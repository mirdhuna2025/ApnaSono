<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Multi API News Aggregator</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<style>
  body {
    font-family: Arial, sans-serif;
    background: #f4f6f8;
    padding: 20px;
  }
  h2 {
    margin-bottom: 15px;
  }
  .news {
    background: #fff;
    padding: 12px;
    margin-bottom: 12px;
    border-radius: 6px;
    box-shadow: 0 2px 6px rgba(0,0,0,.08);
  }
  .news a {
    font-weight: bold;
    color: #1a0dab;
    text-decoration: none;
  }
  .news small {
    display: block;
    color: #666;
    margin-top: 4px;
  }
</style>
</head>

<body>

<h2>Latest News (Multiple APIs)</h2>
<button onclick="loadNews()">Refresh</button>
<div id="news">Loading...</div>

<script>
/* =========================
   CONFIG – ADD APIs HERE
========================= */

const QUERY = "India news";

// 🔑 API KEYS (replace)
const NEWS_API_KEY  = "d9db7ef8a9784644a1c6d2a4b771fa9a";
const GNEWS_API_KEY = "2261c4e3c38d7a0ded2df58d8690a8d3";
const GOOGLE_API_KEY = "AIzaSyCiG3Tal0dCpBAV1SLS2Rbs6GYOA4zomQE";
const GOOGLE_CX = "81f189089ee82423b";

/* =========================
   FETCH FUNCTIONS
========================= */

// 1️⃣ NewsAPI
async function fetchNewsAPI() {
  const url = `https://newsapi.org/v2/everything?q=${QUERY}&apiKey=${NEWS_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.articles || []).map(a => ({
    title: a.title,
    url: a.url,
    source: "NewsAPI",
    time: a.publishedAt
  }));
}

// 2️⃣ GNews
async function fetchGNews() {
  const url = `https://gnews.io/api/v4/search?q=${QUERY}&apikey=${GNEWS_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.articles || []).map(a => ({
    title: a.title,
    url: a.url,
    source: "GNews",
    time: a.publishedAt
  }));
}

// 3️⃣ Google Programmable Search (News style)
async function fetchGoogleNews() {
  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${QUERY}&tbm=nws`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.items || []).map(i => ({
    title: i.title,
    url: i.link,
    source: "Google News",
    time: ""
  }));
}

/* =========================
   MAIN LOADER
========================= */

async function loadNews() {
  document.getElementById("news").innerHTML = "Loading...";

  const results = await Promise.allSettled([
    fetchNewsAPI(),
    fetchGNews(),
    fetchGoogleNews()
  ]);

  const news = results
    .filter(r => r.status === "fulfilled")
    .flatMap(r => r.value)
    .sort((a,b) => (b.time || "").localeCompare(a.time || ""));

  render(news);
}

/* =========================
   UI RENDER
========================= */

function render(items) {
  const box = document.getElementById("news");
  box.innerHTML = "";

  if (!items.length) {
    box.innerHTML = "No news found.";
    return;
  }

  items.forEach(n => {
    box.innerHTML += `
      <div class="news">
        <a href="${n.url}" target="_blank">${n.title}</a>
        <small>${n.source} ${n.time ? "• " + n.time : ""}</small>
      </div>
    `;
  });
}

// Auto load
loadNews();
</script>

</body>
</html>
