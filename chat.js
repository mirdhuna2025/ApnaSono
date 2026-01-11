// Firebase SDK imports (modular v10+)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, onValue, push, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Your Firebase config
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
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

// DOM Elements
const chatArea = document.getElementById('chatArea');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const attachBtn = document.getElementById('attachBtn');
const mediaInput = document.getElementById('mediaInput');
const avatarPreview = document.getElementById('avatarPreview');
const displayNameEl = document.getElementById('displayName');
const bioTextEl = document.getElementById('bioText');
const editProfileBtn = document.getElementById('editProfileBtn');

// Generate or retrieve user ID
let userId = localStorage.getItem('userId');
if (!userId) {
  userId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  localStorage.setItem('userId', userId);
}

// Default profile
let userProfile = JSON.parse(localStorage.getItem('userProfile')) || {
  username: 'Guest',
  bio: 'New user',
  avatar: null // will be DiceBear URL or Firebase Storage URL
};

// Update UI from profile
function renderProfile() {
  displayNameEl.textContent = userProfile.username;
  bioTextEl.textContent = userProfile.bio;

  if (userProfile.avatar) {
    avatarPreview.innerHTML = `<img src="${userProfile.avatar}" alt="Avatar" class="msg-avatar">`;
  } else {
    const firstLetter = userProfile.username.charAt(0).toUpperCase();
    avatarPreview.textContent = firstLetter;
  }
}

renderProfile();

// Save profile to localStorage + Firebase
function saveProfile(profile) {
  userProfile = profile;
  localStorage.setItem('userProfile', JSON.stringify(profile));

  // Sync to Firebase /users/{userId}
  set(ref(db, `users/${userId}`), {
    username: profile.username,
    bio: profile.bio,
    avatar: profile.avatar,
    lastSeen: Date.now()
  });

  renderProfile();
}

// Edit Profile Modal (simple prompt-based for demo)
editProfileBtn.addEventListener('click', () => {
  const username = prompt('Username:', userProfile.username) || userProfile.username;
  const bio = prompt('Bio:', userProfile.bio) || userProfile.bio;

  // Avatar upload
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

// Send message
async function sendMessage() {
  const text = messageInput.value.trim();
  let mediaUrl = null;

  if (!text && !mediaInput.files.length) return;

  // Upload media if present
  if (mediaInput.files[0]) {
    const file = mediaInput.files[0];
    const reader = new FileReader();
    const dataUrl = await new Promise((resolve) => {
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });

    const ext = file.name.split('.').pop();
    const mediaRef = storageRef(storage, `messages/${Date.now()}.${ext}`);
    await uploadString(mediaRef, dataUrl, 'data_url');
    mediaUrl = await getDownloadURL(mediaRef);
  }

  const message = {
    userId,
    text,
    mediaUrl,
    timestamp: Date.now()
  };

  await push(ref(db, 'messages'), message);

  // Clear inputs
  messageInput.value = '';
  mediaInput.value = '';
}

sendBtn.addEventListener('click', sendMessage);
attachBtn.addEventListener('click', () => mediaInput.click());

// Listen to messages in real-time
onValue(ref(db, 'messages'), (snapshot) => {
  chatArea.innerHTML = '';
  const messages = snapshot.val() || {};
  Object.values(messages).forEach(msg => {
    const div = document.createElement('div');
    div.className = 'message';

    // Fetch sender profile (simplified: assume in localStorage or default)
    const senderName = msg.userId === userId ? userProfile.username : 'Anonymous';
    const senderAvatar = msg.userId === userId ? userProfile.avatar : null;

    let avatarHtml = '<div class="msg-avatar"></div>';
    if (senderAvatar) {
      avatarHtml = `<img src="${senderAvatar}" class="msg-avatar" alt="avatar">`;
    } else {
      const letter = senderName.charAt(0).toUpperCase();
      avatarHtml = `<div class="msg-avatar" style="display:flex;align-items:center;justify-content:center;background:#ddd;">${letter}</div>`;
    }

    div.innerHTML = `
      ${avatarHtml}
      <div class="msg-content">
        <div><strong>${senderName}</strong></div>
        ${msg.text ? `<div class="msg-text">${msg.text}</div>` : ''}
        ${msg.mediaUrl ? `<img src="${msg.mediaUrl}" class="msg-media">` : ''}
        <div style="font-size:0.75rem;color:#999;margin-top:4px;">${new Date(msg.timestamp).toLocaleTimeString()}</div>
      </div>
    `;
    chatArea.appendChild(div);
  });

  chatArea.scrollTop = chatArea.scrollHeight;
});
