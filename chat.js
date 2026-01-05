// chat.js — Mirdhuna Chat (Clean Version • Jan 5, 2026)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase, ref, push, onValue, update, remove, get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getStorage, ref as sRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

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

function getAvatarUrl(name, style = "thumbs") {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(name || 'user')}`;
}
const ADMIN_AVATAR = getAvatarUrl("admin", "bottts-neutral");

let user = JSON.parse(localStorage.getItem("chatUser")) || null;

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
const choosePhotoBtn = document.getElementById("choosePhotoBtn");
const photoPreview = document.getElementById("photoPreview");
const adminPopup = document.getElementById("adminPopup");
const adminBtn = document.getElementById("adminBtn");
const adminPassInput = document.getElementById("adminPass");
const adminPanel = document.getElementById("adminPanel");
const replyPopup = document.getElementById("replyPopup");
const replyText = document.getElementById("replyText");
const mediaModal = document.getElementById("mediaModal");
const mediaContent = document.getElementById("mediaContent");

if (user) {
  profileBtn.src = user.photoURL || (user.isAdmin ? ADMIN_AVATAR : getAvatarUrl(user.name));
} else {
  profileBtn.src = getAvatarUrl("Guest");
}

let replyToMsg = null;
let fileToSend = null;

cameraBtn.onclick = () => cameraInput.click();
galleryBtn.onclick = () => galleryInput.click();
cameraInput.onchange = e => { if (e.target.files[0]) fileToSend = e.target.files[0]; };
galleryInput.onchange = e => { if (e.target.files[0]) fileToSend = e.target.files[0]; };

if (choosePhotoBtn) choosePhotoBtn.onclick = () => photoInput.click();

photoInput.onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = ev => photoPreview.innerHTML = `<img src="${ev.target.result}" />`;
    reader.readAsDataURL(file);
  } else photoPreview.innerHTML = "";
};

document.getElementById("profileClose").onclick = () => profilePopup.style.display = "none";
if (!user) profilePopup.style.display = "flex";
profileBtn.onclick = () => profilePopup.style.display = "flex";

document.getElementById("saveProfile").onclick = async () => {
  const name = nameInput.value.trim();
  if (!name) return alert("⚠️ Please enter your name");
  let photoURL = user?.photoURL || "";
  if (photoInput.files[0]) {
    try {
      const file = photoInput.files[0];
      const sref = sRef(storage, `profiles/${Date.now()}_${file.name}`);
      await uploadBytes(sref, file);
      photoURL = await getDownloadURL(sref);
    } catch (err) {
      alert("❌ Photo upload failed.");
      return;
    }
  }
  user = { name, photoURL, isAdmin: false };
  localStorage.setItem("chatUser", JSON.stringify(user));
  profilePopup.style.display = "none";
  profileBtn.src = photoURL || getAvatarUrl(name);
  renderMessages();
};

document.getElementById("adminClose")?.onclick = () => adminPopup.style.display = "none";
adminBtn?.onclick = () => adminPopup.style.display = "flex";
document.getElementById("adminLoginBtn")?.onclick = () => {
  if (adminPassInput.value === "sanu0000") {
    user = { name: "Admin", photoURL: ADMIN_AVATAR, isAdmin: true };
    localStorage.setItem("chatUser", JSON.stringify(user));
    adminPopup.style.display = "none";
    adminPanel.style.display = "block";
    profileBtn.src = ADMIN_AVATAR;
    alert("✅ Admin login successful!");
    renderMessages();
  } else alert("❌ Wrong password.");
};

document.getElementById("send").onclick = async () => {
  if (!user) return profilePopup.style.display = "flex";
  const text = msgInput.value.trim();
  if (!text && !fileToSend) return;
  try {
    let mediaUrl = "", mediaType = "", mediaName = "";
    if (fileToSend) {
      const file = fileToSend;
      const sref = sRef(storage, `uploads/${Date.now()}_${file.name}`);
      await uploadBytes(sref, file);
      mediaUrl = await getDownloadURL(sref);
      mediaType = file.type;
      mediaName = file.name;
      fileToSend = null;
      cameraInput.value = ""; galleryInput.value = "";
    }
    const userPhoto = user.photoURL || (user.isAdmin ? ADMIN_AVATAR : getAvatarUrl(user.name));
    await push(ref(db, "messages"), {
      user: user.name,
      photo: userPhoto,
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
    alert("❌ Message failed.");
  }
};

document.getElementById("replyClose")?.onclick = () => {
  replyPopup.style.display = "none"; replyToMsg = null;
};
window.replyMessage = (key) => {
  replyToMsg = key; replyPopup.style.display = "flex"; replyText.value = ""; replyText.focus();
};
document.getElementById("sendReply")?.onclick = async () => {
  if (!replyText.value.trim() || !replyToMsg) return;
  await push(ref(db, `messages/${replyToMsg}/replies`), {
    user: user.name, text: replyText.value.trim(), timestamp: Date.now()
  });
  replyPopup.style.display = "none"; replyToMsg = null;
};

window.likeMessage = async (key) => {
  const snap = await get(ref(db, `messages/${key}`));
  if (snap.exists()) await update(ref(db, `messages/${key}`), { likes: (snap.val().likes || 0) + 1 });
};
window.dislikeMessage = async (key) => {
  const snap = await get(ref(db, `messages/${key}`));
  if (snap.exists()) await update(ref(db, `messages/${key}`), { dislikes: (snap.val().dislikes || 0) + 1 });
};

window.deleteMessage = async (key) => {
  if (!user?.isAdmin) return alert("🔒 Admin only.");
  if (confirm("⚠️ Delete this message?")) await remove(ref(db, `messages/${key}`));
};

document.getElementById("mediaClose")?.onclick = () => {
  mediaModal.style.display = "none"; mediaContent.innerHTML = "";
};
window.showMedia = (url, type) => {
  mediaContent.innerHTML = type?.startsWith("image")
    ? `<img src="${url}" />`
    : type?.startsWith("video")
    ? `<video src="${url}" controls autoplay playsinline></video>`
    : `<p style="color:white">Unsupported</p>`;
  mediaModal.style.display = "flex";
};

function formatTimestamp(ts) {
  return ts ? new Date(ts).toLocaleString("en-US", {
    month: "2-digit", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true
  }) : "Just now";
}

function renderMessages(data) {
  if (!chatBox) return;
  chatBox.innerHTML = "";
  const messages = data || {};
  const sorted = Object.entries(messages).sort((a, b) => a[1].timestamp - b[1].timestamp);
  sorted.forEach(([key, msg]) => {
    const avatar = msg.photo || getAvatarUrl(msg.user);
    const repliesHTML = msg.replies ? Object.values(msg.replies).map(r =>
      `<div class="reply-inline"><strong>${r.user}</strong>: ${r.text}</div>`
    ).join("") : "";
    const mediaHTML = msg.mediaUrl ? (
      msg.mediaType?.startsWith("video")
        ? `<video class="media-content" src="${msg.mediaUrl}" onclick="showMedia('${msg.mediaUrl}', '${msg.mediaType}')"></video>`
        : `<img class="media-content" src="${msg.mediaUrl}" onclick="showMedia('${msg.mediaUrl}', 'image')"/>`
    ) : "";
    const div = document.createElement("div");
    div.className = "message";
    div.innerHTML = `
      <div class="header">
        <img class="profile" src="${avatar}" alt="${msg.user || 'User'}">
        <div>
          <div class="name-line"><strong>${msg.user || 'Anonymous'}</strong>${msg.isAdmin ? '<span class="admin-tag">Admin</span>' : ''}</div>
          <div class="meta">${formatTimestamp(msg.timestamp)}</div>
        </div>
      </div>
      ${msg.text ? `<div class="content">${msg.text}</div>` : ''}
      ${mediaHTML}
      ${repliesHTML ? `<div class="replies-section"><strong>Replies:</strong>${repliesHTML}</div>` : ''}
      <div class="actions">
        <button class="reply-btn" onclick="replyMessage('${key}')">💬 Reply</button>
        <button class="like-btn" onclick="likeMessage('${key}')">👍 ${msg.likes || 0}</button>
        <button class="dislike-btn" onclick="dislikeMessage('${key}')">👎 ${msg.dislikes || 0}</button>
        ${user?.isAdmin ? `<button class="delete-btn" onclick="deleteMessage('${key}')">🗑️ Delete</button>` : ''}
      </div>
    `;
    chatBox.appendChild(div);
  });
  setTimeout(() => chatBox.scrollTop = chatBox.scrollHeight, 100);
}

onValue(ref(db, "messages"), snap => renderMessages(snap.val()), err => {
  console.error("Firebase error:", err);
  alert("⚠️ Connection issue.");
});

document.getElementById("refreshBtn")?.onclick = async () => {
  try {
    const snap = await get(ref(db, "messages"));
    renderMessages(snap.val());
    alert("✅ Refreshed!");
  } catch (e) {
    alert("❌ Refresh failed.");
  }
};

if (user?.isAdmin) adminPanel.style.display = "block";
