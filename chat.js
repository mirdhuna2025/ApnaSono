// chat.js — Modern Firebase Chat (Mirdhuna Chat • Nov 21, 2025)

// 🔧 Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase, ref, push, onValue, get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getStorage, ref as sRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

document.addEventListener("DOMContentLoaded", () => {

  // 🔐 Firebase Config
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
  let giftToSend = null;

  // 🖼️ DOM
  const chatBox = document.getElementById("chatBox");
  const msgInput = document.getElementById("msg");
  const cameraBtn = document.getElementById("cameraBtn");
  const galleryBtn = document.getElementById("galleryBtn");
  const cameraInput = document.getElementById("cameraInput");
  const galleryInput = document.getElementById("galleryInput");
  const profilePopup = document.getElementById("profilePopup");
  const headerProfile = document.getElementById("profileBtn");
  const nameInput = document.getElementById("name");
  const photoInput = document.getElementById("photo");
  const adminPopup = document.getElementById("adminPopup");
  const adminBtn = document.getElementById("adminBtn");
  const adminPassInput = document.getElementById("adminPass");
  const replyPopup = document.getElementById("replyPopup");
  const replyText = document.getElementById("replyText");
  const mediaModal = document.getElementById("mediaModal");
  const mediaContent = document.getElementById("mediaContent");

  // 📸 Media Buttons
  if (cameraBtn && cameraInput) cameraBtn.onclick = () => cameraInput.click();
  if (galleryBtn && galleryInput) galleryBtn.onclick = () => galleryInput.click();

  if (cameraInput) cameraInput.onchange = e => fileToSend = e.target.files[0] || null;
  if (galleryInput) galleryInput.onchange = e => fileToSend = e.target.files[0] || null;

  // ❌ Close Buttons (FIXED)
  const bindClose = (id, el) => {
    const btn = document.getElementById(id);
    if (btn && el) btn.onclick = () => el.style.display = "none";
  };

  bindClose("profileClose", profilePopup);
  bindClose("giftClose", document.getElementById("giftPopup"));
  bindClose("replyClose", replyPopup);
  bindClose("adminClose", adminPopup);
  bindClose("mediaClose", mediaModal);

  // 👤 Profile Save
  const saveProfileBtn = document.getElementById("saveProfile");
  if (saveProfileBtn) {
    saveProfileBtn.onclick = async () => {
      const name = nameInput?.value.trim();
      if (!name) return alert("Enter name");

      let photoURL = "";
      if (photoInput?.files[0]) {
        const file = photoInput.files[0];
        const path = `profiles/${Date.now()}_${file.name}`;
        const sref = sRef(storage, path);
        await uploadBytes(sref, file);
        photoURL = await getDownloadURL(sref);
      }

      user = { name, photoURL, isAdmin: false };
      localStorage.setItem("chatUser", JSON.stringify(user));
      profilePopup.style.display = "none";
      renderMessages();
    };
  }

  // 🔐 Admin Login
  if (adminBtn) adminBtn.onclick = () => adminPopup.style.display = "flex";

  const adminLoginBtn = document.getElementById("adminLoginBtn");
  if (adminLoginBtn) {
    adminLoginBtn.onclick = () => {
      if (adminPassInput.value === "sanu0000") {
        user = { name: "Admin", isAdmin: true };
        localStorage.setItem("chatUser", JSON.stringify(user));
        adminPopup.style.display = "none";
        renderMessages();
      } else alert("Wrong password");
    };
  }

  // ✉️ Send Message
  const sendBtn = document.getElementById("send");
  if (sendBtn) {
    sendBtn.onclick = async () => {
      if (!user) return profilePopup.style.display = "flex";

      const text = msgInput.value.trim();
      if (!text && !fileToSend && !giftToSend) return;

      let mediaUrl = "", mediaType = "", mediaName = "";
      if (fileToSend) {
        const path = `uploads/${Date.now()}_${fileToSend.name}`;
        const sref = sRef(storage, path);
        await uploadBytes(sref, fileToSend);
        mediaUrl = await getDownloadURL(sref);
        mediaType = fileToSend.type;
        mediaName = fileToSend.name;
        fileToSend = null;
      }

      await push(ref(db, "messages"), {
        user: user.name,
        photo: user.photoURL || "",
        isAdmin: user.isAdmin,
        text,
        gift: giftToSend || "",
        mediaUrl,
        mediaType,
        mediaName,
        timestamp: Date.now(),
        replies: {}
      });

      msgInput.value = "";
      giftToSend = null;
    };
  }

  // 🎁 Quick Gift (FIXED)
  window.sendQuickGift = (emoji) => {
    giftToSend = emoji;
    sendBtn.click();
  };

  // 💬 Reply
  window.replyMessage = (key) => {
    replyToMsg = key;
    replyPopup.style.display = "flex";
    replyText.value = "";
  };

  const sendReplyBtn = document.getElementById("sendReply");
  if (sendReplyBtn) {
    sendReplyBtn.onclick = async () => {
      if (!replyToMsg) return;
      await push(ref(db, `messages/${replyToMsg}/replies`), {
        user: user.name,
        text: replyText.value.trim(),
        gift: giftToSend || "",
        timestamp: Date.now()
      });
      replyPopup.style.display = "none";
      replyToMsg = null;
      giftToSend = null;
    };
  }

  // 🖼️ Media Viewer
  window.showMedia = (url, type) => {
    mediaContent.innerHTML = type.startsWith("video")
      ? `<video src="${url}" controls autoplay></video>`
      : `<img src="${url}" />`;
    mediaModal.style.display = "flex";
  };

  // 🕒 Time
  const formatTime = ts => new Date(ts).toLocaleString();

  // 🎨 Render Messages
  function renderMessages(data = {}) {
    if (!chatBox) return;
    chatBox.innerHTML = "";

    Object.entries(data)
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .forEach(([key, msg]) => {
        const div = document.createElement("div");
        div.className = "message";
        div.innerHTML = `
          <strong>${msg.user}</strong>
          ${msg.isAdmin ? "👑" : ""}
          <div>${msg.text || msg.gift || ""}</div>
          ${msg.mediaUrl ? `<img src="${msg.mediaUrl}" onclick="showMedia('${msg.mediaUrl}','${msg.mediaType}')">` : ""}
          <small>${formatTime(msg.timestamp)}</small>
          <div>
            <button onclick="replyMessage('${key}')">Reply</button>
            <button onclick="sendQuickGift('🎁')">🎁</button>
          </div>
        `;
        chatBox.appendChild(div);
      });

    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // 🔁 Realtime Sync
  onValue(ref(db, "messages"), snap => renderMessages(snap.val() || {}));

});
