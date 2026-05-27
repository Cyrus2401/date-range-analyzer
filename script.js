// Element Selections
const dateForm          = document.getElementById('dateForm');
const dateDebutInput    = document.getElementById('dateDebut');
const dateFinInput      = document.getElementById('dateFin');
const countryCodeSelect = document.getElementById('countryCode');

const resultsPlaceholder = document.getElementById('resultsPlaceholder');
const resultsContent     = document.getElementById('resultsContent');
const workRatioTrack     = document.getElementById('workRatioTrack');

const dateDebutTitle          = document.getElementById('dateDebutTitle');
const dateFinTitle            = document.getElementById('dateFinTitle');
const detailBetweenTwoDatesSpan = document.getElementById('detailBetweenTwoDatesSpan');
const numbersOfDays           = document.getElementById('numbersOfDays');

const workDaysSpan    = document.getElementById('workDaysSpan');
const weekendDaysSpan = document.getElementById('weekendDaysSpan');
const workRatioBar    = document.getElementById('workRatioBar');

const holidaysCountSpan    = document.getElementById('holidaysCountSpan');
const holidaysList         = document.getElementById('holidaysList');
const holidaysDetails      = document.getElementById('holidaysDetails');
const holidaysCountryName  = document.getElementById('holidaysCountryName');
const holidaysLoader       = document.getElementById('holidaysLoader');

const totalMonthsSpan  = document.getElementById('totalMonthsSpan');
const totalWeeksSpan   = document.getElementById('totalWeeksSpan');
const totalHoursSpan   = document.getElementById('totalHoursSpan');
const totalMinutesSpan = document.getElementById('totalMinutesSpan');

const startWeekdaySpan  = document.getElementById('startWeekdaySpan');
const endWeekdaySpan    = document.getElementById('endWeekdaySpan');
const leapYearsCountSpan = document.getElementById('leapYearsCountSpan');
const leapYearsList     = document.getElementById('leapYearsList');
const leapYearsDetails  = document.getElementById('leapYearsDetails');

// Init
document.addEventListener('DOMContentLoaded', () => {
    const currentYearEl = document.getElementById('current-year');
    if (currentYearEl) currentYearEl.innerText = new Date().getFullYear();
    fetchAndInitCountries();
});

// Form Submit 
dateForm.addEventListener('submit', (e) => {
    e.preventDefault();
    analyzeDates();
});

