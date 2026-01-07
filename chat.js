// ========== FIREBASE CONFIGURATION ==========
// Declare the firebase variable
const firebase = window.firebase

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDjhzzGE1jJ-U1lG3b8v3KqYN5oZyIpzHU",
  authDomain: "instantchat-f8b1e.firebaseapp.com",
  projectId: "instantchat-f8b1e",
  storageBucket: "instantchat-f8b1e.appspot.com",
  messagingSenderId: "702833571971",
  appId: "1:702833571971:web:3b4f9c1d4e8f2a5b6c",
}

// Initialize Firebase (using global firebase object from CDN)
firebase.initializeApp(firebaseConfig)
const db = firebase.database()
const storage = firebase.storage()
const messagesRef = db.ref("messages")
const usersRef = db.ref("users")

// ========== STATE MANAGEMENT ==========
let currentUser = null
let isAdmin = false
let replyingToMsgId = null
let allMessages = []
const videoAutoplayEnabled = true

// ========== INITIALIZATION ==========
document.addEventListener("DOMContentLoaded", () => {
  initializeApp()
  setupEventListeners()
  loadUserProfile()
  loadMessagesFromFirebase()
  startAutoRefresh()
})

function initializeApp() {
  // Request notification permission
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission()
  }

  // Check if user profile exists in localStorage
  const savedProfile = localStorage.getItem("userProfile")
  if (!savedProfile) {
    openModal("profileModal")
  }
}

function setupEventListeners() {
  // Header buttons
  document.getElementById("profileBtn").addEventListener("click", () => openModal("profileModal"))
  document.getElementById("adminBtn").addEventListener("click", () => openModal("adminModal"))
  document.getElementById("usersBtn").addEventListener("click", loadAndShowUsers)
  document.getElementById("refreshBtn").addEventListener("click", () => location.reload())

  // Message composer
  document.getElementById("sendBtn").addEventListener("click", sendMessage)
  document.getElementById("msgInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  })

  // Media buttons
  document.getElementById("cameraBtn").addEventListener("click", () => {
    document.getElementById("cameraInput").click()
  })
  document.getElementById("galleryBtn").addEventListener("click", () => {
    document.getElementById("galleryInput").click()
  })

  document.getElementById("cameraInput").addEventListener("change", (e) => handleMediaUpload(e, "camera"))
  document.getElementById("galleryInput").addEventListener("change", (e) => handleMediaUpload(e, "gallery"))

  // Profile modal
  document.getElementById("uploadPhotoBtn").addEventListener("click", () => {
    document.getElementById("profilePhotoInput").click()
  })
  document.getElementById("profilePhotoInput").addEventListener("change", handleProfilePhotoChange)
  document.getElementById("saveProfileBtn").addEventListener("click", saveProfile)

  // Admin modal
  document.getElementById("adminLoginBtn").addEventListener("click", adminLogin)

  // Reply modal
  document.getElementById("sendReplyBtn").addEventListener("click", sendReply)

  // Modal closes
  document.querySelectorAll(".modal-close").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const modalId = e.target.dataset.modal
      closeModal(modalId)
    })
  })

  // Media viewer close
  document.querySelector(".media-viewer-close").addEventListener("click", closeMediaViewer)
  document.getElementById("mediaViewer").addEventListener("click", (e) => {
    if (e.target.id === "mediaViewer") closeMediaViewer()
  })

  // User profile card close
  document.getElementById("closeProfileCardBtn").addEventListener("click", () => closeModal("userProfileModal"))
}

// ========== PROFILE MANAGEMENT ==========
function loadUserProfile() {
  const saved = localStorage.getItem("userProfile")
  if (saved) {
    currentUser = JSON.parse(saved)
    updateProfileUI()
  }
}

function updateProfileUI() {
  if (currentUser) {
    document.getElementById("profileBtn").src =
      currentUser.photo || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"
    document.getElementById("nameInput").value = currentUser.name || ""
    document.getElementById("bioInput").value = currentUser.bio || ""
    document.getElementById("profilePreview").src =
      currentUser.photo || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"
  }
}

