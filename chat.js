// ==============================
// Firebase v10.12.2 (MODULE)
// ==============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  update,
  remove,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import {
  getStorage,
  ref as storageRef,
  getDownloadURL,
  uploadString // ✅ FIXED: In v10, use uploadString instead of putString
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ==============================
// Firebase Config
// ==============================
const firebaseConfig = {
  apiKey: "AIzaSyDjhzzGE1jJ-U1lG3b8v3KqYN5oZyIpzHU",
  authDomain: "instantchat-f8b1e.firebaseapp.com",
  projectId: "instantchat-f8b1e",
  storageBucket: "instantchat-f8b1e.appspot.com",
  messagingSenderId: "702833571971",
  appId: "1:702833571971:web:3b4f9c1d4e8f2a5b6c",
};

// ==============================
// Initialize Firebase
// ==============================
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

// Database references
const messagesRef = ref(db, "messages");
const usersRef = ref(db, "users");

console.log("[v10.12.2] Firebase initialized");

// ==============================
// STATE MANAGEMENT
// ==============================
let currentUser = null;
let isAdmin = false;
let replyingToMsgId = null;
let allMessages = [];
const videoAutoplayEnabled = true; 
let messagesListenerAttached = false;

// ==============================
// INITIALIZATION
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  requestNotificationPermission();
  setupEventListeners();
  loadUserProfile();
  loadMessagesFromFirebase();
});

// ==============================
// NOTIFICATION PERMISSION
// ==============================
function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

// ==============================
// EVENT LISTENERS
// ==============================
function setupEventListeners() {
  document.getElementById("profileBtn")?.addEventListener("click", () => openModal("profileModal"));
  document.getElementById("adminBtn")?.addEventListener("click", () => openModal("adminModal"));
  document.getElementById("usersBtn")?.addEventListener("click", loadAndShowUsers);
  document.getElementById("refreshBtn")?.addEventListener("click", () => location.reload());

  document.getElementById("sendBtn")?.addEventListener("click", sendMessage);
  document.getElementById("msgInput")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  document.getElementById("cameraBtn")?.addEventListener("click", () => {
    document.getElementById("cameraInput")?.click();
  });
  document.getElementById("galleryBtn")?.addEventListener("click", () => {
    document.getElementById("galleryInput")?.click();
  });
  document.getElementById("cameraInput")?.addEventListener("change", (e) => handleMediaUpload(e, "camera"));
  document.getElementById("galleryInput")?.addEventListener("change", (e) => handleMediaUpload(e, "gallery"));

  document.getElementById("uploadPhotoBtn")?.addEventListener("click", () => {
    document.getElementById("profilePhotoInput")?.click();
  });
  document.getElementById("profilePhotoInput")?.addEventListener("change", handleProfilePhotoChange);
  document.getElementById("saveProfileBtn")?.addEventListener("click", saveProfile);

  document.getElementById("adminLoginBtn")?.addEventListener("click", adminLogin);
  document.getElementById("sendReplyBtn")?.addEventListener("click", sendReply);

  document.querySelectorAll(".modal-close").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const modalId = e.target.dataset.modal;
      closeModal(modalId);
    });
  });

  document.querySelector(".media-viewer-close")?.addEventListener("click", closeMediaViewer);
  document.getElementById("mediaViewer")?.addEventListener("click", (e) => {
    if (e.target.id === "mediaViewer") closeMediaViewer();
  });
}

// ==============================
// PROFILE MANAGEMENT
// ==============================
function loadUserProfile() {
  const saved = localStorage.getItem("userProfile");
  if (saved) {
    currentUser = JSON.parse(saved);
    updateProfileUI();
  }
}

