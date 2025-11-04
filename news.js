// 🔒 Your backend Firebase Cloud Function URL (NO API KEY HERE!)
const NEWS_FUNCTION_URL = 'https://us-central1-sono-2b5d6.cloudfunctions.net/getNews';

const GRID = document.getElementById('grid');
const STATUS = document.getElementById('status');
const EMPTY = document.getElementById('empty');

let mode = 'all';

document.getElementById('btnAll').addEventListener('click', () => { mode = 'all'; load(); });
document.getElementById('btnPast15').addEventListener('click', () => { mode = 'past15'; load(); });
document.getElementById('btnFuture15').addEventListener('click', () => { mode = 'future15'; load(); });
document.getElementById('btnRefresh').addEventListener('click', () => load());

async function load() {
  STATUS.textContent = 'Fetching news…';
  GRID.innerHTML = '';
  EMPTY.style.display = 'none';

  try {
    // Your search query
    const q = 'SONO Bihar OR "Bihar village" OR Bihar';
    const url = `${NEWS_FUNCTION_URL}?q=${encodeURIComponent(q)}&max=10`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errorMsg = await res.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${res.status}: ${errorMsg}`);
    }

    const data = await res.json();
    const items = Array.isArray(data.articles) ? data.articles : [];

    const now = new Date();
    const past15Days = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    const future15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

    const filtered = items.filter(item => {
      if (!item.publishedAt) return false;
      const pubDate = new Date(item.publishedAt);
      if (isNaN(pubDate.getTime())) return false;

      if (mode === 'past15') {
        return pubDate >= past15Days && pubDate <= now;
      } else if (mode === 'future15') {
        return pubDate > now && pubDate <= future15Days;
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

      const safeTitle = (item.title || 'No Title')
        .replace(/&/g, '&amp;')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '&quot;');

      const safeDesc = (item.description || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '&quot;');

      const sourceName = item.source?.name || 'Unknown Source';
      const pubDate = new Date(item.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      card.innerHTML = `
        <h3><a href="${item.url}" target="_blank" rel="noopener noreferrer">${safeTitle}</a></h3>
        <div class="meta">${sourceName} · ${pubDate}</div>
        <div class="excerpt">${safeDesc}</div>
      `;
      GRID.appendChild(card);
    });

    STATUS.textContent = `Showing ${filtered.length} result${filtered.length !== 1 ? 's' : ''}`;
  } catch (err) {
    console.error('Fetch error:', err);
    STATUS.textContent = 'Error: ' + (err.message || 'Failed to load news');
    EMPTY.style.display = 'block';
  }
}

// Load on page start
load();
