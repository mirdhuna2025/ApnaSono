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

const DEFAULT_ADMIN_PHONE = "6454678866";
let CURRENT_USER = null;

// ==============================
// Auth – Simple Login
// ==============================
window.loginUser = () => {
  const pass = prompt("Enter Admin Password:");
  if (pass === "123456") {
    CURRENT_USER = "admin";
    alert("✔ Logged In as Admin");
    document.getElementById("addListingForm").style.display = "block";
    loadListings();
  } else {
    alert("❌ Wrong Password");
  }
};

// ==============================
// Toggle Add Form
// ==============================
window.toggleAddForm = () => {
  if (!CURRENT_USER) return alert("Please login first.");
  document.getElementById("addForm").classList.toggle("active");
};

// ==============================
// Preview Image Before Upload
// ==============================
document.getElementById("imageUpload").addEventListener("change", function () {
  const file = this.files[0];
  const preview = document.getElementById("imagePreview");

  if (!file) return (preview.style.display = "none");
  preview.src = URL.createObjectURL(file);
  preview.style.display = "block";
});

// ==============================
// Save Listing
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
      id, title, price, location,
      mobile: mobile || "",
      imageUrl: imgUrl,
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
// Lazy Load + Display Listings
// ==============================
function updateAuthUI() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  authText.textContent = isLoggedIn ? 'Logout' : 'Login';
}

function closeLoginPopup() {
  popup.style.display = 'none';
  mobInput.value = '';
}

async function handleLogin() {
  const number = mobInput.value.trim();
  if (!number || !/^[6-9]\d{9}$/.test(number)) {
    alert('Please enter a valid 10-digit Indian mobile number (starting with 6–9).');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in...';

  let location = null;
  if ('geolocation' in navigator) {
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });
      location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (err) {
      console.warn('Geolocation not available:', err);
    }
  }

  try {
    const database = await initFirebase();
    const { ref, push } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');

    await push(ref(database, 'loginHistory'), {
      mobileNumber: number,
      timestamp: new Date().toISOString(),
      location: location || { error: 'Geolocation denied or unavailable' }
    });

    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('mobileNumber', number);
    updateAuthUI();
   
    closeLoginPopup();
  } catch (error) {
    console.error('Firebase error:', error);
    alert('Login failed. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login';
  }
}


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
      const waURL = `https://wa.me/91${item.mobile || DEFAULT_ADMIN_PHONE}?text=${waText}`;

      const card = document.createElement("div");
      card.className = "item-card";

      card.innerHTML = `
        <div class="item-img">
          <img loading="lazy" src="${item.imageUrl}"
            onclick="openImage('${item.imageUrl}')"
            onerror="this.src='https://via.placeholder.com/150?text=Image+Error'">
        </div>
        <div class="item-info">
          <div class="item-title">${item.title}</div>
          <div class="item-price">₹${item.price.toLocaleString()}</div>
          <div class="item-meta">📍 ${item.location}</div>

          <div class="btn-group">
            <a href="${waURL}" target="_blank" class="btn btn-whatsapp">WhatsApp</a>
            ${item.status === "active"
              ? `<button class="btn btn-purchase" onclick="markAsPurchased('${item.id}')">Purchased</button>`
              : `<button class="btn btn-purchase" onclick="deleteItem('${item.id}')">Delete</button>`
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
// Mark As Purchased
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
// Delete item
// ==============================
window.deleteItem = async function (listingId) {
  if (!CURRENT_USER) return alert("Admin only!");
  if (!confirm("Delete this item?")) return;

  await bucket.child(`listings/${listingId}.json`).delete();
  alert("🗑 Deleted");
  loadListings();
};

// ==============================
// View full image on click
// ==============================
window.openImage = (url) => {
  const win = window.open("");
  win.document.write(`<img src="${url}" style="width:100%">`);
};

// AUTO LOAD
window.addEventListener("load", loadListings);

// Login button action
