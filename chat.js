import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey:"AIzaSyCPbOZwAZEMiC1LSDSgnSEPmSxQ7-pR2oQ",
  authDomain:"mirdhuna-25542.firebaseapp.com",
  databaseURL:"https://mirdhuna-25542-default-rtdb.firebaseio.com",
  projectId:"mirdhuna-25542",
  storageBucket:"mirdhuna-25542.appspot.com",
  messagingSenderId:"575924409876",
  appId:"1:575924409876:web:6ba1ed88ce941d9c83b901"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

let user = JSON.parse(localStorage.getItem("chatUser")) || null;
let replyToMsg = null;
let fileToSend = null;

const chatBox = document.getElementById("chatBox");
const msgInput = document.getElementById("msg");
const cameraBtn = document.getElementById("cameraBtn");
const galleryBtn = document.getElementById("galleryBtn");
const cameraInput = document.getElementById("cameraInput");
const galleryInput = document.getElementById("galleryInput");

cameraBtn.onclick = ()=>cameraInput.click();
galleryBtn.onclick = ()=>galleryInput.click();
cameraInput.onchange = e=>{if(e.target.files[0]) fileToSend=e.target.files[0];}
galleryInput.onchange = e=>{if(e.target.files[0]) fileToSend=e.target.files[0];}

const profilePopup = document.getElementById("profilePopup");
const profileBtn = document.getElementById("profileBtn");
const nameInput = document.getElementById("name");
const photoInput = document.getElementById("photo");
document.getElementById("profileClose").onclick = ()=>profilePopup.style.display="none";
if(!user) profilePopup.style.display="flex";
if(user?.photoURL) profileBtn.src=user.photoURL;
profileBtn.onclick = ()=>profilePopup.style.display="flex";
document.getElementById("saveProfile").onclick = async()=>{
  const name=nameInput.value.trim();
  if(!name) return alert("Enter your name");
  let photoURL="";
  if(photoInput.files[0]){
    const file = photoInput.files[0];
    const path = `profiles/${Date.now()}_${file.name}`;
    const sref = sRef(storage,path);
    await uploadBytes(sref,file);
    photoURL = await getDownloadURL(sref);
  }
  user={name,photoURL,isAdmin:false};
  localStorage.setItem("chatUser",JSON.stringify(user));
  profilePopup.style.display="none";
  if(photoURL) profileBtn.src=photoURL;
}

const adminPopup = document.getElementById("adminPopup");
document.getElementById("adminClose").onclick = ()=>adminPopup.style.display="none";
const adminBtn = document.getElementById("adminBtn");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminPassInput = document.getElementById("adminPass");
const adminPanel = document.getElementById("adminPanel");
adminBtn.onclick = ()=>adminPopup.style.display="flex";
adminLoginBtn.onclick = ()=>{
  if(adminPassInput.value==="sanu0000"){
    user={name:"Admin",photoURL:"",isAdmin:true};
    localStorage.setItem("chatUser",JSON.stringify(user));
    adminPopup.style.display="none";
    adminPanel.style.display="block";
    alert("Admin login successful");
  }else alert("Wrong password");
}

document.getElementById("send").onclick = async()=>{
  if(!user){profilePopup.style.display="flex"; return;}
  const text = msgInput.value.trim();
  if(!text && !fileToSend) return;
  let mediaUrl="", mediaType="", mediaName="";
  if(fileToSend){
    const file = fileToSend;
    const path=`uploads/${Date.now()}_${file.name}`;
    const sref=sRef(storage,path);
    await uploadBytes(sref,file);
    mediaUrl = await getDownloadURL(sref);
    mediaType = file.type;
    mediaName = file.name;
    fileToSend=null;
  }
  await push(ref(db,"messages"),{
    user:user.name, photo:user.photoURL, isAdmin:user.isAdmin, text,
    mediaUrl, mediaType, mediaName, timestamp:Date.now(), replies:{}, likes:0, dislikes:0
  });
  msgInput.value="";
}

