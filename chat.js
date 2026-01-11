// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"
import {
  getDatabase,
  ref,
  set,
  push,
  onValue,
  remove,
  update,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js"
import {
  getStorage,
  ref as storageRef,
  uploadString,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"

const firebaseConfig = {
  apiKey: "AIzaSyCPbOZwAZEMiC1LSDSgnSEPmSxQ7-pR2oQ",
  authDomain: "mirdhuna-25542.firebaseapp.com",
  databaseURL: "https://mirdhuna-25542-default-rtdb.firebaseio.com",
  projectId: "mirdhuna-25542",
  storageBucket: "mirdhuna-25542.firebasestorage.app",
  messagingSenderId: "575924409876",
  appId: "1:575924409876:web:6ba1ed88ce941d9c83b901",
  measurementId: "G-YB7LDKHBPV",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const database = getDatabase(app)
const storage = getStorage(app)

// DOM Elements
const profileAvatar = document.getElementById("profileAvatar")
const usernameInput = document.getElementById("usernameInput")
const bioInput = document.getElementById("bioInput")
const saveProfileBtn = document.getElementById("saveProfileBtn")
const avatarInput = document.getElementById("avatarInput")
const photoInput = document.getElementById("photoInput")
const videoInput = document.getElementById("videoInput")
const photoBtn = document.getElementById("photoBtn")
const videoBtn = document.getElementById("videoBtn")
const sendBtn = document.getElementById("sendBtn")
const messageInput = document.getElementById("messageInput")
const messagesContainer = document.getElementById("messagesContainer")
const usersList = document.getElementById("usersList")
const chatTitle = document.getElementById("chatTitle")
const lightbox = document.getElementById("lightbox")
const lightboxContent = document.getElementById("lightboxContent")
const closeLightbox = document.getElementById("closeLightbox")
const refreshBtn = document.getElementById("refreshBtn")
const exportBtn = document.getElementById("exportBtn")
const clearBtn = document.getElementById("clearBtn")

// App State
const currentUser = JSON.parse(localStorage.getItem("currentUser")) || {
  id: generateUID(),
  username: "Anonymous",
  bio: "",
  avatar: "👤",
  createdAt: new Date().toISOString(),
}

let messages = []
let users = {}
let selectedMediaFile = null

// Utility Functions
function generateUID() {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function getTimeAgo(timestamp) {
  const now = new Date().getTime()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function saveProfile() {
  currentUser.username = usernameInput.value || "Anonymous"
  currentUser.bio = bioInput.value
  localStorage.setItem("currentUser", JSON.stringify(currentUser))
  set(ref(database, `users/${currentUser.id}`), currentUser)
  showNotification("Profile saved!")
}

async function handleAvatarUpload(file) {
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    const dataUrl = e.target.result
    try {
      const avatarRef = storageRef(storage, `avatars/${currentUser.id}.jpg`)
      await uploadString(avatarRef, dataUrl, "data_url")
      const downloadURL = await getDownloadURL(avatarRef)
      currentUser.avatar = downloadURL
      profileAvatar.innerHTML = `<img src="${downloadURL}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`
      saveProfile()
      showNotification("Avatar updated!")
    } catch (error) {
      console.error("Avatar upload error:", error)
      showNotification("Failed to upload avatar")
    }
  }
  reader.readAsDataURL(file)
}

async function handleMediaUpload(file) {
  if (!file) return

  selectedMediaFile = file
  showNotification("Media selected. Send now!")
}

async function sendMessage() {
  const text = messageInput.value.trim()
  if (!text && !selectedMediaFile) return

  const messageData = {
    id: push(ref(database, "messages")).key,
    userId: currentUser.id,
    username: currentUser.username,
    avatar: currentUser.avatar,
    text: text,
    mediaUrl: null,
    mediaType: null,
    timestamp: new Date().getTime(),
    likes: 0,
    dislikes: 0,
    replies: [],
  }

  try {
    if (selectedMediaFile) {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const dataUrl = e.target.result
        const mediaRef = storageRef(storage, `media/${messageData.id}/${selectedMediaFile.name}`)
        await uploadString(mediaRef, dataUrl, "data_url")
        const downloadURL = await getDownloadURL(mediaRef)
        messageData.mediaUrl = downloadURL
        messageData.mediaType = selectedMediaFile.type.split("/")[0]
        set(ref(database, `messages/${messageData.id}`), messageData)
        messageInput.value = ""
        selectedMediaFile = null
        showNotification("Message sent!")
      }
      reader.readAsDataURL(selectedMediaFile)
    } else {
      set(ref(database, `messages/${messageData.id}`), messageData)
      messageInput.value = ""
      showNotification("Message sent!")
    }
  } catch (error) {
    console.error("Send error:", error)
    showNotification("Failed to send message")
  }
}

function renderMessages() {
  messagesContainer.innerHTML = ""

  if (messages.length === 0) {
    messagesContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💬</div>
        <p>No messages yet. Start the conversation!</p>
      </div>
    `
    return
  }

  messages.forEach((msg) => {
    const isOwn = msg.userId === currentUser.id
    const messageGroup = document.createElement("div")
    messageGroup.className = "message-group"

    if (!isOwn) {
      const avatar = document.createElement("div")
      avatar.className = "message-avatar"
      if (msg.avatar && msg.avatar.startsWith("http")) {
        avatar.innerHTML = `<img src="${msg.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`
      } else {
        avatar.textContent = msg.avatar
      }
      messageGroup.appendChild(avatar)
    }

    const content = document.createElement("div")
    content.className = "message-content"
    content.style.marginLeft = isOwn ? "auto" : "0"

    const header = document.createElement("div")
    header.className = "message-header"
    header.innerHTML = `
      <span class="message-author">${msg.username}</span>
      <span class="message-time">${getTimeAgo(msg.timestamp)}</span>
    `
    content.appendChild(header)

    if (msg.text) {
      const bubble = document.createElement("div")
      bubble.className = `message-bubble ${isOwn ? "own" : ""}`
      bubble.textContent = msg.text
      content.appendChild(bubble)
    }

    if (msg.mediaUrl) {
      const media = document.createElement(msg.mediaType === "video" ? "video" : "img")
      media.src = msg.mediaUrl
      media.className = "message-media"
      media.controls = msg.mediaType === "video"
      media.style.cursor = "pointer"
      media.onclick = () => openLightbox(msg.mediaUrl, msg.mediaType)
      content.appendChild(media)
    }

    const interactions = document.createElement("div")
    interactions.className = "message-interactions"
    interactions.innerHTML = `
      <button class="reaction-button" onclick="likeMessage('${msg.id}')">👍 ${msg.likes || 0}</button>
      <button class="reaction-button" onclick="dislikeMessage('${msg.id}')">👎 ${msg.dislikes || 0}</button>
      ${currentUser.id === "admin" ? `<button class="reaction-button" onclick="deleteMessage('${msg.id}')">🗑️</button>` : ""}
    `
    content.appendChild(interactions)

    messageGroup.appendChild(content)
    messagesContainer.appendChild(messageGroup)
  })

  messagesContainer.scrollTop = messagesContainer.scrollHeight
}

