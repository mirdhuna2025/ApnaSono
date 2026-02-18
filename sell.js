// ==============================
// Firebase Config & Init (for admin only, optional for users)
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
const ADMIN_MOBILE = "6454678866"; // WhatsApp contact
let CURRENT_USER = ADMIN_MOBILE; // Only admin uploads, but form can go to admin via WhatsApp

// ==============================
// UI toggle helpers
// ==============================
function toggleModal(show = true) {
  const modal = document.getElementById('modalBackdrop');
  if (!modal) return;
  modal.classList.toggle('active', show);
  document.body.style.overflow = show ? 'hidden' : '';
}

// ==============================
// Open Add Form
// ==============================
window.openAddForm = () => {
  toggleModal(true);
};

// ==============================
// Image Preview
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
// Send Listing to Admin via WhatsApp
// ==============================
window.sendToAdmin = () => {
  const title = document.getElementById("title")?.value.trim();
  const price = document.getElementById("price")?.value.trim();
  const location = document.getElementById("location")?.value.trim();
  const sellerMobile = document.getElementById("mobile")?.value.trim();
  const file = document.getElementById("imageUpload")?.files[0];

  if (!title || !price || !location) {
    return alert("⚠️ All fields marked * are required!");
  }

  let waMessage = `
Hello Admin,

A user wants to post a listing:

📍 Location: ${location}
📱 Mobile: ${sellerMobile || 'Not provided'}
🛒 Item: ${title}
💰 Price: ₹${Number(price).toLocaleString()}
`;

  if (file) waMessage += "\n📷 Image attached (send manually)";

  const waURL = `https://wa.me/91${ADMIN_MOBILE}?text=${encodeURIComponent(waMessage)}`;
  window.open(waURL, "_blank");

  // Optionally reset form
  document.getElementById("addListingForm")?.reset();
  document.getElementById("previewContainer").style.display = "none";
  toggleModal(false);
};

// ==============================
// Load Listings for Users
// ==============================
async function loadListings() {
  const container = document.getElementById("listingsContainer");
  if (!container) return;

  container.innerHTML = `<div class="empty-state"><p>Loading listings…</p></div>`;

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
      container.innerHTML = `<div class="empty-state"><p>No listings yet.</p></div>`;
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


