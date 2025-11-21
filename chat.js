// chat.js — *Ultra-Attractive* Firebase Chat (Sanu’s Version ✨)
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

// 🧠 State
let user = JSON.parse(localStorage.getItem("chatUser")) || null;
let replyToMsg = null;
let fileToSend = null;

// 🌐 Elements
const chatBox = document.getElementById("chatBox");
const msgInput = document.getElementById("msg");
const profileModal = document.getElementById("profileModal");
const profileBtn = document.getElementById("profileBtn");
const avatarPreview = document.getElementById("avatarPreview");
const nameInput = document.getElementById("nameInput");
const photoInput = document.getElementById("photoInput");
const dropZone = document.getElementById("dropZone");
const statusIndicator = document.getElementById("statusIndicator");
const profileTrigger = document.getElementById("profileTrigger");

// ✅ Set initial UI based on user
function updateUserUI() {
  if (!user) {
    profileModal.style.display = "flex";
    profileBtn.src = "https://api.dicebear.com/7.x/thumbs/svg?seed=default";
    statusIndicator.className = "status-indicator";
    return;
  }

  profileBtn.src = user.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.name}`;
  statusIndicator.className = "status-indicator " + (user.isAdmin ? "admin" : "");
  if (user.isAdmin) {
    document.getElementById("adminPanel").style.display = "block";
  }
}

// 📸 Handle photo selection (click or drag-drop)
photoInput.addEventListener("change", previewPhoto);
dropZone.addEventListener("click", () => photoInput.click());

// Drag & Drop
dropZone.addEventListener("dragover", e => {
  e.preventDefault();
  dropZone.style.borderColor = "#7e22ce";
  dropZone.style.backgroundColor = "#f0f9ff";
});

dropZone.addEventListener("dragleave", () => {
  dropZone.style.borderColor = "#cbd5e1";
  dropZone.style.backgroundColor = "";
});

dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.style.borderColor = "#cbd5e1";
  dropZone.style.backgroundColor = "";
  if (e.dataTransfer.files.length) {
    photoInput.files = e.dataTransfer.files;
    previewPhoto();
  }
});

function previewPhoto() {
  const file = photoInput.files[0];
  if (!file) return;
  if (!file.type.match("image.*")) {
    alert("⚠️ Please select an image file (JPG, PNG, GIF).");
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    avatarPreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
  };
  reader.readAsDataURL(file);
}

// 👤 Profile Save
document.getElementById("profileClose").onclick = () => profileModal.style.display = "none";
profileTrigger.onclick = () => {
  if (user) {
    // Pre-fill modal
    nameInput.value = user.name || "";
    avatarPreview.innerHTML = user.photoURL ?
      `<img src="${user.photoURL}" alt="Current">` :
      `<span>📷</span>`;
    photoInput.value = "";
  }
  profileModal.style.display = "flex";
};

document.getElementById("saveProfileBtn").onclick = async () => {
  const name = nameInput.value.trim();
  if (!name) return alert("⚠️ Name is required!");

  let photoURL = user?.photoURL || "";
  const file = photoInput.files[0];

  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      return alert("❌ Image too large! Max 5MB.");
    }
    try {
      const path = `profiles/${Date.now()}_${file.name}`;
      const sref = sRef(storage, path);
      await uploadBytes(sref, file);
      photoURL = await getDownloadURL(sref);
    } catch (err) {
      console.error("Upload failed:", err);
      return alert("❌ Failed to upload photo. Try again.");
    }
  }

  user = { name, photoURL, isAdmin: user?.isAdmin || false };
  localStorage.setItem("chatUser", JSON.stringify(user));
  updateUserUI();
  profileModal.style.display = "none";
  renderMessages(); // refresh
};

// 🔐 Admin
document.getElementById("adminClose").onclick = () => document.getElementById("adminModal").style.display = "none";
document.getElementById("adminBtn").onclick = () => document.getElementById("adminModal").style.display = "flex";

document.getElementById("adminLoginBtn").onclick = () => {
  if (document.getElementById("adminPass").value === "sanu0000") {
    user = { name: "Admin", photoURL: "", isAdmin: true };
    localStorage.setItem("chatUser", JSON.stringify(user));
    document.getElementById("adminModal").style.display = "none";
    updateUserUI();
    alert("✅ Welcome, Admin!");
  } else {
    alert("❌ Wrong password!");
  }
};

// 📤 Send
document.getElementById("send").onclick = async () => {
  if (!user) return profileModal.style.display = "flex";
  const text = msgInput.value.trim();
  if (!text && !fileToSend) return;

  try {
    let mediaUrl = "", mediaType = "";
    if (fileToSend) {
      const path = `uploads/${Date.now()}_${fileToSend.name}`;
      const sref = sRef(storage, path);
      await uploadBytes(sref, fileToSend);
      mediaUrl = await getDownloadURL(sref);
      mediaType = fileToSend.type;
      fileToSend = null;
    }

    await push(ref(db, "messages"), {
      user: user.name,
      photo: user.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.name}`,
      isAdmin: !!user.isAdmin,
      text,
      mediaUrl,
      mediaType,
      timestamp: Date.now(),
      replies: {},
      likes: 0,
      dislikes: 0
    });
    msgInput.value = "";
    document.getElementById("cameraInput").value = "";
    document.getElementById("galleryInput").value = "";
  } catch (err) {
    alert("❌ Message failed. Check connection.");
    console.error(err);
  }
};

