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
firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();
const bucket = storage.ref();

const DEFAULT_ADMIN_PHONE = "6454678866";
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
document.getElementById("imageUpload").addEventListener("change", function() {
  const file = this.files[0];
  const preview = document.getElementById("imagePreview");
  if (!file) { preview.style.display = "none"; return; }
  if (!/image\/(jpe?g|png)/i.test(file.type)) {
    alert("❌ Only JPG/PNG.");
    this.value = ""; preview.style.display = "none";
    return;
  }
  preview.src = URL.createObjectURL(file);
  preview.style.display = "block";
});

// ————————————————————————————————
// Save Listing (Image + JSON)
// ————————————————————————————————
document.getElementById("addListingForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const price = Number(document.getElementById("price").value);
  const location = document.getElementById("location").value.trim();
  const mobile = document.getElementById("mobile").value.trim();
  const file = document.getElementById("imageUpload").files[0];

  if (mobile && !/^\d{10}$/.test(mobile)) {
    alert("❌ Mobile must be 10 digits or blank.");
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
      id, title, price, location,
      mobile: mobile || "",
      imageUrl: imgUrl,
      status: "active",
      createdAt: Date.now()
    };

    const jsonBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    await bucket.child(jsonPath).put(jsonBlob);

    alert("✅ Listing saved to Firebase Storage!");
    document.getElementById("addListingForm").reset();
    document.getElementById("imagePreview").style.display = "none";
    toggleAddForm();
    loadListings();
  } catch (err) {
    console.error(err);
    alert("❌ " + (err.message || "Upload failed"));
  }
});

// ————————————————————————————————
// Load Listings (from /listings/*.json)
// ————————————————————————————————
async function loadListings() {
  const container = document.getElementById("listingsContainer");
  try {
    const listRef = bucket.child("listings/");
    const res = await listRef.listAll();
    const jsonFiles = res.items.filter(item => item.name.endsWith('.json'));

    if (jsonFiles.length === 0) {
      container.innerHTML = "<p>No listings yet.</p>";
      return;
    }

    container.innerHTML = "";
    const listings = [];

    for (const fileRef of jsonFiles) {
      try {
        const url = await fileRef.getDownloadURL();
        const response = await fetch(url);
        const data = await response.json();
        listings.push(data);
      } catch (e) {
        console.warn("Skip invalid listing:", fileRef.name);
      }
    }

    listings.sort((a, b) => b.createdAt - a.createdAt);

    listings.forEach(item => {
      const sellerPhone = (item.mobile && /^\d{10}$/.test(item.mobile)) ? item.mobile : DEFAULT_ADMIN_PHONE;
      const waText = encodeURIComponent(
        `Hi, I'm interested in:\n📌 *${item.title}*\n💰 ₹${item.price.toLocaleString()}\n📍 ${item.location}\n${COD_NOTE}\n\nMore details? Thanks!`
      );
      const waURL = `https://wa.me/91  ${sellerPhone}?text=${waText}`;
      const statusText = item.status === "purchased" ? "⏳ Purchased" : "🟢 Active";

      const card = document.createElement("div");
      card.className = "item-card";
      card.innerHTML = `
        <div class="item-img">
          <img src="${item.imageUrl || 'https://via.placeholder.com/140?text=📷'}" 
               onerror="this.src='  https://via.placeholder.com/140?text=📷'">
        </div>
        <div class="item-info">
          <div class="item-title">${item.title}</div>
          <div class="item-price">₹${item.price.toLocaleString()}</div>
          <div class="item-meta">
            📍 ${item.location}
            ${item.mobile ? ` | 📱 ${item.mobile}` : ""}
            <br><small>${statusText}</small>
          </div>
          <div class="btn-group">
            <a href="${waURL}" target="_blank" class="btn btn-whatsapp">WhatsApp</a>
            ${item.status === "active" ? 
              `<button class="btn btn-purchase" onclick="markAsPurchased('${item.id}')">🛒 Purchased</button>` 
              : ""}
          </div>
        </div>`;
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = `<p class="loading">❌ Load failed: ${err.message}</p>`;
  }
}

// ————————————————————————————————
// Mark as Purchased
// ————————————————————————————————
window.markAsPurchased = async function(listingId) {
  if (!confirm("Confirm purchase?")) return;

  try {
    const jsonPath = `listings/${listingId}.json`;
    const fileRef = bucket.child(jsonPath);

    const url = await fileRef.getDownloadURL();
    const res = await fetch(url);
    const data = await res.json();

    data.status = "purchased";
    data.purchasedAt = Date.now();

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    await fileRef.put(blob);

    alert("✅ Marked as purchased!");
    loadListings();
  } catch (err) {
    alert("❌ " + err.message);
  }
};

// Init
window.addEventListener("load", loadListings);
