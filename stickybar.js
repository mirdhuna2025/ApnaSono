// Optional: JavaScript enhancements (e.g., highlight active button, analytics, etc.)
document.addEventListener('DOMContentLoaded', function () {
  const currentPath = window.location.pathname;
  const currentHost = window.location.hostname;

  // Highlight active button if on same page (basic active-state logic)
  const buttons = {
    homeBtn: () => currentHost === 'apnasono.in' && currentPath === '/',
    loginBtn: () => currentPath.includes('login.html'),
    newsBtn: () => currentHost === 'apnasono.in' && currentPath.startsWith('/news')
  };

  for (const [id, isActive] of Object.entries(buttons)) {
    const btn = document.getElementById(id);
    if (btn && isActive()) {
      btn.style.color = '#3498db';
      btn.querySelector('i').style.color = '#3498db';
    }
  }

  // Optional: Add click handlers later if needed
  // e.g., track clicks, prevent default, etc.
});
