// ==============================
// Firebase Config & Init
// ==============================
const firebaseConfig = {
  apiKey: "AIzaSyCPbOZwAZEMiC1LSDSgnSEPmSxQ7-pR2oQ",
  authDomain: "mirdhuna-25542.firebaseapp.com",
  projectId: "mirdhuna-25542",
  storageBucket: "mirdhuna-25542.firebasestorage.app",
  messagingSenderId: "575924409876",
  appId: "1:575924409876:web:6ba1ed88ce941d9c83b901"
};

firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();
const bucket = storage.ref();

// ==============================
// LOGIN CONFIG
// ==============================
const ADMIN_MOBILE = "6454678866";
const ADMIN_PASS = "123456";

let CURRENT_USER = localStorage.getItem("mobileNumber") || null;
let CURRENT_PASS = localStorage.getItem("userPassword") || null;

// ==============================
// LOGIN & LOGOUT
// ==============================
window.loginUser = () => {
  const mobile = prompt("📱 Enter Mobile Number:");
  const pass = prompt("🔑 Enter Password:");

  if (!mobile || !pass) return alert("⚠️ Both fields required!");

  // Admin check
  if (mobile === ADMIN_MOBILE && pass === ADMIN_PASS) {
    CURRENT_USER = ADMIN_MOBILE;
    CURRENT_PASS = ADMIN_PASS;
    localStorage.setItem("mobileNumber", mobile);
    localStorage.setItem("userPassword", pass);
    alert("✅ Logged in as Admin");
    loadListings();
    return;
  }

  // Regular user
  CURRENT_USER = mobile;
  CURRENT_PASS = pass;
  localStorage.setItem("mobileNumber", mobile);
  localStorage.setItem("userPassword", pass);
  alert("✅ Logged in");
  loadListings();
};

window.logoutUser = () => {
  localStorage.removeItem("mobileNumber");
  localStorage.removeItem("userPassword");
  CURRENT_USER = null;
  CURRENT_PASS = null;
  alert("👋 Logged out");
  location.reload();
};

// UI toggle helpers (for new modal-style form)
function toggleModal(show = true) {
  const modal = document.getElementById('modalBackdrop');
  if (!modal) return;
  modal.classList.toggle('active', show);
  if (show) document.body.style.overflow = 'hidden';
  else document.body.style.overflow = '';
}

// ==============================
// Open Add Form (via FAB)
// ==============================
window.openAddForm = () => {
  if (!CURRENT_USER) return alert("🔐 Please log in first!");
  toggleModal(true);
};

// ==============================
// Image Preview (for new UI)
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  const imageUpload = document.getElementById('imageUpload');
  if (!imageUpload) return;

  imageUpload.addEventListener('change', () => {
    const file = imageUpload.files?.[0];
    const preview = document.getElementById('imagePreview');
    const container = document.getElementById('previewContainer');

    if (file) {
      const url = URL.createObjectURL(file);
      preview.src = url;
      container.style.display = 'block';
    } else {
      container.style.display = 'none';
    }
  });
});

// ==============================
// Save Listing (Upload)
// ==============================
window.handleAddListing = async () => {
  if (!CURRENT_USER) return alert("🔐 Login required!");

  const title = document.getElementById("title")?.value.trim();
  const price = Number(document.getElementById("price")?.value);
  const location = document.getElementById("location")?.value.trim();
  const sellerMobile = document.getElementById("mobile")?.value.trim();
  const file = document.getElementById("imageUpload")?.files[0];

  if (!title || !price || !location || !file) {
    return alert("⚠️ All fields marked * are required!");
  }

  try {
    // Generate 5-digit numeric order ID
    const orderId = Math.floor(10000 + Math.random() * 90000); // e.g., 48291
    const timestamp = Date.now();
    const imgPath = `images/${timestamp}_${file.name}`;
    const jsonPath = `listings/${timestamp}.json`;

    // Upload image
    await bucket.child(imgPath).put(file);
    const imageUrl = await bucket.child(imgPath).getDownloadURL();

    // Final mobile to use (fallback to admin if blank)
    const finalMobile = sellerMobile || ADMIN_MOBILE;

    // Metadata (will be saved as JSON)
    const metadata = {
      id: timestamp,
      orderId, // 5-digit ID for WhatsApp/print use
      title,
      price,
      location,
      mobile: finalMobile,
      imageUrl,
      ownerMobile: CURRENT_USER,
      status: "active",
      paymentMode: "Cash on Delivery", // As per your preference
      createdAt: timestamp
    };

    // Save JSON
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" });
    await bucket.child(jsonPath).put(blob);

    alert("✅ Listing added successfully!");
    document.getElementById("addListingForm")?.reset();
    document.getElementById("previewContainer").style.display = "none";
    toggleModal(false);
    loadListings();
  } catch (err) {
    console.error(err);
    alert("❌ Failed: " + (err.message || err));
  }
};

