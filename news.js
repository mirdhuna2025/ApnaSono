// Function to run Google CSE search
function runSearch() {
  const query = "sono jhajha jamui";
  try {
    if (window.google && google.search && google.search.cse) {
      const element = google.search.cse.element.getElement('searchresults-only0');
      if (element) {
        element.execute(query);
        return true;
      }
    }
  } catch (e) {
    console.warn("CSE not ready yet:", e);
  }
  return false;
}

// Try every 300ms until CSE loads
let attempts = 0;
const maxAttempts = 17;
const interval = setInterval(() => {
  if (runSearch() || ++attempts >= maxAttempts) clearInterval(interval);
}, 300);

// Dynamically add multiple ad containers
const adsContainer = document.getElementById('ads-container');
for (let i = 0; i < 15; i++) {
  const adDiv = document.createElement('div');
  adDiv.className = 'ad-container';
  adDiv.innerHTML = `
    <script>
      atOptions = {
        'key' : 'cbe6058f5f45274622f5fdeb5dd20c29',
        'format' : 'iframe',
        'height' : 60,
        'width' : 300,
        'params' : {}
      };
    </script>
    <script src="https://www.highperformanceformat.com/cbe6058f5f45274622f5fdeb5dd20c29/invoke.js"></script>
  `;
  adsContainer.appendChild(adDiv);
}
