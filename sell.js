// ==============================
// Firebase Config
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
const app = firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();
const bucket = storage.ref();

const DEFAULT_ADMIN_PHONE = "6454678866";
const COD_NOTE = "✅ Cash on Delivery Available";

// ==============================
// Toggle Add Form
// ==============================
window.toggleAddForm = () => {
  document.getElementById("addForm").classList.toggle("active");
};

// ==============================
// Preview Image Before Upload
// ==============================
document.getElementById("imageUpload").addEventListener("change", function () {
  const file = this.files[0];
  const preview = document.getElementById("imagePreview");

  if (!file) return (preview.style.display = "none");

  if (!/image\/(jpe?g|png)$/i.test(file.type)) {
    alert("❌ Only JPG/PNG images allowed.");
    this.value = "";
    preview.style.display = "none";
    return;
  }

  preview.src = URL.createObjectURL(file);
  preview.style.display = "block";
});

// ==============================
// Save Listing (Image + JSON)
// ==============================
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

    const metadata = {
      id, title, price, location,
      mobile: mobile || "",
      imageUrl: imgUrl,
      status: "active",
      createdAt: Date.now()
    };

    // Upload JSON metadata
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" });
    await bucket.child(jsonPath).put(blob);

    alert("✅ Listing successfully added!");

    document.getElementById("addListingForm").reset();
    document.getElementById("imagePreview").style.display = "none";
    toggleAddForm();
    loadListings();
  } catch (err) {
    alert("❌ Failed: " + err.message);
  }
});

// ==============================
// Load Listings
// ==============================
async function loadListings() {
  const container = document.getElementById("listingsContainer");
  container.innerHTML = `<div class="loading">Loading listings...</div>`;

  try {
    const listRef = bucket.child("listings/");
    const res = await listRef.listAll();
    const jsonFiles = res.items.filter(item => item.name.endsWith(".json"));

    container.innerHTML = "";

    const listings = [];

    for (const fileRef of jsonFiles) {
      const url = await fileRef.getDownloadURL();
      const resp = await fetch(url);
      const data = await resp.json();
      listings.push(data);
    }

    listings.sort((a, b) => b.createdAt - a.createdAt);

    listings.forEach(item => {
      const sellerPhone = item.mobile || DEFAULT_ADMIN_PHONE;
      const waText = encodeURIComponent(
        `Hi, I'm interested in:\n📌 ${item.title}\n💰 ₹${item.price}\n📍 ${item.location}\n${COD_NOTE}\nThank you`
      );

      const waURL = `https://wa.me/91${sellerPhone}?text=${waText}`;
      const statusText = item.status === "purchased" ? "⏳ Purchased" : "🟢 Active";

      const card = document.createElement("div");
      card.className = "item-card";

      card.innerHTML = `
        <div class="item-img">
          <img src="${item.imageUrl}" onerror="this.src='https://via.placeholder.com/140?text=No+Image'">
        </div>
        <div class="item-info">
          <div class="item-title">${item.title}</div>
          <div class="item-price">₹${item.price.toLocaleString()}</div>
          <div class="item-meta">
            📍 ${item.location} ${item.mobile ? `| 📱 ${item.mobile}` : ""}
            <br><small>${statusText}</small>
          </div>
          <div class="btn-group">
            <a href="${waURL}" target="_blank" class="btn btn-whatsapp">WhatsApp</a>
            ${item.status === "active"
              ? `<button class="btn btn-purchase" onclick="markAsPurchased('${item.id}')">🛒 Purchased</button>`
              : ""}
          </div>
        </div>
      `;

      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = `<p class="loading">❌ Error loading items: ${err.message}</p>`;
  }
}

// ==============================
// Mark As Purchased
// ==============================
window.markAsPurchased = async function (listingId) {
  if (!confirm("Confirm purchase?")) return;

  try {
    const jsonPath = `listings/${listingId}.json`;
    const fileRef = bucket.child(jsonPath);
    const url = await fileRef.getDownloadURL();

    const resp = await fetch(url);
    const data = await resp.json();

    data.status = "purchased";
    data.purchasedAt = Date.now();

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    await fileRef.put(blob);

    alert("✔ Updated to Purchased");
    loadListings();
  } catch (err) {
    alert(err.message);
  }
};

// Init load
window.addEventListener("load", loadListings);
