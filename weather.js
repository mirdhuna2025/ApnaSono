// 🔑 API Key Warning: For production, proxy this via backend to prevent abuse
const apiKey = "69ab39452b24e6dfd78fb82720ac6d71";
let city = "Sono";

// DOM Elements
const todayWeather = document.getElementById("todayWeather");
const forecastContainer = document.getElementById("forecastContainer");
const closeBtn = document.getElementById("closeBtn");
const searchBtn = document.getElementById("searchBtn");
const widget = document.getElementById("weatherWidget");
const cityInput = document.getElementById("cityInput");

// ✅ Update compact view: temp only (big & bold)
function updateCompactView(temp) {
  todayWeather.innerHTML = `<p style="font-size:18px;font-weight:bold;margin:0;">${temp}°C</p>`;
}

// 🌤️ Fetch current weather
async function getTodayWeather(cityName) {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${cityName},IN&appid=${apiKey}&units=metric&lang=hi`
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "City not found");

    const temp = Math.round(data.main.temp);
    updateCompactView(temp);
  } catch (error) {
    updateCompactView("--");
    console.warn("Today's weather fetch error:", error);
  }
}

// 📅 Fetch 5-day/3-hour → group into daily forecast (max 6 days)
async function getForecast(cityName) {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${cityName},IN&appid=${apiKey}&units=metric&lang=hi`
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Forecast unavailable");

    const dailyMap = {};
    // Group by date (use first record at ~12:00 as representative)
    data.list.forEach(item => {
      const dateObj = new Date(item.dt * 1000);
      const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
      // Prefer midday forecasts
      if (!dailyMap[dateStr] || (dateObj.getHours() >= 10 && dateObj.getHours() <= 14)) {
        dailyMap[dateStr] = {
          temp: Math.round(item.main.temp),
          desc: item.weather[0].description,
          icon: item.weather[0].icon
        };
      }
    });

    const forecastDays = Object.entries(dailyMap).slice(0, 6);

    forecastContainer.innerHTML = forecastDays.map(([date, d]) => `
      <div class="forecast-day">
        <span>${date}</span>
        <span>
          <img src="https://openweathermap.org/img/wn/${d.icon}.png" alt="${d.desc}" />
          ${d.temp}°C | ${d.desc}
        </span>
      </div>
    `).join("");
  } catch (error) {
    forecastContainer.innerHTML = `<p style="color:#ffdddd;padding:15px;text-align:center;border-radius:8px;background:rgba(0,0,0,0.1);">
      ⚠️ ${error.message || "Failed to load forecast"}
    </p>`;
  }
}

// 🧠 Event Listeners
widget.addEventListener("click", (e) => {
  if (!widget.classList.contains("expanded") &&
      !e.target.closest(".search-section") &&
      e.target !== closeBtn) {
    widget.classList.add("expanded");
    getForecast(city);
    setTimeout(() => cityInput.focus(), 300);
  }
});

closeBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  widget.classList.remove("expanded");
});

searchBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const newCity = cityInput.value.trim();
  if (newCity) {
    city = newCity;
    getTodayWeather(city);
    getForecast(city);
  }
});

cityInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") searchBtn.click();
});

// 🚀 Initial Load
(async () => {
  await getTodayWeather(city);
  await getForecast(city);
})();
