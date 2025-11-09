const apiKey = "69ab39452b24e6dfd78fb82720ac6d71";
let city = "Sono";

const todayWeather = document.getElementById("todayWeather");
const forecastContainer = document.getElementById("forecastContainer");
const closeBtn = document.getElementById("closeBtn");
const searchBtn = document.getElementById("searchBtn");
const widget = document.getElementById("weatherWidget");
const cityInput = document.getElementById("cityInput");

// ▼▼▼ MAIN CHANGE: Update compact view to show ONLY temp (big & bold) ▼▼▼
function updateCompactView(temp) {
  todayWeather.innerHTML = `<p style="font-size:18px;font-weight:bold;margin:0;">${temp}°C</p>`;
}

async function getTodayWeather(cityName) {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${cityName},IN&appid=${apiKey}&units=metric`
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "City not found");

    const temp = data.main.temp.toFixed(0); // round to whole number
    updateCompactView(temp); // ✅ Only temp shown in compact mode
  } catch (error) {
    updateCompactView("--"); // fallback
    console.warn("Weather fetch error:", error);
  }
}

async function getForecast(cityName) {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${cityName},IN&appid=${apiKey}&units=metric`
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Forecast unavailable");

    // Show 6-day forecast (clean)
    const dailyMap = {};
    data.list.forEach(item => {
      const date = new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
      if (!dailyMap[date]) {
        dailyMap[date] = {
          temp: Math.round(item.main.temp),
          desc: item.weather[0].description,
          icon: item.weather[0].icon
        };
      }
    });

    const forecastDays = Object.entries(dailyMap).slice(0, 6);

    forecastContainer.innerHTML = `
      <h3 style="text-align:center;margin:10px 0;">${cityName} — Next 6 Days</h3>
      ${forecastDays.map(([date, d]) => `
        <div class="forecast-day">
          <span>${date}</span>
          <span>
            <img src="https://openweathermap.org/img/wn/${d.icon}.png" alt="" style="width:20px;height:20px;vertical-align:middle;margin-right:4px;"/>
            ${d.temp}°C | ${d.desc}
          </span>
        </div>
      `).join("")}
    `;
  } catch (error) {
    forecastContainer.innerHTML = `<p style="color:#ffdddd;padding:10px;">⚠️ ${error.message}</p>`;
  }
}

// Expand & load forecast
widget.addEventListener("click", (e) => {
  if (!widget.classList.contains("expanded") && 
      !e.target.closest("#searchContainer") && 
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

// Initial load
getTodayWeather(city);