function updateProfileUI() {
  if (!currentUser) return;

  const defaultAvatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=default";
  const photo = currentUser.photo || defaultAvatar;

  const profileBtnImg = document.getElementById("profileBtn");
  if (profileBtnImg && profileBtnImg.tagName === "IMG") {
    profileBtnImg.src = photo;
  }

  document.getElementById("nameInput").value = currentUser.name || "";
  document.getElementById("bioInput").value = currentUser.bio || "";
  document.getElementById("profilePreview").src = photo;
}

function handleProfilePhotoChange(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      currentUser = currentUser || {};
      currentUser.photo = event.target.result;
      document.getElementById("profilePreview").src = currentUser.photo;
    };
    reader.readAsDataURL(file);
  }
}

function saveProfile() {
  const name = document.getElementById("nameInput").value.trim();
  const bio = document.getElementById("bioInput").value.trim();
  const defaultAvatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=default";

  if (!name) {
    alert("Please enter a username");
    return;
  }

  currentUser = {
    id: currentUser?.id || Date.now().toString(),
    name: name,
    bio: bio,
    photo: currentUser?.photo || defaultAvatar,
    joinedAt: currentUser?.joinedAt || new Date().toISOString(),
  };

  localStorage.setItem("userProfile", JSON.stringify(currentUser));

  set(ref(db, `users/${currentUser.id}`), {
    name: currentUser.name,
    bio: currentUser.bio,
    photo: currentUser.photo,
    joinedAt: currentUser.joinedAt,
  }).catch((err) => console.error("Error saving profile:", err));

  updateProfileUI();
  closeModal("profileModal");
  showNotification("Profile updated!", { icon: "✓" });
}

// ==============================
// MESSAGE OPERATIONS
// ==============================
function sendMessage() {
  const input = document.getElementById("msgInput");
  const text = input?.value.trim();

  if (!currentUser) {
    alert("Please set your profile first");
    openModal("profileModal");
    return;
  }

  if (!text) return;

  const messageId = Date.now().toString();
  const message = {
    id: messageId,
    userId: currentUser.id,
    username: currentUser.name,
    userPhoto: currentUser.photo,
    text: text,
    type: "text",
    timestamp: new Date().toISOString(),
    likes: 0,
    dislikes: 0,
    replies: [],
    isAdmin: isAdmin,
  };

  set(ref(messagesRef, messageId), message).catch((err) => {
    console.error("Error sending message:", err);
  });

  input.value = "";
}

// ✅ CORRECTED MEDIA UPLOAD FOR v10
function handleMediaUpload(e, type) {
  const file = e.target.files[0];
  if (!file || !currentUser) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const messageId = Date.now().toString();
    const fileName = `${messageId}_${file.name}`;
    const storagePath = `media/${currentUser.id}/${fileName}`;

    if (storage) {
      const storageRefObj = storageRef(storage, storagePath);
      
      // ✅ Using uploadString (v10 modular) instead of putString
      uploadString(storageRefObj, event.target.result, "data_url")
        .then((snapshot) => {
          return getDownloadURL(snapshot.ref);
        })
        .then((downloadURL) => {
          const message = {
            id: messageId,
            userId: currentUser.id,
            username: currentUser.name,
            userPhoto: currentUser.photo,
            text: `[${file.type.includes("image") ? "Image" : "Video"}]`,
            type: file.type.includes("image") ? "image" : "video",
            media: downloadURL,
            timestamp: new Date().toISOString(),
            likes: 0,
            dislikes: 0,
            replies: [],
            isAdmin: isAdmin,
          };

          set(ref(messagesRef, messageId), message);
          showNotification("Media uploaded!", { icon: "📸" });
        })
        .catch((error) => {
          console.error("Upload failed:", error);
          alert("Failed to upload media. Check Storage rules.");
        });
    }
  };
  reader.readAsDataURL(file);
}

// ==============================
// REPLY SYSTEM
// ==============================
function replyToMessage(msgId) {
  replyingToMsgId = msgId;
  openModal("replyModal");
}

