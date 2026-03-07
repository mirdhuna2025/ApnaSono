// ✅ Clean imports (no trailing spaces)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getStorage, ref, listAll, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// 🔥 Your Firebase Config for mirdhuna-25542 (cleaned)
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

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
// Optional: analytics if you need it
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
// const analytics = getAnalytics(app);

// 🔹 Slider DOM Elements
const slider = document.getElementById("slideSlider");
const nav = document.getElementById("slideNav");
let slides = [];
let index = 0;
let autoSlideInterval;

// 🔥 Load slides from Firebase Storage folder 'slideslide/'
async function loadSlidesFromStorage() {
  if (autoSlideInterval) clearInterval(autoSlideInterval);
  slider.innerHTML = "";
  nav.innerHTML = "";
  slides = [];

  try {
    const folderRef = ref(storage, "slideslide/");
    const result = await listAll(folderRef);
    
    // Filter for common image file types only
    const imageFiles = result.items.filter(item => 
      /\.(jpg|jpeg|png|gif|webp)$/i.test(item.name)
    );

    // Get public download URLs for each image
    const imageUrls = await Promise.all(
      imageFiles.map(item => getDownloadURL(item))
    );

    // Create slide elements
    imageUrls.forEach((imageUrl) => {
      const div = document.createElement("div");
      div.classList.add("slide-slide");
      div.dataset.image = imageUrl;
      div.style.backgroundImage = `url('${imageUrl}')`;
      slider.appendChild(div);
      slides.push(div);
    });

    if (slides.length > 0) {
      setupslideSlider();
    }
  } catch (error) {
    console.error("❌ Error loading slides from Firebase Storage:", error);
    slider.innerHTML = `<div style="padding:20px;color:#f5576c">Failed to load images. Check console.</div>`;
  }
}

function setupslideSlider() {
  const dots = [];
  nav.innerHTML = "";

  slides.forEach((slide, i) => {
    // Create navigation dots
    const dot = document.createElement("div");
    dot.classList.add("slide-dot");
    if (i === 0) dot.classList.add("active");
    dot.addEventListener("click", () => goToSlide(i));
    nav.appendChild(dot);
    dots.push(dot);
  });

  function goToSlide(i) {
    index = i;
    slider.style.transform = `translateX(-${i * 100}%)`;
    dots.forEach((d, j) => d.classList.toggle("active", i === j));
  }

  // Safe event listener attachment with optional chaining
  document.querySelector(".prev")?.addEventListener("click", () => {
    goToSlide((index - 1 + slides.length) % slides.length);
  });

  document.querySelector(".next")?.addEventListener("click", () => {
    goToSlide((index + 1) % slides.length);
  });

  // Auto-advance slides
  autoSlideInterval = setInterval(() => {
    goToSlide((index + 1) % slides.length);
  }, 2500);
}

// ✅ Initial load when page is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadSlidesFromStorage);
} else {
  loadSlidesFromStorage();
}
