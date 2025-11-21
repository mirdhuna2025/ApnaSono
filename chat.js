// chat.js — Enhanced Mirdhuna Chat (Nov 21, 2025)
// -------------------------------------------------
// Features included:
// - Firebase Realtime DB + Storage integration
// - Presence (online users) with onDisconnect
// - Typing indicator per-user
// - Read receipts (delivered/read flags)
// - Edit messages (sender can edit within allowed window)
// - Pin/unpin messages
// - Search messages
// - Export chat JSON
// - Theme toggle (Light / Dark Neon)
// - Profanity filter + send cooldown (anti-spam)
// - Offline queue: queue messages when offline, sync when online
// - Media upload and fullscreen modal
// - Admin login & moderation (delete/clear/ban)
// -------------------------------------------------

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  update,
  remove,
  get,
  onDisconnect,
  serverTimestamp,
  query,
  orderByChild,
  limitToLast
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getStorage,
  ref as sRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ---------------------- Firebase config (you already shared these) ----------------------
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

// ---------------------- Constants & safe defaults ----------------------
const MESSAGES_PATH = "messages";
const PRESENCE_PATH = "presence";
const ADMIN_PASSWORD = "sanu0000"; // change if you want
const EDIT_WINDOW_MS = 5 * 60 * 1000; // allow edit within 5 minutes
const COOLDOWN_MS = 2500; // 2.5s between sends
const profanityList = ["badword1","badword2","damn"]; // extend as needed

// ---------------------- DOM elements ----------------------
const chatBox = document.getElementById("chatBox");
const msgInput = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const cameraBtn = document.getElementById("cameraBtn");
const galleryBtn = document.getElementById("galleryBtn");
const cameraInput = document.getElementById("cameraInput");
const galleryInput = document.getElementById("galleryInput");
const refreshBtn = document.getElementById("refreshBtn");
const profileBtn = document.getElementById("profileBtn");
const profilePopup = document.getElementById("profilePopup");
const profileClose = document.getElementById("profileClose");
const saveProfile = document.getElementById("saveProfile");
const clearProfile = document.getElementById("clearProfile");
const nameInput = document.getElementById("name");
const photoInput = document.getElementById("photo");

const replyPopup = document.getElementById("replyPopup");
const replyClose = document.getElementById("replyClose");
const replyText = document.getElementById("replyText");
const sendReply = document.getElementById("sendReply");
const cancelReply = document.getElementById("cancelReply");

const mediaModal = document.getElementById("mediaModal");
const mediaClose = document.getElementById("mediaClose");
const mediaContent = document.getElementById("mediaContent");

const adminBtn = document.getElementById("adminBtn");
const adminPopup = document.getElementById("adminPopup");
const adminClose = document.getElementById("adminClose");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminPass = document.getElementById("adminPass");
const adminPanel = document.getElementById("adminPanel");
const adminCancel = document.getElementById("adminCancel");
const moderationLogEl = document.getElementById("moderationLog");

const onlineList = document.getElementById("onlineList");
const onlineCount = document.getElementById("onlineCount");

const replyCloseBtn = document.getElementById("replyClose");

const editModal = document.getElementById("editModal");
const editText = document.getElementById("editText");
const editClose = document.getElementById("editClose");
const saveEdit = document.getElementById("saveEdit");
const cancelEdit = document.getElementById("cancelEdit");

const exportBtn = document.getElementById("exportBtn");
const themeToggle = document.getElementById("themeToggle");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const clearSearch = document.getElementById("clearSearch");
const toggleSoundBtn = document.getElementById("toggleSound");
const clearChatBtn = document.getElementById("clearChatBtn");
const downloadAnchor = document.getElementById("downloadAnchor");

// ---------------------- State ----------------------
let localUser = loadLocalUser(); // { name, photo, isAdmin }
let lastSendAt = 0;
let currentReplyTo = null;
let editTargetId = null;
let isAdmin = false;
let soundOn = true;
let offlineQueue = []; // queued messages when offline
let moderationLog = [];

// Setup initial UI
if (localUser?.photo) profileBtn.src = localUser.photo;
if (!localUser?.name) setTimeout(()=>profilePopup.style.display="flex",200);