function handleProfilePhotoChange(e) {
  const file = e.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (event) => {
      currentUser = currentUser || {}
      currentUser.photo = event.target.result
      document.getElementById("profilePreview").src = currentUser.photo
    }
    reader.readAsDataURL(file)
  }
}

function saveProfile() {
  const name = document.getElementById("nameInput").value.trim()
  const bio = document.getElementById("bioInput").value.trim()

  if (!name) {
    alert("Please enter a username")
    return
  }

  currentUser = {
    id: Date.now().toString(),
    name: name,
    bio: bio,
    photo: currentUser?.photo || "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
    joinedAt: currentUser?.joinedAt || new Date().toISOString(),
  }

  localStorage.setItem("userProfile", JSON.stringify(currentUser))
  usersRef
    .child(currentUser.id)
    .set(currentUser)
    .catch((err) => console.error("Error saving profile:", err))
  updateProfileUI()
  closeModal("profileModal")
  showNotification("Profile updated!", { icon: "✓" })
}

// ========== MESSAGE OPERATIONS ==========
function sendMessage() {
  const input = document.getElementById("msgInput")
  const text = input.value.trim()

  if (!currentUser) {
    alert("Please set your profile first")
    openModal("profileModal")
    return
  }

  if (!text) {
    return
  }

  const message = {
    id: Date.now().toString(),
    userId: currentUser.id,
    username: currentUser.name,
    userPhoto: currentUser.photo,
    text: text,
    type: "text",
    timestamp: new Date().toISOString(),
    likes: 0,
    dislikes: 0,
    replies: [],
    isAdmin: isAdmin,
  }

  messagesRef
    .child(message.id)
    .set(message)
    .then(() => {
      allMessages.push(message)
      renderMessages()
      input.value = ""
      scrollChatToBottom()
    })
    .catch((err) => {
      alert("Error sending message: " + err.message)
      console.error("Error:", err)
    })
}

function handleMediaUpload(e, type) {
  const file = e.target.files[0]
  if (file && currentUser) {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const mediaPath = `media/${currentUser.id}/${Date.now()}_${file.name}`
        const storageRef = storage.ref(mediaPath)

        const uploadTask = storageRef.putString(event.target.result, "data_url")

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            console.log("Upload progress: " + progress + "%")
          },
          (error) => {
            console.error("Upload error:", error)
            alert("Error uploading media: " + error.message)
          },
          () => {
            // Upload completed, get download URL
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
              const message = {
                id: Date.now().toString(),
                userId: currentUser.id,
                username: currentUser.name,
                userPhoto: currentUser.photo,
                text: `[${file.type.includes("image") ? "Image" : "Video"}]`,
                type: file.type.includes("image") ? "image" : "video",
                media: downloadURL,
                timestamp: new Date().toISOString(),
                likes: 0,
                dislikes: 0,
                replies: [],
                isAdmin: isAdmin,
              }

              messagesRef
                .child(message.id)
                .set(message)
                .then(() => {
                  allMessages.push(message)
                  renderMessages()
                  scrollChatToBottom()
                  showNotification("Media uploaded!", { icon: "📸" })
                })
                .catch((err) => {
                  alert("Error saving media message: " + err.message)
                  console.error("Error:", err)
                })
            })
          },
        )
      } catch (error) {
        console.error("Error handling media:", error)
        alert("Error processing media: " + error.message)
      }
    }
    reader.readAsDataURL(file)
  }
}

// ========== REPLY SYSTEM ==========
function replyToMessage(msgId) {
  replyingToMsgId = msgId
  openModal("replyModal")
}

