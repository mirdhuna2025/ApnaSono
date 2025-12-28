<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sono News Feed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: #fff;
      margin: 0;
      padding: 16px;
      color: #333;
    }
    .embed-header {
      font-size: 1.1rem;
      font-weight: 600;
      color: #1e5631;
      margin-bottom: 12px;
      border-bottom: 1px solid #eee;
      padding-bottom: 6px;
    }
    .loading { color: #666; font-size: 0.9rem; }
    .spinner {
      width: 20px; height: 20px;
      border: 2px solid #eee;
      border-top: 2px solid #4caf50;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      display: inline-block;
      margin-right: 6px;
      vertical-align: middle;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .news-item {
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .news-title {
      font-weight: 600;
      font-size: 0.95rem;
      margin: 0 0 4px;
      color: #0d4726;
    }
    .news-title a {
      text-decoration: none;
      color: inherit;
    }
    .news-title a:hover { text-decoration: underline; }
    .news-snippet {
      font-size: 0.85rem;
      color: #666;
      margin: 0 0 4px;
      line-height: 1.4;
    }
    .news-url {
      font-size: 0.75rem;
      color: #888;
    }

    #no-results {
      text-align: center;
      padding: 20px 0;
      color: #999;
      font-size: 0.9rem;
    }

    /* Hide default CSE */
    .gsc-* { display: none !important; }
  </style>
</head>
<body>
  <div class="embed-header">Sono • Latest Public News</div>
  <div id="status" class="loading"><span class="spinner"></span> Loading...</div>
  
  <div id="feed"></div>
  <div id="no-results" style="display:none;">No recent updates found.</div>

  <!-- CSE with auto-callback -->
  <script>
    window.__gcse = {
      callback: () => {
        document.getElementById('status').style.display = 'none';
        try {
          const el = google.search.cse.element.getElement('sono-embed');
          el.execute("sono jhajha jamui public app");
        } catch (e) { console.warn(e); }
      }
    };
  </script>
  <script async src="https://cse.google.com/cse.js?cx=02dc72061b64943fc"></script>
  <div class="gcse-searchresults-only" id="sono-embed" style="display:none;"></div>

  <script>
    const feed = document.getElementById('feed');
    const noResults = document.getElementById('no-results');

    const observer = new MutationObserver(() => {
      setTimeout(() => {
        const items = document.querySelectorAll('#sono-embed .gsc-webResult');
        const html = [];

        items.forEach(item => {
          const a = item.querySelector('.gs-title a');
          const snippet = item.querySelector('.gs-snippet');
          const url = item.querySelector('.gs-visibleUrl');
          if (!a) return;

          let text = snippet?.textContent || '';
          text = text.replace(/sono\s+jhajha\s+jamui/gi, '').trim();
          if (text.length > 120) text = text.substring(0, 117) + '...';

          html.push(`
            <div class="news-item">
              <div class="news-title"><a href="${a.href}" target="_blank">${a.textContent}</a></div>
              <div class="news-snippet">${text || '—'}</div>
              <div class="news-url">${url?.textContent || ''}</div>
            </div>
          `);
        });

        if (html.length) {
          feed.innerHTML = html.join('');
        } else {
          noResults.style.display = 'block';
        }
        observer.disconnect();
      }, 200);
    });

    observer.observe(document.getElementById('sono-embed'), {
      childList: true, subtree: true
    });
  </script>
</body>
</html>
