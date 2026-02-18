// chat.js — Clean Firebase Chat (No Admin System)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getDatabase, ref, push, onValue, update, remove, get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
    getStorage, ref as sRef,
    uploadBytesResumable,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

/* ===============================
🔐 FIREBASE CONFIG
================================ */
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "YOUR_DATABASE_URL",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MSG_ID",
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
const sendBtn = document.getElementById("send");
const cameraBtn = document.getElementById("cameraBtn");
const galleryBtn = document.getElementById("galleryBtn");
const cameraInput = document.getElementById("cameraInput");
const galleryInput = document.getElementById("galleryInput");
const profilePopup = document.getElementById("profilePopup");
const profileBtn = document.getElementById("profileBtn");
const nameInput = document.getElementById("name");
const photoInput = document.getElementById("photo");
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
const logoutBtn = document.getElementById("logoutBtn");

/* ===============================
🚪 LOGOUT
================================ */
window.logout = () => {
    if (!confirm("🚪 Logout?")) return;

    localStorage.removeItem("chatUser");
    user = null;
    replyToMsg = null;
    fileToSend = null;

    alert("✅ Logged out!");
    location.reload();
};

if (logoutBtn) {
    logoutBtn.onclick = logout;
    if (user) logoutBtn.style.display = "block";
}

/* ===============================
📸 MEDIA SELECTION
================================ */
if (cameraBtn) cameraBtn.onclick = () => cameraInput.click();
if (galleryBtn) galleryBtn.onclick = () => galleryInput.click();

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

if (cameraInput) cameraInput.onchange = e => handleFileSelect(e.target.files[0]);
if (galleryInput) galleryInput.onchange = e => handleFileSelect(e.target.files[0]);

if (closePreview) {
    closePreview.onclick = () => {
        mediaPreview.style.display = "none";
        previewContent.innerHTML = "";
        fileToSend = null;
    };
}

/* ===============================
👤 PROFILE
================================ */
if (!user && profilePopup) profilePopup.style.display = "flex";
if (user?.photoURL && profileBtn) profileBtn.src = user.photoURL;

if (profileBtn) profileBtn.onclick = () => {
    profilePopup.style.display = "flex";
};

const saveProfileBtn = document.getElementById("saveProfile");
if (saveProfileBtn) saveProfileBtn.onclick = async () => {
    const name = nameInput.value.trim();
    if (!name) return alert("Enter name");

    let photoURL = user?.photoURL || "";

    if (photoInput.files[0]) {
        const file = photoInput.files[0];
        const path = `profiles/${Date.now()}_${file.name}`;
        const sref = sRef(storage, path);
        const uploadTask = uploadBytesResumable(sref, file);

        await new Promise((resolve, reject) => {
            uploadTask.on("state_changed", null, reject, async () => {
                photoURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve();
            });
        });
    }

    user = { name, photoURL };
    localStorage.setItem("chatUser", JSON.stringify(user));

    profilePopup.style.display = "none";
    profileBtn.src = photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${name}`;
    logoutBtn.style.display = "block";
};

/* ===============================
✉️ SEND MESSAGE
================================ */
if (sendBtn) sendBtn.onclick = async () => {
    if (!user) {
        profilePopup.style.display = "flex";
        return;
    }

    const text = msgInput.value.trim();
    if (!text && !fileToSend) return;

    let mediaUrl = "", mediaType = "";

    if (fileToSend) {
        const file = fileToSend;
        const storagePath = `uploads/${Date.now()}_${file.name}`;
        const sref = sRef(storage, storagePath);
        const uploadTask = uploadBytesResumable(sref, file);

        uploadStatus.style.display = "flex";

        await new Promise((resolve, reject) => {
            uploadTask.on(
                "state_changed",
                (snapshot) => {
                    const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                    uploadText.innerText = `Uploading ${progress}%`;
                },
                reject,
                async () => {
                    mediaUrl = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve();
                }
            );
        });

        uploadStatus.style.display = "none";
        mediaPreview.style.display = "none";
        fileToSend = null;
        mediaType = file.type;
    }

    await push(ref(db, "messages"), {
        user: user.name,
        photo: user.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.name}`,
        text: text || "",
        mediaUrl,
        mediaType,
        timestamp: Date.now(),
        replies: {},
        likes: 0,
        dislikes: 0
    });

    msgInput.value = "";
};

/* ===============================
💬 REPLIES
================================ */
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
👍👎 REACTIONS
================================ */
window.likeMessage = async (key) => {
    const msgRef = ref(db, `messages/${key}`);
    const snap = await get(msgRef);
    await update(msgRef, { likes: (snap.val().likes || 0) + 1 });
};

window.dislikeMessage = async (key) => {
    const msgRef = ref(db, `messages/${key}`);
    const snap = await get(msgRef);
    await update(msgRef, { dislikes: (snap.val().dislikes || 0) + 1 });
};

/* ===============================
🖼️ MEDIA MODAL
================================ */
window.showMedia = (url, type) => {
    mediaContent.innerHTML = "";
    if (type?.startsWith("video")) {
        mediaContent.innerHTML = `<video src="${url}" controls autoplay></video>`;
    } else {
        mediaContent.innerHTML = `<img src="${url}" />`;
    }
    mediaModal.style.display = "flex";
};

document.getElementById("mediaClose").onclick = () => {
    mediaModal.style.display = "none";
};

/* ===============================
🎨 RENDER
================================ */
function renderMessages(data) {
    chatBox.innerHTML = "";
    const messages = data || {};

    Object.entries(messages)
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .forEach(([key, msg]) => {

            let repliesHTML = "";
            if (msg.replies) {
                repliesHTML = `<div style="margin-left:20px;">`;
                Object.values(msg.replies).forEach(r => {
                    repliesHTML += `<div><strong>${r.user}</strong>: ${r.text}</div>`;
                });
                repliesHTML += `</div>`;
            }

            const div = document.createElement("div");
            div.className = "message";
            div.innerHTML = `
                <div>
                    <img src="${msg.photo}" width="40" height="40">
                    <strong>${msg.user}</strong>
                </div>
                <div>${msg.text}</div>
                ${msg.mediaUrl ? `<img src="${msg.mediaUrl}" onclick="showMedia('${msg.mediaUrl}','${msg.mediaType}')">` : ""}
                ${repliesHTML}
                <button onclick="replyMessage('${key}')">Reply</button>
                <button onclick="likeMessage('${key}')">👍 ${msg.likes || 0}</button>
                <button onclick="dislikeMessage('${key}')">👎 ${msg.dislikes || 0}</button>
            `;
            chatBox.appendChild(div);
        });

    chatBox.scrollTop = chatBox.scrollHeight;
}

/* ===============================
🔄 REALTIME
================================ */
onValue(ref(db, "messages"), snapshot => {
    renderMessages(snapshot.val());
});

/* ===============================
🔄 REFRESH
================================ */
if (refreshBtn) refreshBtn.onclick = async () => {
    const snapshot = await get(ref(db, "messages"));
    renderMessages(snapshot.val());
    alert("Refreshed!");
};
