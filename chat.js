import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase, ref, push, onValue, remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getStorage, ref as sRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCPbOZwAZEMiC1LSDSgnSEPmSxQ7-pR2oQ",
    authDomain: "mirdhuna-25542.firebaseapp.com",
    databaseURL: "https://mirdhuna-25542-default-rtdb.firebaseio.com",
    projectId: "mirdhuna-25542",
    storageBucket: "mirdhuna-25542.firebasestorage.app",
    messagingSenderId: "575924409876",
    appId: "1:575924409876:web:6ba1ed88ce941d9c83b901",
    measurementId: "G-YB7LDKHBPV"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const storage = firebase.storage();

// Global State
let currentUser = {
    id: localStorage.getItem('userId') || generateUserId(),
    name: localStorage.getItem('userName') || 'Anonymous',
    avatar: localStorage.getItem('userAvatar') || ''
};
let isAdmin = false;
let currentReplyToMessageId = null;
let replyGift = null;
let selectedMediaFile = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadUserProfile();
    loadMessages();
    setupKeyboardShortcuts();
    
    // Save user ID
    localStorage.setItem('userId', currentUser.id);
});

// ==================== UTILITY FUNCTIONS ====================

function generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'a' && !isAdmin) {
            e.preventDefault();
            openAdminModal();
        }
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

function closeAllModals() {
    document.getElementById('profileModal').classList.remove('active');
    document.getElementById('adminModal').classList.remove('active');
    document.getElementById('replyModal').classList.remove('active');
    document.getElementById('mediaModal').classList.remove('active');
}

// ==================== USER PROFILE ====================

function loadUserProfile() {
    document.getElementById('nameInput').value = currentUser.name;
    updateHeaderProfile();
}

function updateHeaderProfile() {
    document.getElementById('headerName').textContent = currentUser.name;
    
    if (currentUser.avatar) {
        document.getElementById('headerAvatar').src = currentUser.avatar;
        document.getElementById('profileInfo').style.display = 'flex';
    }
    
    const badgeContainer = document.getElementById('adminBadgeContainer');
    badgeContainer.innerHTML = isAdmin ? '<div class="admin-badge">🔐 ADMIN</div>' : '';
}

function openProfileModal() {
    document.getElementById('profileModal').classList.add('active');
    document.getElementById('nameInput').focus();
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
}

function previewPhoto(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('photoPreview');
            preview.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 200px; border-radius: 8px; margin-bottom: 15px;">`;
        };
        reader.readAsDataURL(file);
    }
}

function saveProfile() {
    const name = document.getElementById('nameInput').value.trim();
    const photoInput = document.getElementById('photoInput');
    
    if (!name) {
        alert('Please enter your name');
        return;
    }
    
    currentUser.name = name;
    localStorage.setItem('userName', name);
    
    if (photoInput.files.length > 0) {
        const file = photoInput.files[0];
        const storageRef = storage.ref(`profiles/${currentUser.id}/${file.name}`);
        
        storageRef.put(file).then((snapshot) => {
            return snapshot.ref.getDownloadURL();
        }).then((url) => {
            currentUser.avatar = url;
            localStorage.setItem('userAvatar', url);
            updateHeaderProfile();
            closeProfileModal();
            alert('Profile updated successfully!');
        }).catch((error) => {
            console.error('Upload error:', error);
            alert('Error uploading photo');
        });
    } else {
        updateHeaderProfile();
        closeProfileModal();
        alert('Profile updated successfully!');
    }
}

// ==================== ADMIN FUNCTIONS ====================

function openAdminModal() {
    document.getElementById('adminModal').classList.add('active');
    document.getElementById('adminPassword').focus();
}

function closeAdminModal() {
    document.getElementById('adminModal').classList.remove('active');
    document.getElementById('adminPassword').value = '';
}

function loginAdmin() {
    const password = document.getElementById('adminPassword').value;
    
    if (password === 'admin123') {
        isAdmin = true;
        updateHeaderProfile();
        closeAdminModal();
        alert('Admin mode activated!');
    } else {
        alert('Invalid password');
    }
}

