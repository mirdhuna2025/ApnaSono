// chat.js — Modern Firebase Chat (Mirdhuna Chat • Full Admin Final 2026)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase, ref, push, onValue, update, remove, get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getStorage, ref as sRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

/* ===============================
   🔐 FIREBASE CONFIG (USE YOURS)
================================ */
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  databaseURL: "YOUR_DB_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

/* ===============================
   🧠 STATE
================================ */
let user = JSON.parse(localStorage.getItem("chatUser")) || null;
let replyToMsg = null;
let fileToSend = null;

/* ===============================
   🖼️ DOM ELEMENTS
================================ */
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
const photoBtn = document.getElementById("photoBtn");
const mediaPreview = document.getElementById("mediaPreview");
const previewContent = document.getElementById("previewContent");
const closePreview = document.getElementById("closePreview");
const uploadStatus = document.getElementById("uploadStatus");
const uploadText = document.getElementById("uploadText");
const refreshBtn = document.getElementById("refreshBtn");

/* ===============================
   📸 MEDIA SELECTION
================================ */
cameraBtn.onclick = () => cameraInput.click();
galleryBtn.onclick = () => galleryInput.click();

function handleFileSelect(file) {
  if (!file) return;
  fileToSend = file;
  previewContent.innerHTML = "";

  if (file.type.startsWith("image")) {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    previewContent.appendChild(img);
  } else if (file.type.startsWith("video")) {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(file);
    video.controls = true;
    previewContent.appendChild(video);
  }

  mediaPreview.style.display = "block";
}

cameraInput.onchange = (e) => handleFileSelect(e.target.files[0]);
galleryInput.onchange = (e) => handleFileSelect(e.target.files[0]);

closePreview.onclick = () => {
  mediaPreview.style.display = "none";
  previewContent.innerHTML = "";
  fileToSend = null;
};

if (photoBtn && photoInput) {
  photoBtn.onclick = () => photoInput.click();
}

/* ===============================
   👤 PROFILE SETUP
================================ */
document.getElementById("profileClose").onclick = () =>
  profilePopup.style.display = "none";

if (!user) profilePopup.style.display = "flex";
if (user?.photoURL) profileBtn.src = user.photoURL;

profileBtn.onclick = () => profilePopup.style.display = "flex";

