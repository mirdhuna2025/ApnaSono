import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCPbOZwAZEMiC1LSDSgnSEPmSxQ7-pR2oQ",
  authDomain: "mirdhuna-25542.firebaseapp.com",
  databaseURL: "https://mirdhuna-25542-default-rtdb.firebaseio.com",
  projectId: "mirdhuna-25542",
  storageBucket: "mirdhuna-25542.firebasestorage.app",
  messagingSenderId: "575924409876",
  appId: "1:575924409876:web:6ba1ed88ce941d9c83b901",
  measurementId: "G-YB7LDKHBPV"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

let anonymousId = localStorage.getItem("anonId");

if(!anonymousId){
  anonymousId = "anon_"+Math.random().toString(36).substr(2,9);
  localStorage.setItem("anonId", anonymousId);
}

let anonymousName = "Anonymous";

const upload = document.getElementById("uploadFile");
const storiesDiv = document.getElementById("stories");

upload.addEventListener("change", async () => {

const file = upload.files[0];

const storageRef = sRef(storage,"status/"+Date.now()+file.name);

await uploadBytes(storageRef,file);

const url = await getDownloadURL(storageRef);

push(ref(db,"status"),{
  url:url,
  type:file.type,
  time:Date.now(),
  uid:anonymousId,
  name:anonymousName,
  reactions:{},
  seen:{}
});

});

onValue(ref(db,"status"),snapshot=>{

storiesDiv.innerHTML = "";

snapshot.forEach(data=>{

const status = data.val();

if(Date.now()-status.time > 86400000){
remove(ref(db,"status/"+data.key));
return;
}

const div=document.createElement("div");
div.className="story";

const img=document.createElement("img");
img.src=status.url;

const name=document.createElement("p");
name.innerText=status.name || "Status";

div.appendChild(img);
div.appendChild(name);

div.onclick=()=>openViewer(status,data.key);

storiesDiv.appendChild(div);

});

});

const viewer=document.getElementById("viewer");
const img=document.getElementById("viewImg");
const video=document.getElementById("viewVideo");
const bar=document.getElementById("bar");
const seenListDiv = document.getElementById("seenList");
const likeBtn = document.getElementById("likeBtn");
const smileBtn = document.getElementById("smileBtn");

let progressInterval;

function openViewer(status, statusKey){

viewer.style.display="flex";

bar.style.width="0%";

let progress=0;

const seenRef = ref(db,"status/"+statusKey+"/seen/"+anonymousId);

update(seenRef,{name:anonymousName});

onValue(ref(db,"status/"+statusKey+"/seen"),snap=>{

let names=[];

snap.forEach(s=>{
names.push(s.val().name);
});

seenListDiv.innerText="Seen: "+names.join(", ");

});

clearInterval(progressInterval);

progressInterval=setInterval(()=>{

progress+=2;

bar.style.width=progress+"%";

if(progress>=100){
clearInterval(progressInterval);
viewer.style.display="none";
}

},100);

if(status.type.startsWith("image")){

img.style.display="block";
video.style.display="none";
img.src=status.url;

}else{

video.style.display="block";
img.style.display="none";
video.src=status.url;
video.play();

}

likeBtn.onclick=()=>addReaction(statusKey,"❤️");
smileBtn.onclick=()=>addReaction(statusKey,"😊");

}

function addReaction(statusKey,reaction){

const reactionRef = ref(db,"status/"+statusKey+"/reactions/"+anonymousId);

update(reactionRef,{reaction});

}
