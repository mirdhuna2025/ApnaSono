// chat.js — Final Clean Firebase Chat (No Admin)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getDatabase, ref, push, onValue, update, get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
    getStorage, ref as sRef,
    uploadBytesResumable,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

/* ===============================
🔐 FIREBASE CONFIG (YOUR REAL CONFIG)
================================ */
const firebaseConfig = {
    apiKey: "AIzaSyCPbOZwAZEMiC1LSDSgnSEPmSxQ7-pR2oQ",
    authDomain: "mirdhuna-25542.firebaseapp.com",
    databaseURL: "https://mirdhuna-25542-default-rtdb.firebaseio.com",
    projectId: "mirdhuna-25542",
    storageBucket: "mirdhuna-25542.firebasestorage.app",
    messagingSenderId: "575924409876",
    appId: "1:575924409876:web:6ba1ed88ce941d9c83b901"
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
const sendReplyBtn = document.getElementById("sendReply");
const mediaModal = document.getElementById("mediaModal");
const mediaContent = document.getElementById("mediaContent");
const mediaClose = document.getElementById("mediaClose");
const photoBtn = document.getElementById("photoBtn");
const mediaPreview = document.getElementById("mediaPreview");
const previewContent = document.getElementById("previewContent");
const closePreview = document.getElementById("closePreview");
const uploadStatus = document.getElementById("uploadStatus");
const uploadText = document.getElementById("uploadText");
const refreshBtn = document.getElementById("refreshBtn");
const logoutBtn = document.getElementById("logoutBtn");
const profileClose = document.getElementById("profileClose");

/* ===============================
🚪 LOGOUT
================================ */
window.logout = () => {
    if (!confirm("🚪 Are you sure you want to logout?")) return;
    localStorage.removeItem("chatUser");
    user = null;
    alert("✅ Logged out successfully!");
    location.reload();
};

if (logoutBtn) {
    logoutBtn.onclick = logout;
    if (user) logoutBtn.style.display = "block";
}

/* ===============================
📸 MEDIA SELECT
================================ */
if (cameraBtn) cameraBtn.onclick = () => cameraInput.click();
if (galleryBtn) galleryBtn.onclick = () => galleryInput.click();
if (photoBtn) photoBtn.onclick = () => photoInput.click();

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
        if (cameraInput) cameraInput.value = "";
        if (galleryInput) galleryInput.value = "";
    };
}

/* ===============================
👤 PROFILE SYSTEM
================================ */
if (!user && profilePopup) profilePopup.style.display = "flex";
if (user?.photoURL && profileBtn) profileBtn.src = user.photoURL;

if (profileBtn) profileBtn.onclick = () => profilePopup.style.display = "flex";
if (profileClose) profileClose.onclick = () => profilePopup.style.display = "none";

const saveProfileBtn = document.getElementById("saveProfile");
if (saveProfileBtn) saveProfileBtn.onclick = async () => {
    const name = nameInput.value.trim();
    if (!name) return alert("⚠️ Please enter your name");

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
    if (!user) return profilePopup.style.display = "flex";

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
                    uploadText.innerText = `Uploading... ${progress}%`;
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
        previewContent.innerHTML = "";
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
    replyText.value = "";
    replyText.focus();
};

if (sendReplyBtn) sendReplyBtn.onclick = async () => {
    if (!replyText.value.trim() || !replyToMsg) return;

    await push(ref(db, `messages/${replyToMsg}/replies`), {
        user: user.name,
        text: replyText.value.trim(),
        timestamp: Date.now()
    });

    replyPopup.style.display = "none";
    replyToMsg = null;
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
        mediaContent.innerHTML = `<video src="${url}" controls autoplay style="max-width:100%;max-height:80vh;"></video>`;
    } else {
        mediaContent.innerHTML = `<img src="${url}" style="max-width:100%;max-height:80vh;" />`;
    }

    mediaModal.style.display = "flex";
};

if (mediaClose) mediaClose.onclick = () => {
    mediaModal.style.display = "none";
    mediaContent.innerHTML = "";
};

/* ===============================
🕒 FORMAT TIME
================================ */
function formatTimestamp(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleString();
}

/* ===============================
🎨 RENDER MESSAGES
================================ */
function renderMessages(data) {
    chatBox.innerHTML = "";
    const messages = data || {};

    Object.entries(messages)
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .forEach(([key, msg]) => {

            let repliesHTML = "";
            if (msg.replies) {
                repliesHTML = `<div style="margin-left:20px;border-left:2px solid #ccc;padding-left:10px;">`;
                Object.values(msg.replies).forEach(r => {
                    repliesHTML += `
                        <div style="font-size:0.9em;margin-top:5px;">
                            <strong>${r.user}</strong>: ${r.text}
                        </div>
                    `;
                });
                repliesHTML += `</div>`;
            }

            let mediaHTML = "";
            if (msg.mediaUrl) {
                if (msg.mediaType?.startsWith("video")) {
                    mediaHTML = `<video src="${msg.mediaUrl}" onclick="showMedia('${msg.mediaUrl}','${msg.mediaType}')" style="max-width:200px;cursor:pointer;"></video>`;
                } else {
                    mediaHTML = `<img src="${msg.mediaUrl}" onclick="showMedia('${msg.mediaUrl}','${msg.mediaType}')" style="max-width:200px;cursor:pointer;" />`;
                }
            }

            const div = document.createElement("div");
            div.className = "message";
            div.innerHTML = `
                <div style="display:flex;gap:10px;align-items:center;">
                    <img src="${msg.photo}" width="40" height="40" style="border-radius:50%;">
                    <div>
                        <strong>${msg.user}</strong>
                        <div style="font-size:0.8em;color:#666;">${formatTimestamp(msg.timestamp)}</div>
                    </div>
                </div>
                <div style="margin:5px 0;">${msg.text}</div>
                ${mediaHTML}
                ${repliesHTML}
                <div style="margin-top:5px;display:flex;gap:10px;">
                    <button onclick="replyMessage('${key}')">💬 Reply</button>
                    <button onclick="likeMessage('${key}')">👍 ${msg.likes || 0}</button>
                    <button onclick="dislikeMessage('${key}')">👎 ${msg.dislikes || 0}</button>
                </div>
            `;
            chatBox.appendChild(div);
        });

    chatBox.scrollTop = chatBox.scrollHeight;
}

/* ===============================
🔄 REALTIME LISTENER
================================ */
onValue(ref(db, "messages"), snapshot => {
    renderMessages(snapshot.val());
});

/* ===============================
🔄 MANUAL REFRESH
================================ */
if (refreshBtn) refreshBtn.onclick = async () => {
    const snapshot = await get(ref(db, "messages"));
    renderMessages(snapshot.val());
    alert("✅ Chat refreshed!");
};

