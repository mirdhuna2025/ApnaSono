// chat.js — Modern Firebase Chat (Mirdhuna Chat • Nov 21, 2025)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase, ref, push, onValue, update, remove, get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getStorage, ref as sRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// 🔐 Firebase Config (Same as yours)
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

// 🧠 State
let user = JSON.parse(localStorage.getItem("chatUser")) || null;
let replyToMsg = null;
let fileToSend = null;

// 🖼️ DOM Elements
const chatBox = document.getElementById("chatBox");
const msgInput = document.getElementById("msg");
const cameraBtn = document.getElementById("cameraBtn");
const galleryBtn = document.getElementById("galleryBtn");
const cameraInput = document.getElementById("cameraInput");
const galleryInput = document.getElementById("galleryInput");
const profilePopup = document.getElementById("profilePopup");
const profileBtn = document.getElementById("profileBtn");
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

// 📸 Media Selection
cameraBtn.onclick = () => cameraInput.click();
galleryBtn.onclick = () => galleryInput.click();

cameraInput.onchange = e => { if (e.target.files[0]) fileToSend = e.target.files[0]; };
galleryInput.onchange = e => { if (e.target.files[0]) fileToSend = e.target.files[0]; };

// 👤 Profile Setup
document.getElementById("profileClose").onclick = () => profilePopup.style.display = "none";
if (!user) profilePopup.style.display = "flex";
if (user?.photoURL) profileBtn.src = user.photoURL;

profileBtn.onclick = () => profilePopup.style.display = "flex";

document.getElementById("saveProfile").onclick = async () => {
  const name = nameInput.value.trim();
  if (!name) return alert("⚠️ Please enter your name");
  let photoURL = user?.photoURL || "";
  if (photoInput.files[0]) {
    try {
      const file = photoInput.files[0];
      const path = `profiles/${Date.now()}_${file.name}`;
      const sref = sRef(storage, path);
      await uploadBytes(sref, file);
      photoURL = await getDownloadURL(sref);
    } catch (err) {
      alert("❌ Failed to upload photo. Try again.");
      console.error(err);
      return;
    }
  }
  user = { name, photoURL, isAdmin: false };
  localStorage.setItem("chatUser", JSON.stringify(user));
  profilePopup.style.display = "none";
  profileBtn.src = photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${name}`;
  renderMessages(); // refresh UI
};

// 🔐 Admin Login
document.getElementById("adminClose").onclick = () => adminPopup.style.display = "none";
adminBtn.onclick = () => adminPopup.style.display = "flex";

document.getElementById("adminLoginBtn").onclick = () => {
  if (adminPassInput.value === "sanu0000") {
    user = { name: "Admin", photoURL: "", isAdmin: true };
    localStorage.setItem("chatUser", JSON.stringify(user));
    adminPopup.style.display = "none";
    adminPanel.style.display = "block";
    profileBtn.src = "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=admin";
    alert("✅ Admin login successful!");
    renderMessages(); // refresh to show delete buttons
  } else {
    alert("❌ Wrong password. Try again.");
  }
};

// ✉️ Send Message
document.getElementById("send").onclick = async () => {
  if (!user) {
    profilePopup.style.display = "flex";
    return;
  }

  const text = msgInput.value.trim();
  if (!text && !fileToSend) return;

  try {
    let mediaUrl = "", mediaType = "", mediaName = "";
    if (fileToSend) {
      const file = fileToSend;
      const path = `uploads/${Date.now()}_${file.name}`;
      const sref = sRef(storage, path);
      await uploadBytes(sref, file);
      mediaUrl = await getDownloadURL(sref);
      mediaType = file.type;
      mediaName = file.name;
      fileToSend = null;
      cameraInput.value = ""; galleryInput.value = "";
    }

    const newMsg = {
      user: user.name,
      photo: user.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.name}`,
      isAdmin: user.isAdmin || false,
      text: text || "",
      mediaUrl,
      mediaType,
      mediaName,
      timestamp: Date.now(),
      replies: {},
      likes: 0,
      dislikes: 0
    };

    await push(ref(db, "messages"), newMsg);
    msgInput.value = "";
  } catch (err) {
    alert("❌ Failed to send message. Check connection.");
    console.error(err);
  }
};

// 💬 Reply Handling
document.getElementById("replyClose").onclick = () => {
  replyPopup.style.display = "none";
  replyToMsg = null;
};

window.replyMessage = (key) => {
  replyToMsg = key;
  replyPopup.style.display = "flex";
  replyText.value = "";
  replyText.focus();
};

document.getElementById("sendReply").onclick = async () => {
  if (!replyText.value.trim() || !replyToMsg) return;
  try {
    const replyRef = ref(db, `messages/${replyToMsg}/replies`);
    await push(replyRef, {
      user: user.name,
      text: replyText.value.trim(),
      timestamp: Date.now()
    });
    replyPopup.style.display = "none";
    replyToMsg = null;
  } catch (err) {
    alert("❌ Failed to send reply.");
    console.error(err);
  }
};

// 👍👎 Reactions
window.likeMessage = async (key) => {
  try {
    const msgRef = ref(db, `messages/${key}`);
    const snap = await get(msgRef);
    if (!snap.exists()) return;
    const val = snap.val();
    await update(msgRef, { likes: (val.likes || 0) + 1 });
  } catch (err) { console.error(err); }
};

