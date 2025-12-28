// chat.js — Enhanced (keeps ALL original features)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

/* FIREBASE CONFIG — SAME AS YOURS */
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

/* STATE */
let user = JSON.parse(localStorage.getItem("chatUser")) || null;
let replyToMsg = null;
let fileToSend = null;

/* ELEMENTS */
const chatBox = document.getElementById("chatBox");
const msgInput = document.getElementById("msg");
const cameraBtn = document.getElementById("cameraBtn");
const galleryBtn = document.getElementById("galleryBtn");
const cameraInput = document.getElementById("cameraInput");
const galleryInput = document.getElementById("galleryInput");
const profilePopup = document.getElementById("profilePopup");
const profilePreview = document.getElementById("profilePreview");
const nameInput = document.getElementById("name");
const photoInput = document.getElementById("photo");
const headerPic = document.getElementById("headerPic");
const headerName = document.getElementById("headerName");
const adminPopup = document.getElementById("adminPopup");
const adminBtn = document.getElementById("adminBtn");
const adminPassInput = document.getElementById("adminPass");
const replyPopup = document.getElementById("replyPopup");
const replyText = document.getElementById("replyText");
const mediaModal = document.getElementById("mediaModal");
const mediaContent = document.getElementById("mediaContent");

/* PROFILE */
if (!user) profilePopup.style.display = "flex";
else updateHeader();

photoInput.onchange = () => {
  if (photoInput.files[0]) {
    profilePreview.src = URL.createObjectURL(photoInput.files[0]);
  }
};

document.getElementById("saveProfile").onclick = async () => {
  const name = nameInput.value.trim();
  if (!name) return alert("Enter name");
  let photoURL = user?.photoURL || "";

  if (photoInput.files[0]) {
    const s = sRef(storage, "profiles/" + Date.now());
    await uploadBytes(s, photoInput.files[0]);
    photoURL = await getDownloadURL(s);
  }

  user = { name, photoURL, isAdmin:false };
  localStorage.setItem("chatUser", JSON.stringify(user));
  profilePopup.style.display = "none";
  updateHeader();
};

function updateHeader(){
  headerName.textContent = user.name;
  headerPic.src = user.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.name}`;
}

/* MEDIA PICK */
cameraBtn.onclick = () => cameraInput.click();
galleryBtn.onclick = () => galleryInput.click();
cameraInput.onchange = e => fileToSend = e.target.files[0];
galleryInput.onchange = e => fileToSend = e.target.files[0];

/* GIFTS */
document.getElementById("giftBtn").onclick = () => {
  msgInput.value += " 🎁";
  msgInput.focus();
};

/* SEND */
document.getElementById("send").onclick = async () => {
  if (!msgInput.value && !fileToSend) return;

  let mediaUrl="", mediaType="";
  if (fileToSend) {
    const s = sRef(storage,"uploads/"+Date.now());
    await uploadBytes(s,fileToSend);
    mediaUrl = await getDownloadURL(s);
    mediaType = fileToSend.type;
    fileToSend=null;
  }

  await push(ref(db,"messages"),{
    user:user.name,
    photo:user.photoURL,
    isAdmin:user.isAdmin,
    text:msgInput.value,
    mediaUrl,
    mediaType,
    timestamp:Date.now(),
    likes:0,
    dislikes:0,
    replies:{}
  });

  msgInput.value="";
};

/* RENDER */
function format(ts){
  return new Date(ts).toLocaleString();
}

onValue(ref(db,"messages"),snap=>{
  chatBox.innerHTML="";
  const data=snap.val()||{};
  Object.entries(data).sort((a,b)=>a[1].timestamp-b[1].timestamp)
  .forEach(([key,m])=>{
    let replies="";
    if(m.replies){
      replies="<div class='replies-section'>";
      Object.values(m.replies).forEach(r=>{
        replies+=`<div class="reply-inline"><b>${r.user}</b>: ${r.text}</div>`;
      });
      replies+="</div>";
    }

    const div=document.createElement("div");
    div.className="message";
    div.innerHTML=`
      <div class="header">
        <img class="profile" src="${m.photo}">
        <div>
          <div class="name-line">
            <b>${m.user}</b>
            ${m.isAdmin?'<span class="admin-tag">Admin</span>':""}
          </div>
          <div class="meta">${format(m.timestamp)}</div>
        </div>
      </div>
      ${m.text?`<div class="content">${m.text}</div>`:""}
      ${m.mediaUrl?`
        <div class="media" onclick="showMedia('${m.mediaUrl}','${m.mediaType}')">
          ${m.mediaType.startsWith("video")
            ? `<video src="${m.mediaUrl}"></video><div class="play-overlay">▶</div>`
            : `<img src="${m.mediaUrl}">`}
        </div>`:""}
      ${replies}
      <div class="actions">
        <button class="reply-btn" onclick="replyMessage('${key}')">💬 Reply</button>
        <button class="like-btn" onclick="likeMessage('${key}')">👍 ${m.likes||0}</button>
        <button class="dislike-btn" onclick="dislikeMessage('${key}')">👎 ${m.dislikes||0}</button>
        ${user?.isAdmin?`<button class="delete-btn" onclick="deleteMessage('${key}')">🗑️</button>`:""}
      </div>
    `;
    chatBox.appendChild(div);
  });
  chatBox.scrollTop=chatBox.scrollHeight;
});

/* GLOBAL ACTIONS */
window.replyMessage = k => { replyToMsg=k; replyPopup.style.display="flex"; };
document.getElementById("sendReply").onclick = async ()=>{
  if(!replyText.value) return;
  await push(ref(db,`messages/${replyToMsg}/replies`),{
    user:user.name,
    text:replyText.value,
    timestamp:Date.now()
  });
  replyText.value="";
  replyPopup.style.display="none";
};

window.likeMessage = async k=>{
  const r=ref(db,`messages/${k}`);
  const s=await get(r);
  update(r,{likes:(s.val().likes||0)+1});
};
window.dislikeMessage = async k=>{
  const r=ref(db,`messages/${k}`);
  const s=await get(r);
  update(r,{dislikes:(s.val().dislikes||0)+1});
};
window.deleteMessage = async k=>{
  if(!user?.isAdmin) return;
  if(confirm("Delete?")) await remove(ref(db,`messages/${k}`));
};
window.showMedia = (u,t)=>{
  mediaContent.innerHTML=t.startsWith("video")
    ? `<video src="${u}" controls autoplay></video>`
    : `<img src="${u}">`;
  mediaModal.style.display="flex";
};

/* ADMIN */
adminBtn.onclick=()=>adminPopup.style.display="flex";
document.getElementById("adminLoginBtn").onclick=()=>{
  if(adminPassInput.value==="sanu0000"){
    user={name:"Admin",photoURL:"",isAdmin:true};
    localStorage.setItem("chatUser",JSON.stringify(user));
    updateHeader();
    adminPopup.style.display="none";
  }else alert("Wrong password");
};

/* REFRESH */
document.getElementById("refreshBtn").onclick=async()=>{
  const s=await get(ref(db,"messages"));
  chatBox.scrollTop=chatBox.scrollHeight;
};
