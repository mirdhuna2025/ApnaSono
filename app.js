// ========== APPLICATION CORE ==========

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  renderHeader()
  renderNavbar()
  renderFooter()

  // Load sections dynamically
  loadChatSection()
  loadSellSection()
  loadNewsSection()
})

// ========== NAVIGATION ==========

function navigateToSection(sectionName) {
  // Hide all sections
  document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"))

  // Show active section
  document.getElementById(`${sectionName}-section`)?.classList.add("active")

  // Update navbar
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active")
  })
  document.querySelector(`[data-section="${sectionName}"]`)?.classList.add("active")

  // Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" })
}

// ========== HEADER COMPONENT ==========

function renderHeader() {
  const header = document.getElementById("header")
  header.innerHTML = `
    <div class="header-container">
      <div class="logo">Apna <span>Sono</span></div>
      <div class="social-links">
        <a href="https://facebook.com" target="_blank" title="Facebook">f</a>
        <a href="https://instagram.com" target="_blank" title="Instagram">📷</a>
        <a href="https://wa.me/919835124772" target="_blank" title="WhatsApp">💬</a>
        <a href="tel:919835124772" title="Call">☎️</a>
      </div>
    </div>
  `
}

// ========== NAVBAR COMPONENT ==========

function renderNavbar() {
  const navbar = document.getElementById("navbar")
  navbar.innerHTML = `
    <div class="nav-container">
      <div class="nav-item active" data-section="home" onclick="navigateToSection('home')">Home</div>
      <div class="nav-item" data-section="chat" onclick="navigateToSection('chat')">Chat</div>
      <div class="nav-item" data-section="sell" onclick="navigateToSection('sell')">Marketplace</div>
      <div class="nav-item" data-section="news" onclick="navigateToSection('news')">News</div>
    </div>
  `
}

// ========== FOOTER COMPONENT ==========

function renderFooter() {
  const footer = document.getElementById("footer")
  footer.innerHTML = `
    <div class="footer-container">
      <div class="footer-section">
        <h3>About</h3>
        <ul>
          <li><a href="#about">About Apna Sono</a></li>
          <li><a href="#careers">Careers</a></li>
          <li><a href="#press">Press</a></li>
        </ul>
      </div>
      <div class="footer-section">
        <h3>Support</h3>
        <ul>
          <li><a href="#help">Help Center</a></li>
          <li><a href="#safety">Safety Tips</a></li>
          <li><a href="#contact">Contact Us</a></li>
        </ul>
      </div>
      <div class="footer-section">
        <h3>Legal</h3>
        <ul>
          <li><a href="#terms">Terms & Conditions</a></li>
          <li><a href="#privacy">Privacy Policy</a></li>
          <li><a href="#cookies">Cookie Policy</a></li>
        </ul>
      </div>
      <div class="footer-section">
        <h3>Community</h3>
        <ul>
          <li><a href="#blog">Blog</a></li>
          <li><a href="#events">Events</a></li>
          <li><a href="#newsletter">Newsletter</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2025 Apna Sono. All rights reserved.</p>
    </div>
  `
}

// ========== SECTION LOADERS ==========

function loadChatSection() {
  const container = document.getElementById("chat-container")
  container.innerHTML = `
    <div class="container">
      <div class="card">
        <h2 class="card-title">💬 Community Chat</h2>
        <p class="card-subtitle">Connect with locals and chat about Apna Sono</p>
        <div class="chat-box" id="chatBox" style="height: 400px; overflow-y: auto; background: #f9fafb; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
          <div style="text-align: center; color: #9ca3af; padding: 2rem;">
            💬 Welcome to Apna Sono Chat
          </div>
        </div>
        <div style="display: flex; gap: 1rem;">
          <input type="text" id="chatInput" placeholder="Type your message..." style="flex: 1;">
          <button class="btn btn-primary btn-small" onclick="sendChatMessage()">Send</button>
        </div>
      </div>
    </div>
  `
}