document.getElementById("saveProfile").onclick = async () => {
  const name = nameInput.value.trim();
  if (!name) return alert("⚠️ Enter your name");

  let photoURL = user?.photoURL || "";

  if (photoInput.files[0]) {
    const file = photoInput.files[0];
    const path = `profiles/${Date.now()}_${file.name}`;
    const sref = sRef(storage, path);
    const uploadTask = uploadBytesResumable(sref, file);

    await new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        null,
        reject,
        async () => {
          photoURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve();
        }
      );
    });
  }

  user = { name, photoURL, isAdmin: false };
  localStorage.setItem("chatUser", JSON.stringify(user));
  profileBtn.src =
    photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${name}`;
  profilePopup.style.display = "none";
};

/* ===============================
   🔐 ADMIN LOGIN (PASSWORD: sanu0000)
================================ */
document.getElementById("adminClose").onclick = () =>
  adminPopup.style.display = "none";

adminBtn.onclick = () => adminPopup.style.display = "flex";

document.getElementById("adminLoginBtn").onclick = () => {
  if (adminPassInput.value === "sanu0000") {
    user = { name: "Admin", photoURL: "", isAdmin: true };
    localStorage.setItem("chatUser", JSON.stringify(user));
    adminPopup.style.display = "none";
    adminPanel.style.display = "block";
    alert("✅ Admin login successful!");
    loadAnalytics();
  } else {
    alert("❌ Wrong password.");
  }
};

/* ===============================
   🚫 BAN CHECK
================================ */
async function isBanned(username) {
  const snap = await get(ref(db, `bannedUsers/${username}`));
  return snap.exists();
}

/* ===============================
   ✉️ SEND MESSAGE
================================ */
document.getElementById("send").onclick = async () => {
  if (!user) return;

  if (await isBanned(user.name)) {
    alert("🚫 You are banned.");
    return;
  }

  const text = msgInput.value.trim();
  if (!text && !fileToSend) return;

  let mediaUrl = "";
  let mediaType = "";

  if (fileToSend) {
    const path = `uploads/${Date.now()}_${fileToSend.name}`;
    const sref = sRef(storage, path);
    const uploadTask = uploadBytesResumable(sref, fileToSend);

    uploadStatus.style.display = "flex";

    await new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          uploadText.innerText = `Uploading... ${progress}%`;
        },
        reject,
        async () => {
          mediaUrl = await getDownloadURL(uploadTask.snapshot.ref);
          mediaType = fileToSend.type;
          resolve();
        }
      );
    });

    uploadStatus.style.display = "none";
    mediaPreview.style.display = "none";
    fileToSend = null;
  }

  const newMsg = {
    user: user.name,
    photo: user.photoURL,
    isAdmin: user.isAdmin || false,
    text: text || "",
    mediaUrl,
    mediaType,
    timestamp: Date.now(),
    replies: {},
    likes: 0,
    dislikes: 0
  };

  await push(ref(db, "messages"), newMsg);
  msgInput.value = "";
};

/* ===============================
   👍👎 REACTIONS
================================ */
window.likeMessage = async (key) => {
  const snap = await get(ref(db, `messages/${key}`));
  if (!snap.exists()) return;
  const val = snap.val();
  await update(ref(db, `messages/${key}`), {
    likes: (val.likes || 0) + 1
  });
};

window.dislikeMessage = async (key) => {
  const snap = await get(ref(db, `messages/${key}`));
  if (!snap.exists()) return;
  const val = snap.val();
  await update(ref(db, `messages/${key}`), {
    dislikes: (val.dislikes || 0) + 1
  });
};

/* ===============================
   ✏️ EDIT MESSAGE (ADMIN)
================================ */
window.editMessage = async (key, oldText) => {
  if (!user?.isAdmin) return;
  const newText = prompt("Edit message:", oldText);
  if (newText === null) return;
  await update(ref(db, `messages/${key}`), { text: newText });
};

/* ===============================
   🗑️ DELETE MESSAGE + MEDIA
================================ */
window.deleteMessage = async (key) => {
  if (!user?.isAdmin) return;
  if (!confirm("Delete this message?")) return;

  const snap = await get(ref(db, `messages/${key}`));
  if (!snap.exists()) return;

  const msg = snap.val();

  if (msg.mediaUrl) {
    try {
      const fileRef = sRef(storage, msg.mediaUrl);
      await deleteObject(fileRef);
    } catch {}
  }

  await remove(ref(db, `messages/${key}`));
};

/* ===============================
   💬 REPLIES
================================ */
document.getElementById("replyClose").onclick = () => {
  replyPopup.style.display = "none";
  replyToMsg = null;
};

window.replyMessage = (key) => {
  replyToMsg = key;
  replyPopup.style.display = "flex";
};

document.getElementById("sendReply").onclick = async () => {
  if (!replyText.value.trim()) return;

  await push(ref(db, `messages/${replyToMsg}/replies`), {
    user: user.name,
    text: replyText.value.trim(),
    timestamp: Date.now()
  });

  replyPopup.style.display = "none";
  replyText.value = "";
};

/* ===============================
   🚫 BAN USER
================================ */
window.banUser = async (username) => {
  if (!user?.isAdmin) return;
  await update(ref(db, `bannedUsers/${username}`), true);
  alert(username + " banned!");
};

/* ===============================
   🧹 CLEAR CHAT
================================ */
window.clearChat = async () => {
  if (!user?.isAdmin) return;
  if (!confirm("Delete ALL messages?")) return;
  await remove(ref(db, "messages"));
};

/* ===============================
   📊 ANALYTICS
================================ */
async function loadAnalytics() {
  if (!user?.isAdmin) return;
  const snap = await get(ref(db, "messages"));
  const total = snap.exists() ? Object.keys(snap.val()).length : 0;
  console.log("📊 Total Messages:", total);
}

/* ===============================
   🎨 RENDER
================================ */
function renderMessages(data) {
  chatBox.innerHTML = "";
  const messages = data || {};

  const sorted = Object.entries(messages)
    .sort((a, b) => a[1].timestamp - b[1].timestamp);

  sorted.forEach(([key, msg]) => {
    const div = document.createElement("div");
    div.className = "message";

    let repliesHTML = "";
    if (msg.replies) {
      Object.entries(msg.replies).forEach(([rKey, r]) => {
        repliesHTML += `
          <div class="reply-inline">
            <strong>${r.user}</strong>: ${r.text}
            ${user?.isAdmin ? `<button onclick="deleteReply('${key}','${rKey}')">🗑️</button>` : ""}
          </div>`;
      });
    }

    div.innerHTML = `
      <div class="header">
        <img class="profile" src="${msg.photo}" />
        <strong>${msg.user}</strong>
        ${msg.isAdmin ? '<span class="admin-tag">Admin</span>' : ""}
      </div>
      <div>${msg.text || ""}</div>
      ${msg.mediaUrl ? `<img src="${msg.mediaUrl}" class="media-content"/>` : ""}
      <div>${new Date(msg.timestamp).toLocaleString()}</div>
      <button onclick="replyMessage('${key}')">💬</button>
      <button onclick="likeMessage('${key}')">👍 ${msg.likes || 0}</button>
      <button onclick="dislikeMessage('${key}')">👎 ${msg.dislikes || 0}</button>
      ${user?.isAdmin ? `
        <button onclick="editMessage('${key}', \`${msg.text || ""}\`)">✏️</button>
        <button onclick="deleteMessage('${key}')">🗑️</button>
        <button onclick="banUser('${msg.user}')">🚫</button>
      ` : ""}
      ${repliesHTML}
    `;

    chatBox.appendChild(div);
  });

  chatBox.scrollTop = chatBox.scrollHeight;
}

/* ===============================
   🔄 REALTIME LISTENER
================================ */
onValue(ref(db, "messages"), (snapshot) => {
  renderMessages(snapshot.val());
});

/* ===============================
   🔄 MANUAL REFRESH
================================ */
refreshBtn.onclick = async () => {
  const snapshot = await get(ref(db, "messages"));
  renderMessages(snapshot.val());
  alert("✅ Chat refreshed!");
};

/* ===============================
   INIT
================================ */
if (user?.isAdmin) {
  adminPanel.style.display = "block";
  loadAnalytics();
}
