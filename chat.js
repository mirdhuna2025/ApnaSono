// Firebase SDK (modular v10+)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
  push,
  remove,
  onDisconnect,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getStorage,
  ref as storageRef,
  uploadString,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Config
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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

// DOM
const chatArea = document.getElementById('chatArea');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const attachBtn = document.getElementById('attachBtn');
const mediaInput = document.getElementById('mediaInput');
const avatarPreview = document.getElementById('avatarPreview');
const displayNameEl = document.getElementById('displayName');
const bioTextEl = document.getElementById('bioText');
const editProfileBtn = document.getElementById('editProfileBtn');
const userListEl = document.getElementById('userList');
const exportBtn = document.getElementById('exportBtn');
const clearBtn = document.getElementById('clearBtn');
const lightbox = document.getElementById('lightbox');

// State
let userId = localStorage.getItem('userId') || (Date.now().toString(36) + Math.random().toString(36).substr(2, 5));
localStorage.setItem('userId', userId);

let userProfile = JSON.parse(localStorage.getItem('userProfile')) || {
  username: 'Guest',
  bio: 'New user',
  avatar: null
};

let isAdmin = localStorage.getItem('isAdmin') === 'true';
let typingTimeout = null;
let currentReplyTo = null; // { key, text, sender }

// Initialize
initPresence();
renderProfile();
setupEventListeners();

// === Presence / Online Status ===
function initPresence() {
  const presenceRef = ref(db, `presence/${userId}`);
  set(presenceRef, { ...userProfile, lastSeen: serverTimestamp() });
  onDisconnect(presenceRef).remove();
}

// === Profile ===
function renderProfile() {
  displayNameEl.textContent = userProfile.username;
  bioTextEl.textContent = userProfile.bio;

  if (!userProfile.avatar) {
    userProfile.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
    saveProfile(userProfile); // persist DiceBear URL
  }

  if (userProfile.avatar.startsWith('http')) {
    avatarPreview.innerHTML = `<img src="${userProfile.avatar}" alt="Avatar" class="msg-avatar">`;
  } else {
    const letter = userProfile.username.charAt(0).toUpperCase();
    avatarPreview.textContent = letter;
  }
}

function saveProfile(profile) {
  userProfile = profile;
  localStorage.setItem('userProfile', JSON.stringify(profile));
  set(ref(db, `users/${userId}`), {
    username: profile.username,
    bio: profile.bio,
    avatar: profile.avatar,
    lastSeen: Date.now()
  });
  renderProfile();
}

// === Edit Profile ===
editProfileBtn.addEventListener('click', () => {
  const username = prompt('Username:', userProfile.username) || userProfile.username;
  const bio = prompt('Bio:', userProfile.bio) || userProfile.bio;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      const imgRef = storageRef(storage, `avatars/${userId}`);
      await uploadString(imgRef, dataUrl, 'data_url');
      const url = await getDownloadURL(imgRef);
      saveProfile({ username, bio, avatar: url });
    };
    reader.readAsDataURL(file);
  };
  fileInput.click();
});

// === Send Message ===
async function sendMessage() {
  const text = messageInput.value.trim();
  let mediaUrl = null;

  if (!text && !mediaInput.files.length && !currentReplyTo) return;

  if (mediaInput.files[0]) {
    const file = mediaInput.files[0];
    const reader = new FileReader();
    const dataUrl = await new Promise(resolve => {
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    const ext = file.name.split('.').pop();
    const mediaRef = storageRef(storage, `messages/${userId}_${Date.now()}.${ext}`);
    await uploadString(mediaRef, dataUrl, 'data_url');
    mediaUrl = await getDownloadURL(mediaRef);
  }

  const message = {
    userId,
    text,
    mediaUrl,
    timestamp: Date.now(),
    replyTo: currentReplyTo?.key || null
  };

  await push(ref(db, 'messages'), message);
  resetComposer();
}

function resetComposer() {
  messageInput.value = '';
  mediaInput.value = '';
  currentReplyTo = null;
  updateComposerPlaceholder();
}

function updateComposerPlaceholder() {
  messageInput.placeholder = currentReplyTo 
    ? `Replying to ${currentReplyTo.sender}: "${currentReplyTo.text.substring(0, 30)}..."`
    : 'Type a message...';
}

// === Typing Indicator ===
messageInput.addEventListener('input', () => {
  set(ref(db, `typing/${userId}`), true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    set(ref(db, `typing/${userId}`), null);
  }, 3000);
});

// === Paste Image ===
document.addEventListener('paste', async (e) => {
  const items = e.clipboardData.items;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      mediaInput.files = [file];
      mediaInput.dispatchEvent(new Event('change'));
      break;
    }
  }
});