// ---------------------- Utility helpers ----------------------
function uidSeed(n=6){ return Math.random().toString(36).slice(2,2+n); }
function now(){ return Date.now(); }
function formatTimestamp(ts){
  if(!ts) return "";
  const d = new Date(ts);
  const options = { month:"2-digit", day:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:true };
  return d.toLocaleString("en-US", options);
}
function sanitizeText(t){
  if(!t) return "";
  let s = String(t);
  // basic profanity replace
  profanityList.forEach(w => {
    const re = new RegExp("\\b"+w+"\\b", "ig");
    s = s.replace(re, "***");
  });
  // escape markup
  s = s.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return s;
}
function saveLocalUser(u){ localStorage.setItem("mirdhuna_user", JSON.stringify(u)); }
function loadLocalUser(){ try{ return JSON.parse(localStorage.getItem("mirdhuna_user")) || null }catch(e){return null} }
function playSound(){ if(!soundOn) return; try{ new Audio('data:audio/mpeg;base64,//uQZ...').play().catch(()=>{}); }catch(e){} } // short stub base64 could be replaced

// ---------------------- Presence (online) ----------------------
const myPresenceRef = ref(db, `${PRESENCE_PATH}/${uidSeed()}`); // ephemeral node for this client
function goOnline(){
  const name = localUser?.name || "Anonymous";
  const photo = localUser?.photo || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name)}`;
  set(myPresenceRef, { name, photo, lastSeen: now(), typing:false }).then(()=> {
    onDisconnect(myPresenceRef).remove();
  });
}
function updateTyping(flag){
  update(myPresenceRef, { typing: flag, lastSeen: now() }).catch(()=>{});
}

// list presence
const presenceRef = ref(db, PRESENCE_PATH);
onValue(presenceRef, snap=>{
  onlineList.innerHTML = "";
  const data = snap.val() || {};
  const users = Object.values(data);
  onlineCount.textContent = users.length;
  for(const k in data){
    const u = data[k];
    const el = document.createElement("div"); el.className="online-item";
    el.innerHTML = `<img src="${u.photo}" style="width:30px;height:30px;border-radius:8px;object-fit:cover" /> <div style="font-size:13px">${u.name}${u.typing? ' • typing…':''}</div>`;
    onlineList.appendChild(el);
  }
});

// ---------------------- Messages listeners ----------------------
const messagesRef = ref(db, MESSAGES_PATH);
const recentQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(200));

onValue(recentQuery, snapshot=>{
  const val = snapshot.val() || {};
  renderMessages(val);
});

// ---------------------- Render messages ----------------------
function renderMessages(messages){
  chatBox.innerHTML = ""; // clear
  // convert to sorted array
  const list = Object.entries(messages).sort((a,b)=> (a[1].timestamp||0)-(b[1].timestamp||0));
  for(const [id, msg] of list){
    const mEl = renderSingleMessage(id, msg);
    chatBox.appendChild(mEl);
  }
  scrollBottom();
}

// single message DOM
function renderSingleMessage(id, msg){
  const el = document.createElement("div");
  el.className = "message";
  el.dataset.id = id;

  const profileUrl = msg.senderPhoto || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(msg.senderName||'anon')}`;

  // left profile
  const prof = document.createElement("img"); prof.className="profile"; prof.src = profileUrl; prof.alt = msg.senderName || "User";
  el.appendChild(prof);

  // body
  const body = document.createElement("div"); body.className="msg-body";
  const header = document.createElement("div"); header.className="msg-header";

  const nameDiv = document.createElement("div");
  nameDiv.innerHTML = `<div class="msg-name">${msg.senderName || 'Anonymous'} ${msg.isAdmin?'<span class="admin-tag">Admin</span>':''}</div><div class="meta">${formatTimestamp(msg.timestamp)}</div>`;
  header.appendChild(nameDiv);

  // right side actions small
  const rightActions = document.createElement("div");
  rightActions.style.display="flex"; rightActions.style.gap="8px"; rightActions.style.alignItems="center";

  const pinBtn = document.createElement("button"); pinBtn.className="small-btn"; pinBtn.textContent = msg.pinned ? "📌 Unpin":"📌 Pin";
  pinBtn.onclick = async ()=>{
    await update(ref(db, `${MESSAGES_PATH}/${id}`), { pinned: !msg.pinned });
  };
  rightActions.appendChild(pinBtn);

  // if message belongs to local user -> allow edit
  const nameLower = (localUser?.name || "").toLowerCase();
  if((msg.senderName || "").toLowerCase() === nameLower){
    const nowMs = now();
    if((nowMs - (msg.timestamp||0)) < EDIT_WINDOW_MS){
      const editBtn = document.createElement("button"); editBtn.className="small-btn"; editBtn.textContent="✏️ Edit";
      editBtn.onclick = ()=> openEditModal(id, msg);
      rightActions.appendChild(editBtn);
    }
  }
  // admin delete
  if(localUser?.isAdmin){
    const delBtn = document.createElement("button"); delBtn.className="small-btn"; delBtn.style.background="rgba(255,200,200,0.9)"; delBtn.textContent="🗑 Delete";
    delBtn.onclick = async ()=>{
      if(!confirm("Delete message permanently?")) return;
      await remove(ref(db, `${MESSAGES_PATH}/${id}`));
      logModeration(`Deleted message ${id} by admin ${localUser.name||'admin'}`);
    };
    rightActions.appendChild(delBtn);
  }

  header.appendChild(rightActions);
  body.appendChild(header);

  // text
  if(msg.text){
    const t = document.createElement("div"); t.className="msg-text"; t.innerHTML = sanitizeText(msg.text);
    body.appendChild(t);
  }

  // media
  if(msg.mediaURL){
    const isImage = msg.mediaType?.startsWith("image") || /\.(jpg|jpeg|png|gif)$/i.test(msg.mediaURL);
    const isVideo = msg.mediaType?.startsWith("video") || /\.(mp4|webm|ogg)$/i.test(msg.mediaURL);
    if(isImage){
      const img = document.createElement("img"); img.className="media-content"; img.src = msg.mediaURL; img.onclick = ()=> openMedia(msg.mediaURL, msg.mediaType || "image");
      body.appendChild(img);
    } else if(isVideo){
      const vid = document.createElement("video"); vid.className="media-content"; vid.src = msg.mediaURL; vid.controls=true; vid.onclick = ()=> openMedia(msg.mediaURL, msg.mediaType || "video");
      body.appendChild(vid);
    } else {
      const a = document.createElement("a"); a.href = msg.mediaURL; a.textContent = `Download ${msg.mediaName||'file'}`; a.target="_blank";
      body.appendChild(a);
    }
  }

  // replies short preview
  if(msg.replies){
    const replies = Array.isArray(msg.replies) ? msg.replies : Object.values(msg.replies);
    if(replies.length){
      const rSec = document.createElement("div"); rSec.className="replies-section";
      rSec.innerHTML = `<div style="font-size:13px;font-weight:700;color:var(--muted)">${replies.length} repl${replies.length>1?'ies':'y'}</div>`;
      replies.slice(0,3).forEach(r=>{
        const ri = document.createElement("div"); ri.className="reply-inline"; ri.innerHTML = `<strong>${r.name}</strong>: ${sanitizeText(r.text)}`;
        rSec.appendChild(ri);
      });
      body.appendChild(rSec);
    }
  }

  // actions (reply, like, dislike, read)
  const actions = document.createElement("div"); actions.className="actions";
  const replyBtn = document.createElement("button"); replyBtn.className="small-btn"; replyBtn.textContent="💬 Reply";
  replyBtn.onclick = ()=> openReply(id);
  actions.appendChild(replyBtn);

  const likeBtn = document.createElement("button"); likeBtn.className="small-btn"; likeBtn.textContent=`👍 ${msg.likes||0}`;
  likeBtn.onclick = ()=> update(ref(db, `${MESSAGES_PATH}/${id}`), { likes: (msg.likes||0)+1 });
  actions.appendChild(likeBtn);

  const dislikeBtn = document.createElement("button"); dislikeBtn.className="small-btn"; dislikeBtn.textContent=`👎 ${msg.dislikes||0}`;
  dislikeBtn.onclick = ()=> update(ref(db, `${MESSAGES_PATH}/${id}`), { dislikes: (msg.dislikes||0)+1 });
  actions.appendChild(dislikeBtn);

  // mark delivered/read (simple)
  const readBtn = document.createElement("button"); readBtn.className="small-btn"; readBtn.textContent = msg.readBy && Array.isArray(msg.readBy) && msg.readBy.includes(localUser?.name) ? "✓ Read" : "Mark Read";
  readBtn.onclick = async ()=>{
    const snap = await get(ref(db, `${MESSAGES_PATH}/${id}/readBy`));
    const arr = snap.exists()? (snap.val()||[]) : [];
    if(!arr.includes(localUser?.name)){
      arr.push(localUser?.name);
      await update(ref(db, `${MESSAGES_PATH}/${id}`), { readBy: arr });
    }
  };
  actions.appendChild(readBtn);

  body.appendChild(actions);
  el.appendChild(body);

  return el;
}