// ==============================
// Load Listings (Updated for New UI)
// ==============================
async function loadListings() {
  const container = document.getElementById("listingsContainer");
  if (!container) return;

  container.innerHTML = `<div class="empty-state">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
    <p>Loading listings…</p>
  </div>`;

  try {
    const listRef = bucket.child("listings/");
    const res = await listRef.listAll();
    const jsonFiles = res.items.filter(item => item.name.endsWith(".json"));

    const items = [];
    for (const fileRef of jsonFiles) {
      const url = await fileRef.getDownloadURL();
      const resp = await fetch(url);
      if (resp.ok) items.push(await resp.json());
    }

    items.sort((a, b) => b.createdAt - a.createdAt);

    if (items.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p>No listings yet. Tap + to add one!</p>
      </div>`;
      return;
    }

    container.innerHTML = "";
    items.forEach(item => {
      // WhatsApp message (map-ready, rich, print-friendly)
      const waMessage = `
Hi, I'm interested in:

📍 Location: ${item.location}
📱 Mobile: ${item.mobile}
🛒 Item: ${item.title}
💰 Price: ₹${item.price.toLocaleString()}
📷 Image: ${item.imageUrl}
🆔 Order ID: ${item.orderId}
💳 Payment: ${item.paymentMode}

Thanks!
`.trim();

      const waURL = `https://wa.me/91${item.mobile}?text=${encodeURIComponent(waMessage)}`;

      const card = document.createElement("div");
      card.className = "item-card";

      card.innerHTML = `
        <div class="item-img">
          <img loading="lazy" src="${item.imageUrl}" alt="${item.title}" onclick="openImage('${item.imageUrl}')">
        </div>
        <div class="item-info">
          <div class="item-title">${item.title}</div>
          <div class="item-price">₹${item.price.toLocaleString()}</div>
          <div class="item-meta">
            <span class="meta-badge">📍 ${item.location}</span>
            ${item.status === "purchased" ? `<span class="meta-badge" style="background:#fee2e2;color:#ef4444">Purchased</span>` : ""}
          </div>

          <div class="btn-group">
            <a href="${waURL}" class="btn-whatsapp" target="_blank">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.925c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.89 7.89 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.306.088-.405.087-.087.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
              </svg>
              WhatsApp
            </a>

            ${
              (CURRENT_USER === ADMIN_MOBILE || CURRENT_USER === item.ownerMobile) && item.status !== "purchased"
                ? `<button class="btn-purchase" style="flex:1;background:#ef4444" onclick="deleteItem('${item.id}')">Delete</button>`
                : ""
            }

            ${
              CURRENT_USER === ADMIN_MOBILE && item.status === "active"
                ? `<button class="btn-purchase" onclick="markAsPurchased('${item.id}')">Purchased</button>`
                : ""
            }
          </div>
        </div>
      `;

      container.appendChild(card);
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="empty-state"><p>❌ Error loading listings.<br>${err.message}</p></div>`;
  }
}

// ==============================
// Mark as Purchased
// ==============================
window.markAsPurchased = async function (listingId) {
  if (!confirm("✅ Mark this item as purchased?")) return;

  try {
    const fileRef = bucket.child(`listings/${listingId}.json`);
    const url = await fileRef.getDownloadURL();
    const resp = await fetch(url);
    const data = await resp.json();

    data.status = "purchased";
    data.purchasedAt = Date.now();

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    await fileRef.put(blob);

    alert("✔️ Marked as Purchased");
    loadListings();
  } catch (err) {
    alert("❌ Failed: " + err.message);
  }
};

// ==============================
// Delete Item
// ==============================
window.deleteItem = async function (listingId) {
  if (!confirm("🗑️ Permanently delete this listing?")) return;

  try {
    const fileRef = bucket.child(`listings/${listingId}.json`);
    const url = await fileRef.getDownloadURL();
    const resp = await fetch(url);
    const item = await resp.json();

    if (CURRENT_USER !== ADMIN_MOBILE && CURRENT_USER !== item.ownerMobile) {
      return alert("🚫 Permission denied!");
    }

    // Delete JSON metadata
    await fileRef.delete();

    // Optional: Also delete image (if you want strict cleanup)
    // await bucket.child(`images/${item.imageUrl.split('/').pop()}`).delete();

    alert("🗑️ Deleted successfully");
    loadListings();
  } catch (err) {
    alert("❌ Delete failed: " + err.message);
  }
};

// ==============================
// Open Full Image
// ==============================
window.openImage = (url) => {
  const newWin = window.open("", "_blank", "width=800,height=600,scrollbars=yes");
  if (newWin) {
    newWin.document.write(`
      <html>
        <head><title>Image</title></head>
        <body style="margin:0;background:#000">
          <img src="${url}" style="max-width:100%;max-height:100vh;display:block;margin:auto">
        </body>
      </html>
    `);
    newWin.document.close();
  } else {
    alert("Popup blocked. Please allow popups to view image.");
  }
};

// ==============================
// Auto Load on Start
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  // Bind login/logout if buttons exist (for admin UI later)
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  if (loginBtn) loginBtn.onclick = loginUser;
  if (logoutBtn) logoutBtn.onclick = logoutUser;

  // Load listings
  loadListings();
});
