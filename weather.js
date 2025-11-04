const apiKey = "YOUR_OPENWEATHERMAP_API_KEY"; // Replace with your API key

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

let currentCity = "Sono";

async function getTodayWeather(city) {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
  );
  const data = await res.json();
  cityElem.textContent = data.name;
  tempElem.textContent = `${Math.round(data.main.temp)}°C`;
  descElem.textContent = data.weather[0].description;
}

async function getHistoryAndForecast(city, mode = "future") {
  listElem.innerHTML = "Loading...";
  const days = 15;
  let content = "";

  for (let i = 0; i < days; i++) {
    const day = new Date();
    day.setDate(day.getDate() + (mode === "future" ? i + 1 : -i - 1));

    const fakeTemp = Math.round(Math.random() * 10 + 20);
    const fakeDesc = ["Sunny", "Cloudy", "Rainy", "Windy"][Math.floor(Math.random() * 4)];

    content += `
      <div class="weather-item">
        <div>${day.toDateString()}</div>
        <div style="font-size:20px;font-weight:600;">${fakeTemp}°C</div>
        <div>${fakeDesc}</div>
      </div>
    `;
  }

  listElem.innerHTML = content;
}

// Event listeners
widget.addEventListener("click", () => expanded.style.display = "block");
closeBtn.addEventListener("click", () => expanded.style.display = "none");
window.addEventListener("click", (e) => {
  if (e.target === expanded) expanded.style.display = "none";
});
searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (city) {
    currentCity = city;
    getTodayWeather(city);
    getHistoryAndForecast(city, "future");
  }
});
pastBtn.addEventListener("click", () => getHistoryAndForecast(currentCity, "past"));
futureBtn.addEventListener("click", () => getHistoryAndForecast(currentCity, "future"));

// Initialize
getTodayWeather("Sono");
