import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = { /* YOUR SAME CONFIG */ };

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

let user = JSON.parse(localStorage.getItem("chatUser")) || null;
let fileToSend = null;

/* ELEMENTS */
const chatBox = document.getElementById("chatBox");
const profilePopup = document.getElementById("profilePopup");
const profilePreview = document.getElementById("profilePreview");
const nameInput = document.getElementById("nameInput");
const photoInput = document.getElementById("photoInput");
const headerPic = document.getElementById("headerPic");
const headerName = document.getElementById("headerName");
const msgInput = document.getElementById("msg");

/* PROFILE */
if (!user) profilePopup.style.display = "flex";
else updateHeader();

photoInput.onchange = () => {
  const file = photoInput.files[0];
  if (file) profilePreview.src = URL.createObjectURL(file);
};

document.getElementById("saveProfile").onclick = async () => {
  const name = nameInput.value.trim();
  if (!name) return alert("Enter name");

  let photoURL = "";
  if (photoInput.files[0]) {
    const s = sRef(storage, "profiles/" + Date.now());
    await uploadBytes(s, photoInput.files[0]);
    photoURL = await getDownloadURL(s);
  }

  user = { name, photoURL };
  localStorage.setItem("chatUser", JSON.stringify(user));
  profilePopup.style.display = "none";
  updateHeader();
};

function updateHeader(){
  headerName.textContent = user.name;
  headerPic.src = user.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.name}`;
}

/* MEDIA */
document.getElementById("mediaBtn").onclick = () => mediaInput.click();
mediaInput.onchange = e => fileToSend = e.target.files[0];

/* GIFTS */
document.getElementById("giftBtn").onclick = () => {
  msgInput.value += " 🎁";
  msgInput.focus();
};

/* SEND */
document.getElementById("sendBtn").onclick = async () => {
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
    text:msgInput.value,
    mediaUrl,
    mediaType,
    time:Date.now()
  });
  msgInput.value="";
};

/* RENDER */
onValue(ref(db,"messages"),snap=>{
  chatBox.innerHTML="";
  Object.values(snap.val()||{}).forEach(m=>{
    const div=document.createElement("div");
    div.className="message";
    div.innerHTML=`
      <div class="header-line">
        <img class="profile" src="${m.photo}">
        <strong>${m.user}</strong>
      </div>
      ${m.text?`<div class="content">${m.text}</div>`:""}
      ${m.mediaUrl?`
        <div class="media">
          ${m.mediaType.startsWith("video")
            ? `<video src="${m.mediaUrl}"></video><div class="play-btn">▶</div>`
            : `<img src="${m.mediaUrl}">`}
        </div>`:""}
    `;
    chatBox.appendChild(div);
  });
  chatBox.scrollTop=chatBox.scrollHeight;
});
