// 🔁 Your Firebase Cloud Function endpoint
const NEWS_FUNCTION_URL = 'https://us-central1-sono-2b5d6.cloudfunctions.net/getNews';

const GRID = document.getElementById('grid');
const STATUS = document.getElementById('status');
const EMPTY = document.getElementById('empty');

let mode = 'all';

document.getElementById('btnAll').onclick = () => { mode = 'all'; load(); };
document.getElementById('btnPast15').onclick = () => { mode = 'past15'; load(); };
document.getElementById('btnFuture15').onclick = () => { mode = 'future15'; load(); };
document.getElementById('btnRefresh').onclick = () => load();

async function load() {
  STATUS.textContent = 'Fetching news…';
  GRID.innerHTML = '';
  EMPTY.style.display = 'none';

  try {
    const q = 'SONO Bihar OR "Bihar village" OR Bihar';
    const url = `${NEWS_FUNCTION_URL}?q=${encodeURIComponent(q)}&max=10`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => 'Unknown error')}`);
    
    const data = await res.json();
    const items = data.articles || [];

    const now = new Date();
    let filtered = items.filter(item => {
      const d = new Date(item.publishedAt);
      if (mode === 'past15') {
        return d >= new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) && d <= now;
      } else if (mode === 'future15') {
        return d > now && d <= new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
      }
      return true;
    });

    if (filtered.length === 0) {
      EMPTY.style.display = 'block';
      STATUS.textContent = 'No matching news found.';
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      const safeTitle = (item.title || 'No Title').replace(/</g, '<').replace(/>/g, '>');
      const safeDesc = (item.description || '').replace(/</g, '<').replace(/>/g, '>');
      const sourceName = item.source?.name || 'Unknown Source';
      const pubDate = new Date(item.publishedAt).toLocaleDateString();

      card.innerHTML = `
        <h3><a href="${item.url}" target="_blank" rel="noopener noreferrer">${safeTitle}</a></h3>
        <div class="meta">${sourceName} · ${pubDate}</div>
        <div class="excerpt">${safeDesc}</div>
      `;
      GRID.appendChild(card);
    });

    STATUS.textContent = `Showing ${filtered.length} result(s)`;
  }
  catch (err) {
    console.error('Fetch error:', err);
    STATUS.textContent = 'Error: ' + (err.message || 'Failed to load news');
    EMPTY.style.display = 'block';
  }
}

// Load on page start
load();
