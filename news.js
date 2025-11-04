// news.js - Frontend JavaScript (runs in browser)
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('news-container');

  fetch('/api/news?q=Sono%20village%20Bihar')
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    })
    .then(data => {
      if (data.articles && data.articles.length > 0) {
        container.innerHTML = '';
        data.articles.slice(0, 10).forEach(article => {
          const articleEl = document.createElement('div');
          articleEl.className = 'article';
          articleEl.innerHTML = `
            <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="title">${article.title}</a>
            <p class="description">${article.description || 'No description available.'}</p>
            <p class="meta">
              <strong>${article.source.name}</strong> • 
              ${new Date(article.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          `;
          container.appendChild(articleEl);
        });
      } else {
        container.innerHTML = '<p class="error">No news found about Sono Village.</p>';
      }
    })
    .catch(err => {
      console.error('Error fetching news:', err);
      container.innerHTML = '<p class="error">Failed to load news. Please try again later.</p>';
    });
});
