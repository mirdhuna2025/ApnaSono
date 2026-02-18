// chat.js — Merged Modern Firebase Chat (Fixed & Enhanced)
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
🔐 FIREBASE CONFIG
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
🖼️ DOM ELEMENTS (Fixed IDs - No Spaces)
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
const clearChatBtn = document.getElementById("clearChatBtn");

/* ===============================
📸 MEDIA SELECTION & PREVIEW
================================ */
if(cameraBtn) cameraBtn.onclick = () => cameraInput.click();
if(galleryBtn) galleryBtn.onclick = () => galleryInput.click();

function handleFileSelect(file) {
    if (!file) return;
    fileToSend = file;
    if(previewContent) previewContent.innerHTML = "";
    if (file.type.startsWith("image")) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        if(previewContent) previewContent.appendChild(img);
    } else if (file.type.startsWith("video")) {
        const video = document.createElement("video");
        video.src = URL.createObjectURL(file);
        video.controls = true;
        if(previewContent) previewContent.appendChild(video);
    }
    if(mediaPreview) mediaPreview.style.display = "block";
}

if(cameraInput) cameraInput.onchange = (e) => handleFileSelect(e.target.files[0]);
if(galleryInput) galleryInput.onchange = (e) => handleFileSelect(e.target.files[0]);

if(closePreview) {
    closePreview.onclick = () => {
        if(mediaPreview) mediaPreview.style.display = "none";
        if(previewContent) previewContent.innerHTML = "";
        fileToSend = null;
        if(cameraInput) cameraInput.value = "";
        if(galleryInput) galleryInput.value = "";
    };
}

if (photoBtn && photoInput) {
    photoBtn.onclick = () => photoInput.click();
}

/* ===============================
👤 PROFILE SETUP
================================ */
const profileClose = document.getElementById("profileClose");
if(profileClose) profileClose.onclick = () => {
    if(profilePopup) profilePopup.style.display = "none";
};

if (!user && profilePopup) profilePopup.style.display = "flex";
if (user?.photoURL && profileBtn) profileBtn.src = user.photoURL;

if(profileBtn) profileBtn.onclick = () => {
    if(profilePopup) profilePopup.style.display = "flex";
};