function sendReply() {
  if (!replyingToMsgId || !currentUser) return

  const replyText = document.getElementById("replyInput").value.trim()
  if (!replyText) return

  const message = allMessages.find((m) => m.id === replyingToMsgId)
  if (message) {
    message.replies = message.replies || []
    message.replies.push({
      userId: currentUser.id,
      username: currentUser.name,
      text: replyText,
      timestamp: new Date().toISOString(),
    })

    messagesRef
      .child(replyingToMsgId)
      .set(message)
      .then(() => {
        renderMessages()
        document.getElementById("replyInput").value = ""
        closeModal("replyModal")
        replyingToMsgId = null
        showNotification("Reply sent!", { icon: "💬" })
      })
      .catch((err) => {
        alert("Error sending reply: " + err.message)
        console.error("Error:", err)
      })
  }
}

// ========== MESSAGE RENDERING ==========
function renderMessages() {
  const chatBox = document.getElementById("chatBox")
  chatBox.innerHTML = ""

  if (allMessages.length === 0) {
    chatBox.innerHTML = `
      <div class="welcome-placeholder">
        <div class="welcome-icon">💬</div>
        <div class="welcome-text">No messages yet<br><span style="font-size: 12px; color: var(--text-tertiary);">Be the first to say something!</span></div>
      </div>
    `
    return
  }

  allMessages.forEach((msg) => {
    const messageGroup = document.createElement("div")
    messageGroup.className = "message-group"
    messageGroup.id = `msg-${msg.id}`

    const avatar = document.createElement("img")
    avatar.className = "message-avatar"
    avatar.src = msg.userPhoto || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"
    avatar.alt = msg.username
    avatar.style.cursor = "pointer"
    avatar.addEventListener("click", () => viewUserProfile(msg.userId, msg.username, msg.userPhoto))

    const content = document.createElement("div")
    content.className = "message-content"

    const header = document.createElement("div")
    header.className = "message-header"

    const username = document.createElement("span")
    username.className = "message-username"
    username.textContent = msg.username

    const time = document.createElement("span")
    time.className = "message-time"
    time.textContent = formatTime(msg.timestamp)

    header.appendChild(username)
    if (msg.isAdmin) {
      const adminBadge = document.createElement("span")
      adminBadge.className = "admin-badge"
      adminBadge.textContent = "ADMIN"
      header.appendChild(adminBadge)
    }
    header.appendChild(time)

    const messageBody = document.createElement("div")

    if (msg.type === "text") {
      const textDiv = document.createElement("div")
      textDiv.className = "message-text"
      textDiv.textContent = msg.text
      messageBody.appendChild(textDiv)
    } else if (msg.type === "image") {
      const img = document.createElement("img")
      img.className = "message-media"
      img.src = msg.media
      img.alt = "Image"
      img.addEventListener("click", () => viewMedia(msg.media, "image"))
      messageBody.appendChild(img)
    } else if (msg.type === "video") {
      const videoContainer = document.createElement("div")
      videoContainer.className = "video-play-overlay"
      const video = document.createElement("video")
      video.className = "message-video"
      video.src = msg.media
      video.controls = true
      video.muted = !videoAutoplayEnabled
      video.id = `video-${msg.id}`
      videoContainer.appendChild(video)
      videoContainer.addEventListener("click", () => viewMedia(msg.media, "video"))
      messageBody.appendChild(videoContainer)
    }

    if (msg.type === "video") {
      setTimeout(() => {
        const videoElement = document.getElementById(`video-${msg.id}`)
        if (videoElement) {
          const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                videoElement.play()
                videoElement.muted = !videoAutoplayEnabled
              } else {
                videoElement.pause()
              }
            })
          })
          observer.observe(videoElement)
        }
      }, 100)
    }

    if (msg.replies && msg.replies.length > 0) {
      const repliesDiv = document.createElement("div")
      repliesDiv.className = "message-replies"
      msg.replies.forEach((reply) => {
        const replyItem = document.createElement("div")
        replyItem.className = "reply-item"
        replyItem.innerHTML = `<span class="reply-username">${reply.username}:</span><span class="reply-text">${reply.text}</span>`
        repliesDiv.appendChild(replyItem)
      })
      messageBody.appendChild(repliesDiv)
    }

    const actions = document.createElement("div")
    actions.className = "message-actions"

    const likeBtn = document.createElement("button")
    likeBtn.className = "action-btn action-btn-like"
    likeBtn.innerHTML = `❤️ ${msg.likes}`
    likeBtn.addEventListener("click", () => likeMessage(msg.id))

    const dislikeBtn = document.createElement("button")
    dislikeBtn.className = "action-btn action-btn-dislike"
    dislikeBtn.innerHTML = `👎 ${msg.dislikes}`
    dislikeBtn.addEventListener("click", () => dislikeMessage(msg.id))

    const replyBtn = document.createElement("button")
    replyBtn.className = "action-btn action-btn-reply"
    replyBtn.innerHTML = "💬 Reply"
    replyBtn.addEventListener("click", () => replyToMessage(msg.id))

    actions.appendChild(likeBtn)
    actions.appendChild(dislikeBtn)
    actions.appendChild(replyBtn)

    if (currentUser && currentUser.id === msg.userId && isAdmin) {
      const deleteBtn = document.createElement("button")
      deleteBtn.className = "action-btn action-btn-delete"
      deleteBtn.innerHTML = "🗑️ Delete"
      deleteBtn.addEventListener("click", () => deleteMessage(msg.id))
      actions.appendChild(deleteBtn)
    }

    content.appendChild(header)
    content.appendChild(messageBody)
    content.appendChild(actions)

    messageGroup.appendChild(avatar)
    messageGroup.appendChild(content)

    chatBox.appendChild(messageGroup)
  })

  setupMediaViewerClicks()
}

