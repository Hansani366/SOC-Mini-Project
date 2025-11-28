// ===== Configuration =====
const API_URL = "http://localhost:3000";
const API_KEY = "my-api-key-123";
const JWT_TOKEN = "";
const COVID_API_BASE = 'https://disease.sh/v3/covid-19/countries';
const COUNTRY_API_BASE = 'https://restcountries.com/v3.1';

// ===== DOM Elements =====
const countrySelect = document.getElementById('country-select');
const dashboard = document.getElementById('dashboard');
const loadingSpinner = document.getElementById('loading-spinner');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');
const lastUpdated = document.getElementById('last-updated');
const actionButtons = document.getElementById('action-buttons');
const saveBtn = document.getElementById('save-btn');
const viewRecordsBtn = document.getElementById('view-records-btn');
const trackerSection = document.getElementById('tracker-section');
const recordsSection = document.getElementById('records-section');
const trackerTab = document.getElementById('tracker-tab');
const recordsTab = document.getElementById('records-tab');
const backToTracker = document.getElementById('back-to-tracker');
const clearRecords = document.getElementById('clear-records');
const recordsList = document.getElementById('records-list');

let aggregatedData = {};

// ===== Initialize App =====
async function initApp() {
    try {
        showLoading(true);
        const response = await fetch(`${COUNTRY_API_BASE}/all?fields=name,cca2,flags,capital,population,currencies,region`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const countries = await response.json();
        countries.sort((a, b) => a.name.common.localeCompare(b.name.common));
        while (countrySelect.options.length > 1) countrySelect.remove(1);
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.cca2;
            option.textContent = country.name.common;
            countrySelect.appendChild(option);
        });
        lastUpdated.textContent = new Date().toLocaleString();
        hideError();
    } catch (error) {
        console.error("Initialization Error:", error);
        showError('Failed to load countries from API. Using fallback list.');
        loadHardcodedCountries();
    } finally {
        showLoading(false);
    }
}

function loadHardcodedCountries() {
    const countries = [
        {name: "United States", code: "US"},
        {name: "United Kingdom", code: "GB"},
        {name: "Canada", code: "CA"},
        {name: "Australia", code: "AU"},
        {name: "Germany", code: "DE"},
        {name: "France", code: "FR"},
        {name: "Japan", code: "JP"},
        {name: "India", code: "IN"},
        {name: "Brazil", code: "BR"},
        {name: "Sri Lanka", code: "LK"}
    ];
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country.code;
        option.textContent = country.name;
        countrySelect.appendChild(option);
    });
}

// ===== Country Selection =====
countrySelect.addEventListener('change', async (event) => {
    const countryCode = event.target.value;
    if (!countryCode) {
        dashboard.style.display = 'none';
        actionButtons.style.display = 'none';
        return;
    }
    showLoading(true);
    dashboard.style.display = 'none';
    actionButtons.style.display = 'none';
    hideError();
    hideSuccess();

    try {
        const countryName = countrySelect.options[countrySelect.selectedIndex].text;
        const [covidData, countryData] = await Promise.all([
            fetchData(`${COVID_API_BASE}/${countryCode}`),
            fetchData(`${COUNTRY_API_BASE}/alpha/${countryCode}`)
        ]);

        aggregateData(covidData, countryData[0]);
        displayData(aggregatedData);
        actionButtons.style.display = 'flex';

        // Auto-save to backend
        await saveToBackend(aggregatedData);
    } catch (error) {
        showError(`Failed to fetch data: ${error.message}`);
        console.error("Fetch Error:", error);
    } finally {
        showLoading(false);
    }
});