const saveProfileBtn = document.getElementById("saveProfile");
if(saveProfileBtn) saveProfileBtn.onclick = async () => {
    const name = nameInput.value.trim();
    if (!name) return alert("⚠️ Please enter your name");
    
    let photoURL = user?.photoURL || "";
    if (photoInput.files[0]) {
        try {
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
        } catch (err) {
            alert("❌ Failed to upload photo. Try again.");
            console.error(err);
            return;
        }
    }
    
    const wasAdmin = user?.isAdmin || false;
    user = { name, photoURL, isAdmin: wasAdmin };
    localStorage.setItem("chatUser", JSON.stringify(user));
    
    if(profilePopup) profilePopup.style.display = "none";
    if(profileBtn) profileBtn.src = photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${name}`;
    
    if(wasAdmin && adminPanel) adminPanel.style.display = "block";
};

/* ===============================
🔐 ADMIN LOGIN
================================ */
const adminClose = document.getElementById("adminClose");
if(adminClose) adminClose.onclick = () => {
    if(adminPopup) adminPopup.style.display = "none";
};

if(adminBtn) adminBtn.onclick = () => {
    if(adminPopup) adminPopup.style.display = "flex";
};

const adminLoginBtn = document.getElementById("adminLoginBtn");
if(adminLoginBtn) adminLoginBtn.onclick = async () => {
    if (adminPassInput.value === "sanu0000") {
        user = { name: "Admin", photoURL: "", isAdmin: true };
        localStorage.setItem("chatUser", JSON.stringify(user));
        if(adminPopup) adminPopup.style.display = "none";
        if(adminPanel) adminPanel.style.display = "block";
        if(profileBtn) profileBtn.src = "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=admin";
        alert("✅ Admin login successful!");
        loadAnalytics();
        const snapshot = await get(ref(db, "messages")); // ✅ now allowed
        renderMessages(snapshot.val());
    } else {
        alert("❌ Wrong password. Try again.");
    }
};



/* ===============================
🚫 BAN SYSTEM
================================ */
async function isBanned(username) {
    try {
        const snap = await get(ref(db, `bannedUsers/${username}`));
        return snap.exists();
    } catch (e) {
        return false;
    }
}

window.banUser = async (username) => {
    if (!user?.isAdmin) return alert("🔒 Admins only");
    if (!confirm(`Ban user ${username}?`)) return;
    await update(ref(db, `bannedUsers/${username}`), true);
    alert(`${username} has been banned!`);
};

/* ===============================
✉️ SEND MESSAGE
================================ */
if(sendBtn) sendBtn.onclick = async () => {
    if (!user) {
        if(profilePopup) profilePopup.style.display = "flex";
        return;
    }
    
    if (await isBanned(user.name)) {
        alert("🚫 You are banned from chatting.");
        return;
    }

    const text = msgInput.value.trim();
    if (!text && !fileToSend) return;

    try {
        let mediaUrl = "", mediaType = "", mediaName = "", storagePath = "";
        
        if (fileToSend) {
            const file = fileToSend;
            storagePath = `uploads/${Date.now()}_${file.name}`;
            const sref = sRef(storage, storagePath);
            const uploadTask = uploadBytesResumable(sref, file);
            
            if(uploadStatus) {
                uploadStatus.style.display = "flex";
                uploadStatus.style.opacity = "1";
                uploadStatus.style.zIndex = "9999";
            }

            await new Promise((resolve, reject) => {
                uploadTask.on(
                    "state_changed",
                    (snapshot) => {
                        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                        if(uploadText) uploadText.innerText = `Uploading... ${progress}%`;
                    },
                    (error) => reject(error),
                    async () => {
                        mediaUrl = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve();
                    }
                );
            });

            if(uploadStatus) uploadStatus.style.display = "none";
            if(mediaPreview) mediaPreview.style.display = "none";
            if(previewContent) previewContent.innerHTML = "";
            
            mediaType = file.type;
            mediaName = file.name;
            fileToSend = null;
            if(cameraInput) cameraInput.value = ""; 
            if(galleryInput) galleryInput.value = "";
        }

        const newMsg = {
            user: user.name,
            photo: user.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.name}`,
            isAdmin: user.isAdmin || false,
            text: text || "",
            mediaUrl,
            mediaType,
            mediaName,
            storagePath,
            timestamp: Date.now(),
            replies: {},
            likes: 0,
            dislikes: 0
        };

        await push(ref(db, "messages"), newMsg);
        if(msgInput) msgInput.value = "";
    } catch (err) {
        alert("❌ Failed to send message. Check connection.");
        console.error(err);
        if(uploadStatus) uploadStatus.style.display = "none";
    }
};

/* ===============================
💬 REPLIES
================================ */
const replyClose = document.getElementById("replyClose");
if(replyClose) replyClose.onclick = () => {
    if(replyPopup) replyPopup.style.display = "none";
    replyToMsg = null;
};

window.replyMessage = (key) => {
    replyToMsg = key;
    if(replyPopup) replyPopup.style.display = "flex";
    if(replyText) {
        replyText.value = "";
        replyText.focus();
    }
};

const sendReplyBtn = document.getElementById("sendReply");
if(sendReplyBtn) sendReplyBtn.onclick = async () => {
    if (!replyText.value.trim() || !replyToMsg) return;
    try {
        const replyRef = ref(db, `messages/${replyToMsg}/replies`);
        await push(replyRef, {
            user: user.name,
            text: replyText.value.trim(),
            timestamp: Date.now()
        });
        if(replyPopup) replyPopup.style.display = "none";
        replyToMsg = null;
    } catch (err) {
        alert("❌ Failed to send reply.");
        console.error(err);
    }
};

