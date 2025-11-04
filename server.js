// server.js - Node.js backend (keeps API key secure)
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (HTML, JS, CSS)
app.use(express.static(path.join(__dirname)));

// Secure news API endpoint
app.get('/api/news', async (req, res) => {
  const query = req.query.q || 'Sono village Bihar';

  // Validate query to prevent abuse (basic check)
  if (typeof query !== 'string' || query.length > 100) {
    return res.status(400).json({ error: 'Invalid query' });
  }

  try {
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: query,
        language: 'en',
        sortBy: 'relevancy',
        apiKey: '1d32a085fe7543098fa3450b55b562af' // Your key — safe on server!
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('NewsAPI Error:', error.message);
    res.status(500).json({ error: 'Unable to fetch news at this time.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`   Open http://localhost:${PORT}/news.html in your browser`);
});
