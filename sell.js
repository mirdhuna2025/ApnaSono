
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://mirdhuna-25542.firebasestorage.app">

<!-- Firebase SDK (use compat for simplicity) -->
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-storage-compat.js"></script>

<script>
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

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const storage = firebase.storage();
const bucket = storage.ref();

// ==============================
// Config & State
// ==============================
const ADMIN_MOBILE = "6454678866";
const ADMIN_PASS = "123456";
const CACHE_TTL = 30 * 1000; // 30 seconds cache
const MAX_LISTINGS = 50; // Limit initial load

let CURRENT_USER = localStorage.getItem("mobileNumber") || null;
let CURRENT_PASS = localStorage.getItem("userPassword") || null;
let listingsCache = null;
let cacheTimestamp = 0;
let isLoading = false;

// ==============================
// LOGIN & LOGOUT
// ==============================
window.loginUser = () => {
  const mobile = prompt("📱 Enter Mobile Number:");
  const pass = prompt("🔑 Enter Password:");

  if (!mobile || !pass) return alert("⚠️ Both fields required!");

  if (mobile === ADMIN_MOBILE && pass === ADMIN_PASS) {
    CURRENT_USER = ADMIN_MOBILE;
    CURRENT_PASS = ADMIN_PASS;
    localStorage.setItem("mobileNumber", mobile);
    localStorage.setItem("userPassword", pass);
    alert("✅ Logged in as Admin");
  } else {
    CURRENT_USER = mobile;
    CURRENT_PASS = pass;
    localStorage.setItem("mobileNumber", mobile);
    localStorage.setItem("userPassword", pass);
    alert("✅ Logged in");
  }
  // Clear cache on login change
  listingsCache = null;
  loadListings();
};

window.logoutUser = () => {
  localStorage.removeItem("mobileNumber");
  localStorage.removeItem("userPassword");
  CURRENT_USER = null;
  CURRENT_PASS = null;
  listingsCache = null;
  alert("👋 Logged out");
  location.reload();
};

// ==============================
// UI Helpers
// ==============================
function toggleModal(show = true) {
  const modal = document.getElementById('modalBackdrop');
  if (!modal) return;
  modal.classList.toggle('active', show);
  document.body.style.overflow = show ? 'hidden' : '';
}

window.openAddForm = () => {
  if (!CURRENT_USER) return alert("🔐 Please log in first!");
  toggleModal(true);
};

// Image preview
document.addEventListener('DOMContentLoaded', () => {
  const imageUpload = document.getElementById('imageUpload');
  if (imageUpload) {
    imageUpload.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      const preview = document.getElementById('imagePreview');
      const container = document.getElementById('previewContainer');
      if (file) {
        preview.src = URL.createObjectURL(file);
        container.style.display = 'block';
      } else {
        container.style.display = 'none';
      }
    });
  }

  // Bind auth buttons
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  if (loginBtn) loginBtn.onclick = loginUser;
  if (logoutBtn) logoutBtn.onclick = logoutUser;

  // Initial load with cache
  loadListings();
});

