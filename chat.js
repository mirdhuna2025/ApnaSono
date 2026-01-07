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
  putString // ✅ Added missing import
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
const videoAutoplayEnabled = true; // Note: browsers require muted for autoplay
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
  // Header buttons
  document.getElementById("profileBtn")?.addEventListener("click", () => openModal("profileModal"));
  document.getElementById("adminBtn")?.addEventListener("click", () => openModal("adminModal"));
  document.getElementById("usersBtn")?.addEventListener("click", loadAndShowUsers);
  document.getElementById("refreshBtn")?.addEventListener("click", () => location.reload());

  // Message composer
  document.getElementById("sendBtn")?.addEventListener("click", sendMessage);
  document.getElementById("msgInput")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Media buttons
  document.getElementById("cameraBtn")?.addEventListener("click", () => {
    document.getElementById("cameraInput")?.click();
  });
  document.getElementById("galleryBtn")?.addEventListener("click", () => {
    document.getElementById("galleryInput")?.click();
  });
  document.getElementById("cameraInput")?.addEventListener("change", (e) => handleMediaUpload(e, "camera"));
  document.getElementById("galleryInput")?.addEventListener("change", (e) => handleMediaUpload(e, "gallery"));

  // Profile modal
  document.getElementById("uploadPhotoBtn")?.addEventListener("click", () => {
    document.getElementById("profilePhotoInput")?.click();
  });
  document.getElementById("profilePhotoInput")?.addEventListener("change", handleProfilePhotoChange);
  document.getElementById("saveProfileBtn")?.addEventListener("click", saveProfile);

  // Admin modal
  document.getElementById("adminLoginBtn")?.addEventListener("click", adminLogin);

  // Reply modal
  document.getElementById("sendReplyBtn")?.addEventListener("click", sendReply);

  // Modal closes
  document.querySelectorAll(".modal-close").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const modalId = e.target.dataset.modal;
      closeModal(modalId);
    });
  });

  // Media viewer close
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

  document.getElementById("profileBtn").src = photo;
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
    id: Date.now().toString(),
    name: name,
    bio: bio,
    photo: currentUser?.photo || defaultAvatar,
    joinedAt: currentUser?.joinedAt || new Date().toISOString(),
  };

  localStorage.setItem("userProfile", JSON.stringify(currentUser));

  if (usersRef) {
    set(ref(usersRef, currentUser.id), {
      name: currentUser.name,
      bio: currentUser.bio,
      photo: currentUser.photo,
      joinedAt: currentUser.joinedAt,
    }).catch((err) => console.error("[v0] Error saving profile:", err));
  }

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
    console.error("[v0] Error sending message:", err);
    alert("Failed to send message. Check Firebase connection.");
  });

  allMessages.push(message);
  renderMessages();
  if (input) input.value = "";
  scrollChatToBottom();
}

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
      const uploadTask = putString(storageRefObj, event.target.result, "data_url");

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log("[v0] Upload progress:", progress);
        },
        (error) => {
          console.error("[v0] Upload failed:", error);
          alert("Failed to upload media");
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
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

            set(ref(messagesRef, messageId), message).catch((err) => {
              console.error("[v0] Error saving media message:", err);
            });

            allMessages.push(message);
            renderMessages();
            scrollChatToBottom();
            showNotification("Media uploaded!", { icon: "📸" });
          });
        }
      );
    } else {
      // Fallback (shouldn't happen if Firebase initialized)
      const message = {
        id: messageId,
        userId: currentUser.id,
        username: currentUser.name,
        userPhoto: currentUser.photo,
        text: `[${file.type.includes("image") ? "Image" : "Video"}]`,
        type: file.type.includes("image") ? "image" : "video",
        media: event.target.result,
        timestamp: new Date().toISOString(),
        likes: 0,
        dislikes: 0,
        replies: [],
        isAdmin: isAdmin,
      };

      allMessages.push(message);
      renderMessages();
      scrollChatToBottom();
      showNotification("Media uploaded (local)!", { icon: "📸" });
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
    message.replies = message.replies || [];
    message.replies.push({
      userId: currentUser.id,
      username: currentUser.name,
      text: replyText,
      timestamp: new Date().toISOString(),
    });

    update(ref(messagesRef, replyingToMsgId), message).catch((err) => {
      console.error("[v0] Error saving reply:", err);
    });

    renderMessages();
    if (replyInput) replyInput.value = "";
    closeModal("replyModal");
    replyingToMsgId = null;
    showNotification("Reply sent!", { icon: "💬" });
  }
}

