<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mirdhuna Sell</title>

<style>
body{font-family:Arial,sans-serif;margin:0;background:#f6f7f9}
button{cursor:pointer}
.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center}
.modal-backdrop.active{display:flex}
.modal{background:#fff;padding:20px;border-radius:10px;width:90%;max-width:420px}
input,button{width:100%;padding:10px;margin:6px 0}
#previewContainer{display:none;text-align:center}
#previewContainer img{max-width:100%;border-radius:8px}
.item-card{background:#fff;margin:10px;padding:10px;border-radius:10px;display:flex;gap:10px}
.item-img img{width:100px;height:100px;object-fit:cover;border-radius:8px}
.btn-whatsapp{background:#25d366;color:#fff;padding:8px 12px;text-decoration:none;border-radius:6px;display:inline-block}
.empty-state{text-align:center;padding:40px;color:#777}
</style>
</head>

<body>

<button onclick="openAddForm()">➕ Add Listing</button>

<div id="listingsContainer"></div>

<!-- MODAL -->
<div class="modal-backdrop" id="modalBackdrop">
  <div class="modal">
    <h3>Add Listing</h3>

    <form id="addListingForm">
      <input id="title" placeholder="Item title *" required>
      <input id="price" type="number" placeholder="Price *" required>
      <input id="location" placeholder="Location *" required>
      <input id="mobile" placeholder="Your mobile (optional)">
      <input id="imageUpload" type="file" accept="image/*">

      <div id="previewContainer">
        <img id="imagePreview">
      </div>

      <button type="submit">Send to Admin</button>
      <button type="button" onclick="toggleModal(false)">Cancel</button>
    </form>
  </div>
</div>

<!-- FIREBASE -->
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-storage-compat.js"></script>

<script>
// ==============================
// FIREBASE CONFIG
// ==============================
const firebaseConfig = {
  apiKey: "AIzaSyCPbOZwAZEMiC1LSDSgnSEPmSxQ7-pR2oQ",
  authDomain: "mirdhuna-25542.firebaseapp.com",
  projectId: "mirdhuna-25542",
  storageBucket: "mirdhuna-25542.appspot.com",
  messagingSenderId: "575924409876",
  appId: "1:575924409876:web:6ba1ed88ce941d9c83b901"
};

firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();
const bucket = storage.ref();

// ==============================
// ADMIN
// ==============================
const ADMIN_MOBILE = "6303438082";

// ==============================
// MODAL
// ==============================
function toggleModal(show){
  document.getElementById("modalBackdrop").classList.toggle("active",show);
  document.body.style.overflow = show ? "hidden" : "";
}
function openAddForm(){toggleModal(true)}

// ==============================
// IMAGE PREVIEW
// ==============================
document.getElementById("imageUpload").addEventListener("change",e=>{
  const file=e.target.files[0];
  const preview=document.getElementById("imagePreview");
  const box=document.getElementById("previewContainer");
  if(file){
    preview.src=URL.createObjectURL(file);
    box.style.display="block";
  }else box.style.display="none";
});

// ==============================
// SEND TO ADMIN (NO ERRORS)
// ==============================
document.getElementById("addListingForm").addEventListener("submit",e=>{
  e.preventDefault();

  const title=document.getElementById("title").value.trim();
  const price=document.getElementById("price").value.trim();
  const location=document.getElementById("location").value.trim();
  const mobile=document.getElementById("mobile").value.trim();
  const file=document.getElementById("imageUpload").files[0];

  if(!title||!price||!location){
    alert("All * fields required");
    return;
  }

  let msg=`Hello Admin,

New listing request:

🛒 Item: ${title}
💰 Price: ₹${Number(price).toLocaleString()}
📍 Location: ${location}
📱 Mobile: ${mobile||"Not provided"}
`;

  if(file) msg+="\n📷 Image selected (send manually)";

  const waURL=`https://wa.me/91${ADMIN_MOBILE}?text=${encodeURIComponent(msg)}`;
  window.open(waURL,"_blank");

  e.target.reset();
  document.getElementById("previewContainer").style.display="none";
  toggleModal(false);
});

// ==============================
// LOAD LISTINGS
// ==============================
async function loadListings(){
  const container=document.getElementById("listingsContainer");
  container.innerHTML=`<div class="empty-state">Loading…</div>`;

  try{
    const res=await bucket.child("listings").listAll();
    if(!res.items.length){
      container.innerHTML=`<div class="empty-state">No listings</div>`;
      return;
    }

    container.innerHTML="";
    for(const ref of res.items){
      const url=await ref.getDownloadURL();
      const data=await fetch(url).then(r=>r.json());

      const wa=`https://wa.me/91${data.mobile}?text=${encodeURIComponent(
`Hi, I am interested in:
${data.title}
₹${data.price}
${data.location}`
      )}`;

      const card=document.createElement("div");
      card.className="item-card";
      card.innerHTML=`
        <div class="item-img">
          <img src="${data.imageUrl}">
        </div>
        <div>
          <b>${data.title}</b>
          <div>₹${data.price}</div>
          <div>${data.location}</div>
          <a class="btn-whatsapp" href="${wa}" target="_blank">WhatsApp</a>
        </div>`;
      container.appendChild(card);
    }
  }catch(err){
    console.error(err);
    container.innerHTML=`<div class="empty-state">Error loading</div>`;
  }
}

loadListings();
</script>

</body>
</html>
