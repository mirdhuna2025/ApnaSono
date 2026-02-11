// ==================== FIREBASE IMPORTS (v10 MODULE) ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getDatabase,ref,push,onValue,update,remove,get} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {getStorage,ref as sRef,uploadBytes,getDownloadURL} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";






// ==================== FIREBASE CONFIG ====================
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

// ==================== INIT FIREBASE ====================

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);
firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();
const bucket = storage.ref();


// ==================== GLOBAL STATE ====================
let currentUser = {
  id: localStorage.getItem("userId") || generateUserId(),
  name: localStorage.getItem("userName") || "Anonymous",
  avatar: localStorage.getItem("userAvatar") || ""
};

let isAdmin = false;
let currentReplyToMessageId = null;
let replyGift = null;
let selectedMediaFile = null;

// ==================== INIT ====================
document.addEventListener("DOMContentLoaded", () => {
  loadUserProfile();
  loadMessages();
  setupKeyboardShortcuts();
  localStorage.setItem("userId", currentUser.id);
});

// ==================== UTILITY FUNCTIONS ====================
function generateUserId() {
  return "user_" + Math.random().toString(36).substr(2, 9);
}

function escapeHtml(text = "") {
  return text.replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

function formatTime(timestamp) {
  const d = new Date(timestamp);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function setupKeyboardShortcuts() {
  document.addEventListener("keydown", e => {
    if (e.ctrlKey && e.key === "a" && !isAdmin) {
      e.preventDefault();
      openAdminModal();
    }
    if (e.key === "Escape") closeAllModals();
  });
}

function closeAllModals() {
  ["profileModal","adminModal","replyModal","mediaModal"]
    .forEach(id => document.getElementById(id)?.classList.remove("active"));
}

// ==================== USER PROFILE ====================
function loadUserProfile() {
  document.getElementById("nameInput").value = currentUser.name;
  updateHeaderProfile();
}

function updateHeaderProfile() {
  document.getElementById("headerName").textContent = currentUser.name;

  if (currentUser.avatar) {
    document.getElementById("headerAvatar").src = currentUser.avatar;
    document.getElementById("profileInfo").style.display = "flex";
  }

  document.getElementById("adminBadgeContainer").innerHTML =
    isAdmin ? `<div class="admin-badge">🔐 ADMIN</div>` : "";
}

window.openProfileModal = () =>
  document.getElementById("profileModal").classList.add("active");

window.closeProfileModal = () =>
  document.getElementById("profileModal").classList.remove("active");

window.previewPhoto = e => {
  const file = e.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = ev =>
    document.getElementById("photoPreview").innerHTML =
      `<img src="${ev.target.result}" style="max-width:100%;border-radius:8px">`;
  r.readAsDataURL(file);
};

window.saveProfile = async () => {
  const name = document.getElementById("nameInput").value.trim();
  if (!name) return alert("Enter your name");

  currentUser.name = name;
  localStorage.setItem("userName", name);

  const photo = document.getElementById("photoInput").files[0];
  if (photo) {
    const refPath = sRef(storage, `profiles/${currentUser.id}/${photo.name}`);
    await uploadBytes(refPath, photo);
    currentUser.avatar = await getDownloadURL(refPath);
    localStorage.setItem("userAvatar", currentUser.avatar);
  }

  updateHeaderProfile();
  closeProfileModal();
};

// ==================== ADMIN ====================
function openAdminModal() {
  document.getElementById("adminModal").classList.add("active");
}

window.loginAdmin = () => {
  if (document.getElementById("adminPassword").value === "admin123") {
    isAdmin = true;
    updateHeaderProfile();
    closeAllModals();
    alert("Admin mode activated");
  } else alert("Wrong password");
};

window.deleteMessage = async id => {
  if (!isAdmin) return alert("Admin only");
  if (confirm("Delete this message?"))
    await remove(ref(db, `messages/${id}`));
};

// ==================== MESSAGES ====================
function loadMessages() {
  onValue(ref(db,"messages"), snap => {
    renderMessages(snap.val() || {});
  });
}

function renderMessages(messages) {
  const box = document.getElementById("messagesContainer");
  box.innerHTML = "";

  if (!Object.keys(messages).length) {
    box.innerHTML = `<div class="empty-state">No messages yet</div>`;
    return;
  }

  Object.entries(messages).forEach(([id,msg]) =>
    box.appendChild(createMessageElement(id,msg))
  );

  box.scrollTop = box.scrollHeight;
}

function createMessageElement(id,msg) {
  const d = document.createElement("div");
  d.className = "message";

  d.innerHTML = `
    <div class="message-content">
      <div class="message-header">
        <b>${escapeHtml(msg.name)}</b>
        <span>${formatTime(msg.timestamp)}</span>
      </div>
      <div>${escapeHtml(msg.text||"")}</div>
      ${msg.media ? `<img src="${msg.media}" style="max-width:280px">` : ""}
      ${msg.gift ? `<div class="message-gift">${msg.gift}</div>` : ""}
      <div class="message-actions">
        <button onclick="openReplyModal('${id}')">Reply</button>
        ${isAdmin ? `<button onclick="deleteMessage('${id}')">Delete</button>` : ""}
      </div>
    </div>`;
  return d;
}

// ==================== SEND MESSAGE ====================
window.handleMediaSelect = e => selectedMediaFile = e.target.files[0];

window.sendMessage = async () => {
  const text = document.getElementById("messageInput").value.trim();
  if (!text && !selectedMediaFile) return alert("Empty");

  let media=null, mediaType=null;
  if (selectedMediaFile) {
    const r = sRef(storage, `messages/${Date.now()}_${selectedMediaFile.name}`);
    await uploadBytes(r, selectedMediaFile);
    media = await getDownloadURL(r);
    mediaType = selectedMediaFile.type;
  }

  await push(ref(db,"messages"),{
    userId: currentUser.id,
    name: currentUser.name,
    avatar: currentUser.avatar,
    text,
    media,
    mediaType,
    timestamp: Date.now(),
    replies:{}
  });

  document.getElementById("messageInput").value="";
  document.getElementById("mediaInput").value="";
  selectedMediaFile=null;
};

// ==================== REPLIES ====================
window.openReplyModal = async id => {
  currentReplyToMessageId=id;
  const snap = await get(ref(db,`messages/${id}`));
  document.getElementById("replyPreview").innerHTML =
    `<b>${escapeHtml(snap.val().name)}</b>: ${escapeHtml(snap.val().text)}`;
  document.getElementById("replyModal").classList.add("active");
};

window.setReplyGift = e => replyGift = e;

window.submitReply = async () => {
  const text = document.getElementById("replyInput").value.trim();
  if (!text && !replyGift) return alert("Empty reply");

  await push(ref(db,`messages/${currentReplyToMessageId}/replies`),{
    userId: currentUser.id,
    name: currentUser.name,
    avatar: currentUser.avatar,
    text,
    gift: replyGift,
    timestamp: Date.now()
  });

  closeAllModals();
  document.getElementById("replyInput").value="";
  replyGift=null;
};

// ==================== MEDIA MODAL ====================
window.openMediaModal = (src,type) => {
  const c = document.getElementById("mediaContent");
  c.innerHTML = type==="image"
    ? `<img src="${src}" style="max-width:90vw">`
    : `<video src="${src}" controls style="max-width:90vw"></video>`;
  document.getElementById("mediaModal").classList.add("active");
};

window.closeMediaModal = () => closeAllModals();
