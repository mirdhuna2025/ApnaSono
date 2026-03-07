import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"
import { getStorage, ref, listAll, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"
import { getConfig } from "./config.js"

const firebaseConfig = getConfig().firebase

const app = initializeApp(firebaseConfig)
const storage = getStorage(app)

const slider = document.getElementById("offerSlider")
const nav = document.getElementById("offerNav")
let slides = []
let index = 0
let autoSlideInterval

// 🔥 Load slides directly from Firebase Storage folder 'offerslide/'
async function loadSlidesFromStorage() {
  if (autoSlideInterval) clearInterval(autoSlideInterval)
  slider.innerHTML = ""
  nav.innerHTML = ""
  slides = []

  try {
    const folderRef = ref(storage, "offerslide/")
    const result = await listAll(folderRef)
    
    // Filter for common image file types only
    const imageFiles = result.items.filter(item => 
      /\.(jpg|jpeg|png|gif|webp)$/i.test(item.name)
    )

    // Get public download URLs for each image
    const imageUrls = await Promise.all(
      imageFiles.map(item => getDownloadURL(item))
    )

    // Create slide elements
    imageUrls.forEach((imageUrl) => {
      const div = document.createElement("div")
      div.classList.add("offer-slide")
      div.dataset.image = imageUrl
      div.style.backgroundImage = `url('${imageUrl}')`
      slider.appendChild(div)
      slides.push(div)
    })

    if (slides.length > 0) {
      setupOfferSlider()
    }
  } catch (error) {
    console.error("Error loading slides from Firebase Storage:", error)
  }
}

function setupOfferSlider() {
  const dots = []
  nav.innerHTML = ""

  slides.forEach((slide, i) => {
    // Create navigation dots
    const dot = document.createElement("div")
    dot.classList.add("offer-dot")
    if (i === 0) dot.classList.add("active")
    dot.addEventListener("click", () => goToSlide(i))
    nav.appendChild(dot)
    dots.push(dot)

    // 🔥 URL navigation and click tracking REMOVED as requested
    // Slides are now display-only. Add custom behavior here if needed.
  })

  function goToSlide(i) {
    index = i
    slider.style.transform = `translateX(-${i * 100}%)`
    dots.forEach((d, j) => d.classList.toggle("active", i === j))
  }

  // Safe event listener attachment with optional chaining
  document.querySelector(".prev")?.addEventListener("click", () => {
    goToSlide((index - 1 + slides.length) % slides.length)
  })

  document.querySelector(".next")?.addEventListener("click", () => {
    goToSlide((index + 1) % slides.length)
  })

  // Auto-advance slides
  autoSlideInterval = setInterval(() => {
    goToSlide((index + 1) % slides.length)
  }, 2500)
}

// Initial load
loadSlidesFromStorage()