window.dislikeMessage = async (key) => {
  try {
    const msgRef = ref(db, `messages/${key}`);
    const snap = await get(msgRef);
    if (!snap.exists()) return;
    const val = snap.val();
    await update(msgRef, { dislikes: (val.dislikes || 0) + 1 });
  } catch (err) { console.error(err); }
};

// 🗑️ Delete (Admin only)
window.deleteMessage = async (key) => {
  if (!user?.isAdmin) return alert("🔒 Only admins can delete messages.");
  if (!confirm("⚠️ Are you sure you want to delete this message? This cannot be undone.")) return;
  try {
    await remove(ref(db, `messages/${key}`));
  } catch (err) {
    alert("❌ Delete failed.");
    console.error(err);
  }
};

// 🖼️ Media Modal
document.getElementById("mediaClose").onclick = () => {
  mediaModal.style.display = "none";
  mediaContent.innerHTML = "";
};

window.showMedia = (url, type) => {
  mediaContent.innerHTML = "";
  if (type?.startsWith("image")) {
    mediaContent.innerHTML = `<img src="${url}" alt="Shared media" />`;
  } else if (type?.startsWith("video")) {
    mediaContent.innerHTML = `<video src="${url}" controls autoplay playsinline></video>`;
  } else {
    mediaContent.innerHTML = `<p style="color:white">Unsupported media type</p>`;
  }
  mediaModal.style.display = "flex";
};

// 🕒 Format timestamp as "11/21/2025, 10:56:08 PM"
function formatTimestamp(ts) {
  if (!ts) return "Just now";
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).replace(",", ",");
}

// 🎨 Render Messages
function renderMessages(data) {
  if (!chatBox) return;
  chatBox.innerHTML = "";
  const messages = data || {};

  // Sort chronologically
  const sorted = Object.entries(messages).sort((a, b) => a[1].timestamp - b[1].timestamp);

  sorted.forEach(([key, msg]) => {
    const div = document.createElement("div");
    div.className = "message";

    // Build replies HTML
    let repliesHTML = "";
    if (msg.replies && Object.keys(msg.replies).length > 0) {
      repliesHTML = `<div class="replies-section"><strong>Replies:</strong>`;
      Object.values(msg.replies).forEach(r => {
        repliesHTML += `<div class="reply-inline"><strong>${r.user}</strong>: ${r.text}</div>`;
      });
      repliesHTML += `</div>`;
    }

    // Build media HTML
    let mediaHTML = "";
    if (msg.mediaUrl) {
      if (msg.mediaType?.startsWith("video")) {
        mediaHTML = `<video class="media-content" src="${msg.mediaUrl}" poster="${msg.mediaUrl.replace('.mp4', '.jpg')}" onclick="showMedia('${msg.mediaUrl}', '${msg.mediaType}')"></video>`;
      } else {
        mediaHTML = `<img class="media-content" src="${msg.mediaUrl}" alt="Shared" onclick="showMedia('${msg.mediaUrl}', '${msg.mediaType || 'image'}')"/>`;
      }
    }

    div.innerHTML = `
      <div class="header">
        <img class="profile" src="${msg.photo || 'https://api.dicebear.com/7.x/thumbs/svg?seed=' + (msg.user || 'user')}" alt="${msg.user}">
        <div>
          <div class="name-line">
            <strong>${msg.user || 'Anonymous'}</strong>
            ${msg.isAdmin ? '<span class="admin-tag">Admin</span>' : ''}
          </div>
          <div class="meta">${formatTimestamp(msg.timestamp)}</div>
        </div>
      </div>
      ${msg.text ? `<div class="content">${msg.text}</div>` : ''}
      ${mediaHTML}
      ${repliesHTML}
      <div class="actions">
        <button class="reply-btn" onclick="replyMessage('${key}')">💬 Reply</button>
        <button class="like-btn" onclick="likeMessage('${key}')">👍 ${msg.likes || 0}</button>
        <button class="dislike-btn" onclick="dislikeMessage('${key}')">👎 ${msg.dislikes || 0}</button>
        ${user?.isAdmin ? `<button class="delete-btn" onclick="deleteMessage('${key}')">🗑️ Delete</button>` : ''}
      </div>
    `;
    chatBox.appendChild(div);
  });

  // Auto-scroll to bottom
  setTimeout(() => {
    chatBox.scrollTop = chatBox.scrollHeight;
  }, 100);
}

// 🔄 Real-time listener
onValue(ref(db, "messages"), (snapshot) => {
  renderMessages(snapshot.val());
}, (error) => {
  console.error("Firebase sync error:", error);
  alert("⚠️ Connection issue. Try refreshing.");
});

// ♻️ Manual Refresh
document.getElementById("refreshBtn").onclick = async () => {
  try {
    const snapshot = await get(ref(db, "messages"));
    renderMessages(snapshot.val());
    alert("✅ Chat refreshed!");
  } catch (err) {
    alert("❌ Refresh failed. Check internet.");
    console.error(err);
  }
};

// ✅ Initial load
if (user?.isAdmin) adminPanel.style.display = "block";
