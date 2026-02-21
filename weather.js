
// 🔑 Tomorrow.io API Key
const apiKey = "RsFPY8ETXFqDDTN8rbKQHoospZTMXsvA";

// Sono (Jharkhand) coordinates — HIGH accuracy
let location = {
  lat: 24.4973,
  lon: 86.1572
};

// DOM Elements
const todayWeather = document.getElementById("todayWeather");
const forecastContainer = document.getElementById("forecastContainer");
const closeBtn = document.getElementById("closeBtn");
const searchBtn = document.getElementById("searchBtn");
const widget = document.getElementById("weatherWidget");
const cityInput = document.getElementById("cityInput");

// ✅ Compact view
function updateCompactView(temp) {
  todayWeather.innerHTML = `
    <p style="font-size:18px;font-weight:bold;margin:0;">
      ${temp}°C
    </p>`;
}

// 🌤️ Current Weather (Tomorrow.io)
async function getTodayWeather() {
  try {
    const res = await fetch(
      `https://api.tomorrow.io/v4/weather/realtime?location=${location.lat},${location.lon}&apikey=${apiKey}`
    );
    const data = await res.json();

    const temp = Math.round(data.data.values.temperature);
    updateCompactView(temp);
  } catch (err) {
    updateCompactView("--");
    console.warn("Realtime weather error:", err);
  }
}

// 📅 Daily Forecast (Next 6 days)
async function getForecast() {
  try {
    const res = await fetch(
      `https://api.tomorrow.io/v4/weather/forecast?location=${location.lat},${location.lon}&timesteps=1d&apikey=${apiKey}`
    );
    const data = await res.json();

    const days = data.timelines.daily.slice(0, 6);

    forecastContainer.innerHTML = days.map(day => {
      const date = new Date(day.time).toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric"
      });

      return `
        <div class="forecast-day">
          <span>${date}</span>
          <span>
            ${Math.round(day.values.temperatureAvg)}°C |
            ${day.values.weatherCodeMax}
          </span>
        </div>`;
    }).join("");

  } catch (err) {
    forecastContainer.innerHTML = `
      <p style="padding:15px;text-align:center;color:#ffdddd;">
        ⚠️ Forecast unavailable
      </p>`;
    console.warn("Forecast error:", err);
  }
}

// 🧠 Widget Events
widget.addEventListener("click", (e) => {
  if (!widget.classList.contains("expanded") &&
      !e.target.closest(".search-section") &&
      e.target !== closeBtn) {
    widget.classList.add("expanded");
    getForecast();
  }
});

closeBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  widget.classList.remove("expanded");
});

// 🚀 Initial Load
(async () => {
  await getTodayWeather();
  await getForecast();
})();

