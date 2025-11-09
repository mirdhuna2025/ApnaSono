<script>
const apiKey = "69ab39452b24e6dfd78fb82720ac6d71";
let city = "Sono";

// DOM Elements
const widget = document.getElementById("weatherWidget");       // ✅ Main widget container
const todayWeather = document.getElementById("todayWeather");
const forecastContainer = document.getElementById("forecastContainer");
const closeBtn = document.getElementById("closeBtn");
const searchBtn = document.getElementById("searchBtn");
const cityInput = document.getElementById("cityInput");

// Ensure all required elements exist
if (!widget || !todayWeather || !forecastContainer || !closeBtn || !searchBtn || !cityInput) {
  console.error("❌ Missing required HTML elements. Check IDs: weatherWidget, todayWeather, forecastContainer, closeBtn, searchBtn, cityInput");
}

// Fetch today’s weather
async function getTodayWeather(cityName) {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)},IN&appid=${apiKey}&units=metric`
    );
    const data = await response.json();

    if (!response.ok) throw new Error(data.message || "City not found");

    const temp = data.main.temp.toFixed(1);
    const desc = data.weather[0].description;
    const icon = data.weather[0].icon;

    todayWeather.innerHTML = `
      <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="weather icon" />
      <h2>${cityName}</h2>
      <p>${temp}°C | ${desc.charAt(0).toUpperCase() + desc.slice(1)}</p>
    `;
  } catch (error) {
    todayWeather.innerHTML = `<p style="color:#ff5555;">⚠️ ${error.message}</p>`;
  }
}

// Fetch 5-day forecast and combine with mock past 15 days
async function getForecast(cityName) {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cityName)},IN&appid=${apiKey}&units=metric`
    );
    const data = await response.json();

    if (!response.ok) throw new Error(data.message || "Forecast unavailable");

    // Clear and add header
    forecastContainer.innerHTML = `<h3 style="text-align:center;margin:10px 0;">Past & Future Forecast</h3>`;

    const allDays = [];
    const today = new Date();

    // 🔹 Mock past 15 days (since API doesn’t provide historical data)
    for (let i = 15; i > 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      // Simple temp variation (you can refine this)
      const baseTemp = 28;
      const variance = Math.sin(i * 0.4) * 3; // mild wave-like variation
      const temp = (baseTemp + variance + (Math.random() - 0.5) * 2).toFixed(1);
      allDays.push({
        date: d.toDateString(),
        temp,
        desc: "Partly cloudy"
      });
    }

    // 🔹 Real forecast: every 8 hours → ~3 per day × 5 days = 15 entries max
    const seenDates = new Set();
    for (let item of data.list) {
      const date = new Date(item.dt * 1000);
      const dateKey = date.toDateString();

      // Only take first entry per day (approx. 12:00 PM)
      if (!seenDates.has(dateKey)) {
        seenDates.add(dateKey);
        const temp = item.main.temp.toFixed(1);
        const desc = item.weather[0].description;
        allDays.push({ date: dateKey, temp, desc });
        if (allDays.length >= 30) break; // 15 past + 15 future
      }
    }

    // Render forecast
    forecastContainer.innerHTML += allDays
      .map(d => 
        `<div class="forecast-day" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;">
          <span style="font-weight:500;">${d.date}</span>
          <span>${d.temp}°C | ${d.desc}</span>
        </div>`
      )
      .join("");
      
  } catch (error) {
    forecastContainer.innerHTML += `<p style="color:#ff5555;text-align:center;">⚠️ ${error.message}</p>`;
  }
}

// Event Listeners
if (widget) {
  widget.addEventListener("click", (e) => {
    if (!widget.classList.contains("expanded")) {
      widget.classList.add("expanded");
      getForecast(city);
    }
  });
}

if (closeBtn) {
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (widget) widget.classList.remove("expanded");
  });
}

if (searchBtn) {
  searchBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const newCity = cityInput.value.trim();
    if (newCity) {
      city = newCity;
      getTodayWeather(city);
      if (widget && widget.classList.contains("expanded")) {
        getForecast(city);
      }
    } else {
      alert("Please enter a city name.");
    }
  });
}

// Also allow Enter key in input
if (cityInput) {
  cityInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchBtn.click();
    }
  });
}

// Initial load
getTodayWeather(city);
</script>