window.deleteReply = async (msgKey, replyKey) => {
    if (!user?.isAdmin) return alert("🔒 Admins only");
    if (!confirm("Delete this reply?")) return;
    try {
        await remove(ref(db, `messages/${msgKey}/replies/${replyKey}`));
    } catch (err) {
        alert("❌ Failed to delete reply");
    }
};

/* ===============================
👍👎 REACTIONS
================================ */
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

/* ===============================
🗑️ DELETE & EDIT (ADMIN)
================================ */
window.editMessage = async (key, oldText) => {
    if (!user?.isAdmin) return alert("🔒 Admins only");
    const newText = prompt("Edit message:", oldText);
    if (newText === null || newText.trim() === "") return;
    try {
        await update(ref(db, `messages/${key}`), { text: newText.trim() });
    } catch (err) {
        alert("❌ Edit failed");
    }
};

window.deleteMessage = async (key) => {
    if (!user?.isAdmin) return alert("🔒 Only admins can delete messages.");
    if (!confirm("⚠️ Are you sure? This cannot be undone.")) return;
    
    try {
        const snap = await get(ref(db, `messages/${key}`));
        if (!snap.exists()) return;
        const msg = snap.val();
        
        if (msg.storagePath) {
            try {
                const fileRef = sRef(storage, msg.storagePath);
                await deleteObject(fileRef);
            } catch (storageErr) {
                console.warn("Storage file not found", storageErr);
            }
        }
        
        await remove(ref(db, `messages/${key}`));
    } catch (err) {
        alert("❌ Delete failed.");
        console.error(err);
    }
};

window.clearChat = async () => {
    if (!user?.isAdmin) return alert("🔒 Admins only");
    if (!confirm("⚠️ WARNING: Delete ALL messages?")) return;
    try {
        await remove(ref(db, "messages"));
        alert("✅ Chat cleared.");
    } catch (err) {
        alert("❌ Failed to clear chat.");
    }
};

if(clearChatBtn) clearChatBtn.onclick = clearChat;

/* ===============================
🖼️ MEDIA MODAL
================================ */
const mediaClose = document.getElementById("mediaClose");
if(mediaClose) mediaClose.onclick = () => {
    if(mediaModal) mediaModal.style.display = "none";
    if(mediaContent) mediaContent.innerHTML = "";
};

window.showMedia = (url, type) => {
    if(!mediaContent || !mediaModal) return;
    mediaContent.innerHTML = "";
    if (type?.startsWith("image")) {
        mediaContent.innerHTML = `<img src="${url}" alt="Shared media" style="max-width:100%; max-height:80vh;" />`;
    } else if (type?.startsWith("video")) {
        mediaContent.innerHTML = `<video src="${url}" controls autoplay playsinline style="max-width:100%; max-height:80vh;"></video>`;
    } else {
        mediaContent.innerHTML = `<p style="color:white">Unsupported media type</p>`;
    }
    mediaModal.style.display = "flex";
};

/* ===============================
📊 ANALYTICS
================================ */
async function loadAnalytics() {
    if (!user?.isAdmin) return;
    try {
        const snap = await get(ref(db, "messages"));
        const total = snap.exists() ? Object.keys(snap.val()).length : 0;
        console.log("📊 Total Messages:", total);
    } catch (e) { console.error(e); }
}

/* ===============================
🕒 UTILS
================================ */
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
    }).replace(", ", ", ");
}