function deleteMessage(messageId) {
    if (!isAdmin) {
        alert('Only admins can delete messages');
        return;
    }
    
    if (confirm('Delete this message?')) {
        db.ref(`messages/${messageId}`).remove().catch(error => {
            console.error('Delete error:', error);
            alert('Error deleting message');
        });
    }
}

// ==================== MESSAGES ====================

function loadMessages() {
    const messagesRef = db.ref('messages');
    
    messagesRef.on('value', (snapshot) => {
        const messages = snapshot.val() || {};
        renderMessages(messages);
    });
}

function renderMessages(messages) {
    const container = document.getElementById('messagesContainer');
    
    if (Object.keys(messages).length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No messages yet. Start the conversation!</p></div>';
        return;
    }
    
    container.innerHTML = '';
    
    Object.entries(messages).forEach(([messageId, message]) => {
        const messageEl = createMessageElement(messageId, message);
        container.appendChild(messageEl);
    });
    
    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function createMessageElement(messageId, message) {
    const div = document.createElement('div');
    div.className = 'message';
    
    const avatar = message.avatar ? `<img src="${message.avatar}" class="message-avatar" alt="${message.name}">` : `<div class="message-avatar" style="background: #667eea; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">${message.name.charAt(0)}</div>`;
    
    let mediaHtml = '';
    if (message.media) {
        if (message.mediaType.startsWith('image')) {
            mediaHtml = `<div class="message-media"><img src="${message.media}" onclick="openMediaModal('${message.media}', 'image')" alt="Shared image"></div>`;
        } else if (message.mediaType.startsWith('video')) {
            mediaHtml = `<div class="message-media"><div class="video-play-overlay"><video style="width: 300px; border-radius: 8px;"><source src="${message.media}" type="${message.mediaType}"></video><button class="video-play-button" onclick="openMediaModal('${message.media}', 'video')">▶</button></div></div>`;
        }
    }
    
    let giftHtml = message.gift ? `<div class="message-gift">${message.gift}</div>` : '';
    
    let repliesHtml = '';
    if (message.replies && Object.keys(message.replies).length > 0) {
        repliesHtml = '<div class="replies">';
        Object.entries(message.replies).forEach(([replyId, reply]) => {
            const replyAvatar = reply.avatar ? `<img src="${reply.avatar}" class="reply-avatar" alt="${reply.name}">` : `<div class="reply-avatar" style="background: #667eea; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">${reply.name.charAt(0)}</div>`;
            repliesHtml += `
                <div class="reply">
                    ${replyAvatar}
                    <div class="reply-content">
                        <div class="reply-name">${escapeHtml(reply.name)}</div>
                        <div class="reply-text">${escapeHtml(reply.text)}</div>
                        ${reply.gift ? `<div class="reply-gift">${reply.gift}</div>` : ''}
                    </div>
                </div>
            `;
        });
        repliesHtml += '</div>';
    }
    
    const deleteBtn = isAdmin ? `<button class="action-btn delete" onclick="deleteMessage('${messageId}')">Delete</button>` : '';
    
    div.innerHTML = `
        ${avatar}
        <div class="message-content">
            <div class="message-header">
                <span class="message-name">${escapeHtml(message.name)}</span>
                <span class="message-time">${formatTime(message.timestamp)}</span>
            </div>
            <div class="message-text">${escapeHtml(message.text)}</div>
            ${mediaHtml}
            ${giftHtml}
            <div class="message-actions">
                <button class="action-btn" onclick="openReplyModal('${messageId}')">Reply</button>
                ${deleteBtn}
            </div>
            ${repliesHtml}
        </div>
    `;
    
    return div;
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function handleMediaSelect(event) {
    selectedMediaFile = event.target.files[0];
    if (selectedMediaFile) {
        console.log('[v0] Media selected:', selectedMediaFile.name);
    }
}

function sendMessage() {
    const messageText = document.getElementById('messageInput').value.trim();
    
    if (!messageText && !selectedMediaFile) {
        alert('Please enter a message or select media');
        return;
    }
    
    if (selectedMediaFile) {
        uploadMediaAndSendMessage(messageText);
    } else {
        sendPlainMessage(messageText);
    }
}

function sendPlainMessage(text) {
    const messageRef = db.ref('messages').push();
    
    messageRef.set({
        id: messageRef.key,
        userId: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
        text: text,
        timestamp: Date.now(),
        replies: {}
    }).then(() => {
        document.getElementById('messageInput').value = '';
        selectedMediaFile = null;
    }).catch(error => {
        console.error('Error sending message:', error);
        alert('Error sending message');
    });
}

function uploadMediaAndSendMessage(text) {
    const fileName = Date.now() + '_' + selectedMediaFile.name;
    const storageRef = storage.ref(`messages/${fileName}`);
    
    storageRef.put(selectedMediaFile).then((snapshot) => {
        return snapshot.ref.getDownloadURL();
    }).then((url) => {
        const messageRef = db.ref('messages').push();
        
        return messageRef.set({
            id: messageRef.key,
            userId: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
            text: text,
            media: url,
            mediaType: selectedMediaFile.type,
            timestamp: Date.now(),
            replies: {}
        });
    }).then(() => {
        document.getElementById('messageInput').value = '';
        selectedMediaFile = null;
        document.getElementById('mediaInput').value = '';
    }).catch(error => {
        console.error('Upload error:', error);
        alert('Error uploading media');
    });
}

function sendGift(emoji) {
    const messageText = document.getElementById('messageInput').value.trim();
    
    if (!messageText) {
        alert('Please type a message first');
        return;
    }
    
    const messageRef = db.ref('messages').push();
    
    messageRef.set({
        id: messageRef.key,
        userId: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
        text: messageText,
        gift: emoji,
        timestamp: Date.now(),
        replies: {}
    }).then(() => {
        document.getElementById('messageInput').value = '';
    }).catch(error => {
        console.error('Error sending gift:', error);
    });
}

function refreshMessages() {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '<div class="empty-state"><p>Refreshing messages...</p></div>';
    
    setTimeout(() => {
        loadMessages();
    }, 300);
}

// ==================== REPLIES ====================

function openReplyModal(messageId) {
    currentReplyToMessageId = messageId;
    replyGift = null;
    
    db.ref(`messages/${messageId}`).once('value', (snapshot) => {
        const message = snapshot.val();
        if (message) {
            const preview = `<strong>${escapeHtml(message.name)}:</strong> ${escapeHtml(message.text)}`;
            document.getElementById('replyPreview').innerHTML = preview;
        }
    });
    
    document.getElementById('replyModal').classList.add('active');
    document.getElementById('replyInput').focus();
}

function closeReplyModal() {
    document.getElementById('replyModal').classList.remove('active');
    document.getElementById('replyInput').value = '';
    currentReplyToMessageId = null;
    replyGift = null;
}

function setReplyGift(emoji) {
    replyGift = emoji;
    console.log('[v0] Gift selected:', emoji);
}

function submitReply() {
    const replyText = document.getElementById('replyInput').value.trim();
    
    if (!replyText && !replyGift) {
        alert('Please type a reply or select a gift');
        return;
    }
    
    if (!currentReplyToMessageId) {
        alert('Message not found');
        return;
    }
    
    const replyRef = db.ref(`messages/${currentReplyToMessageId}/replies`).push();
    
    replyRef.set({
        id: replyRef.key,
        userId: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
        text: replyText,
        gift: replyGift,
        timestamp: Date.now()
    }).then(() => {
        closeReplyModal();
    }).catch(error => {
        console.error('Error sending reply:', error);
        alert('Error sending reply');
    });
}

// ==================== MEDIA MODAL ====================

function openMediaModal(src, type) {
    const mediaModal = document.getElementById('mediaModal');
    const mediaContent = document.getElementById('mediaContent');
    
    if (type === 'image') {
        mediaContent.innerHTML = `<img src="${src}" style="max-width: 100%; max-height: 90vh; border-radius: 8px;">`;
    } else if (type === 'video') {
        mediaContent.innerHTML = `<video style="max-width: 100%; max-height: 90vh; border-radius: 8px;" controls><source src="${src}"></video>`;
    }
    
    mediaModal.classList.add('active');
}

function closeMediaModal() {
    document.getElementById('mediaModal').classList.remove('active');
    document.getElementById('mediaContent').innerHTML = '';
}

