import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"
import { getStorage, ref, listAll, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"
import { getDatabase, ref as dbRef, push } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js"
import { getConfig } from "./config.js"

const firebaseConfig = getConfig().firebase

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const storage = getStorage(app)
const db = getDatabase(app) // Still used for logging clicks (analytics)

// DOM Elements
const slider = document.getElementById("slider")
const nav = document.getElementById("sliderNav")
let slides = []
let index = 0
let autoSlideInterval

// Load slides from Firebase Storage
async function loadSlides() {
  try {
    // List all images in the 'slides/' folder in Firebase Storage
    const storageRef = ref(storage, "slides/")
    const result = await listAll(storageRef)
    
    // Cleanup previous state
    if (autoSlideInterval) clearInterval(autoSlideInterval)
    slider.innerHTML = ""
    nav.innerHTML = ""
    slides = []

    // Create slides for each image
    for (const itemRef of result.items) {
      try {
        const imageUrl = await getDownloadURL(itemRef)
        
        const div = document.createElement("div")
        div.classList.add("slide")
        div.dataset.image = imageUrl // Store image URL for logging
        div.style.backgroundImage = `url('${imageUrl}')`
        
        slider.appendChild(div)
        slides.push(div)
      } catch (err) {
        console.error("Error getting download URL for slide:", err)
      }
    }

    // Setup slider if we have slides
    if (slides.length > 0) {
      setupSlider()
    }
  } catch (error) {
    console.error("Error loading slides from Firebase Storage:", error)
  }
}

// Initial load
loadSlides()

function setupSlider() {
  const dots = []
  nav.innerHTML = ""

  // Create navigation dots
  slides.forEach((slide, i) => {
    const dot = document.createElement("div")
    dot.classList.add("slider-dot")
    if (i === 0) dot.classList.add("active")
    dot.addEventListener("click", () => goToSlide(i))
    nav.appendChild(dot)
    dots.push(dot)

    // Click handler for slide - logs click only, NO URL redirect
    slide.addEventListener("click", () => {
      const imgUrl = slide.dataset.image

      // Log click to Firebase Realtime Database (analytics)
      push(dbRef(db, "slideClicks"), {
        image: imgUrl,
        clickedAt: new Date().toISOString(),
      })
      // No window.open() since URL feature was removed
    })
  })

  function goToSlide(i) {
    index = i
    slider.style.transform = `translateX(-${i * 100}%)`
    dots.forEach((d, j) => d.classList.toggle("active", i === j))
  }

  // Navigation buttons with null checks
  const prevBtn = document.querySelector(".prev")
  const nextBtn = document.querySelector(".next")
  
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      goToSlide((index - 1 + slides.length) % slides.length)
    })
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      goToSlide((index + 1) % slides.length)
    })
  }

  // Auto-slide every 5 seconds
  autoSlideInterval = setInterval(() => {
    goToSlide((index + 1) % slides.length)
  }, 5000)
}
