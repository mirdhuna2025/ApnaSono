import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, push } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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

const slider = document.getElementById("offerSlider");
const nav = document.getElementById("offerNav");
let slides = [];
let index = 0;
let autoSlideInterval;

// 🔥 Now reading from 'offerslide' instead of 'slides'
onValue(ref(db, 'offerslide'), (snapshot) => {
  const data = snapshot.val();
  
  if (autoSlideInterval) clearInterval(autoSlideInterval);
  slider.innerHTML = '';
  nav.innerHTML = '';
  slides = [];

  if (!data) return;

  Object.values(data).forEach(item => {
    if (!item.image) return;
    
    const div = document.createElement('div');
    div.classList.add('offer-slide');
    div.dataset.url = item.url || '';
    div.dataset.image = item.image;
    div.style.backgroundImage = `url('${item.image}')`;
    
    slider.appendChild(div);
    slides.push(div);
  });

  if (slides.length > 0) {
    setupOfferSlider();
  }
});

function setupOfferSlider() {
  const dots = [];
  nav.innerHTML = '';

  slides.forEach((slide, i) => {
    const dot = document.createElement('div');
    dot.classList.add('offer-dot');
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goToSlide(i));
    nav.appendChild(dot);
    dots.push(dot);

    slide.addEventListener('click', () => {
      const imgUrl = slide.dataset.image;
      const url = slide.dataset.url;
      
      // 🔥 Also logs to 'slideClicks' (you can change if needed)
      push(ref(db, 'slideClicks'), {
        image: imgUrl,
        url: url,
        clickedAt: new Date().toISOString()
      });

      if (url) window.open(url, '_blank');
    });
  });

  function goToSlide(i) {
    index = i;
    slider.style.transform = `translateX(-${i * 100}%)`;
    dots.forEach((d, j) => d.classList.toggle('active', i === j));
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