// === Render Messages ===
function formatTime(timestamp) {
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

function showNotification(title, body, icon) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon });
  }
}

// === Real-time Listeners ===
let messagesCache = {};
let reactionsCache = {};
let typingUsers = new Set();

// Messages
onValue(ref(db, 'messages'), snapshot => {
  messagesCache = snapshot.val() || {};
  renderChat();
});

// Reactions
onValue(ref(db, 'reactions'), snapshot => {
  reactionsCache = snapshot.val() || {};
  renderChat();
});

// Typing
onValue(ref(db, 'typing'), snapshot => {
  typingUsers.clear();
  const typing = snapshot.val() || {};
  Object.keys(typing).forEach(uid => {
    if (uid !== userId) typingUsers.add(uid);
  });
  renderChat();
});

// Users (for directory)
onValue(ref(db, 'users'), snapshot => {
  const users = snapshot.val() || {};
  renderUserList(users);
});

// === Render Chat Area ===
function renderChat() {
  chatArea.innerHTML = '';

  // Typing indicator
  if (typingUsers.size > 0) {
    const div = document.createElement('div');
    div.className = 'typing-indicator';
    div.textContent = 'Someone is typing...';
    chatArea.appendChild(div);
  }

  // Messages
  Object.entries(messagesCache).forEach(([key, msg]) => {
    const div = document.createElement('div');
    div.className = 'message';
    div.dataset.key = key;

    // Get sender info
    const isOwn = msg.userId === userId;
    const senderName = isOwn ? userProfile.username : (msg.username || 'Anonymous');
    const senderAvatar = isOwn ? userProfile.avatar : (msg.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.userId}`);

    // Avatar
    let avatarHtml = `<div class="msg-avatar">${senderName.charAt(0).toUpperCase()}</div>`;
    if (senderAvatar) {
      avatarHtml = `<img src="${senderAvatar}" class="msg-avatar" alt="avatar">`;
    }

    // Reply quote
    let replyHtml = '';
    if (msg.replyTo && messagesCache[msg.replyTo]) {
      const rep = messagesCache[msg.replyTo];
      const repSender = rep.userId === userId ? userProfile.username : 'Anonymous';
      replyHtml = `<div style="font-size:0.85rem;color:#6b7280;border-left:2px solid var(--border);padding-left:8px;margin-bottom:6px;">
        ↪️ <strong>${repSender}</strong>: ${rep.text || '[media]'}
      </div>`;
    }

    // Media
    let mediaHtml = '';
    if (msg.mediaUrl) {
      if (msg.mediaUrl.endsWith('.mp4') || msg.mediaUrl.endsWith('.webm')) {
        mediaHtml = `<video src="${msg.mediaUrl}" muted playsinline class="msg-media" controls></video>`;
      } else {
        mediaHtml = `<img src="${msg.mediaUrl}" class="msg-media" style="cursor:pointer;" onclick="openLightbox('${msg.mediaUrl}')">`;
      }
    }

    // Reactions
    const reactions = reactionsCache[key] || {};
    const likes = Object.values(reactions).filter(r => r === 'like').length;
    const dislikes = Object.values(reactions).filter(r => r === 'dislike').length;
    const userReacted = reactions[userId];

    const reactionsHtml = `
      <div class="reactions">
        <button class="reaction-btn ${userReacted === 'like' ? 'active' : ''}" data-key="${key}" data-type="like">👍 ${likes || ''}</button>
        <button class="reaction-btn ${userReacted === 'dislike' ? 'active' : ''}" data-key="${key}" data-type="dislike">👎 ${dislikes || ''}</button>
      </div>
    `;

    // Delete button (admin)
    const deleteBtn = isAdmin ? `<button class="delete-btn" data-key="${key}">×</button>` : '';

    div.innerHTML = `
      ${avatarHtml}
      <div class="msg-content">
        ${deleteBtn}
        <div><strong>${senderName}</strong></div>
        ${replyHtml}
        ${msg.text ? `<div class="msg-text">${msg.text}</div>` : ''}
        ${mediaHtml}
        <div style="font-size:0.75rem;color:#999;margin-top:4px;">${formatTime(msg.timestamp)}</div>
        ${reactionsHtml}
      </div>
    `;
    chatArea.appendChild(div);
  });

  // Setup reaction handlers
  document.querySelectorAll('.reaction-btn').forEach(btn => {
    btn.onclick = async (e) => {
      const key = e.target.dataset.key;
      const type = e.target.dataset.type;
      const refPath = `reactions/${key}/${userId}`;
      const current = reactionsCache[key]?.[userId];
      if (current === type) {
        await remove(ref(db, refPath));
      } else {
        await set(ref(db, refPath), type);
      }
    };
  });

  // Setup delete handlers
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = async (e) => {
      if (confirm('Delete this message?')) {
        await remove(ref(db, `messages/${e.target.dataset.key}`));
      }
    };
  });

  // Scroll
  chatArea.scrollTop = chatArea.scrollHeight;
}

// === User List ===
function renderUserList(users) {
  const activeUsers = Object.entries(users)
    .filter(([uid, u]) => uid !== userId && (Date.now() - u.lastSeen) < 120000) // last 2 min
    .map(([uid, u]) => ({ ...u, uid }));

  userListEl.innerHTML = activeUsers.map(u => `
    <div class="user-badge online">
      <img src="${u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`}" width="20" height="20" style="border-radius:50%;">
      ${u.username}
    </div>
  `).join('');
}

// === Lightbox ===
window.openLightbox = (url) => {
  lightbox.innerHTML = `
    <span class="lightbox-close">&times;</span>
    ${url.endsWith('.mp4') || url.endsWith('.webm') 
      ? `<video src="${url}" controls autoplay muted playsinline></video>` 
      : `<img src="${url}">`
    }
  `;
  lightbox.classList.add('active');
};

lightbox.querySelector('.lightbox-close')?.addEventListener('click', () => {
  lightbox.classList.remove('active');
});
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) lightbox.classList.remove('active');
});

// === Admin Mode ===
if (isAdmin) {
  clearBtn.style.display = 'inline-block';
}
editProfileBtn.insertAdjacentHTML('afterend', `<button class="btn" id="adminBtn" style="margin-left:8px;">${isAdmin ? 'Exit Admin' : 'Admin'}</button>`);
document.getElementById('adminBtn').onclick = () => {
  if (isAdmin) {
    isAdmin = false;
    localStorage.removeItem('isAdmin');
    location.reload();
  } else {
    const pass = prompt('Admin password:');
    if (pass === 'admin123') {
      isAdmin = true;
      localStorage.setItem('isAdmin', 'true');
      clearBtn.style.display = 'inline-block';
    }
  }
};

clearBtn.onclick = async () => {
  if (confirm('Delete ALL messages?')) {
    await remove(ref(db, 'messages'));
    await remove(ref(db, 'reactions'));
  }
};

// === Export ===
exportBtn.onclick = () => {
  const dataStr = JSON.stringify(messagesCache, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `instantchat-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
};

// === Reply Feature ===
chatArea.addEventListener('click', (e) => {
  if (e.target.closest('.msg-content')) {
    const msgDiv = e.target.closest('.message');
    const key = msgDiv.dataset.key;
    const msg = messagesCache[key];
    if (msg) {
      currentReplyTo = {
        key,
        text: msg.text || '[media]',
        sender: msg.userId === userId ? userProfile.username : 'Anonymous'
      };
      updateComposerPlaceholder();
      messageInput.focus();
    }
  }
});

// === Video Auto-Play ===
const videoObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const video = entry.target;
    if (entry.isIntersecting && video.paused) {
      video.play().catch(e => console.log("Autoplay prevented:", e));
    } else if (!entry.isIntersecting && !video.paused) {
      video.pause();
    }
  });
}, { threshold: 0.5 });

// Observe videos after render
const originalRenderChat = renderChat;
renderChat = () => {
  originalRenderChat();
  document.querySelectorAll('.msg-media').forEach(el => {
    if (el.tagName === 'VIDEO') {
      videoObserver.observe(el);
    }
  });
};

// === Notifications ===
if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
  Notification.requestPermission();
}

// Listen for new messages to notify
let firstLoad = true;
onValue(ref(db, 'messages'), (snapshot) => {
  if (firstLoad) {
    firstLoad = false;
    return;
  }
  const messages = snapshot.val() || {};
  const keys = Object.keys(messages);
  const latestKey = keys[keys.length - 1];
  const latest = messages[latestKey];
  if (latest && latest.userId !== userId) {
    const sender = latest.userId === userId ? userProfile.username : 'Someone';
    showNotification(sender, latest.text || 'Sent a media message', userProfile.avatar);
  }
});

// === Final Setup ===
function setupEventListeners() {
  sendBtn.addEventListener('click', sendMessage);
  attachBtn.addEventListener('click', () => mediaInput.click());
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}