// ==============================
// LOAD MESSAGES (REALTIME – WITH SORTING)
// ==============================
function loadMessagesFromFirebase() {
  if (messagesListenerAttached) return;
  messagesListenerAttached = true;

  onValue(
    messagesRef,
    (snapshot) => {
      allMessages = [];
      const data = snapshot.val();

      if (data) {
        Object.keys(data).forEach((key) => {
          allMessages.push({ id: key, ...data[key] });
        });
        allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      }

      renderMessages();
    },
    (error) => {
      console.error("[v0] Error loading messages from Firebase:", error);
    }
  );
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
    avatar.alt = msg.username;
    avatar.style.cursor = "pointer";
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
      img.alt = "Image";
      img.addEventListener("click", () => viewMedia(msg.media, "image"));
      messageBody.appendChild(img);
    } else if (msg.type === "video") {
      const videoContainer = document.createElement("div");
      videoContainer.className = "video-play-overlay";
      const video = document.createElement("video");
      video.className = "message-video";
      video.src = msg.media;
      video.controls = true;
      video.muted = true; // ✅ Required for autoplay in most browsers
      video.id = `video-${msg.id}`;
      videoContainer.appendChild(video);
      videoContainer.addEventListener("click", () => viewMedia(msg.media, "video"));
      messageBody.appendChild(videoContainer);

      // Auto-play/pause on visibility
      setTimeout(() => {
        const videoElement = document.getElementById(`video-${msg.id}`);
        if (videoElement) {
          const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                videoElement.play().catch(() => {}); // mute required
              } else {
                videoElement.pause();
              }
            });
          });
          observer.observe(videoElement);
        }
      }, 100);
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

    // Actions
    const actions = document.createElement("div");
    actions.className = "message-actions";

    const likeBtn = document.createElement("button");
    likeBtn.className = "action-btn action-btn-like";
    likeBtn.innerHTML = `❤️ ${msg.likes || 0}`;
    likeBtn.addEventListener("click", () => likeMessage(msg.id));

    const dislikeBtn = document.createElement("button");
    dislikeBtn.className = "action-btn action-btn-dislike";
    dislikeBtn.innerHTML = `👎 ${msg.dislikes || 0}`;
    dislikeBtn.addEventListener("click", () => dislikeMessage(msg.id));

    const replyBtn = document.createElement("button");
    replyBtn.className = "action-btn action-btn-reply";
    replyBtn.innerHTML = "💬 Reply";
    replyBtn.addEventListener("click", () => replyToMessage(msg.id));

    actions.appendChild(likeBtn);
    actions.appendChild(dislikeBtn);
    actions.appendChild(replyBtn);

    if (currentUser && currentUser.id === msg.userId && isAdmin) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "action-btn action-btn-delete";
      deleteBtn.innerHTML = "🗑️ Delete";
      deleteBtn.addEventListener("click", () => deleteMessage(msg.id));
      actions.appendChild(deleteBtn);
    }

    content.appendChild(header);
    content.appendChild(messageBody);
    content.appendChild(actions);

    messageGroup.appendChild(avatar);
    messageGroup.appendChild(content);

    chatBox.appendChild(messageGroup);
  });

  setupMediaViewerClicks();
}

// ==============================
// MESSAGE ACTIONS
// ==============================
function likeMessage(msgId) {
  const message = allMessages.find((m) => m.id === msgId);
  if (message) {
    message.likes = (message.likes || 0) + 1;
    update(ref(messagesRef, msgId), { likes: message.likes }).catch(console.error);
    renderMessages();
  }
}

function dislikeMessage(msgId) {
  const message = allMessages.find((m) => m.id === msgId);
  if (message) {
    message.dislikes = (message.dislikes || 0) + 1;
    update(ref(messagesRef, msgId), { dislikes: message.dislikes }).catch(console.error);
    renderMessages();
  }
}

function deleteMessage(msgId) {
  if (confirm("Delete this message?")) {
    allMessages = allMessages.filter((m) => m.id !== msgId);
    remove(ref(messagesRef, msgId)).catch(console.error);
    renderMessages();
  }
}

// ==============================
// USER PROFILES
// ==============================
function viewUserProfile(userId, username, userPhoto) {
  const defaultAvatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=default";
  document.getElementById("userProfilePhoto").src = userPhoto || defaultAvatar;
  document.getElementById("userProfileName").textContent = username;
  openModal("userProfileModal");
}