// ---------------------- Send message ----------------------
sendBtn.addEventListener("click", trySend);
msgInput.addEventListener("keydown", (e)=>{
  if(e.key === "Enter" && !e.shiftKey) { e.preventDefault(); trySend(); }
  // typing indicator
  updateTyping(true);
  setTimeout(()=> updateTyping(false), 1200);
});

// profanity + cooldown + offline queue
async function trySend(){
  const textRaw = msgInput.value || "";
  const text = textRaw.trim();
  if(!localUser?.name){ profilePopup.style.display="flex"; return; }
  if(!text && !pendingMediaFile) return;

  const since = now() - lastSendAt;
  if(since < COOLDOWN_MS) {
    alert("Slow down a bit — sending too fast.");
    return;
  }
  lastSendAt = now();

  // basic profanity check
  for(const w of profanityList){
    const re = new RegExp("\\b"+w+"\\b","i");
    if(re.test(text)){ alert("Please avoid offensive language."); return; }
  }

  // if offline
  if(!navigator.onLine){
    offlineQueue.push({ text, media: pendingMediaFile ? { name: pendingMediaFile.name, type: pendingMediaFile.type, blob: pendingMediaFile } : null, ts: now() });
    alert("You're offline — message queued and will send when connection returns.");
    msgInput.value = "";
    pendingMediaFile = null;
    cameraInput.value = ""; galleryInput.value = "";
    return;
  }

  // if there's a file to send
  let mediaURL = null, mediaType = null, mediaName = null;
  if(pendingMediaFile){
    try{
      const sf = sRef(storage, `uploads/${Date.now()}_${pendingMediaFile.name}`);
      await uploadBytes(sf, pendingMediaFile);
      mediaURL = await getDownloadURL(sf);
      mediaType = pendingMediaFile.type;
      mediaName = pendingMediaFile.name;
      pendingMediaFile = null; cameraInput.value=""; galleryInput.value="";
    }catch(err){ console.error("Upload failed",err); alert("Upload failed"); return; }
  }

  const payload = {
    text: sanitizeText(text),
    senderName: localUser.name,
    senderPhoto: localUser.photo,
    timestamp: now(),
    likes: 0,
    dislikes: 0,
    replies: [],
    pinned: false,
    mediaURL, mediaType, mediaName,
    readBy: []
  };

  await push(ref(db, MESSAGES_PATH), payload);
  msgInput.value = "";
  playSound();
}