// ==============================
// Save Listing (Optimized Upload)
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

  const submitBtn = document.querySelector('#addListingForm button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const orderId = Math.floor(10000 + Math.random() * 90000);
    const timestamp = Date.now();
    const imgPath = `images/${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const jsonPath = `listings/${timestamp}.json`;

    // Parallel upload: image + metadata
    const [snapshot] = await Promise.all([
      bucket.child(imgPath).put(file),
      (async () => {
        const finalMobile = sellerMobile || ADMIN_MOBILE;
        const metadata = {
          id: timestamp,
          orderId,
          title,
          price,
          location,
          mobile: finalMobile,
          imageUrl: '', // Will update after image upload
          ownerMobile: CURRENT_USER,
          status: "active",
          paymentMode: "Cash on Delivery",
          createdAt: timestamp
        };
        const blob = new Blob([JSON.stringify(metadata)], { type: "application/json" });
        return bucket.child(jsonPath).put(blob);
      })()
    ]);

    // Get image URL and update metadata
    const imageUrl = await snapshot.ref.getDownloadURL();
    const metadata = {
      id: timestamp,
      orderId,
      title,
      price,
      location,
      mobile: sellerMobile || ADMIN_MOBILE,
      imageUrl,
      ownerMobile: CURRENT_USER,
      status: "active",
      paymentMode: "Cash on Delivery",
      createdAt: timestamp
    };

    // Update JSON with image URL
    const blob = new Blob([JSON.stringify(metadata)], { type: "application/json" });
    await bucket.child(jsonPath).put(blob);

    // Invalidate cache & refresh
    listingsCache = null;
    alert("✅ Listing added successfully!");
    document.getElementById("addListingForm")?.reset();
    document.getElementById("previewContainer").style.display = "none";
    toggleModal(false);
    loadListings(true); // force refresh

  } catch (err) {
    console.error(err);
    alert("❌ Failed: " + (err.message || err));
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
};

// ==============================
// Load Listings (⚡ OPTIMIZED)
// ==============================
async function loadListings(forceRefresh = false) {
  const container = document.getElementById("listingsContainer");
  if (!container || isLoading) return;
  
  // Show loading state only if no cache
  if (!listingsCache || forceRefresh) {
    container.innerHTML = `<div class="empty-state">
      <div class="spinner"></div>
      <p>Loading listings…</p>
    </div>`;
    isLoading = true;
  }

  try {
    const now = Date.now();
    
    // ✅ Use cache if valid
    if (listingsCache && (now - cacheTimestamp) < CACHE_TTL && !forceRefresh) {
      renderListings(listingsCache);
      isLoading = false;
      return;
    }

    // Fetch listing references
    const listRef = bucket.child("listings/");
    const res = await listRef.listAll();
    let jsonFiles = res.items.filter(item => item.name.endsWith(".json"));
    
    // Sort by name (timestamp) descending, limit for speed
    jsonFiles.sort((a, b) => b.name.localeCompare(a.name));
    jsonFiles = jsonFiles.slice(0, MAX_LISTINGS);

    // ✅ Parallel fetch all JSON files
    const fetchPromises = jsonFiles.map(async (fileRef) => {
      try {
        const url = await fileRef.getDownloadURL();
        const resp = await fetch(url, { cache: 'no-store' });
        return resp.ok ? await resp.json() : null;
      } catch {
        return null;
      }
    });

    const results = await Promise.all(fetchPromises);
    let items = results.filter(item => item && item.id).sort((a, b) => b.createdAt - a.createdAt);

    // Save to cache
    listingsCache = items;
    cacheTimestamp = now;
    
    renderListings(items);
    
  } catch (err) {
    console.error("Load error:", err);
    if (!listingsCache) {
      container.innerHTML = `<div class="empty-state">
        <p>⚠️ Using offline data. ${err.message || 'Retry soon.'}</p>
      </div>`;
    }
  } finally {
    isLoading = false;
  }
}

// ==============================
// Render Listings (Lazy WhatsApp)
// ==============================
function renderListings(items) {
  const container = document.getElementById("listingsContainer");
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="48" height="48">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
      <p>No listings yet. Tap + to add one!</p>
    </div>`;
    return;
  }

  container.innerHTML = "";
  const fragment = document.createDocumentFragment();

  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "item-card";
    
    // ✅ Generate WhatsApp URL on click (not during render)
    const waButton = document.createElement("a");
    waButton.className = "btn-whatsapp";
    waButton.target = "_blank";
    waButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.925c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.89 7.89 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.306.088-.405.087-.087.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
      </svg>
      WhatsApp
    `;
    waButton.onclick = (e) => {
      e.preventDefault();
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
      const waURL = `https://wa.me/91${item.mobile.replace(/\D/g,'')}?text=${encodeURIComponent(waMessage)}`;
      window.open(waURL, '_blank');
    };

    card.innerHTML = `
      <div class="item-img">
        <img loading="lazy" src="${item.imageUrl}" alt="${item.title}" 
             onclick="openImage('${item.imageUrl}')" 
             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23ccc%22 stroke-width=%221%22%3E%3Crect x=%223%22 y=%223%22 width=%2218%22 height=%2218%22 rx=%222%22/%3E%3Ccircle cx=%229%22 cy=%229%22 r=%222%22/%3E%3Cpath d=%22M15 12l-3 3l-4-4l-3 3%22/%3E%3C/svg%3E'">
      </div>
      <div class="item-info">
        <div class="item-title">${escapeHtml(item.title)}</div>
        <div class="item-price">₹${item.price.toLocaleString()}</div>
        <div class="item-meta">
          <span class="meta-badge">📍 ${escapeHtml(item.location)}</span>
          ${item.status === "purchased" ? `<span class="meta-badge purchased">Purchased</span>` : ""}
        </div>
        <div class="btn-group">
          <!-- WhatsApp button inserted below -->
        </div>
      </div>
    `;
    
    // Insert WhatsApp button
    const btnGroup = card.querySelector('.btn-group');
    btnGroup.appendChild(waButton);

    // Admin/Owner actions
    if ((CURRENT_USER === ADMIN_MOBILE || CURRENT_USER === item.ownerMobile) && item.status !== "purchased") {
      const delBtn = document.createElement("button");
      delBtn.className = "btn-purchase btn-delete";
      delBtn.textContent = "Delete";
      delBtn.onclick = () => deleteItem(item.id);
      btnGroup.appendChild(delBtn);
    }
    if (CURRENT_USER === ADMIN_MOBILE && item.status === "active") {
      const buyBtn = document.createElement("button");
      buyBtn.className = "btn-purchase";
      buyBtn.textContent = "Purchased";
      buyBtn.onclick = () => markAsPurchased(item.id);
      btnGroup.appendChild(buyBtn);
    }

    fragment.appendChild(card);
  });

  container.innerHTML = "";
  container.appendChild(fragment);
}