const replyPopup = document.getElementById("replyPopup");
const replyText = document.getElementById("replyText");
document.getElementById("replyClose").onclick = ()=>{replyPopup.style.display="none"; replyToMsg=null;}
window.replyMessage = (key)=>{
  replyToMsg=key;
  replyPopup.style.display="flex";
  replyText.value="";
  replyText.focus();
}
document.getElementById("sendReply").onclick = async()=>{
  if(!replyText.value.trim() || !replyToMsg) return;
  const replyRef = ref(db,`messages/${replyToMsg}/replies`);
  await push(replyRef,{user:user.name,text:replyText.value,timestamp:Date.now()});
  replyPopup.style.display="none"; replyToMsg=null;
}

window.likeMessage = async(key)=>{
  const msgRef = ref(db,`messages/${key}`);
  const snap = await get(msgRef);
  const val = snap.val();
  await update(msgRef,{likes:(val.likes||0)+1});
};
window.dislikeMessage = async(key)=>{
  const msgRef = ref(db,`messages/${key}`);
  const snap = await get(msgRef);
  const val = snap.val();
  await update(msgRef,{dislikes:(val.dislikes||0)+1});
};

window.deleteMessage = async(key)=>{
  if(!user?.isAdmin) return alert("Only admin can delete messages");
  if(confirm("Delete this message?")) await remove(ref(db,"messages/"+key));
};

const mediaModal = document.getElementById("mediaModal");
const mediaContent = document.getElementById("mediaContent");
const mediaClose = document.getElementById("mediaClose");
mediaClose.onclick = ()=>{mediaModal.style.display="none"; mediaContent.innerHTML="";}
window.showMedia=(url,type)=>{
  mediaContent.innerHTML="";
  if(type?.startsWith("image")) mediaContent.innerHTML=`<img src="${url}"/>`;
  else if(type?.startsWith("video")) mediaContent.innerHTML=`<video src="${url}" controls autoplay></video>`;
  mediaModal.style.display="flex";
}

function renderMessages(data){
  chatBox.innerHTML="";
  Object.entries(data||{}).sort((a,b)=>a[1].timestamp-b[1].timestamp).forEach(([key,msg])=>{
    const div=document.createElement("div"); div.className="message";
    let repliesHTML="";
    if(msg.replies) Object.values(msg.replies).forEach(r=>{
      repliesHTML+=`<div class="reply-inline"><strong>${r.user}</strong>: ${r.text}</div>`;
    });

    let mediaHTML="";
    if(msg.mediaUrl){
      if(msg.mediaType?.startsWith("video")){
        mediaHTML=`<video class="media-content" src="${msg.mediaUrl}" onclick="showMedia('${msg.mediaUrl}','${msg.mediaType}')"></video>`;
      } else{
        mediaHTML=`<img class="media-content" src="${msg.mediaUrl}" onclick="showMedia('${msg.mediaUrl}','${msg.mediaType}')"/>`;
      }
    }

    div.innerHTML=`
      <div class="header">
        <img class="profile" src="${msg.photo||'https://api.dicebear.com/7.x/thumbs/svg?seed='+msg.user}">
        <div>
          <div class="name-line">
            <strong>${msg.user}</strong>
            ${msg.isAdmin?'<span class="admin-tag">Admin</span>':''}
          </div>
          <div class="meta">${new Date(msg.timestamp).toLocaleTimeString()}</div>
        </div>
      </div>
      <div class="content">${msg.text||''}</div>
      ${mediaHTML}
      ${repliesHTML}
      <div class="actions">
        <button onclick="replyMessage('${key}')">💬 Reply</button>
        <button onclick="likeMessage('${key}')">👍 ${msg.likes||0}</button>
        <button onclick="dislikeMessage('${key}')">👎 ${msg.dislikes||0}</button>
        ${user?.isAdmin?`<button onclick="deleteMessage('${key}')">🗑️ Delete</button>`:''}
      </div>
    `;
    chatBox.appendChild(div);
  });
  chatBox.scrollTop=chatBox.scrollHeight;
}

onValue(ref(db,"messages"), snapshot=>renderMessages(snapshot.val()));

document.getElementById("refreshBtn").onclick = async()=>{
  const snapshot = await get(ref(db,"messages"));
  renderMessages(snapshot.val());
};