// Main Analyze 
async function analyzeDates() {
    const dateDebutVal = dateDebutInput.value;
    const dateFinVal   = dateFinInput.value;

    if (!dateDebutVal || !dateFinVal) {
        showToast('Veuillez sélectionner deux dates valides.');
        return;
    }

    const dateDebut = new Date(dateDebutVal);
    const dateFin   = new Date(dateFinVal);
    dateDebut.setHours(0, 0, 0, 0);
    dateFin.setHours(0, 0, 0, 0);

    if (dateDebut > dateFin) {
        showToast('La date de début doit être antérieure ou égale à la date de fin.');
        return;
    }

    resultsPlaceholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');
    resultsContent.classList.remove('is-visible');
    void resultsContent.offsetWidth;
    resultsContent.classList.add('is-visible');

    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    dateDebutTitle.innerText = dateDebut.toLocaleDateString('fr-FR', options);
    dateFinTitle.innerText   = dateFin.toLocaleDateString('fr-FR', options);

    const duration = getDuration(dateDebut, dateFin);
    let durationStr = '';
    if (duration.years  > 0) durationStr += `${duration.years} an${duration.years > 1 ? 's' : ''} `;
    if (duration.months > 0) durationStr += `${duration.months} mois `;
    if (duration.days   > 0 || (!duration.years && !duration.months)) {
        durationStr += `${duration.days} jour${duration.days > 1 ? 's' : ''}`;
    }
    detailBetweenTwoDatesSpan.innerText = durationStr.trim();

    const totalDays = getNumberOfDays(dateDebut, dateFin);
    numbersOfDays.innerText = formatNumber(totalDays);

    const { workDays, weekendDays } = calcWeeklySplit(dateDebut, dateFin);
    workDaysSpan.innerText    = formatNumber(workDays);
    weekendDaysSpan.innerText = formatNumber(weekendDays);
    const pct = (workDays + weekendDays) > 0 ? (workDays / (workDays + weekendDays)) * 100 : 0;
    workRatioBar.style.width = `${pct}%`;
    if (workRatioTrack) {
        workRatioTrack.setAttribute('aria-valuenow', Math.round(pct));
    }

    totalMonthsSpan.innerText  = formatNumber((totalDays / 30.437).toFixed(1));
    totalWeeksSpan.innerText   = formatNumber((totalDays / 7).toFixed(1));
    totalHoursSpan.innerText   = formatNumber(totalDays * 24);
    totalMinutesSpan.innerText = formatNumber(totalDays * 24 * 60);

    startWeekdaySpan.innerText = capitalize(dateDebut.toLocaleDateString('fr-FR', { weekday: 'long' }));
    endWeekdaySpan.innerText   = capitalize(dateFin.toLocaleDateString('fr-FR', { weekday: 'long' }));

    const leapYears = getLeapYears(dateDebut.getFullYear(), dateFin.getFullYear());
    leapYearsCountSpan.innerText = leapYears.length;
    if (leapYears.length > 0) {
        leapYearsDetails.open = false;
        leapYearsDetails.style.display = 'block';
        leapYearsList.innerHTML = leapYears
            .map(y => `<li><span>Année ${y}</span> <small>366 jours</small></li>`)
            .join('');
    } else {
        leapYearsDetails.style.display = 'none';
        leapYearsList.innerHTML = '';
    }

    const countryCode = countryCodeSelect.value;
    const countryLabel = countryCodeSelect.options[countryCodeSelect.selectedIndex].text.trim();
    holidaysCountryName.innerText = countryLabel ? `— ${countryLabel}` : '';

    setHolidaysLoading(true);
    try {
        const holidays = await fetchHolidays(countryCode, dateDebut, dateFin);
        setHolidaysLoading(false);
        holidaysCountSpan.innerText = holidays.length;

        if (holidays.length > 0) {
            holidaysDetails.style.display = 'block';
            holidaysList.innerHTML = holidays
                .map(h => `<li><span>${escapeHtml(h.localName)}</span> <small>${new Date(h.date + 'T00:00:00').toLocaleDateString('fr-FR', options)}</small></li>`)
                .join('');
        } else {
            holidaysDetails.style.display = 'none';
            holidaysList.innerHTML = '';
        }
    } catch {
        setHolidaysLoading(false);
        holidaysCountSpan.innerText = '—';
        holidaysDetails.style.display = 'none';
        holidaysList.innerHTML = '';
        showToast('Impossible de récupérer les jours fériés. Vérifiez votre connexion.');
    }
}