// Helper: Escape HTML to prevent XSS
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
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

    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    await fileRef.put(blob);

    listingsCache = null; // Invalidate cache
    alert("✔️ Marked as Purchased");
    loadListings(true);
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

    await fileRef.delete();
    
    // Optional: Delete image (uncomment if needed)
    // if (item.imageUrl) {
    //   const imgRef = storage.refFromURL(item.imageUrl);
    //   await imgRef.delete();
    // }

    listingsCache = null;
    alert("🗑️ Deleted successfully");
    loadListings(true);
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
      <!DOCTYPE html>
      <html><head><title>Image</title><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh">
        <img src="${url}" style="max-width:100%;max-height:100vh;object-fit:contain">
      </body></html>
    `);
    newWin.document.close();
  } else {
    alert("Popup blocked. Please allow popups to view image.");
  }
};

// ==============================
// CSS for Spinner & Performance (add to your stylesheet)
// ==============================
/*
.spinner {
  width: 32px; height: 32px;
  border: 3px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s linear infinite;
  margin: 20px auto;
}
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { text-align: center; padding: 40px 20px; color: #666; }
.item-card { display: flex; gap: 12px; padding: 12px; border-bottom: 1px solid #eee; }
.item-img img { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; cursor: pointer; }
.item-info { flex: 1; min-width: 0; }
.item-title { font-weight: 600; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-price { color: #059669; font-weight: 700; font-size: 1.1em; }
.item-meta { display: flex; gap: 8px; margin: 8px 0; flex-wrap: wrap; }
.meta-badge { background: #f3f4f6; padding: 4px 8px; border-radius: 12px; font-size: 0.85em; }
.meta-badge.purchased { background: #fee2e2; color: #ef4444; }
.btn-group { display: flex; gap: 8px; margin-top: 10px; }
.btn-whatsapp, .btn-purchase { 
  flex: 1; padding: 8px 12px; border: none; border-radius: 6px; 
  font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
}
.btn-whatsapp { background: #25D366; color: white; text-decoration: none; }
.btn-purchase { background: #3b82f6; color: white; }
.btn-delete { background: #ef4444; }
@media (max-width: 640px) {
  .item-card { flex-direction: column; }
  .item-img img { width: 100%; height: 200px; }
}
*/
</script>
