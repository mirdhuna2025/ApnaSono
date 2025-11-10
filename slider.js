<script type="module">
// Firebase SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, push } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getStorage, ref as storageRef, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

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
const storage = getStorage(app);

// DOM Elements
const slider = document.getElementById("slider");
const nav = document.getElementById("sliderNav");
let slides = [];
let index = 0;
let autoSlideInterval;

// Load slides from Firebase Realtime DB, resolve images from Storage (sono/)
onValue(ref(db, 'slides'), async (snapshot) => {
  const data = snapshot.val();

  // Cleanup previous state
  if (autoSlideInterval) clearInterval(autoSlideInterval);
  slider.innerHTML = '';
  nav.innerHTML = '';
  slides = [];

  if (!data) {
    console.log("No slides found in /slides");
    return;
  }

  const slideEntries = Object.values(data);
  const slidePromises = slideEntries.map(async (item, i) => {
    if (!item.filename) {
      console.warn(`Slide ${i} missing 'filename' field. Skipping.`);
      return null;
    }

    try {
      const imageRef = storageRef(storage, `sono/${item.filename}`);
      const imageUrl = await getDownloadURL(imageRef);
      return { ...item, image: imageUrl };
    } catch (err) {
      console.error(`Failed to load image 'sono/${item.filename}'`, err);
      return null;
    }
  });

  const resolvedSlides = (await Promise.all(slidePromises)).filter(Boolean);

  // Create slide DOM elements
  resolvedSlides.forEach(item => {
    const div = document.createElement('div');
    div.classList.add('slide');
    div.dataset.url = item.url || '';
    div.dataset.image = item.image;
    div.style.backgroundImage = `url('${item.image}')`;
    div.style.backgroundSize = 'cover';
    div.style.backgroundPosition = 'center';
    slider.appendChild(div);
    slides.push(div);
  });

  if (slides.length > 0) {
    setupSlider();
  } else {
    console.log("No valid slides to display");
  }
});

function setupSlider() {
  const dots = [];
  nav.innerHTML = '';

  // Create navigation dots and attach click handlers
  slides.forEach((slide, i) => {
    const dot = document.createElement('div');
    dot.classList.add('slider-dot');
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goToSlide(i));
    nav.appendChild(dot);
    dots.push(dot);

    // Slide click → log & open URL
    slide.addEventListener('click', () => {
      const imgUrl = slide.dataset.image;
      const url = slide.dataset.url;

      // Log to Firebase
      push(ref(db, 'slideClicks'), {
        image: imgUrl,
        url: url,
        clickedAt: new Date().toISOString(),
        timestamp: Date.now()
      });

      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    });
  });

  function goToSlide(i) {
    index = i;
    slider.style.transition = 'transform 0.5s ease-in-out';
    slider.style.transform = `translateX(-${i * 100}%)`;
    dots.forEach((d, j) => d.classList.toggle('active', i === j));
  }

  // Prev/Next buttons
  const prevBtn = document.querySelector(".prev");
  const nextBtn = document.querySelector(".next");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      goToSlide((index - 1 + slides.length) % slides.length);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      goToSlide((index + 1) % slides.length);
    });
  }

  // Auto-slide every 5 seconds
  autoSlideInterval = setInterval(() => {
    goToSlide((index + 1) % slides.length);
  }, 5000);
}
</script>