/* ===============================
🎨 RENDER MESSAGES
================================ */
function renderMessages(data) {
    if (!chatBox) return;
    chatBox.innerHTML = "";
    const messages = data || {};
    
    const sorted = Object.entries(messages).sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    sorted.forEach(([key, msg]) => {
        const div = document.createElement("div");
        div.className = "message";
        
        let repliesHTML = "";
        if (msg.replies && Object.keys(msg.replies).length > 0) {
            repliesHTML = `<div class="replies-section" style="margin-left:20px; border-left:2px solid #ccc; padding-left:10px;"><strong>Replies:</strong>`;
            Object.entries(msg.replies).forEach(([rKey, r]) => {
                repliesHTML += `
                    <div class="reply-inline" style="font-size:0.9em; margin-top:5px;">
                        <strong>${r.user}</strong>: ${r.text}
                        ${user?.isAdmin ? `<button onclick="deleteReply('${key}','${rKey}')" style="color:red; border:none; background:none; cursor:pointer;">🗑️</button>` : ""}
                    </div>`;
            });
            repliesHTML += `</div>`;
        }

        let mediaHTML = "";
        if (msg.mediaUrl) {
            if (msg.mediaType?.startsWith("video")) {
                mediaHTML = `<video class="media-content" src="${msg.mediaUrl}" onclick="showMedia('${msg.mediaUrl}', '${msg.mediaType}')" style="max-width:200px; cursor:pointer;"></video>`;
            } else {
                mediaHTML = `<img class="media-content" src="${msg.mediaUrl}" alt="Shared" onclick="showMedia('${msg.mediaUrl}', '${msg.mediaType || 'image'}')" style="max-width:200px; cursor:pointer;" />`;
            }
        }

        div.innerHTML = `
           <div class="header" style="display:flex; align-items:center; gap:10px; margin-bottom:5px;">
             <img class="profile" src="${msg.photo || 'https://api.dicebear.com/7.x/thumbs/svg?seed=' + (msg.user || 'user')}" alt="${msg.user}" style="width:40px; height:40px; border-radius:50%;">
             <div>
               <div class="name-line">
                 <strong>${msg.user || 'Anonymous'}</strong>
                 ${msg.isAdmin ? '<span class="admin-tag" style="background:red; color:white; padding:2px 5px; border-radius:3px; font-size:0.7em;">Admin</span>' : ''}
               </div>
               <div class="meta" style="font-size:0.8em; color:#666;">${formatTimestamp(msg.timestamp)}</div>
             </div>
           </div>
          ${msg.text ? `<div class="content" style="margin:5px 0;">${msg.text}</div>` : ''}
          ${mediaHTML}
          ${repliesHTML}
           <div class="actions" style="margin-top:5px; display:flex; gap:10px;">
             <button class="reply-btn" onclick="replyMessage('${key}')" style="cursor:pointer;">💬 Reply</button>
             <button class="like-btn" onclick="likeMessage('${key}')" style="cursor:pointer;">👍 ${msg.likes || 0}</button>
             <button class="dislike-btn" onclick="dislikeMessage('${key}')" style="cursor:pointer;">👎 ${msg.dislikes || 0}</button>
            ${user?.isAdmin ? `
                <button class="edit-btn" onclick="editMessage('${key}', \`${msg.text || ''}\`)" style="cursor:pointer;">✏️ Edit</button>
                <button class="delete-btn" onclick="deleteMessage('${key}')" style="cursor:pointer; color:red;">🗑️ Delete</button>
                <button class="ban-btn" onclick="banUser('${msg.user}')" style="cursor:pointer; color:orange;">🚫 Ban</button>
            ` : ''}
           </div>
        `;
        chatBox.appendChild(div);
    });
    
    setTimeout(() => {
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 100);
}

/* ===============================
🔄 REALTIME LISTENER
================================ */
onValue(ref(db, "messages"), (snapshot) => {
    renderMessages(snapshot.val());
}, (error) => {
    console.error("Firebase sync error:", error);
});

/* ===============================
🔄 MANUAL REFRESH
================================ */
if(refreshBtn) refreshBtn.onclick = async () => {
    try {
        const snapshot = await get(ref(db, "messages"));
        renderMessages(snapshot.val());
        alert("✅ Chat refreshed!");
    } catch (err) {
        alert("❌ Refresh failed. Check internet.");
        console.error(err);
    }
};

/* ===============================
✅ INITIAL LOAD
================================ */
if (user?.isAdmin) {
    if(adminPanel) adminPanel.style.display = "block";
    loadAnalytics();
}