// ===== Fetch Helper =====
async function fetchData(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API request failed: ${response.status}`);
    return await response.json();
}

// ===== Aggregate Data =====
function aggregateData(covidData, countryData) {
    let currency = 'N/A';
    if (countryData.currencies) {
        const code = Object.keys(countryData.currencies)[0];
        currency = `${countryData.currencies[code].name} (${code})`;
    }
    aggregatedData = {
        countryInfo: {
            name: countryData.name?.common || 'N/A',
            capital: countryData.capital ? countryData.capital[0] : 'N/A',
            population: countryData.population ? countryData.population.toLocaleString() : 'N/A',
            currency: currency,
            region: countryData.region || 'N/A',
            flag: countryData.flags?.png || ''
        },
        covidStats: {
            cases: covidData.cases?.toLocaleString() || 'N/A',
            todayCases: covidData.todayCases?.toLocaleString() || 'N/A',
            deaths: covidData.deaths?.toLocaleString() || 'N/A',
            todayDeaths: covidData.todayDeaths?.toLocaleString() || 'N/A',
            recovered: covidData.recovered?.toLocaleString() || 'N/A',
            active: covidData.active?.toLocaleString() || 'N/A',
            casesPerOneMillion: covidData.casesPerOneMillion?.toLocaleString() || 'N/A',
            updated: covidData.updated || Date.now()
        }
    };
}

// ===== Display Data =====
function displayData(data) {
    const country = data.countryInfo;
    const covid = data.covidStats;

    document.getElementById('country-name').textContent = country.name;
    document.getElementById('country-flag').src = country.flag;
    document.getElementById('country-flag').alt = `Flag of ${country.name}`;
    document.getElementById('country-capital').textContent = country.capital;
    document.getElementById('country-population').textContent = country.population;
    document.getElementById('country-currency').textContent = country.currency;
    document.getElementById('country-region').textContent = country.region;

    document.getElementById('covid-cases').textContent = covid.cases;
    document.getElementById('covid-today-cases').textContent = covid.todayCases;
    document.getElementById('covid-deaths').textContent = covid.deaths;
    document.getElementById('covid-today-deaths').textContent = covid.todayDeaths;
    document.getElementById('covid-recovered').textContent = covid.recovered;
    document.getElementById('covid-active').textContent = covid.active;
    document.getElementById('covid-cases-per-million').textContent = covid.casesPerOneMillion;

    dashboard.style.display = 'grid';
}

// ===== Save to Backend =====
async function saveToBackend(data) {
    try {
        const res = await fetch(`${API_URL}/records`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY,
                "Authorization": `Bearer ${JWT_TOKEN}`
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json();
            console.warn("Backend save failed:", err.error);
        } else {
            showSuccess("Record saved successfully!");
        }
    } catch (err) {
        console.error("Backend save error:", err);
        showError("Failed to save record to backend");
    }
}

// ===== Save Button Click =====
saveBtn.addEventListener('click', async () => {
    if (!aggregatedData || Object.keys(aggregatedData).length === 0) {
        showError('No data to save!');
        return;
    }
    await saveToBackend(aggregatedData);
});

// ===== Tab Switching =====
trackerTab.addEventListener('click', () => switchTab('tracker'));
recordsTab.addEventListener('click', () => { fetchRecords(); switchTab('records'); });
backToTracker.addEventListener('click', () => switchTab('tracker'));

function switchTab(tab) {
    if (tab === 'tracker') {
        trackerSection.style.display = 'block';
        recordsSection.style.display = 'none';
        trackerTab.classList.add('active');
        recordsTab.classList.remove('active');
    } else {
        trackerSection.style.display = 'none';
        recordsSection.style.display = 'block';
        trackerTab.classList.remove('active');
        recordsTab.classList.add('active');
    }
}

// ===== View Records Button Click =====
viewRecordsBtn.addEventListener('click', () => {
    fetchRecords();
    switchTab('records');
});

// ===== Fetch Saved Records (Fixed) =====
async function fetchRecords() {
    recordsList.innerHTML = "<p>Loading saved records...</p>";
    try {
        const res = await fetch(`${API_URL}/records`, {
            headers: {
                "x-api-key": API_KEY,
                "Authorization": `Bearer ${JWT_TOKEN}`
            }
        });
        const records = await res.json();
        if (!records.length) {
            recordsList.innerHTML = "<p>No records found.</p>";
            return;
        }
        recordsList.innerHTML = records.map(r => {
            const data = r.data || {}; // fallback if data missing
            return `
            <div class="record-item">
                <div class="record-header">
                    <div class="record-country">${data.countryInfo?.name || 'N/A'}</div>
                    <div class="record-date">${new Date(r.createdAt).toLocaleString()}</div>
                </div>
                <div class="record-stats">
                    <div>Cases: ${data.covidStats?.cases || 'N/A'}</div>
                    <div>Deaths: ${data.covidStats?.deaths || 'N/A'}</div>
                    <div>Recovered: ${data.covidStats?.recovered || 'N/A'}</div>
                    <div>Active: ${data.covidStats?.active || 'N/A'}</div>
                </div>
            </div>
            `;
        }).join('');
    } catch (err) {
        recordsList.innerHTML = `<p style="color:red;">Failed to load records</p>`;
        console.error(err);
    }
}

// ===== Clear Records Button =====
clearRecords.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all saved records?')) {
        fetch(`${API_URL}/records`, {
            method: "DELETE",
            headers: {
                "x-api-key": API_KEY,
                "Authorization": `Bearer ${JWT_TOKEN}`
            }
        }).then(() => fetchRecords());
    }
});

// ===== Utilities =====
function showLoading(show) { loadingSpinner.style.display = show ? 'block' : 'none'; }
function showError(msg) { errorMessage.textContent = msg; errorMessage.style.display = 'block'; }
function hideError() { errorMessage.style.display = 'none'; errorMessage.textContent = ''; }
function showSuccess(msg) { successMessage.textContent = msg; successMessage.style.display = 'block'; setTimeout(hideSuccess,3000); }
function hideSuccess() { successMessage.style.display = 'none'; successMessage.textContent = ''; }

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', initApp);
