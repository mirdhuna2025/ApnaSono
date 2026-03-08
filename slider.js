import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getStorage, ref, listAll, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

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
const storage = getStorage(app);

const slider = document.getElementById("slideSlider");
const nav = document.getElementById("slideNav");

const preview = document.getElementById("imagePreview");
const previewImg = document.getElementById("previewImg");
const closePreview = document.getElementById("closePreview");

let slides = [];
let index = 0;
let autoSlide;

async function loadSlides() {

  slider.innerHTML="";
  nav.innerHTML="";
  slides=[];

  const folderRef = ref(storage,"slideslide/");
  const result = await listAll(folderRef);

  const urls = await Promise.all(
    result.items.map(item => getDownloadURL(item))
  );

  urls.forEach((url,i)=>{

    const div=document.createElement("div");
    div.className="slide-slide";
    div.style.backgroundImage=`url('${url}')`;

    // CLICK IMAGE PREVIEW
    div.addEventListener("click",()=>{
      preview.style.display="flex";
      previewImg.src=url;
    });

    slider.appendChild(div);
    slides.push(div);

    const dot=document.createElement("div");
    dot.className="slide-dot";
    if(i===0) dot.classList.add("active");

    dot.onclick=()=>goToSlide(i);

    nav.appendChild(dot);

  });

  startSlider();

}

function goToSlide(i){

  index=i;

  slider.style.transform=`translateX(-${i*100}%)`;

  document.querySelectorAll(".slide-dot").forEach((d,j)=>{
    d.classList.toggle("active",j===i)
  });

}

function startSlider(){

  autoSlide=setInterval(()=>{
    index=(index+1)%slides.length;
    goToSlide(index);
  },2500);

}

document.querySelector(".prev").onclick=()=>{
  index=(index-1+slides.length)%slides.length;
  goToSlide(index);
}

document.querySelector(".next").onclick=()=>{
  index=(index+1)%slides.length;
  goToSlide(index);
}

// CLOSE PREVIEW
closePreview.onclick=()=>{
  preview.style.display="none";
}

preview.onclick=(e)=>{
  if(e.target===preview){
    preview.style.display="none";
  }
}

loadSlides();