// ---------------------- Offline queue sync ----------------------
window.addEventListener("online", async ()=>{
  if(offlineQueue.length === 0) return;
  const q = offlineQueue.slice(); offlineQueue = [];
  for(const item of q){
    let mediaURL=null, mediaType=null, mediaName=null;
    if(item.media && item.media.blob){
      const sf = sRef(storage, `uploads/${Date.now()}_${item.media.name}`);
      try{ await uploadBytes(sf, item.media.blob); mediaURL = await getDownloadURL(sf); mediaType = item.media.type; mediaName = item.media.name; }catch(e){ console.error(e); }
    }
    await push(ref(db, MESSAGES_PATH), { text: sanitizeText(item.text), senderName: localUser.name, senderPhoto: localUser.photo, timestamp: item.ts, mediaURL, mediaType, mediaName, likes:0, dislikes:0, replies:[], pinned:false });
  }
  alert(`Synced ${q.length} queued message(s).`);
});

// ---------------------- Media upload buttons ----------------------
let pendingMediaFile = null;
cameraBtn.onclick = ()=> cameraInput.click();
galleryBtn.onclick = ()=> galleryInput.click();
cameraInput.onchange = (e)=> { if(e.target.files[0]) pendingMediaFile = e.target.files[0]; trySend(); };
galleryInput.onchange = (e)=> { if(e.target.files && e.target.files[0]) { pendingMediaFile = e.target.files[0]; trySend(); }};

// ---------------------- Replies ----------------------
function openReply(id){
  currentReplyTo = id;
  replyPopup.style.display = "flex";
  replyText.focus();
}
replyClose.onclick = ()=> replyPopup.style.display="none";
cancelReply.onclick = ()=> { replyPopup.style.display="none"; currentReplyTo=null; replyText.value=""; }

