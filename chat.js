// chat.js — Modern Firebase Chat (Mirdhuna Chat • Updated Full Version)

// ==============================
// Firebase Imports
// ==============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase, ref, push, onValue, update, remove, get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getStorage, ref as sRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ==============================
// Firebase Config
// ==============================
const firebaseConfig = {
  apiKey: "AIzaSyCPbOZwAZEMiC1LSDSgnSEPmSxQ7-pR2oQ",
  authDomain: "mirdhuna-25542.firebaseapp.com",
  databaseURL: "https://mirdhuna-25542-default-rtdb.firebaseio.com",
  projectId: "mirdhuna-25542",
  storageBucket: "mirdhuna-25542.appspot.com",
  messagingSenderId: "575924409876",
  appId: "1:575924409876:web:6ba1ed88ce941d9c83b901"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

// ==============================
// Avatar Helpers
// ==============================
const USER_AVATAR_STYLE = "thumbs";
const ADMIN_AVATAR_STYLE = "bottts-neutral";

function getAvatarUrl(name, style = USER_AVATAR_STYLE) {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(name || "user")}`;
}

const ADMIN_AVATAR = getAvatarUrl("admin", ADMIN_AVATAR_STYLE);

// ==============================
// State
// ==============================
let user = JSON.parse(localStorage.getItem("chatUser")) || null;
let replyToMsg = null;
let fileToSend = null;

// ==============================
// DOM Elements
// ==============================
const chatBox = document.getElementById("chatBox");
const msgInput = document.getElementById("msg");

const cameraInput = document.getElementById("cameraInput");
const galleryInput = document.getElementById("galleryInput");

const profileBtn = document.getElementById("profileBtn");
const profilePopup = document.getElementById("profilePopup");
const nameInput = document.getElementById("name");
const photoInput = document.getElementById("photo");

const adminPopup = document.getElementById("adminPopup");
const adminBtn = document.getElementById("adminBtn");
const adminPassInput = document.getElementById("adminPass");
const adminPanel = document.getElementById("adminPanel");

const replyPopup = document.getElementById("replyPopup");
const replyText = document.getElementById("replyText");

const mediaModal = document.getElementById("mediaModal");
const mediaContent = document.getElementById("mediaContent");

// ==============================
// Initial Profile Button
// ==============================
if (user) {
  profileBtn.src = user.photoURL || (user.isAdmin ? ADMIN_AVATAR : getAvatarUrl(user.name));
} else {
  profileBtn.src = getAvatarUrl("Guest");
  profilePopup.style.display = "flex";
}

// ==============================
// FILE INPUT FIX (NO JS CLICK)
// ==============================
cameraInput.addEventListener("change", e => {
  if (e.target.files && e.target.files[0]) {
    fileToSend = e.target.files[0];
  }
});

galleryInput.addEventListener("change", e => {
  if (e.target.files && e.target.files[0]) {
    fileToSend = e.target.files[0];
  }
});

// ==============================
// Profile Setup
// ==============================
document.getElementById("profileClose").onclick = () => {
  profilePopup.style.display = "none";
};

profileBtn.onclick = () => {
  profilePopup.style.display = "flex";
};

document.getElementById("saveProfile").onclick = async () => {
  const name = nameInput.value.trim();
  if (!name) return alert("⚠️ Please enter your name");

  let photoURL = user?.photoURL || "";

  if (photoInput.files[0]) {
    const file = photoInput.files[0];
    const path = `profiles/${Date.now()}_${file.name}`;
    const refImg = sRef(storage, path);
    await uploadBytes(refImg, file);
    photoURL = await getDownloadURL(refImg);
  }

  user = { name, photoURL, isAdmin: false };
  localStorage.setItem("chatUser", JSON.stringify(user));

  profileBtn.src = photoURL || getAvatarUrl(name);
  profilePopup.style.display = "none";
};

// ==============================
// Admin Login
// ==============================
document.getElementById("adminClose").onclick = () => {
  adminPopup.style.display = "none";
};

adminBtn.onclick = () => {
  adminPopup.style.display = "flex";
};

document.getElementById("adminLoginBtn").onclick = () => {
  if (adminPassInput.value === "sanu0000") {
    user = { name: "Admin", photoURL: ADMIN_AVATAR, isAdmin: true };
    localStorage.setItem("chatUser", JSON.stringify(user));
    adminPanel.style.display = "block";
    profileBtn.src = ADMIN_AVATAR;
    adminPopup.style.display = "none";
    alert("✅ Admin login successful!");
    renderMessages(lastSnapshot);
  } else {
    alert("❌ Wrong password");
  }
};

// ==============================
// Send Message
// ==============================
document.getElementById("send").onclick = async () => {
  if (!user) return profilePopup.style.display = "flex";

  const text = msgInput.value.trim();
  if (!text && !fileToSend) return;

  let mediaUrl = "", mediaType = "", mediaName = "";

  if (fileToSend) {
    const file = fileToSend;
    const path = `uploads/${Date.now()}_${file.name}`;
    const refFile = sRef(storage, path);
    await uploadBytes(refFile, file);
    mediaUrl = await getDownloadURL(refFile);
    mediaType = file.type;
    mediaName = file.name;

    fileToSend = null;
    cameraInput.value = "";
    galleryInput.value = "";
  }

  await push(ref(db, "messages"), {
    user: user.name,
    photo: user.isAdmin ? ADMIN_AVATAR : (user.photoURL || getAvatarUrl(user.name)),
    isAdmin: user.isAdmin || false,
    text,
    mediaUrl,
    mediaType,
    mediaName,
    timestamp: Date.now(),
    replies: {},
    likes: 0,
    dislikes: 0
  });

  msgInput.value = "";
};

// ==============================
// Reply System
// ==============================
window.replyMessage = key => {
  replyToMsg = key;
  replyPopup.style.display = "flex";
  replyText.value = "";
  replyText.focus();
};

document.getElementById("replyClose").onclick = () => {
  replyPopup.style.display = "none";
  replyToMsg = null;
};

document.getElementById("sendReply").onclick = async () => {
  if (!replyText.value.trim() || !replyToMsg) return;

  await push(ref(db, `messages/${replyToMsg}/replies`), {
    user: user.name,
    text: replyText.value.trim(),
    timestamp: Date.now()
  });

  replyPopup.style.display = "none";
  replyToMsg = null;
};

// ==============================
// Reactions
// ==============================
window.likeMessage = async key => {
  const r = ref(db, `messages/${key}`);
  const s = await get(r);
  if (s.exists()) await update(r, { likes: (s.val().likes || 0) + 1 });
};

window.dislikeMessage = async key => {
  const r = ref(db, `messages/${key}`);
  const s = await get(r);
  if (s.exists()) await update(r, { dislikes: (s.val().dislikes || 0) + 1 });
};

// ==============================
// Delete (Admin)
// ==============================
window.deleteMessage = async key => {
  if (!user?.isAdmin) return alert("🔒 Only admins can delete messages");
  if (!confirm("Delete this message?")) return;
  await remove(ref(db, `messages/${key}`));
};

// ==============================
// Media Modal
// ==============================
document.getElementById("mediaClose").onclick = () => {
  mediaModal.style.display = "none";
  mediaContent.innerHTML = "";
};

window.showMedia = (url, type) => {
  mediaContent.innerHTML = "";
  if (type?.startsWith("image")) {
    mediaContent.innerHTML = `<img src="${url}">`;
  } else if (type?.startsWith("video")) {
    mediaContent.innerHTML = `<video src="${url}" controls autoplay playsinline></video>`;
  }
  mediaModal.style.display = "flex";
};

// ==============================
// Timestamp Formatter
// ==============================
function formatTimestamp(ts) {
  if (!ts) return "Just now";
  return new Date(ts).toLocaleString("en-US", {
    hour12: true,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

// ==============================
// Render Messages
// ==============================
let lastSnapshot = {};

function renderMessages(data = {}) {
  lastSnapshot = data;
  chatBox.innerHTML = "";

  Object.entries(data)
    .sort((a, b) => a[1].timestamp - b[1].timestamp)
    .forEach(([key, msg]) => {

      let repliesHTML = "";
      if (msg.replies) {
        repliesHTML = `<div class="replies-section">`;
        Object.values(msg.replies).forEach(r => {
          repliesHTML += `<div class="reply-inline"><b>${r.user}</b>: ${r.text}</div>`;
        });
        repliesHTML += `</div>`;
      }

      const div = document.createElement("div");
      div.className = "message";
      div.innerHTML = `
        <div class="header">
          <img class="profile" src="${msg.photo || getAvatarUrl(msg.user)}">
          <div>
            <strong>${msg.user}</strong>
            ${msg.isAdmin ? `<span class="admin-tag">Admin</span>` : ""}
            <div class="meta">${formatTimestamp(msg.timestamp)}</div>
          </div>
        </div>

        ${msg.text ? `<div class="content">${msg.text}</div>` : ""}
        ${msg.mediaUrl ? `<img class="media-content" src="${msg.mediaUrl}" onclick="showMedia('${msg.mediaUrl}','${msg.mediaType}')">` : ""}
        ${repliesHTML}

        <div class="actions">
          <button onclick="replyMessage('${key}')">💬 Reply</button>
          <button onclick="likeMessage('${key}')">👍 ${msg.likes || 0}</button>
          <button onclick="dislikeMessage('${key}')">👎 ${msg.dislikes || 0}</button>
          ${user?.isAdmin ? `<button onclick="deleteMessage('${key}')">🗑️ Delete</button>` : ""}
        </div>
      `;
      chatBox.appendChild(div);
    });

  chatBox.scrollTop = chatBox.scrollHeight;
}

// ==============================
// Realtime Listener
// ==============================
onValue(ref(db, "messages"), snap => {
  renderMessages(snap.val() || {});
});

// ==============================
// Manual Refresh
// ==============================
document.getElementById("refreshBtn").onclick = async () => {
  const snap = await get(ref(db, "messages"));
  renderMessages(snap.val() || {});
  alert("✅ Chat refreshed");
};

// ==============================
// Admin Panel Visibility
// ==============================
if (user?.isAdmin) {
  adminPanel.style.display = "block";
}