function renderUsers() {
  usersList.innerHTML = ""
  Object.values(users).forEach((user) => {
    const userItem = document.createElement("div")
    userItem.className = "user-item"
    const userAvatar = document.createElement("div")
    userAvatar.className = "user-avatar-small"
    if (user.avatar && user.avatar.startsWith("http")) {
      userAvatar.innerHTML = `<img src="${user.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`
    } else {
      userAvatar.textContent = user.avatar
    }
    userItem.appendChild(userAvatar)

    const userInfo = document.createElement("div")
    userInfo.className = "user-info"
    userInfo.innerHTML = `
      <div class="user-name">${user.username}</div>
      <div class="user-status">${user.bio}</div>
    `
    userItem.appendChild(userInfo)
    usersList.appendChild(userItem)
  })
}

function openLightbox(src, type) {
  lightboxContent.innerHTML = ""
  const media = document.createElement(type === "video" ? "video" : "img")
  media.src = src
  media.style.maxWidth = "100%"
  media.style.maxHeight = "100%"
  if (type === "video") media.controls = true
  lightboxContent.appendChild(media)
  lightbox.classList.add("active")
}

function showNotification(message) {
  // Simple notification - can be enhanced with a toast system
  console.log("Notification:", message)
}

// Global functions for message interactions
window.likeMessage = (messageId) => {
  const msg = messages.find((m) => m.id === messageId)
  if (msg) {
    msg.likes = (msg.likes || 0) + 1
    update(ref(database, `messages/${messageId}`), { likes: msg.likes })
  }
}

window.dislikeMessage = (messageId) => {
  const msg = messages.find((m) => m.id === messageId)
  if (msg) {
    msg.dislikes = (msg.dislikes || 0) + 1
    update(ref(database, `messages/${messageId}`), { dislikes: msg.dislikes })
  }
}

window.deleteMessage = (messageId) => {
  remove(ref(database, `messages/${messageId}`))
}

// Event Listeners
saveProfileBtn.addEventListener("click", saveProfile)
avatarInput.addEventListener("change", (e) => handleAvatarUpload(e.target.files[0]))
photoBtn.addEventListener("click", () => photoInput.click())
photoInput.addEventListener("change", (e) => handleMediaUpload(e.target.files[0]))
videoBtn.addEventListener("click", () => videoInput.click())
videoInput.addEventListener("change", (e) => handleMediaUpload(e.target.files[0]))
sendBtn.addEventListener("click", sendMessage)
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
})

closeLightbox.addEventListener("click", () => {
  lightbox.classList.remove("active")
})

lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) {
    lightbox.classList.remove("active")
  }
})

refreshBtn.addEventListener("click", () => {
  location.reload()
})

exportBtn.addEventListener("click", () => {
  const dataToExport = {
    user: currentUser,
    messages: messages,
    exportedAt: new Date().toISOString(),
  }
  const dataStr = JSON.stringify(dataToExport, null, 2)
  const dataBlob = new Blob([dataStr], { type: "application/json" })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement("a")
  link.href = url
  link.download = `instantchat-export-${Date.now()}.json`
  link.click()
  showNotification("Chat exported!")
})

clearBtn.addEventListener("click", () => {
  if (confirm("Are you sure? This will delete all messages.")) {
    remove(ref(database, "messages"))
    showNotification("Chat cleared!")
  }
})

// Initialize Profile Display
usernameInput.value = currentUser.username
bioInput.value = currentUser.bio
if (currentUser.avatar && currentUser.avatar.startsWith("http")) {
  profileAvatar.innerHTML = `<img src="${currentUser.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`
} else {
  profileAvatar.textContent = currentUser.avatar
}

// Load messages from Firebase
onValue(ref(database, "messages"), (snapshot) => {
  messages = []
  const data = snapshot.val()
  if (data) {
    Object.keys(data).forEach((key) => {
      messages.push({ id: key, ...data[key] })
    })
    messages.sort((a, b) => a.timestamp - b.timestamp)
  }
  renderMessages()
})

// Load users from Firebase
onValue(ref(database, "users"), (snapshot) => {
  users = {}
  const data = snapshot.val()
  if (data) {
    users = data
  }
  renderUsers()
})

// Save current user to Firebase
set(ref(database, `users/${currentUser.id}`), currentUser)