// Nager.Date API 
async function fetchHolidays(countryCode, startDate, endDate) {
    const startYear = startDate.getFullYear();
    const endYear   = endDate.getFullYear();
    const requests = [];

    for (let y = startYear; y <= endYear; y++) {
        requests.push(
            fetch(`https://date.nager.at/api/v3/PublicHolidays/${y}/${countryCode}`)
                .then(r => r.ok ? r.json() : [])
        );
    }

    const results = await Promise.all(requests);
    const all = results.flat();

    return all.filter(h => {
        const d = new Date(h.date + 'T00:00:00');
        return d >= startDate && d <= endDate;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Loading State 
function setHolidaysLoading(loading) {
    if (loading) {
        holidaysCountSpan.innerText = '';
        holidaysLoader.classList.remove('hidden');
        holidaysDetails.style.display = 'none';
        holidaysList.innerHTML = '';
    } else {
        holidaysLoader.classList.add('hidden');
    }
}

// Calculations 
function getNumberOfDays(start, end) {
    return Math.round(Math.abs(end - start) / (1000 * 60 * 60 * 24));
}

function getDuration(start, end) {
    let years  = end.getFullYear() - start.getFullYear();
    let months = end.getMonth()    - start.getMonth();
    let days   = end.getDate()     - start.getDate();

    if (days < 0) {
        months--;
        days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    }
    if (months < 0) { years--; months += 12; }

    return { years, months, days };
}

function calcWeeklySplit(start, end) {
    let workDays = 0, weekendDays = 0;
    const curr = new Date(start);
    while (curr <= end) {
        const day = curr.getDay();
        (day === 0 || day === 6) ? weekendDays++ : workDays++;
        curr.setDate(curr.getDate() + 1);
    }
    return { workDays, weekendDays };
}

function getLeapYears(startYear, endYear) {
    const years = [];
    for (let y = startYear; y <= endYear; y++) {
        if ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) years.push(y);
    }
    return years;
}

// Helpers 
function formatNumber(num) {
    return new Intl.NumberFormat('fr-FR').format(num);
}

function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(message) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <span>${escapeHtml(message)}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(12px)';
        toast.style.transition = 'all 0.35s ease';
        setTimeout(() => toast.remove(), 350);
    }, 3500);
}

// Country Selector & API integration 

let allCountries = [];
let currentSelectedCode = 'BJ';

// Helper: Convert country code to flag emoji
function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '🌐';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    try {
        return String.fromCodePoint(...codePoints);
    } catch {
        return '🌐';
    }
}

// Populate the native select for compatibility
function populateNativeSelect(list) {
    countryCodeSelect.innerHTML = list
        .map(c => `<option value="${c.countryCode}">${getFlagEmoji(c.countryCode)} ${c.name}</option>`)
        .join('');
}

// Select a country and update all UI elements
function selectCountry(code) {
    const c = allCountries.find(x => x.countryCode === code);
    if (!c) return;

    currentSelectedCode = code;
    
    // Update native select
    countryCodeSelect.value = code;

    // Update trigger UI
    const selectedValueEl = document.querySelector('#selectTrigger .selected-value');
    if (selectedValueEl) {
        selectedValueEl.innerHTML = `${getFlagEmoji(c.countryCode)} ${c.name}`;
    }

    // Update active class in dropdown items
    document.querySelectorAll('.option-item').forEach(item => {
        if (item.getAttribute('data-value') === code) {
            item.classList.add('is-selected');
        } else {
            item.classList.remove('is-selected');
        }
    });
}

// Render option items in custom dropdown list
function renderCustomOptions(list) {
    const optionsList = document.getElementById('optionsList');
    if (!optionsList) return;

    if (list.length === 0) {
        optionsList.innerHTML = `<li class="no-results">Aucun pays trouvé</li>`;
        return;
    }

    optionsList.innerHTML = list
        .map(c => `
            <li class="option-item ${c.countryCode === currentSelectedCode ? 'is-selected' : ''}" data-value="${c.countryCode}">
                <span class="option-flag">${getFlagEmoji(c.countryCode)}</span>
                <span class="option-name">${escapeHtml(c.name)}</span>
            </li>
        `)
        .join('');

    // Add click listeners to items
    optionsList.querySelectorAll('.option-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const code = item.getAttribute('data-value');
            selectCountry(code);
            
            // Close dropdown
            const customSelectContainer = document.getElementById('customSelectContainer');
            if (customSelectContainer) {
                customSelectContainer.classList.remove('is-open');
                document.getElementById('selectTrigger').setAttribute('aria-expanded', 'false');
            }
        });
    });
}

