<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mirdhuna Sell</title>

<style>
*{box-sizing:border-box}
body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#f5f6f8}
button{cursor:pointer}
header{padding:12px;background:#111;color:#fff;text-align:center}
.add-btn{background:#4caf50;color:#fff;border:none;padding:10px 16px;border-radius:6px}
#listingsContainer{padding:10px}

.item-card{
  background:#fff;
  border-radius:10px;
  margin-bottom:10px;
  display:flex;
  gap:10px;
  padding:10px;
  box-shadow:0 2px 6px rgba(0,0,0,.05);
}
.item-img img{
  width:110px;
  height:110px;
  object-fit:cover;
  border-radius:8px;
}
.item-info{flex:1}
.item-title{font-weight:700}
.item-price{color:#16a34a;font-weight:700}
.btn-whatsapp{
  display:inline-block;
  margin-top:6px;
  background:#25d366;
  color:#fff;
  text-decoration:none;
  padding:6px 10px;
  border-radius:6px;
}

.empty-state{text-align:center;padding:40px;color:#777}

/* MODAL */
.modal-backdrop{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.6);
  display:none;
  align-items:center;
  justify-content:center
}
.modal-backdrop.active{display:flex}
.modal{
  background:#fff;
  width:90%;
  max-width:420px;
  border-radius:12px;
  padding:16px
}
.modal h3{margin-top:0}
.modal input,.modal button{
  width:100%;
  padding:10px;
  margin-top:8px
}
#previewContainer{display:none;text-align:center;margin-top:6px}
#previewContainer img{
  max-width:100%;
  border-radius:8px
}
</style>
</head>

<body>

<header>
  <h2>Mirdhuna Sell</h2>
  <button class="add-btn" onclick="openAddForm()">➕ Add Listing</button>
</header>

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
/* ===============================
   FIREBASE INIT
================================ */
const firebaseConfig={
  apiKey:"YOUR_API_KEY",
  authDomain:"YOUR_AUTH_DOMAIN",
  projectId:"YOUR_PROJECT_ID",
  storageBucket:"YOUR_STORAGE_BUCKET",
  messagingSenderId:"YOUR_MSG_ID",
  appId:"YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const storage=firebase.storage();
const bucket=storage.ref();

const ADMIN_MOBILE="6303438082";

/* ===============================
   MODAL
================================ */
function toggleModal(show){
  document.getElementById("modalBackdrop")
    .classList.toggle("active",show);
  document.body.style.overflow=show?"hidden":"";
}
function openAddForm(){toggleModal(true)}

/* ===============================
   IMAGE PREVIEW
================================ */
document.getElementById("imageUpload")
.addEventListener("change",function(){
  const file=this.files[0];
  const preview=document.getElementById("imagePreview");
  const box=document.getElementById("previewContainer");

  if(file){
    preview.src=URL.createObjectURL(file);
    box.style.display="block";
  }else{
    box.style.display="none";
  }
});

/* ===============================
   SEND TO ADMIN
================================ */
document.getElementById("addListingForm")
.addEventListener("submit",function(e){
  e.preventDefault();

  const title=document.getElementById("title").value.trim();
  const price=document.getElementById("price").value.trim();
  const location=document.getElementById("location").value.trim();
  const mobile=document.getElementById("mobile").value.trim();
  const file=document.getElementById("imageUpload").files[0];

  if(!title||!price||!location){
    alert("All * fields are required");
    return;
  }

  let msg=
`Hello Admin,

New listing request:

🛒 Item: ${title}
💰 Price: ₹${Number(price).toLocaleString()}
📍 Location: ${location}
📱 Mobile: ${mobile||"Not provided"}
`;

  if(file) msg+="\n📷 Image selected (send manually)";

  const waURL="https://wa.me/91"+ADMIN_MOBILE+
              "?text="+encodeURIComponent(msg);

  window.open(waURL,"_blank");

  this.reset();
  document.getElementById("previewContainer")
    .style.display="none";
  toggleModal(false);
});

/* ===============================
   FAST LOAD LISTINGS
================================ */
async function loadListings(){
  const container=document.getElementById("listingsContainer");
  container.innerHTML=
    '<div class="empty-state">Loading listings…</div>';

  try{
    const res=await bucket.child("listings").listAll();

    if(res.items.length===0){
      container.innerHTML=
        '<div class="empty-state">No listings yet</div>';
      return;
    }

    container.innerHTML="";

    // 🔥 LOAD ALL IN PARALLEL
    const listings=await Promise.all(
      res.items.map(async(ref)=>{
        const url=await ref.getDownloadURL();
        return fetch(url).then(r=>r.json());
      })
    );

    // 🔥 RENDER FAST
    const fragment=document.createDocumentFragment();

    listings.forEach(data=>{
      const wa="https://wa.me/91"+data.mobile+
      "?text="+encodeURIComponent(
        `Hi, I am interested in:\n${data.title}\n₹${data.price}\n${data.location}`
      );

      const card=document.createElement("div");
      card.className="item-card";
      card.innerHTML=`
        <div class="item-img">
          <img src="${data.imageUrl}" loading="lazy">
        </div>
        <div class="item-info">
          <div class="item-title">${data.title}</div>
          <div class="item-price">₹${data.price}</div>
          <div>${data.location}</div>
          <a class="btn-whatsapp"
             href="${wa}" target="_blank">
             WhatsApp
          </a>
        </div>
      `;
      fragment.appendChild(card);
    });

    container.appendChild(fragment);

  }catch(err){
    console.error(err);
    container.innerHTML=
      '<div class="empty-state">❌ Error loading listings</div>';
  }
}

loadListings();
</script>

</body>
</html>