function loadSellSection() {
  const container = document.getElementById("sell-container")
  container.innerHTML = `
    <div class="container">
      <div class="card">
        <h2 class="card-title">🛒 Sell Your Products</h2>
        <p class="card-subtitle">List your items and reach local buyers</p>
        <form id="sellForm" style="display: grid; gap: 1.5rem;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Product Name *</label>
              <input type="text" id="productName" placeholder="E.g., iPhone 12" required>
            </div>
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Price (₹) *</label>
              <input type="number" id="productPrice" placeholder="1000" required min="1">
            </div>
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Location *</label>
              <input type="text" id="productLocation" placeholder="E.g., Sono" required>
            </div>
          </div>
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Description</label>
            <textarea id="productDesc" placeholder="Describe your product..." rows="4"></textarea>
          </div>
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Upload Photo</label>
            <input type="file" id="productImage" accept="image/*">
          </div>
          <button type="submit" class="btn btn-primary">📤 Post Listing</button>
        </form>
      </div>
      <div class="mt-4">
        <h3 style="margin-bottom: 1.5rem;">📦 Recent Listings</h3>
        <div class="grid grid-3" id="listingsGrid">
          <div style="text-align: center; color: #9ca3af; padding: 2rem; grid-column: 1/-1;">
            No listings yet. Be the first to post!
          </div>
        </div>
      </div>
    </div>
  `

  document.getElementById("sellForm").addEventListener("submit", handleAddListing)
}

function loadNewsSection() {
  const container = document.getElementById("news-container")
  container.innerHTML = `
    <div class="container">
      <div class="card">
        <h2 class="card-title">📰 Local News</h2>
        <p class="card-subtitle">Stay updated with news from Sono and surrounding areas</p>
        <input type="text" id="newsSearch" placeholder="Search news..." style="margin-bottom: 1.5rem;">
        <div id="newsFeed" style="display: grid; gap: 1.5rem;">
          <div style="text-align: center; color: #9ca3af; padding: 2rem;">
            Loading news...
          </div>
        </div>
      </div>
    </div>
  `

  // Simulate news loading
  loadNews()
}

// ========== CHAT FUNCTIONS ==========

function sendChatMessage() {
  const input = document.getElementById("chatInput")
  if (!input.value.trim()) return

  const chatBox = document.getElementById("chatBox")
  const msg = document.createElement("div")
  msg.style.cssText =
    "background: #fff; padding: 1rem; border-radius: 12px; margin-bottom: 0.5rem; border-left: 4px solid #f59e0b;"
  msg.innerHTML = `<strong>You:</strong> ${escapeHtml(input.value)}`
  chatBox.appendChild(msg)
  chatBox.scrollTop = chatBox.scrollHeight
  input.value = ""
}

// ========== MARKETPLACE FUNCTIONS ==========

function handleAddListing(e) {
  e.preventDefault()

  const name = document.getElementById("productName").value
  const price = document.getElementById("productPrice").value
  const location = document.getElementById("productLocation").value

  if (!name || !price || !location) {
    alert("⚠️ Please fill in all required fields")
    return
  }

  // Create listing card
  const listingsGrid = document.getElementById("listingsGrid")
  if (listingsGrid.innerHTML.includes("No listings yet")) {
    listingsGrid.innerHTML = ""
  }

  const card = document.createElement("div")
  card.className = "card"
  card.innerHTML = `
    <h3 class="card-title">${escapeHtml(name)}</h3>
    <p style="font-size: 1.2rem; color: #f59e0b; font-weight: 700; margin-bottom: 0.5rem;">₹${price}</p>
    <p class="text-muted">📍 ${escapeHtml(location)}</p>
    <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
      <button class="btn btn-success btn-small" onclick="alert('WhatsApp integration')">💬 WhatsApp</button>
      <button class="btn btn-small" style="background: #3b82f6; color: white;">❤️ Save</button>
    </div>
  `
  listingsGrid.appendChild(card)

  // Reset form
  document.getElementById("sellForm").reset()
  alert("✅ Listing posted successfully!")
}

// ========== NEWS FUNCTIONS ==========

function loadNews() {
  const newsFeed = document.getElementById("newsFeed")
  const newsItems = [
    { title: "New Market Opens in Sono", source: "Local Times", date: "Today" },
    { title: "Agriculture Tips for Winter Season", source: "Farm Daily", date: "Yesterday" },
    { title: "Infrastructure Development Update", source: "News Hub", date: "2 days ago" },
  ]

  newsFeed.innerHTML = newsItems
    .map(
      (item) => `
    <div class="card">
      <h4 class="card-title">${item.title}</h4>
      <p class="text-muted" style="font-size: 0.85rem;">📰 ${item.source} • ${item.date}</p>
      <a href="#" style="color: #f59e0b; text-decoration: none; font-weight: 500;">Read more →</a>
    </div>
  `,
    )
    .join("")
}

// ========== UTILITIES ==========

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}