function sendReply() {
  if (!replyingToMsgId || !currentUser) return;

  const replyInput = document.getElementById("replyInput");
  const replyText = replyInput?.value.trim();
  if (!replyText) return;

  const message = allMessages.find((m) => m.id === replyingToMsgId);
  if (message) {
    const replies = message.replies || [];
    replies.push({
      userId: currentUser.id,
      username: currentUser.name,
      text: replyText,
      timestamp: new Date().toISOString(),
    });

    update(ref(messagesRef, replyingToMsgId), { replies }).catch((err) => {
      console.error("Error saving reply:", err);
    });

    replyInput.value = "";
    closeModal("replyModal");
    replyingToMsgId = null;
    showNotification("Reply sent!", { icon: "💬" });
  }
}

// ==============================
// LOAD MESSAGES (REALTIME)
// ==============================
function loadMessagesFromFirebase() {
  if (messagesListenerAttached) return;
  messagesListenerAttached = true;

  onValue(messagesRef, (snapshot) => {
    allMessages = [];
    const data = snapshot.val();

    if (data) {
      Object.keys(data).forEach((key) => {
        allMessages.push({ id: key, ...data[key] });
      });
      allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    renderMessages();
    scrollChatToBottom();
  });
}

// ==============================
// MESSAGE RENDERING
// ==============================
function renderMessages() {
  const chatBox = document.getElementById("chatBox");
  if (!chatBox) return;

  chatBox.innerHTML = "";

  if (allMessages.length === 0) {
    chatBox.innerHTML = `
      <div class="welcome-placeholder">
        <div class="welcome-icon">💬</div>
        <div class="welcome-text">No messages yet<br><span style="font-size: 12px; color: var(--text-tertiary);">Be the first to say something!</span></div>
      </div>
    `;
    return;
  }

  const defaultAvatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=default";

  allMessages.forEach((msg) => {
    const messageGroup = document.createElement("div");
    messageGroup.className = "message-group";
    messageGroup.id = `msg-${msg.id}`;

    const avatar = document.createElement("img");
    avatar.className = "message-avatar";
    avatar.src = msg.userPhoto || defaultAvatar;
    avatar.addEventListener("click", () => viewUserProfile(msg.userId, msg.username, msg.userPhoto));

    const content = document.createElement("div");
    content.className = "message-content";

    const header = document.createElement("div");
    header.className = "message-header";

    const username = document.createElement("span");
    username.className = "message-username";
    username.textContent = msg.username;

    const time = document.createElement("span");
    time.className = "message-time";
    time.textContent = formatTime(msg.timestamp);

    header.appendChild(username);
    if (msg.isAdmin) {
      const adminBadge = document.createElement("span");
      adminBadge.className = "admin-badge";
      adminBadge.textContent = "ADMIN";
      header.appendChild(adminBadge);
    }
    header.appendChild(time);

    const messageBody = document.createElement("div");

    if (msg.type === "text") {
      const textDiv = document.createElement("div");
      textDiv.className = "message-text";
      textDiv.textContent = msg.text;
      messageBody.appendChild(textDiv);
    } else if (msg.type === "image") {
      const img = document.createElement("img");
      img.className = "message-media";
      img.src = msg.media;
      img.addEventListener("click", () => viewMedia(msg.media, "image"));
      messageBody.appendChild(img);
    } else if (msg.type === "video") {
      const video = document.createElement("video");
      video.className = "message-video";
      video.src = msg.media;
      video.controls = true;
      video.muted = true;
      video.addEventListener("click", () => viewMedia(msg.media, "video"));
      messageBody.appendChild(video);
    }

    // Replies
    if (msg.replies && msg.replies.length > 0) {
      const repliesDiv = document.createElement("div");
      repliesDiv.className = "message-replies";
      msg.replies.forEach((reply) => {
        const replyItem = document.createElement("div");
        replyItem.className = "reply-item";
        replyItem.innerHTML = `<span class="reply-username">${reply.username}:</span> <span class="reply-text">${reply.text}</span>`;
        repliesDiv.appendChild(replyItem);
      });
      messageBody.appendChild(repliesDiv);
    }

    const actions = document.createElement("div");
    actions.className = "message-actions";

    const likeBtn = document.createElement("button");
    likeBtn.className = "action-btn";
    likeBtn.innerHTML = `❤️ ${msg.likes || 0}`;
    likeBtn.onclick = () => likeMessage(msg.id);

    const replyBtn = document.createElement("button");
    replyBtn.className = "action-btn";
    replyBtn.innerHTML = "💬 Reply";
    replyBtn.onclick = () => replyToMessage(msg.id);

    actions.appendChild(likeBtn);
    actions.appendChild(replyBtn);

    if (isAdmin) {
      const delBtn = document.createElement("button");
      delBtn.className = "action-btn";
      delBtn.innerHTML = "🗑️";
      delBtn.onclick = () => deleteMessage(msg.id);
      actions.appendChild(delBtn);
    }

    content.appendChild(header);
    content.appendChild(messageBody);
    content.appendChild(actions);
    messageGroup.appendChild(avatar);
    messageGroup.appendChild(content);
    chatBox.appendChild(messageGroup);
  });
}

// ==============================
// ACTIONS (Global)
// ==============================
window.likeMessage = (msgId) => {
  const message = allMessages.find((m) => m.id === msgId);
  if (message) {
    update(ref(db, `messages/${msgId}`), { likes: (message.likes || 0) + 1 });
  }
};

window.deleteMessage = (msgId) => {
  if (confirm("Delete this message?")) {
    remove(ref(db, `messages/${msgId}`));
  }
};

// ==============================
// MODALS & MEDIA VIEWER
// ==============================
function openModal(modalId) {
  document.getElementById(modalId)?.classList.add("active");
}

function closeModal(modalId) {
  document.getElementById(modalId)?.classList.remove("active");
}

function viewMedia(src, type) {
  const viewer = document.getElementById("mediaViewer");
  const container = document.getElementById("mediaViewerContainer");
  if (!viewer || !container) return;

  container.innerHTML = type === "image" 
    ? `<img src="${src}" style="max-width:100%">` 
    : `<video src="${src}" controls autoplay style="max-width:100%"></video>`;

  viewer.classList.add("active");
}

function closeMediaViewer() {
  document.getElementById("mediaViewer")?.classList.remove("active");
}

// ==============================
// ADMIN & STATS
// ==============================
function adminLogin() {
  const pass = document.getElementById("adminPassword")?.value;
  if (pass === "admin123") {
    isAdmin = true;
    closeModal("adminModal");
    renderMessages();
    showNotification("Admin access granted!");
  } else {
    alert("Wrong password");
  }
}

function loadAndShowUsers() {
  const usersList = document.getElementById("usersList");
  if (!usersList) return;
  
  const uniqueUsers = new Map();
  allMessages.forEach(m => uniqueUsers.set(m.userId, { name: m.username, photo: m.userPhoto }));

  usersList.innerHTML = "";
  uniqueUsers.forEach((user, id) => {
    const div = document.createElement("div");
    div.className = "user-card"; // Apply your CSS here
    div.innerHTML = `<img src="${user.photo}" width="30"> <span>${user.name}</span>`;
    usersList.appendChild(div);
  });
  openModal("usersModal");
}

// ==============================
// UTILS
// ==============================
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const diff = Math.floor((new Date() - date) / 60000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollChatToBottom() {
  const chatBox = document.getElementById("chatBox");
  if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
}

function showNotification(title, options = {}) {
  if (Notification.permission === "granted") new Notification(title, options);
}

// Chat Export
window.exportChat = () => {
  const data = JSON.stringify(allMessages, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "chat-export.json";
  a.click();
};

window.clearChat = () => {
  if (isAdmin && confirm("Clear all?")) remove(messagesRef);
};