// Initialize custom select event handlers
function initCustomSelect() {
    const selectTrigger = document.getElementById('selectTrigger');
    const customSelectContainer = document.getElementById('customSelectContainer');
    const countrySearchInput = document.getElementById('countrySearchInput');

    if (!selectTrigger || !customSelectContainer) return;

    // Toggle dropdown on click
    selectTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = customSelectContainer.classList.toggle('is-open');
        selectTrigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        
        if (isOpen) {
            if (countrySearchInput) {
                countrySearchInput.value = '';
                renderCustomOptions(allCountries);
                countrySearchInput.focus();
            }
        }
    });

    // Filter list on search input
    if (countrySearchInput) {
        countrySearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const filtered = allCountries.filter(c => 
                c.name.toLowerCase().includes(query) || 
                c.countryCode.toLowerCase().includes(query)
            );
            renderCustomOptions(filtered);
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!customSelectContainer.contains(e.target)) {
            customSelectContainer.classList.remove('is-open');
            selectTrigger.setAttribute('aria-expanded', 'false');
        }
    });
}

// Fetch all available countries from Nager.Date API with local fallback
async function fetchAndInitCountries() {
    const fallbackCountries = [
        { countryCode: "BJ", name: "Bénin" },
        { countryCode: "CI", name: "Côte d'Ivoire" },
        { countryCode: "CD", name: "Congo (RDC)" },
        { countryCode: "CG", name: "Congo" },
        { countryCode: "GA", name: "Gabon" },
        { countryCode: "GH", name: "Ghana" },
        { countryCode: "KE", name: "Kenya" },
        { countryCode: "MA", name: "Maroc" },
        { countryCode: "MG", name: "Madagascar" },
        { countryCode: "NE", name: "Niger" },
        { countryCode: "NG", name: "Nigeria" },
        { countryCode: "SC", name: "Seychelles" },
        { countryCode: "SN", name: "Sénégal" },
        { countryCode: "TN", name: "Tunisie" },
        { countryCode: "ZA", name: "Afrique du Sud" },
        { countryCode: "BE", name: "Belgique" },
        { countryCode: "CH", name: "Suisse" },
        { countryCode: "DE", name: "Allemagne" },
        { countryCode: "ES", name: "Espagne" },
        { countryCode: "FR", name: "France" },
        { countryCode: "GB", name: "Royaume-Uni" },
        { countryCode: "IT", name: "Italie" },
        { countryCode: "LU", name: "Luxembourg" },
        { countryCode: "NL", name: "Pays-Bas" },
        { countryCode: "PT", name: "Portugal" },
        { countryCode: "BR", name: "Brésil" },
        { countryCode: "CA", name: "Canada" },
        { countryCode: "MX", name: "Mexique" },
        { countryCode: "US", name: "États-Unis" },
        { countryCode: "AU", name: "Australie" },
        { countryCode: "CN", name: "Chine" },
        { countryCode: "JP", name: "Japon" },
        { countryCode: "SG", name: "Singapour" }
    ];

    try {
        const response = await fetch('https://date.nager.at/api/v3/AvailableCountries');
        if (!response.ok) throw new Error('Network error');
        const apiCountries = await response.json();
        
        // Map and merge French names for existing fallback countries
        allCountries = apiCountries.map(ac => {
            const matched = fallbackCountries.find(fc => fc.countryCode.toUpperCase() === ac.countryCode.toUpperCase());
            return {
                countryCode: ac.countryCode,
                name: matched ? matched.name : ac.name
            };
        });
    } catch (err) {
        console.warn('API error fetching countries, using local fallback:', err);
        allCountries = [...fallbackCountries];
    }

    // Sort alphabetically by name
    allCountries.sort((a, b) => a.name.localeCompare(b.name, 'fr'));

    // Populate native and custom UIs
    populateNativeSelect(allCountries);
    initCustomSelect();
    
    // Select default Bénin (BJ) or first available
    const defaultSelection = allCountries.find(c => c.countryCode === 'BJ') || allCountries[0];
    if (defaultSelection) {
        selectCountry(defaultSelection.countryCode);
    }
}
