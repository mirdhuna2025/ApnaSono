// chat.js — Modern Firebase Chat (Mirdhuna Chat • Nov 21, 2025)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase, ref, push, onValue, update, remove, get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getStorage, ref as sRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// 🔐 Firebase Config (UNCHANGED)
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

      // ✅ FIX: sanitize filename (CORS + Unicode safe)
      const safeName = file.name
        .replace(/\s+/g, "_")
        .replace(/[^\w.-]/g, "");

      const path = `profiles/${Date.now()}_${safeName}`;
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
  } else {
    alert("❌ Wrong password. Try again.");
  }
};

// ✉️ Send Message
document.getElementById("send").onclick = async () => {
  if (!user) return profilePopup.style.display = "flex";

  const text = msgInput.value.trim();
  if (!text && !fileToSend) return;

  try {
    let mediaUrl = "", mediaType = "", mediaName = "";

    if (fileToSend) {
      const file = fileToSend;

      // ✅ FIX: sanitize filename
      const safeName = file.name
        .replace(/\s+/g, "_")
        .replace(/[^\w.-]/g, "");

      const path = `uploads/${Date.now()}_${safeName}`;
      const sref = sRef(storage, path);

      await uploadBytes(sref, file);
      mediaUrl = await getDownloadURL(sref);
      mediaType = file.type;
      mediaName = safeName;

      fileToSend = null;
      cameraInput.value = "";
      galleryInput.value = "";
    }

    await push(ref(db, "messages"), {
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
    });

    msgInput.value = "";
  } catch (err) {
    alert("❌ Failed to send message.");
    console.error(err);
  }
};

// 💬 Replies
window.replyMessage = key => {
  replyToMsg = key;
  replyPopup.style.display = "flex";
  replyText.value = "";
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

// 👍👎 Reactions
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

// 🗑️ Delete
window.deleteMessage = async key => {
  if (!user?.isAdmin) return alert("Admins only");
  if (!confirm("Delete message permanently?")) return;
  await remove(ref(db, `messages/${key}`));
};

// 🖼️ Media Viewer
window.showMedia = (url, type) => {
  mediaContent.innerHTML = "";
  mediaContent.innerHTML = type?.startsWith("video")
    ? `<video src="${url}" controls autoplay></video>`
    : `<img src="${url}" />`;
  mediaModal.style.display = "flex";
};

document.getElementById("mediaClose").onclick = () => {
  mediaModal.style.display = "none";
  mediaContent.innerHTML = "";
};

// 🕒 Time
function formatTimestamp(ts) {
  return new Date(ts).toLocaleString("en-US", {
    month: "2-digit", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: true
  });
}

// 🎨 Render Messages
function renderMessages(data = {}) {
  chatBox.innerHTML = "";

  Object.entries(data)
    .sort((a, b) => a[1].timestamp - b[1].timestamp)
    .forEach(([key, msg]) => {
      const div = document.createElement("div");
      div.className = "message";
      div.innerHTML = `
        <strong>${msg.user}</strong>
        <div>${msg.text || ""}</div>
        ${msg.mediaUrl ? `<img src="${msg.mediaUrl}" onclick="showMedia('${msg.mediaUrl}','${msg.mediaType}')">` : ""}
        <small>${formatTimestamp(msg.timestamp)}</small>
        <div>
          <button onclick="replyMessage('${key}')">Reply</button>
          <button onclick="likeMessage('${key}')">👍 ${msg.likes}</button>
          <button onclick="dislikeMessage('${key}')">👎 ${msg.dislikes}</button>
          ${user?.isAdmin ? `<button onclick="deleteMessage('${key}')">Delete</button>` : ""}
        </div>
      `;
      chatBox.appendChild(div);
    });

  chatBox.scrollTop = chatBox.scrollHeight;
}

// 🔄 Live Sync
onValue(ref(db, "messages"), s => renderMessages(s.val()));

// ♻️ Refresh
document.getElementById("refreshBtn").onclick = async () => {
  const s = await get(ref(db, "messages"));
  renderMessages(s.val());
};

// ✅ Admin panel
if (user?.isAdmin) adminPanel.style.display = "block";

