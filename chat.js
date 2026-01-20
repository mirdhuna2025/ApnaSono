// chat.js — Modern Firebase Chat (Mirdhuna Chat • Nov 21, 2025)

// 🔧 Fix: Remove trailing spaces in import URLs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase, ref, push, onValue, update, remove, get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getStorage, ref as sRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Wait for DOM before accessing elements
document.addEventListener("DOMContentLoaded", () => {
  // 🔐 Firebase Config (trimmed trailing space in databaseURL)
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

  // 🖼️ DOM Elements (now safe inside DOMContentLoaded)
  const chatBox = document.getElementById("chatBox");
  const msgInput = document.getElementById("msg");
  const cameraBtn = document.getElementById("cameraBtn");
  const galleryBtn = document.getElementById("galleryBtn");
  const giftBtn = document.getElementById("giftBtn"); // Note: this element doesn't exist in your HTML yet
  const cameraInput = document.getElementById("cameraInput");
  const galleryInput = document.getElementById("galleryInput");
  const profilePopup = document.getElementById("profilePopup");
  const headerProfile = document.getElementById("profileBtn"); // 👈 You used #profileBtn, not #headerProfile
  const headerName = document.querySelector("#chatTitle"); // or create a dedicated span if needed
  const nameInput = document.getElementById("name");
  const photoInput = document.getElementById("photo");
  const previewAvatar = document.getElementById("previewAvatar"); // ❌ Not in your HTML — will be null
  const previewName = document.getElementById("previewName");     // ❌ Not in your HTML
  const adminPopup = document.getElementById("adminPopup");
  const adminBtn = document.getElementById("adminBtn");
  const adminPassInput = document.getElementById("adminPass");
  const adminPanel = document.getElementById("adminPanel");
  const replyPopup = document.getElementById("replyPopup");
  const replyText = document.getElementById("replyText");
  const replyGiftBtn = document.getElementById("replyGiftBtn"); // ❌ Not in your HTML
  const giftPopup = document.getElementById("giftPopup");       // ❌ Not in your HTML
  const giftGrid = document.getElementById("giftGrid");         // ❌ Not in your HTML
  const sendGiftBtn = document.getElementById("sendGift");      // ❌ Not in your HTML
  const mediaModal = document.getElementById("mediaModal");
  const mediaContent = document.getElementById("mediaContent");

  // ⚠️ Optional: Warn about missing optional elements
  // (Gift UI isn't in your current HTML, so we'll skip gift grid setup if missing)
  if (giftGrid) {
    const gifts = ["🎁", "💖", "🎂", "🎉", "🎈", "🍫", "🧁", "💎", "👑", "🦄", "🚀", "🌟"];
    gifts.forEach(emoji => {
      const btn = document.createElement("button");
      btn.className = "gift-btn-item";
      btn.textContent = emoji;
      btn.onclick = () => {
        giftToSend = emoji;
        if (giftPopup) giftPopup.style.display = "none";
        if (sendGiftBtn) sendGiftBtn.style.display = "block";
        sendGift();
      };
      giftGrid.appendChild(btn);
    });
  }

  // 📸 Media Selection
  if (cameraBtn && cameraInput) {
    cameraBtn.onclick = () => cameraInput.click();
  }
  if (galleryBtn && galleryInput) {
    galleryBtn.onclick = () => galleryInput.click();
  }

  // Gift button (only if present)
  if (giftBtn && giftPopup && sendGiftBtn) {
    giftBtn.onclick = () => {
      giftToSend = null;
      sendGiftBtn.style.display = "none";
      giftPopup.style.display = "flex";
    };
  }

  // File inputs
  if (cameraInput) {
    cameraInput.onchange = e => { if (e.target.files[0]) fileToSend = e.target.files[0]; };
  }
  if (galleryInput) {
    galleryInput.onchange = e => { if (e.target.files[0]) fileToSend = e.target.files[0]; };
  }

  // 👤 Profile Setup
  if (profilePopup) {
    document.getElementById("profileClose")?.onclick = () => profilePopup.style.display = "none";
    profilePopup.onclick = (e) => {
      if (e.target === profilePopup) profilePopup.style.display = "none";
    };
  }

  if (giftPopup) {
    document.getElementById("giftClose")?.onclick = () => giftPopup.style.display = "none";
  }

  if (replyPopup) {
    document.getElementById("replyClose")?.onclick = () => {
      replyPopup.style.display = "none";
      replyToMsg = null;
      giftToSend = null;
    };
  }

  if (adminPopup) {
    document.getElementById("adminClose")?.onclick = () => adminPopup.style.display = "none";
  }

  // Preview helper (only if preview elements exist)
  function updatePreview(name, avatarSrc) {
    if (previewName) previewName.textContent = name || "—";
    if (previewAvatar) {
      if (avatarSrc.startsWith("http")) {
        previewAvatar.innerHTML = `<img src="${avatarSrc}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      } else {
        previewAvatar.innerHTML = avatarSrc;
      }
    }
  }

  if (!user && profilePopup) {
    profilePopup.style.display = "flex";
    updatePreview("—", "👤");
  }

  if (nameInput && previewName) {
    nameInput.oninput = () => updatePreview(
      nameInput.value.trim() || "—",
      previewAvatar?.innerHTML?.includes("img")
        ? previewAvatar.querySelector("img")?.src || "👤"
        : "👤"
    );
  }

  if (photoInput) {
    photoInput.onchange = async (e) => {
      if (!e.target.files[0]) return;
      const url = URL.createObjectURL(e.target.files[0]);
      updatePreview(nameInput?.value.trim() || "—", url);
    };
  }

  // Header sync
  if (headerProfile) {
    if (user?.photoURL) {
      headerProfile.src = user.photoURL;
    } else {
      headerProfile.src = "https://api.dicebear.com/7.x/thumbs/svg?seed=default";
    }
  }

  // Save Profile
  document.getElementById("saveProfile")?.onclick = async () => {
    const name = nameInput?.value.trim();
    if (!name) return alert("⚠️ Please enter your name");
    let photoURL = user?.photoURL || "";
    if (photoInput?.files[0]) {
      try {
        const file = photoInput.files[0];
        const path = `profiles/${Date.now()}_${file.name}`;
        const sref = sRef(storage, path);
        await uploadBytes(sref, file);
        photoURL = await getDownloadURL(sref);
      } catch (err) {
        alert("❌ Failed to upload photo.");
        console.error(err);
        return;
      }
    }
    user = { name, photoURL, isAdmin: false };
    localStorage.setItem("chatUser", JSON.stringify(user));
    if (profilePopup) profilePopup.style.display = "none";
    if (headerProfile) {
      headerProfile.src = photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name)}`;
    }
    renderMessages();
  };

  // 🔐 Admin Login
  adminBtn?.onclick = () => {
    if (adminPopup) adminPopup.style.display = "flex";
  };

  document.getElementById("adminLoginBtn")?.onclick = () => {
    if (adminPassInput?.value === "sanu0000") {
      user = { name: "Admin", photoURL: "", isAdmin: true };
      localStorage.setItem("chatUser", JSON.stringify(user));
      if (adminPopup) adminPopup.style.display = "none";
      if (headerProfile) {
        headerProfile.src = "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=admin";
      }
      renderMessages();
    } else {
      alert("❌ Wrong password.");
    }
  };

  // ✉️ Send Main Message
  document.getElementById("send")?.onclick = async () => {
    if (!user) {
      if (profilePopup) profilePopup.style.display = "flex";
      return;
    }

    const text = msgInput?.value.trim() || "";
    if (!text && !fileToSend && !giftToSend) return;

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
        if (cameraInput) cameraInput.value = "";
        if (galleryInput) galleryInput.value = "";
      }

      const newMsg = {
        user: user.name,
        photo: user.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(user.name)}`,
        isAdmin: !!user.isAdmin,
        text: text || "",
        gift: giftToSend || "",
        mediaUrl,
        mediaType,
        mediaName,
        timestamp: Date.now(),
        replies: {}
      };

      await push(ref(db, "messages"), newMsg);
      if (msgInput) msgInput.value = "";
      giftToSend = null;
    } catch (err) {
      alert("❌ Failed to send.");
      console.error(err);
    }
  };

  // 🎁 Send Gift
  async function sendGift() {
    if (!user || !giftToSend) return;
    try {
      const newMsg = {
        user: user.name,
        photo: user.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(user.name)}`,
        isAdmin: !!user.isAdmin,
        text: "",
        gift: giftToSend,
        mediaUrl: "",
        mediaType: "",
        mediaName: "",
        timestamp: Date.now(),
        replies: {}
      };
      await push(ref(db, "messages"), newMsg);
      giftToSend = null;
    } catch (err) {
      alert("❌ Gift failed.");
    }
  }

  // 💬 Reply Handling
  window.replyMessage = (key) => {
    replyToMsg = key;
    if (replyPopup) {
      replyPopup.style.display = "flex";
      if (replyText) replyText.value = "";
      replyText?.focus();
    }
    giftToSend = null;
  };

  if (replyGiftBtn && giftPopup && sendGiftBtn) {
    replyGiftBtn.onclick = () => {
      giftToSend = null;
      sendGiftBtn.style.display = "none";
      giftPopup.style.display = "flex";
    };
  }

  document.getElementById("sendReply")?.onclick = async () => {
    const text = replyText?.value.trim() || "";
    if ((!text && !giftToSend) || !replyToMsg) return;

    try {
      const replyRef = ref(db, `messages/${replyToMsg}/replies`);
      await push(replyRef, {
        user: user.name,
        text: text || "",
        gift: giftToSend || "",
        timestamp: Date.now()
      });
      if (replyPopup) replyPopup.style.display = "none";
      replyToMsg = null;
      giftToSend = null;
    } catch (err) {
      alert("❌ Reply failed.");
      console.error(err);
    }
  };

  // 🖼️ Media Modal
  document.getElementById("mediaClose")?.onclick = () => {
    if (mediaModal) {
      mediaModal.style.display = "none";
      if (mediaContent) mediaContent.innerHTML = "";
    }
  };

  window.showMedia = (url, type) => {
    if (!mediaContent || !mediaModal) return;
    mediaContent.innerHTML = "";
    if (type?.startsWith("video")) {
      mediaContent.innerHTML = `<video src="${url}" controls autoplay playsinline></video>`;
    } else if (type?.startsWith("image")) {
      mediaContent.innerHTML = `<img src="${url}" alt="Media" />`;
    } else {
      mediaContent.innerHTML = `<p style="color:white">Unsupported media</p>`;
    }
    mediaModal.style.display = "flex";
  };

  // 🕒 Format timestamp
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
    });
  }

  // 🎨 Render Messages
  function renderMessages(data) {
    if (!chatBox) return;
    chatBox.innerHTML = "";
    const messages = data || {};

    const sorted = Object.entries(messages).sort((a, b) => a[1].timestamp - b[1].timestamp);

    sorted.forEach(([key, msg]) => {
      let repliesHTML = "";
      if (msg.replies && Object.keys(msg.replies).length > 0) {
        repliesHTML = `<div class="replies-section"><strong>Replies:</strong>`;
        Object.values(msg.replies).forEach(r => {
          const giftTag = r.gift ? `<span class="reply-gift">${r.gift}</span>` : "";
          repliesHTML += `<div class="reply-inline"><strong>${r.user}</strong>: ${r.text}${giftTag}</div>`;
        });
        repliesHTML += `</div>`;
      }

      let mediaHTML = "";
      if (msg.mediaUrl) {
        if (msg.mediaType?.startsWith("video")) {
          mediaHTML = `
            <div style="position:relative;display:inline-block;">
              <video class="media-content" src="${msg.mediaUrl}" poster="${msg.mediaUrl.replace('.mp4', '.jpg')}" onclick="showMedia('${msg.mediaUrl}', '${msg.mediaType}')"></video>
              <div class="video-overlay">
                <div class="play-btn">▶</div>
              </div>
            </div>`;
        } else {
          mediaHTML = `<img class="media-content" src="${msg.mediaUrl}" alt="Shared" onclick="showMedia('${msg.mediaUrl}', '${msg.mediaType || 'image'}')"/>`;
        }
      }

      const giftHTML = msg.gift ? `<div class="content" style="font-size:36px;text-align:center;">${msg.gift}</div>` : "";
      const textHTML = msg.text ? `<div class="content">${msg.text}</div>` : "";

      const div = document.createElement("div");
      div.className = "message";
      div.innerHTML = `
        <div class="header">
          <img class="profile" src="${msg.photo || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(msg.user || 'user')}`}" alt="${msg.user}">
          <div>
            <div class="name-line">
              <strong>${msg.user || 'Anonymous'}</strong>
              ${msg.isAdmin ? '<span class="admin-tag">Admin</span>' : ''}
            </div>
            <div class="meta">${formatTimestamp(msg.timestamp)}</div>
          </div>
        </div>
        ${giftHTML}
        ${textHTML}
        ${mediaHTML}
        ${repliesHTML}
        <div class="actions">
          <button class="reply-btn" onclick="replyMessage('${key}')">💬 Reply</button>
          <button class="like-btn">👍 0</button>
          <button class="dislike-btn">👎 0</button>
          ${user?.isAdmin ? `<button class="delete-btn" onclick="deleteMessage('${key}')">🗑️ Delete</button>` : ''}
          <button class="gift-btn" onclick="giftToSend='${gifts[0]}';sendGift()">🎁 Gift</button>
        </div>
      `;
      chatBox.appendChild(div);
    });

    setTimeout(() => {
      chatBox.scrollTop = chatBox.scrollHeight;
    }, 150);
  }

  // 🔁 Real-time sync
  onValue(ref(db, "messages"), (snapshot) => {
    renderMessages(snapshot.val());
  }, (error) => {
    console.error("Firebase error:", error);
  });

  // ♻️ Manual Refresh
  document.getElementById("refreshBtn")?.onclick = async () => {
    const snapshot = await get(ref(db, "messages"));
    renderMessages(snapshot.val());
    alert("✅ Refreshed!");
  };

  // Escape key closes popups
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (profilePopup) profilePopup.style.display = "none";
      if (replyPopup) replyPopup.style.display = "none";
      if (adminPopup) adminPopup.style.display = "none";
      if (giftPopup) giftPopup.style.display = "none";
      if (mediaModal) mediaModal.style.display = "none";
      replyToMsg = null;
      giftToSend = null;
    }
  });

  // Initial header sync
  if (user && headerProfile) {
    headerProfile.src = user.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(user.name)}`;
  }
});
