// chat.js — Modern Firebase Chat (Mirdhuna Chat • Fixed Media Picker)

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
let fileToSend = null;
let replyToMsg = null;

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

const adminBtn = document.getElementById("adminBtn");
const adminPopup = document.getElementById("adminPopup");
const adminPassInput = document.getElementById("adminPass");
const adminPanel = document.getElementById("adminPanel");

const replyPopup = document.getElementById("replyPopup");
const replyText = document.getElementById("replyText");

const mediaModal = document.getElementById("mediaModal");
const mediaContent = document.getElementById("mediaContent");

// ==============================
// Initial Profile Image
// ==============================
if (user) {
  profileBtn.src = user.photoURL || (user.isAdmin ? ADMIN_AVATAR : getAvatarUrl(user.name));
} else {
  profileBtn.src = getAvatarUrl("Guest");
  profilePopup.style.display = "flex";
}

// ==============================
// FILE INPUT (FIXED – MOBILE SAFE)
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
// Profile
// ==============================
document.getElementById("profileClose").onclick = () => {
  profilePopup.style.display = "none";
};

profileBtn.onclick = () => {
  profilePopup.style.display = "flex";
};

document.getElementById("saveProfile").onclick = async () => {
  const name = nameInput.value.trim();
  if (!name) return alert("Please enter your name");

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
    alert("Admin logged in");
  } else {
    alert("Wrong password");
  }
};

// ==============================
// SEND MESSAGE (TEXT + MEDIA)
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
    likes: 0,
    dislikes: 0
  });

  msgInput.value = "";
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
  if (!user?.isAdmin) return alert("Admin only");
  if (!confirm("Delete message?")) return;
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
  if (type.startsWith("image")) {
    mediaContent.innerHTML = `<img src="${url}">`;
  } else if (type.startsWith("video")) {
    mediaContent.innerHTML = `<video src="${url}" controls autoplay></video>`;
  }
  mediaModal.style.display = "flex";
};

// ==============================
// Render Messages
// ==============================
function renderMessages(data = {}) {
  chatBox.innerHTML = "";

  Object.entries(data)
    .sort((a, b) => a[1].timestamp - b[1].timestamp)
    .forEach(([key, msg]) => {
      const div = document.createElement("div");
      div.className = "message";

      div.innerHTML = `
        <div class="header">
          <img class="profile" src="${msg.photo}">
          <div>
            <strong>${msg.user}</strong>
            ${msg.isAdmin ? "<span class='admin-tag'>Admin</span>" : ""}
            <div class="meta">${new Date(msg.timestamp).toLocaleString()}</div>
          </div>
        </div>
        ${msg.text ? `<div class="content">${msg.text}</div>` : ""}
        ${msg.mediaUrl ? `<img class="media-content" src="${msg.mediaUrl}" onclick="showMedia('${msg.mediaUrl}','${msg.mediaType}')">` : ""}
        <div class="actions">
          <button onclick="likeMessage('${key}')">👍 ${msg.likes || 0}</button>
          <button onclick="dislikeMessage('${key}')">👎 ${msg.dislikes || 0}</button>
          ${user?.isAdmin ? `<button onclick="deleteMessage('${key}')">🗑️</button>` : ""}
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
  renderMessages(snap.val());
});