// ========== MESSAGE ACTIONS ==========
function likeMessage(msgId) {
  const message = allMessages.find((m) => m.id === msgId)
  if (message) {
    message.likes = (message.likes || 0) + 1
    messagesRef
      .child(msgId)
      .update({ likes: message.likes })
      .then(() => renderMessages())
      .catch((err) => console.error("Error:", err))
  }
}

function dislikeMessage(msgId) {
  const message = allMessages.find((m) => m.id === msgId)
  if (message) {
    message.dislikes = (message.dislikes || 0) + 1
    messagesRef
      .child(msgId)
      .update({ dislikes: message.dislikes })
      .then(() => renderMessages())
      .catch((err) => console.error("Error:", err))
  }
}

function deleteMessage(msgId) {
  if (confirm("Delete this message?")) {
    messagesRef
      .child(msgId)
      .remove()
      .then(() => {
        allMessages = allMessages.filter((m) => m.id !== msgId)
        renderMessages()
      })
      .catch((err) => {
        alert("Error deleting message: " + err.message)
        console.error("Error:", err)
      })
  }
}

// ========== USER PROFILES ==========
function viewUserProfile(userId, username, userPhoto) {
  const userMessages = allMessages.filter((m) => m.userId === userId)
  const totalLikes = userMessages.reduce((sum, msg) => sum + (msg.likes || 0), 0)

  document.getElementById("userProfilePhoto").src =
    userPhoto || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"
  document.getElementById("userProfileName").textContent = username
  document.getElementById("userMessageCount").textContent = userMessages.length
  document.getElementById("userLikeCount").textContent = totalLikes

  openModal("userProfileModal")
}

function loadAndShowUsers() {
  const usersList = document.getElementById("usersList")
  const uniqueUsers = new Map()

  allMessages.forEach((msg) => {
    if (!uniqueUsers.has(msg.userId)) {
      uniqueUsers.set(msg.userId, {
        id: msg.userId,
        name: msg.username,
        photo: msg.userPhoto,
      })
    }
  })

  if (uniqueUsers.size === 0) {
    usersList.innerHTML =
      '<div style="text-align: center; color: var(--text-tertiary); padding: 20px;">No active users yet</div>'
  } else {
    usersList.innerHTML = ""
    uniqueUsers.forEach((user) => {
      const userCard = document.createElement("div")
      userCard.style.cssText =
        "display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-secondary); border-radius: var(--radius-md); cursor: pointer; transition: var(--transition);"
      userCard.innerHTML = `
        <img src="${user.photo}" alt="${user.name}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;" />
        <span style="flex: 1; font-weight: 500;">${user.name}</span>
      `
      userCard.addEventListener("mouseenter", () => (userCard.style.background = "var(--bg-tertiary)"))
      userCard.addEventListener("mouseleave", () => (userCard.style.background = "var(--bg-secondary)"))
      userCard.addEventListener("click", () => {
        viewUserProfile(user.id, user.name, user.photo)
        closeModal("usersModal")
      })
      usersList.appendChild(userCard)
    })
  }

  openModal("usersModal")
}

