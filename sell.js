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
// DEFAULT USER
// ==============================
const ADMIN_MOBILE = "6454678866";
let CURRENT_USER = ADMIN_MOBILE; // Default to admin

// ==============================
// UI toggle helpers (for new modal-style form)
// ==============================
function toggleModal(show = true) {
  const modal = document.getElementById('modalBackdrop');
  if (!modal) return;
  modal.classList.toggle('active', show);
  document.body.style.overflow = show ? 'hidden' : '';
}

// ==============================
// Open Add Form (via FAB)
// ==============================
window.openAddForm = () => {
  toggleModal(true); // No login check anymore
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
  const title = document.getElementById("title")?.value.trim();
  const price = Number(document.getElementById("price")?.value);
  const location = document.getElementById("location")?.value.trim();
  const sellerMobile = document.getElementById("mobile")?.value.trim();
  const file = document.getElementById("imageUpload")?.files[0];

  if (!title || !price || !location || !file) {
    return alert("⚠️ All fields marked * are required!");
  }

  try {
    const orderId = Math.floor(10000 + Math.random() * 90000);
    const timestamp = Date.now();
    const imgPath = `images/${timestamp}_${file.name}`;
    const jsonPath = `listings/${timestamp}.json`;

    await bucket.child(imgPath).put(file);
    const imageUrl = await bucket.child(imgPath).getDownloadURL();

    const finalMobile = sellerMobile || ADMIN_MOBILE;

    const metadata = {
      id: timestamp,
      orderId,
      title,
      price,
      location,
      mobile: finalMobile,
      imageUrl,
      ownerMobile: CURRENT_USER,
      status: "active",
      paymentMode: "Cash on Delivery",
      createdAt: timestamp
    };

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
      container.innerHTML = `<div class="empty-state"><p>No listings yet. Tap + to add one!</p></div>`;
      return;
    }

    container.innerHTML = "";
    items.forEach(item => {
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
            <a href="${waURL}" class="btn-whatsapp" target="_blank">WhatsApp</a>
            ${item.status !== "purchased" ? `<button class="btn-purchase" style="flex:1;background:#ef4444" onclick="deleteItem('${item.id}')">Delete</button>` : ""}
            ${item.status === "active" ? `<button class="btn-purchase" onclick="markAsPurchased('${item.id}')">Purchased</button>` : ""}
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
    await fileRef.delete();
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
  loadListings();
});
