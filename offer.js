import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getStorage, ref, listAll, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCPbOZwAZEMiC1LSDSgnSEPmSxQ7-pR2oQ",
  authDomain: "mirdhuna-25542.firebaseapp.com",
  projectId: "mirdhuna-25542",
  storageBucket: "mirdhuna-25542.appspot.com",
  messagingSenderId: "575924409876",
  appId: "1:575924409876:web:6ba1ed88ce941d9c83b901"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

const slider = document.getElementById("offerSlider");
const nav = document.getElementById("offerNav");

let slides = [];
let index = 0;
let autoSlideInterval;

// 🔥 Load images from Firebase Storage folder "offerslide"
const listRef = ref(storage, "offerslide");

listAll(listRef)
.then((res) => {

  slider.innerHTML = "";
  nav.innerHTML = "";
  slides = [];

  if (!res.items.length) return;

  res.items.forEach((itemRef) => {

    getDownloadURL(itemRef).then((url) => {

      const div = document.createElement("div");
      div.classList.add("offer-slide");
      div.style.backgroundImage = `url('${url}')`;

      slider.appendChild(div);
      slides.push(div);

      if (slides.length === res.items.length) {
        setupOfferSlider();
      }

    });

  });

})
.catch((error) => {
  console.error("Error loading images:", error);
});

function setupOfferSlider() {

  const dots = [];
  nav.innerHTML = "";

  slides.forEach((slide, i) => {

    const dot = document.createElement("div");
    dot.classList.add("offer-dot");

    if (i === 0) dot.classList.add("active");

    dot.addEventListener("click", () => goToSlide(i));

    nav.appendChild(dot);
    dots.push(dot);

  });

  function goToSlide(i) {

    index = i;

    slider.style.transform = `translateX(-${i * 100}%)`;

    dots.forEach((d, j) => {
      d.classList.toggle("active", i === j);
    });

  }

  document.querySelector(".prev").addEventListener("click", () => {
    goToSlide((index - 1 + slides.length) % slides.length);
  });

  document.querySelector(".next").addEventListener("click", () => {
    goToSlide((index + 1) % slides.length);
  });

  autoSlideInterval = setInterval(() => {
    goToSlide((index + 1) % slides.length);
  }, 2500);

}
