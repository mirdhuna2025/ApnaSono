import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, push } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ✅ Firebase Config — Clean, no trailing spaces
const firebaseConfig = {
  apiKey: "AIzaSyCPbOZwAZEMiC1LSDSgnSEPmSxQ7-pR2oQ",
  authDomain: "mirdhuna-25542.firebaseapp.com",
  databaseURL: "https://mirdhuna-25542-default-rtdb.firebaseio.com",
  projectId: "mirdhuna-25542",
  storageBucket: "mirdhuna-25542.appspot.com",
  messagingSenderId: "575924409876",
  appId: "1:575924409876:web:6ba1ed88ce941d9c83b901"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM Elements
const slider = document.getElementById("slider");
const nav = document.getElementById("sliderNav");
let slides = [];
let index = 0;
let autoSlideInterval;

// Load slides from Firebase
onValue(ref(db, 'slides'), (snapshot) => {
  const data = snapshot.val();
  
  // Cleanup previous state
  if (autoSlideInterval) clearInterval(autoSlideInterval);
  slider.innerHTML = '';
  nav.innerHTML = '';
  slides = [];

  if (!data) return;

  // Create slides
  Object.values(data).forEach(item => {
    if (!item.image) return;
    
    const div = document.createElement('div');
    div.classList.add('slide');
    div.dataset.url = item.url || '';  // Store URL for click handler
    div.dataset.image = item.image;    // Store image for logging
    div.style.backgroundImage = `url('${item.image}')`;
    
    slider.appendChild(div);
    slides.push(div);
  });

  // Setup slider if we have slides
  if (slides.length > 0) {
    setupSlider();
  }
});

function setupSlider() {
  const dots = [];
  nav.innerHTML = '';

  // Create navigation dots
  slides.forEach((slide, i) => {
    const dot = document.createElement('div');
    dot.classList.add('slider-dot');
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goToSlide(i));
    nav.appendChild(dot);
    dots.push(dot);

    // Click handler for slide
    slide.addEventListener('click', () => {
      const imgUrl = slide.dataset.image;
      const url = slide.dataset.url;
      
      // Log click to Firebase
      push(ref(db, 'slideClicks'), {
        image: imgUrl,
        url: url,
        clickedAt: new Date().toISOString()
      });

      // Open link if exists
      if (url) window.open(url, '_blank');
    });
  });

  function goToSlide(i) {
    index = i;
    slider.style.transform = `translateX(-${i * 100}%)`;
    dots.forEach((d, j) => d.classList.toggle('active', i === j));
  }

  // Navigation buttons
  document.querySelector(".prev").addEventListener("click", () => {
    goToSlide((index - 1 + slides.length) % slides.length);
  });

  document.querySelector(".next").addEventListener("click", () => {
    goToSlide((index + 1) % slides.length);
  });

  // Auto-slide every 5 seconds
  autoSlideInterval = setInterval(() => {
    goToSlide((index + 1) % slides.length);
  }, 5000);
}
