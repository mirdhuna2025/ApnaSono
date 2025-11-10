<!-- 📦 Include Firebase v8 BEFORE this script -->
<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-storage.js"></script>

<script>
// ✅ Firebase Config
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

const DEFAULT_ADMIN_PHONE = "6454678866"; // ← Your number, Sanu
const COD_NOTE = "✅ Cash on Delivery Available";

// ————————————————————————————————
// Toggle Add Form
// ————————————————————————————————
window.toggleAddForm = () => {
  document.getElementById("addForm").classList.toggle("active");
};

// ————————————————————————————————
// Preview Image
// ————————————————————————————————
document.getElementById("imageUpload")?.addEventListener("change", function() {
  const file = this.files[0];
  const preview = document.getElementById("imagePreview");
  if (!file) {
    preview.style.display = "none";
    return;
  }
  if (!/image\/(jpe?g|png)/i.test(file.type)) {
    alert("❌ Only JPG/PNG allowed.");
    this.value = "";
    preview.style.display = "none";
    return;
  }
  preview.src = URL.createObjectURL(file);
  preview.style.display = "block";
});

// ————————————————————————————————
// Save Listing (Image + JSON)
// ————————————————————————————————
document.getElementById("addListingForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title")?.value.trim();
  const price = Number(document.getElementById("price")?.value);
  const location = document.getElementById("location")?.value.trim();
  const mobile = document.getElementById("mobile")?.value.trim();
  const file = document.getElementById("imageUpload")?.files[0];

  if (!title || !price || !location || !file) {
    alert("❌ Title, price, location, and image are required.");
    return;
  }

  if (mobile && !/^\d{10}$/.test(mobile)) {
    alert("❌ Mobile must be 10 digits (or leave blank).");
    return;
  }

  try {
    const id = Date.now().toString();
    const imgPath = `images/${id}_${file.name}`;
    const jsonPath = `listings/${id}.json`;

    // Upload image
    await bucket.child(imgPath).put(file);
    const imgUrl = await bucket.child(imgPath).getDownloadURL();

    // Save metadata as JSON
    const metadata = {
      id,
      title,
      price,
      location,
      mobile: mobile || "", // optional
      imageUrl: imgUrl,
      status: "active",
      createdAt: Date.now()
    };

    const jsonBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    await bucket.child(jsonPath).put(jsonBlob);

    alert("✅ Listing saved to Firebase Storage!");
    
    // Reset form
    document.getElementById("addListingForm")?.reset();
    const preview = document.getElementById("imagePreview");
    if (preview) preview.style.display = "none";
    
    toggleAddForm();
    loadListings();
  } catch (err) {
    console.error("🔥 Save failed:", err);
    alert("❌ Save failed: " + (err.message || "Unknown error"));
  }
});

// ————————————————————————————————
// Load Listings (from /listings/*.json)
// ————————————————————————————————
async function loadListings() {
  const container = document.getElementById("listingsContainer");
  if (!container) {
    console.error("⚠️ #listingsContainer not found in DOM!");
    return;
  }

  container.innerHTML = `<p class="loading">Loading listings…</p>`;

  try {
    const listRef = bucket.child("listings/");
    const res = await listRef.listAll();
    const jsonFiles = res.items.filter(item => item.name.endsWith('.json'));

    if (jsonFiles.length === 0) {
      container.innerHTML = "<p>No listings yet.</p>";
      return;
    }

    const listings = [];
    for (const fileRef of jsonFiles) {
      try {
        const url = await fileRef.getDownloadURL();
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data.id || !data.title) throw new Error("Invalid data");
        listings.push(data);
      } catch (e) {
        console.warn(`⚠️ Skipping invalid listing: ${fileRef.name}`, e.message);
      }
    }

    // Sort newest first
    listings.sort((a, b) => b.createdAt - a.createdAt);

    if (listings.length === 0) {
      container.innerHTML = "<p>No valid listings found.</p>";
      return;
    }

    container.innerHTML = "";
    listings.forEach(item => {
      // Use user's mobile if valid 10-digit; else fallback to admin (you)
      const sellerPhone = (item.mobile && /^\d{10}$/.test(item.mobile))
        ? item.mobile
        : DEFAULT_ADMIN_PHONE;

      // ✅ FIXED WhatsApp URL: NO SPACE after '91'
      const waText = encodeURIComponent(
        `Hi, I'm interested in:\n📌 *${item.title}*\n💰 ₹${item.price.toLocaleString()}\n📍 ${item.location}\n${COD_NOTE}\n\nMore details? Thanks!`
      );
      const waURL = `https://wa.me/91${sellerPhone}?text=${waText}`; // ← corrected

      const statusText = item.status === "purchased" 
        ? "⏳ Purchased" 
        : "🟢 Active";

      const card = document.createElement("div");
      card.className = "item-card";
      card.innerHTML = `
        <div class="item-img">
          <img src="${item.imageUrl || 'https://via.placeholder.com/140?text=📷'}" 
               alt="${item.title}"
               onerror="this.onerror=null; this.src='https://via.placeholder.com/140?text=📷'">
        </div>
        <div class="item-info">
          <div class="item-title">${escapeHTML(item.title)}</div>
          <div class="item-price">₹${item.price.toLocaleString()}</div>
          <div class="item-meta">
            📍 ${escapeHTML(item.location)}
            ${item.mobile ? ` | 📱 ${escapeHTML(item.mobile)}` : ""}
            <br><small>${statusText}</small>
          </div>
          <div class="btn-group">
            <a href="${waURL}" target="_blank" class="btn btn-whatsapp">💬 WhatsApp</a>
            ${item.status === "active" ? 
              `<button class="btn btn-purchase" onclick="markAsPurchased('${item.id}')">🛒 Mark Purchased</button>` 
              : `<span class="btn disabled">✅ Purchased</span>`}
          </div>
        </div>`;
      container.appendChild(card);
    });

  } catch (err) {
    console.error("💥 loadListings error:", err);
    container.innerHTML = `<p class="error">❌ Failed to load listings.<br>(${err.message})</p>`;
  }
}

// Helper: Escape HTML to prevent XSS
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '<', '>': '>',
    '"': '&quot;', "'": '&#039;'
  }[m]));
}

// ————————————————————————————————
// Mark as Purchased
// ————————————————————————————————
window.markAsPurchased = async function(listingId) {
  if (!confirm("✅ Confirm: Mark this listing as purchased?")) return;

  try {
    const jsonPath = `listings/${listingId}.json`;
    const fileRef = bucket.child(jsonPath);

    // Fetch current data
    const url = await fileRef.getDownloadURL();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const data = await res.json();

    // Update
    data.status = "purchased";
    data.purchasedAt = Date.now();

    // Save back
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    await fileRef.put(blob);

    alert("✅ Successfully marked as purchased!");
    loadListings();
  } catch (err) {
    console.error("❌ markAsPurchased error:", err);
    alert("❌ Update failed: " + (err.message || "Try again"));
  }
};

// ————————————————————————————————
// Init
// ————————————————————————————————
window.addEventListener("load", () => {
  console.log("监听页面加载完成，开始加载 listings...");
  loadListings();
});
</script>
