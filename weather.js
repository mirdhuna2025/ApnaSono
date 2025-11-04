const apiKey = "YOUR_OPENWEATHERMAP_API_KEY"; // Replace with your real key
const lat = 24.6817; // Sono, Bihar latitude
const lon = 86.3982; // Sono, Bihar longitude

const widget = document.getElementById("weatherWidget");
const expanded = document.getElementById("expandedWeather");
const closeBtn = document.getElementById("closeBtn");
const cityElem = document.getElementById("city");
const tempElem = document.getElementById("temp");
const descElem = document.getElementById("desc");
const listElem = document.getElementById("weatherList");
const searchBtn = document.getElementById("searchBtn");
const cityInput = document.getElementById("cityInput");
const pastBtn = document.getElementById("pastBtn");
const futureBtn = document.getElementById("futureBtn");

let currentCity = "Sono, Bihar";

// 🌤️ Fetch Today Weather
async function getTodayWeather() {
  try {
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,alerts&units=metric&appid=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    const today = data.current;
    const desc = today.weather[0].description;

    cityElem.textContent = currentCity;
    tempElem.textContent = `${Math.round(today.temp)}°C`;
    descElem.textContent = desc.charAt(0).toUpperCase() + desc.slice(1);
  } catch (err) {
    console.error("Error fetching weather:", err);
    tempElem.textContent = "--°C";
    descElem.textContent = "Unable to load data";
  }
}

// 📅 Fetch 15 days future & past (OneCall gives forecast for 7–16 days)
async function getHistoryAndForecast(mode = "future") {
  listElem.innerHTML = "<p>Loading...</p>";

  try {
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    let content = "";

    if (mode === "future") {
      data.daily.slice(0, 15).forEach((day) => {
        const d = new Date(day.dt * 1000);
        const temp = Math.round(day.temp.day);
        const desc = day.weather[0].main;

        content += `
          <div class="weather-item">
            <div><strong>${d.toDateString()}</strong></div>
            <div style="font-size:20px;font-weight:600;">${temp}°C</div>
            <div>${desc}</div>
          </div>
        `;
      });
    } else {
      // For past 15 days — One Call 3.0 historical data needs "timemachine" API per day
      const today = Math.floor(Date.now() / 1000);
      for (let i = 1; i <= 15; i++) {
        const timestamp = today - i * 86400;
        const pastUrl = `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${timestamp}&units=metric&appid=${apiKey}`;
        const r = await fetch(pastUrl);
        const pastData = await r.json();
        const temp = Math.round(pastData.data[0].temp);
        const desc = pastData.data[0].weather[0].main;
        const d = new Date(timestamp * 1000);

        content += `
          <div class="weather-item">
            <div><strong>${d.toDateString()}</strong></div>
            <div style="font-size:20px;font-weight:600;">${temp}°C</div>
            <div>${desc}</div>
          </div>
        `;
      }
    }

    listElem.innerHTML = content;
  } catch (err) {
    console.error("Error loading forecast:", err);
    listElem.innerHTML = "<p>Failed to load data</p>";
  }
}

// 🧭 Search another city
searchBtn.addEventListener("click", async () => {
  const city = cityInput.value.trim();
  if (!city) return;
  try {
    const geoRes = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`);
    const geoData = await geoRes.json();
    if (geoData.length > 0) {
      const { lat: newLat, lon: newLon, name } = geoData[0];
      currentCity = name;
      cityElem.textContent = currentCity;
      await getTodayWeather(newLat, newLon);
      await getHistoryAndForecast("future");
    } else {
      alert("City not found!");
    }
  } catch (err) {
    console.error(err);
  }
});

// 🎛️ Widget controls
widget.addEventListener("click", () => {
  expanded.style.display = "block";
  getHistoryAndForecast("future");
});
closeBtn.addEventListener("click", () => expanded.style.display = "none");
window.addEventListener("click", (e) => {
  if (e.target === expanded) expanded.style.display = "none";
});
pastBtn.addEventListener("click", () => getHistoryAndForecast("past"));
futureBtn.addEventListener("click", () => getHistoryAndForecast("future"));

// 🚀 Load default
getTodayWeather();
