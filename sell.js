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
  const mobile = prompt("Enter Mobile Number:");
  const pass = prompt("Enter Password:");

  if (!mobile || !pass) return alert("Enter both fields!");

  // Admin login
  if (mobile === ADMIN_MOBILE && pass === ADMIN_PASS) {
    CURRENT_USER = ADMIN_MOBILE;
    CURRENT_PASS = ADMIN_PASS;
    localStorage.setItem("mobileNumber", mobile);
    localStorage.setItem("userPassword", pass);

    alert("✔ Logged in as Admin");
    loadListings();
    return;
  }

  // Normal user login
  CURRENT_USER = mobile;
  CURRENT_PASS = pass;
  localStorage.setItem("mobileNumber", mobile);
  localStorage.setItem("userPassword", pass);

  alert("✔ Logged In Successfully");
  loadListings();
};

window.logoutUser = () => {
  localStorage.removeItem("mobileNumber");
  localStorage.removeItem("userPassword");
  CURRENT_USER = null;
  CURRENT_PASS = null;
  alert("Logged out");
  location.reload();
};

// ==============================
// Toggle Add Form
// ==============================
window.toggleAddForm = () => {
  if (!CURRENT_USER) return alert("Login required!");
  document.getElementById("addForm").classList.toggle("active");
};

// ==============================
// Preview Image
// ==============================
document.getElementById("imageUpload").addEventListener("change", function () {
  const file = this.files[0];
  const preview = document.getElementById("imagePreview");

  if (!file) return (preview.style.display = "none");
  preview.src = URL.createObjectURL(file);
  preview.style.display = "block";
});

// ==============================
// Save Listing (Upload)
// ==============================
document.getElementById("addListingForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!CURRENT_USER) return alert("Login required!");

  const title = document.getElementById("title").value.trim();
  const price = Number(document.getElementById("price").value);
  const location = document.getElementById("location").value.trim();
  const mobile = document.getElementById("mobile").value.trim();
  const file = document.getElementById("imageUpload").files[0];

  try {
    const id = Date.now().toString();
    const imgPath = `images/${id}_${file.name}`;
    const jsonPath = `listings/${id}.json`;

    await bucket.child(imgPath).put(file);
    const imgUrl = await bucket.child(imgPath).getDownloadURL();

    const metadata = {
      id,
      title,
      price,
      location,
      mobile,
      imageUrl: imgUrl,
      ownerMobile: CURRENT_USER,  // SET OWNER
      status: "active",
      createdAt: Date.now()
    };

    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" });
    await bucket.child(jsonPath).put(blob);

    alert("✔ Listing Added");
    document.getElementById("addListingForm").reset();
    document.getElementById("imagePreview").style.display = "none";
    toggleAddForm();
    loadListings();
  } catch (err) {
    alert(err.message);
  }
});

// ==============================
// Load Listings
// ==============================
async function loadListings() {
  const container = document.getElementById("listingsContainer");
  container.innerHTML = `<div class="loading">Loading...</div>`;

  try {
    const listRef = bucket.child("listings/");
    const res = await listRef.listAll();
    const jsonFiles = res.items.filter(item => item.name.endsWith(".json"));

    container.innerHTML = "";
    const items = [];

    for (const fileRef of jsonFiles) {
      const url = await fileRef.getDownloadURL();
      const resp = await fetch(url);
      items.push(await resp.json());
    }

    items.sort((a, b) => b.createdAt - a.createdAt);

    items.forEach(item => {
      const waText = encodeURIComponent(
        `Hi, I'm interested in:\n${item.title}\nPrice: ₹${item.price}\nLocation: ${item.location}`
      );
      const waURL = `https://wa.me/91${item.mobile}?text=${waText}`;

      const card = document.createElement("div");
      card.className = "item-card";

      card.innerHTML = `
        <div class="item-img">
          <img loading="lazy" src="${item.imageUrl}" onclick="openImage('${item.imageUrl}')">
        </div>
        <div class="item-info">
          <div class="item-title">${item.title}</div>
          <div class="item-price">₹${item.price.toLocaleString()}</div>
          <div class="item-meta">📍 ${item.location}</div>

          <div class="btn-group">
            <a href="${waURL}" class="btn btn-whatsapp" target="_blank">WhatsApp</a>

            ${
              item.ownerMobile === CURRENT_USER || CURRENT_USER === ADMIN_MOBILE
                ? `<button class="btn btn-delete" onclick="deleteItem('${item.id}')">Delete</button>`
                : ""
            }

            ${
              CURRENT_USER === ADMIN_MOBILE && item.status === "active"
                ? `<button class="btn btn-purchase" onclick="markAsPurchased('${item.id}')">Purchased</button>`
                : ""
            }
          </div>
        </div>
      `;

      container.appendChild(card);
    });

  } catch (err) {
    container.innerHTML = `<p>Error: ${err.message}</p>`;
  }
}

// ==============================
// Purchased
// ==============================
window.markAsPurchased = async function (listingId) {
  const jsonPath = `listings/${listingId}.json`;
  const fileRef = bucket.child(jsonPath);

  const resp = await fetch(await fileRef.getDownloadURL());
  const data = await resp.json();
  data.status = "purchased";

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  await fileRef.put(blob);

  alert("✔ Marked Purchased");
  loadListings();
};

// ==============================
// Delete Item with Permission
// ==============================
window.deleteItem = async function (listingId) {
  const fileRef = bucket.child(`listings/${listingId}.json`);
  const resp = await fetch(await fileRef.getDownloadURL());
  const item = await resp.json();

  if (CURRENT_USER !== ADMIN_MOBILE && CURRENT_USER !== item.ownerMobile) {
    return alert("❌ You don't have permission to delete this!");
  }

  if (!confirm("Delete this item?")) return;

  await fileRef.delete();
  alert("🗑 Deleted");
  loadListings();
};

// ==============================
// View Image
// ==============================
window.openImage = (url) => {
  const win = window.open("");
  win.document.write(`<img src="${url}" style="width:100%">`);
};

// AUTO LOAD
window.addEventListener("load", loadListings);