// 📷 Media
document.getElementById("cameraBtn").onclick = () => document.getElementById("cameraInput").click();
document.getElementById("galleryBtn").onclick = () => document.getElementById("galleryInput").click();
["cameraInput", "galleryInput"].forEach(id => {
  document.getElementById(id).onchange = e => {
    if (e.target.files[0]) fileToSend = e.target.files[0];
  };
});

// 💬 Reply
document.getElementById("replyClose").onclick = () => {
  document.getElementById("replyModal").style.display = "none";
  replyToMsg = null;
};

window.replyMessage = key => {
  replyToMsg = key;
  document.getElementById("replyModal").style.display = "flex";
  document.getElementById("replyText").value = "";
  document.getElementById("replyText").focus();
};

document.getElementById("sendReplyBtn").onclick = async () => {
  const text = document.getElementById("replyText").value.trim();
  if (!text || !replyToMsg) return;
  try {
    await push(ref(db, `messages/${replyToMsg}/replies`), {
      user: user.name,
      text,
      timestamp: Date.now()
    });
    document.getElementById("replyModal").style.display = "none";
    replyToMsg = null;
  } catch (err) {
    alert("❌ Reply failed.");
  }
};

// 👍👎
window.likeMessage = async key => {
  const msgRef = ref(db, `messages/${key}`);
  const snap = await get(msgRef);
  if (snap.exists()) await update(msgRef, { likes: (snap.val().likes || 0) + 1 });
};

window.dislikeMessage = async key => {
  const msgRef = ref(db, `messages/${key}`);
  const snap = await get(msgRef);
  if (snap.exists()) await update(msgRef, { dislikes: (snap.val().dislikes || 0) + 1 });
};

// 🗑️
window.deleteMessage = async key => {
  if (!user?.isAdmin) return alert("🔒 Admin only!");
  if (confirm("⚠️ Delete this message?")) {
    await remove(ref(db, `messages/${key}`));
  }
};

// 🖼️
document.getElementById("mediaClose").onclick = () => {
  document.getElementById("mediaModal").style.display = "none";
  document.getElementById("mediaContent").innerHTML = "";
};

window.showMedia = (url, type) => {
  const el = document.getElementById("mediaContent");
  el.innerHTML = type?.startsWith("video") ?
    `<video src="${url}" controls autoplay playsinline></video>` :
    `<img src="${url}" alt="Media">`;
  document.getElementById("mediaModal").style.display = "flex";
};

// 🕒 Format: "11/21/2025, 10:56:08 PM"
const formatTimestamp = ts => {
  return new Date(ts).toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).replace(",", ",");
};

// 🎨 Render
function renderMessages(data = {}) {
  chatBox.innerHTML = "";
  Object.entries(data).sort((a, b) => a[1].timestamp - b[1].timestamp).forEach(([key, msg]) => {
    const div = document.createElement("div");
    div.className = "message";

    let repliesHTML = "";
    if (msg.replies && Object.keys(msg.replies).length) {
      repliesHTML = `<div class="replies-section"><strong>Replies:</strong>`;
      Object.values(msg.replies).forEach(r => {
        repliesHTML += `<div class="reply-bubble"><strong>${r.user}</strong>: ${r.text}</div>`;
      });
      repliesHTML += `</div>`;
    }

    let mediaHTML = "";
    if (msg.mediaUrl) {
      mediaHTML = msg.mediaType?.startsWith("video") ?
        `<video class="media-content" src="${msg.mediaUrl}" onclick="showMedia('${msg.mediaUrl}', '${msg.mediaType}')"></video>` :
        `<img class="media-content" src="${msg.mediaUrl}" onclick="showMedia('${msg.mediaUrl}', '${msg.mediaType || 'image'}')"/>`;
    }

    div.innerHTML = `
      <div class="header">
        <div class="avatar">
          <img src="${msg.photo || 'https://api.dicebear.com/7.x/thumbs/svg?seed=' + (msg.user || 'user')}" alt="${msg.user}">
        </div>
        <div class="user-info">
          <div class="name-line">
            ${msg.user}
            <span class="badge ${msg.isAdmin ? 'admin-badge' : 'user-badge'}">
              ${msg.isAdmin ? 'Admin' : 'Member'}
            </span>
          </div>
          <div class="timestamp">${formatTimestamp(msg.timestamp)}</div>
        </div>
      </div>
      ${msg.text ? `<div class="content">${msg.text}</div>` : ''}
      ${mediaHTML}
      ${repliesHTML}
      <div class="actions">
        <button class="action-btn reply-btn" onclick="replyMessage('${key}')">💬 Reply</button>
        <button class="action-btn like-btn" onclick="likeMessage('${key}')">👍 ${msg.likes || 0}</button>
        <button class="action-btn dislike-btn" onclick="dislikeMessage('${key}')">👎 ${msg.dislikes || 0}</button>
        ${user?.isAdmin ? `<button class="action-btn delete-btn" onclick="deleteMessage('${key}')">🗑️ Delete</button>` : ''}
      </div>
    `;
    chatBox.appendChild(div);
  });

  // Auto-scroll
  setTimeout(() => chatBox.scrollTop = chatBox.scrollHeight, 50);
}

// 🔄 Real-time & Manual
onValue(ref(db, "messages"), snap => renderMessages(snap.val()));

document.getElementById("refreshBtn").onclick = async () => {
  const snap = await get(ref(db, "messages"));
  renderMessages(snap.val());
  alert("✅ Chat refreshed!");
};

// 🚀 Init
updateUserUI();