// ========== ADMIN SYSTEM ==========
function adminLogin() {
  const password = document.getElementById("adminPassword").value
  if (password === "admin123") {
    isAdmin = true
    closeModal("adminModal")
    document.getElementById("adminPassword").value = ""
    showNotification("Admin access granted!", { icon: "🔐" })
  } else {
    alert("Invalid password")
  }
}

// ========== FIREBASE DATA LOADING ==========
function loadMessagesFromFirebase() {
  messagesRef.on(
    "value",
    (snapshot) => {
      allMessages = []
      const data = snapshot.val()

      if (data) {
        Object.keys(data).forEach((key) => {
          allMessages.push(data[key])
        })
        // Sort messages by timestamp
        allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      }

      renderMessages()
    },
    (error) => {
      console.error("Error loading messages:", error)
    },
  )
}

// ========== UTILITY FUNCTIONS ==========
function openModal(modalId) {
  document.getElementById(modalId).classList.add("active")
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active")
}

function viewMedia(src, type) {
  const viewer = document.getElementById("mediaViewer")
  const content = document.getElementById("mediaViewerContent")

  if (type === "image") {
    content.innerHTML = `<img src="${src}" alt="Image" />`
  } else {
    content.innerHTML = `<video src="${src}" controls style="max-width: 100%; max-height: 85vh;"></video>`
  }

  viewer.classList.add("active")
}

function closeMediaViewer() {
  document.getElementById("mediaViewer").classList.remove("active")
  document.getElementById("mediaViewerContent").innerHTML = ""
}

function setupMediaViewerClicks() {
  document.querySelectorAll(".message-media, .message-video").forEach((el) => {
    if (!el.hasClickListener) {
      el.hasClickListener = true
      el.addEventListener("click", (e) => {
        e.stopPropagation()
      })
    }
  })
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
  if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`

  return date.toLocaleDateString()
}

function scrollChatToBottom() {
  const chatBox = document.getElementById("chatBox")
  chatBox.scrollTop = chatBox.scrollHeight
}

function showNotification(title, options = {}) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, options)
  }
}

function startAutoRefresh() {
  setInterval(() => {
    loadMessagesFromFirebase()
  }, 3000)
}

// ========== EMOJI REACTIONS ==========
const emojiReactions = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "💯"]

// ========== CHAT STATISTICS ==========
function getChatStats() {
  const users = new Set()
  const totalMessages = allMessages.length
  let totalLikes = 0

  allMessages.forEach((msg) => {
    users.add(msg.userId)
    totalLikes += msg.likes || 0
  })

  return {
    totalMessages,
    uniqueUsers: users.size,
    totalLikes,
    averageLikesPerMessage: (totalLikes / totalMessages).toFixed(2) || 0,
  }
}

// ========== EXPORT/BACKUP ==========
window.exportChat = () => {
  const stats = getChatStats()
  const data = {
    messages: allMessages,
    statistics: stats,
    exportedAt: new Date().toISOString(),
  }

  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `chat-export-${Date.now()}.json`
  a.click()
  showNotification("Chat exported!", { icon: "📥" })
}

window.clearChat = () => {
  if (isAdmin && confirm("Clear all messages? This cannot be undone.")) {
    messagesRef
      .remove()
      .then(() => {
        allMessages = []
        renderMessages()
        showNotification("Chat cleared", { icon: "🗑️" })
      })
      .catch((err) => {
        alert("Error clearing chat: " + err.message)
        console.error("Error:", err)
      })
  }
}