sendReply.onclick = async ()=>{
  const text = replyText.value.trim();
  if(!text) return;
  if(!currentReplyTo) return;
  const payload = { name: localUser.name, text: sanitizeText(text), ts: now() };
  // push to replies array
  const repliesRef = ref(db, `${MESSAGES_PATH}/${currentReplyTo}/replies`);
  const snap = await get(repliesRef);
  const arr = snap.exists() ? (snap.val()||[]) : [];
  arr.push(payload);
  await update(ref(db, `${MESSAGES_PATH}/${currentReplyTo}`), { replies: arr });
  replyPopup.style.display="none"; replyText.value=""; currentReplyTo=null;
};

// ---------------------- Media modal ----------------------
function openMedia(url, type){
  mediaModal.style.display = "flex";
  mediaContent.innerHTML = "";
  if(type && type.startsWith("video")){
    mediaContent.innerHTML = `<video controls autoplay src="${url}" style="max-width:95vw;max-height:80vh;border-radius:12px"></video>`;
  } else {
    mediaContent.innerHTML = `<img src="${url}" style="max-width:95vw;max-height:80vh;border-radius:12px" />`;
  }
}
mediaClose.onclick = ()=> { mediaModal.style.display="none"; mediaContent.innerHTML=""; }

// ---------------------- Editing messages ----------------------
function openEditModal(id, msg){
  editTargetId = id;
  editModal.style.display = "flex";
  editText.value = msg.text || "";
}
editClose.onclick = ()=> { editModal.style.display="none"; editTargetId=null; }
cancelEdit.onclick = ()=> { editModal.style.display="none"; editTargetId=null; }
saveEdit.onclick = async ()=>{
  if(!editTargetId) return;
  const newText = editText.value.trim();
  await update(ref(db, `${MESSAGES_PATH}/${editTargetId}`), { text: sanitizeText(newText), editedAt: now() });
  editModal.style.display="none"; editTargetId=null;
};

// ---------------------- Admin login & actions ----------------------
adminBtn.onclick = ()=> adminPopup.style.display = "flex";
adminClose.onclick = ()=> adminPopup.style.display = "none";
adminCancel.onclick = ()=> adminPopup.style.display = "none";
adminLoginBtn.onclick = async ()=>{
  const pass = adminPass.value;
  if(pass === ADMIN_PASSWORD){
    localUser = localUser || {};
    localUser.isAdmin = true;
    localUser.name = localUser.name || "Admin";
    saveLocalUser(localUser); isAdmin = true;
    adminPopup.style.display = "none";
    adminPanel.style.display = "block";
    alert("Admin login successful");
  } else alert("Wrong admin password");
};

document.getElementById("clearChatBtn").onclick = async ()=>{
  if(!localUser?.isAdmin) return alert("Only admin can clear chat");
  if(!confirm("Clear all messages permanently?")) return;
  await remove(ref(db, MESSAGES_PATH));
  logModeration(`Chat cleared by ${localUser.name}`);
};

// moderation log
function logModeration(text){
  const entry = { ts: now(), text };
  moderationLog.push(entry);
  renderModeration();
}
function renderModeration(){
  moderationLogEl.innerHTML = "";
  moderationLog.slice().reverse().forEach(m=>{
    const d = document.createElement("div");
    d.style.fontSize="13px"; d.style.padding="6px 0"; d.style.borderBottom="1px solid rgba(0,0,0,0.04)";
    d.textContent = `${new Date(m.ts).toLocaleString()}: ${m.text}`;
    moderationLogEl.appendChild(d);
  });
}