function loadAndShowUsers() {
  const usersList = document.getElementById("usersList");
  if (!usersList) return;

  const uniqueUsers = new Map();
  allMessages.forEach((msg) => {
    if (!uniqueUsers.has(msg.userId)) {
      uniqueUsers.set(msg.userId, {
        id: msg.userId,
        name: msg.username,
        photo: msg.userPhoto,
      });
    }
  });

  if (uniqueUsers.size === 0) {
    usersList.innerHTML = '<div style="text-align: center; color: var(--text-tertiary); padding: 20px;">No active users yet</div>';
  } else {
    usersList.innerHTML = "";
    uniqueUsers.forEach((user) => {
      const userCard = document.createElement("div");
      userCard.style.cssText = "display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-secondary); border-radius: var(--radius-md); cursor: pointer; transition: var(--transition);";
      userCard.innerHTML = `
        <img src="${user.photo || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"}" 
             alt="${user.name}" 
             style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;" />
        <span style="flex: 1; font-weight: 500;">${user.name}</span>
      `;
      userCard.addEventListener("mouseenter", () => (userCard.style.background = "var(--bg-tertiary)"));
      userCard.addEventListener("mouseleave", () => (userCard.style.background = "var(--bg-secondary)"));
      userCard.addEventListener("click", () => {
        viewUserProfile(user.id, user.name, user.photo);
        closeModal("usersModal");
      });
      usersList.appendChild(userCard);
    });
  }

  openModal("usersModal");
}

// ==============================
// ADMIN SYSTEM
// ==============================
function adminLogin() {
  const password = document.getElementById("adminPassword")?.value;
  if (password === "admin123") {
    isAdmin = true;
    closeModal("adminModal");
    if (document.getElementById("adminPassword")) document.getElementById("adminPassword").value = "";
    showNotification("Admin access granted!", { icon: "🔐" });
  } else {
    alert("Invalid password");
  }
}

// ==============================
// UTILITY FUNCTIONS
// ==============================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("active");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
}

function viewMedia(src, type) {
  const viewer = document.getElementById("mediaViewer");
  const container = document.getElementById("mediaViewerContainer");
  if (!viewer || !container) return;

  container.innerHTML = "";

  if (type === "image") {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "Image";
    container.appendChild(img);
  } else {
    const video = document.createElement("video");
    video.src = src;
    video.controls = true;
    video.style.maxWidth = "100%";
    video.style.maxHeight = "85vh";
    video.muted = true;
    container.appendChild(video);
  }

  viewer.classList.add("active");
}

function closeMediaViewer() {
  const viewer = document.getElementById("mediaViewer");
  const container = document.getElementById("mediaViewerContainer");
  if (viewer) viewer.classList.remove("active");
  if (container) container.innerHTML = "";
}

function setupMediaViewerClicks() {
  document.querySelectorAll(".message-media, .message-video").forEach((el) => {
    if (!el.hasClickListener) {
      el.hasClickListener = true;
      el.addEventListener("click", (e) => e.stopPropagation());
    }
  });
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`;
  return date.toLocaleDateString();
}

function scrollChatToBottom() {
  const chatBox = document.getElementById("chatBox");
  if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
}

function showNotification(title, options = {}) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, options);
  }
}

// ==============================
// CHAT STATISTICS & EXPORT
// ==============================
function getChatStats() {
  const users = new Set();
  const totalMessages = allMessages.length;
  let totalLikes = 0;

  allMessages.forEach((msg) => {
    users.add(msg.userId);
    totalLikes += msg.likes || 0;
  });

  return {
    totalMessages,
    uniqueUsers: users.size,
    totalLikes,
    averageLikesPerMessage: totalMessages ? (totalLikes / totalMessages).toFixed(2) : 0,
  };
}

// Expose to global for HTML buttons
window.exportChat = () => {
  const stats = getChatStats();
  const data = {
    messages: allMessages,
    statistics: stats,
    exportedAt: new Date().toISOString(),
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chat-export-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showNotification("Chat exported!", { icon: "📥" });
};

window.clearChat = () => {
  if (isAdmin && confirm("Clear all messages? This cannot be undone.")) {
    allMessages = [];
    remove(messagesRef).catch(console.error);
    renderMessages();
    showNotification("Chat cleared", { icon: "🗑️" });
  }
};