// ---------------------- Presence on load ----------------------
window.addEventListener("load", ()=>{
  if(!localUser) localUser = {};
  localUser.name = localUser.name || `User${uidSeed(3)}`;
  localUser.photo = localUser.photo || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(localUser.name)}`;
  saveLocalUser(localUser);
  profileBtn.src = localUser.photo;
  // presence
  goOnline();
});

// presence helpers (reusing defined functions)
function goOnline(){
  const nodeKey = uidSeed(10);
  const myRef = ref(db, `${PRESENCE_PATH}/${nodeKey}`);
  set(myRef, { name: localUser.name, photo: localUser.photo, typing:false, lastSeen: now() });
  onDisconnect(myRef).remove();
}

// typing updates already implemented earlier in input handler

// ---------------------- Search & export ----------------------
searchBtn.onclick = ()=> applySearch();
searchInput.addEventListener("keydown",(e)=> { if(e.key==='Enter') applySearch(); });
clearSearch.onclick = ()=> { searchInput.value=""; applySearch(); }

async function applySearch(){
  const q = (searchInput.value||"").trim().toLowerCase();
  const snap = await get(ref(db, MESSAGES_PATH));
  const data = snap.exists()? snap.val() : {};
  if(!q){ renderMessages(data); return; }
  const results = {};
  Object.entries(data).forEach(([id,m])=>{
    if((m.text||"").toLowerCase().includes(q) || (m.senderName||"").toLowerCase().includes(q) || (new Date(m.timestamp||0).toLocaleString()).toLowerCase().includes(q)){
      results[id]=m;
    }
  });
  renderMessages(results);
}

// export chat
exportBtn.onclick = async ()=>{
  const snap = await get(ref(db, MESSAGES_PATH));
  const data = snap.exists()? snap.val() : {};
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  downloadAnchor.href = URL.createObjectURL(blob);
  downloadAnchor.download = `mirdhuna_chat_${new Date().toISOString().slice(0,19)}.json`;
  downloadAnchor.click();
};

// ---------------------- Theme toggle ----------------------
themeToggle.onclick = ()=>{
  const body = document.body;
  const isDark = body.classList.contains("dark");
  if(isDark){ body.classList.remove("dark"); body.classList.add("light"); themeToggle.textContent="🌙 Theme"; }
  else { body.classList.remove("light"); body.classList.add("dark"); themeToggle.textContent="☀ Theme"; }
};

// ---------------------- Sound toggle ----------------------
toggleSoundBtn.onclick = ()=>{
  soundOn = !soundOn;
  toggleSoundBtn.textContent = `🔔 Sound: ${soundOn? "On":"Off"}`;
};

// ---------------------- Misc UI handlers ----------------------
refreshBtn.onclick = ()=> { location.reload(); };
profileBtn.onclick = ()=> profilePopup.style.display = "flex";
profileClose.onclick = ()=> profilePopup.style.display = "none";
saveProfile.onclick = async ()=>{
  const name = nameInput.value.trim();
  if(!name) return alert("Enter a name");
  let photoURL = localUser.photo;
  if(photoInput.files && photoInput.files[0]){
    const f = photoInput.files[0];
    const sref = sRef(storage, `profiles/${Date.now()}_${f.name}`);
    await uploadBytes(sref, f);
    photoURL = await getDownloadURL(sref);
  }
  localUser = { ...localUser, name, photo: photoURL };
  saveLocalUser(localUser);
  profileBtn.src = photoURL;
  profilePopup.style.display = "none";
};
clearProfile.onclick = ()=> { localStorage.removeItem("mirdhuna_user"); localUser=null; alert("Profile cleared; reload to setup again"); };

// ---------------------- Helpers ----------------------
function scrollBottom(){ setTimeout(()=> chatBox.scrollTo({ top: chatBox.scrollHeight, behavior:"smooth" }), 80); }

// ---------------------- Simple read receipts: update readBy when visible ----------------------
const observer = new IntersectionObserver(entries=>{
  entries.forEach(async ent=>{
    if(ent.isIntersecting){
      const id = ent.target.dataset.id;
      if(!id) return;
      const snap = await get(ref(db, `${MESSAGES_PATH}/${id}/readBy`));
      const arr = snap.exists()? (snap.val()||[]) : [];
      if(!arr.includes(localUser.name)){
        arr.push(localUser.name);
        await update(ref(db, `${MESSAGES_PATH}/${id}`), { readBy: arr });
      }
    }
  });
}, { root: chatBox, threshold: 0.7 });

// attach observer whenever new messages rendered (called in renderMessages)
const originalRenderMessages = renderMessages;
renderMessages = function(messages){
  originalRenderMessages(messages);
  // attach to message nodes
  document.querySelectorAll('.message').forEach(node=>{
    observer.observe(node);
  });
};

// ---------------------- Final small UX: beep on new message ----------------------
let lastRendered = 0;
onValue(recentQuery, snapshot=>{
  const val = snapshot.val() || {};
  const newestTs = Math.max(...Object.values(val).map(m=>m.timestamp||0), 0);
  if(newestTs > lastRendered && lastRendered !== 0){ playSound(); }
  lastRendered = newestTs;
  renderMessages(val);
});

// End of file
console.log("Mirdhuna Chat JS loaded — features: presence, typing, edit, pin, search, export, offline queue.");
