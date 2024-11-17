document.addEventListener('DOMContentLoaded', () => {
    // Sabitler
    const CONFIG = {
        API_URL: 'https://api.artic.edu/api/v1/artworks/search',
        CACHE_KEY: 'artelier_artwork_cache',
        CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 saat
        THEME_STATES: {
            LIGHT: {
                name: 'light',
                icon: 'light_mode',
                label: 'Light Theme'
            },
            DARK: {
                name: 'dark',
                icon: 'dark_mode',
                label: 'Dark Theme'
            },
            AUTO: {
                name: 'auto',
                icon: 'brightness_auto',
                label: 'Auto Theme'
            }
        }
    };

    // DOM Elementleri
    const DOM = {
        artworkImage: document.getElementById('artworkImage'),
        artworkTitle: document.getElementById('artworkTitle'),
        artist: document.getElementById('artist'),
        date: document.getElementById('date'),
        tags: document.getElementById('tags'),
        colorPalette: document.getElementById('colorPalette'),
        themeToggle: document.getElementById('themeToggle'),
        locationToggle: document.getElementById('locationToggle'),
        museumToggle: document.getElementById('museumToggle'),
        downloadBtn: document.getElementById('downloadBtn'),
        locationPanel: document.querySelector('.location-panel'),
        museumPanel: document.querySelector('.museum-panel'),
        saveLocationBtn: document.getElementById('saveLocation'),
        latitudeInput: document.getElementById('latitude'),
        longitudeInput: document.getElementById('longitude'),
        themeIcon: document.querySelector('.theme-icon')
    };

    // State Management
    let currentThemeState = localStorage.getItem('themeState') || 'light';
    let currentTheme = localStorage.getItem('theme') || 'light';
    let themeTimeout = null;
    let currentArtwork = null;

    // Color Thief instance
    const colorThief = new ColorThief();

    // API İşlemleri
    async function fetchArtwork() {
        try {
            const params = new URLSearchParams({
                fields: 'id,title,artist_display,date_display,image_id,style_titles,classification_titles,material_titles',
                limit: '100'
            });

            const response = await fetch(`${CONFIG.API_URL}?${params}`);
            if (!response.ok) throw new Error('API request failed');

            const data = await response.json();
            const artworksWithImages = data.data.filter(artwork => artwork.image_id);
            
            if (artworksWithImages.length === 0) {
                throw new Error('No artwork found');
            }

            currentArtwork = artworksWithImages[Math.floor(Math.random() * artworksWithImages.length)];
            
            updateArtworkDisplay();
            
        } catch (error) {
            console.error('Error fetching artwork:', error);
            showToast('Error loading artwork');
        }
    }

    // Artwork Display
    function updateArtworkDisplay() {
        if (!currentArtwork) return;

        DOM.artworkTitle.textContent = currentArtwork.title;
        DOM.artist.textContent = currentArtwork.artist_display;
        DOM.date.textContent = currentArtwork.date_display;

        const allTags = [
            ...(currentArtwork.style_titles || []),
            ...(currentArtwork.classification_titles || []),
            ...(currentArtwork.material_titles || [])
        ];
        
        DOM.tags.innerHTML = allTags
            .slice(0, 5)
            .map(tag => `<span class="tag">${tag}</span>`)
            .join('');

        const imageUrl = `https://www.artic.edu/iiif/2/${currentArtwork.image_id}/full/843,/0/default.jpg`;
        DOM.artworkImage.src = imageUrl;
        DOM.artworkImage.onload = function() {
            updateColorPalette(this);
        };
    }

    // Color Palette Management
    function updateColorPalette(image) {
        try {
            const colors = colorThief.getPalette(image, 5);
            DOM.colorPalette.innerHTML = colors
                .map(color => {
                    const [r, g, b] = color;
                    return `
                        <div class="color-wrapper">
                            <div class="color" 
                                 style="background-color: rgb(${r}, ${g}, ${b})"
                                 data-color="rgb(${r}, ${g}, ${b})">
                            </div>
                        </div>`;
                })
                .join('');

            setupColorCopyEvents();
        } catch (error) {
            console.error('Error generating color palette:', error);
        }
    }

    // Theme Management
    function updateThemeIcon() {
        const currentState = CONFIG.THEME_STATES[currentThemeState.toUpperCase()];
        DOM.themeIcon.textContent = currentState.icon;
        DOM.themeToggle.setAttribute('data-label', currentState.label);
    }

    function toggleTheme() {
        switch(currentThemeState) {
            case 'light':
                currentThemeState = 'dark';
                currentTheme = 'dark';
                break;
            case 'dark':
                currentThemeState = 'auto';
                checkLocationBasedTheme();
                break;
            default:
                currentThemeState = 'light';
                currentTheme = 'light';
        }

        localStorage.setItem('themeState', currentThemeState);
        localStorage.setItem('theme', currentTheme);
        document.documentElement.setAttribute('data-theme', currentTheme);
        updateThemeIcon();
    }

    // Location Based Theme
    function checkLocationBasedTheme() {
        if (themeTimeout) {
            clearTimeout(themeTimeout);
        }

        const latitude = parseFloat(localStorage.getItem('latitude'));
        const longitude = parseFloat(localStorage.getItem('longitude'));

        if (!isNaN(latitude) && !isNaN(longitude) && currentThemeState === 'auto') {
            const now = new Date();
            const times = SunCalc.getTimes(now, latitude, longitude);
            const utcOffset = Math.round(longitude * 4);
            const localSunrise = new Date(times.sunrise.getTime() + (utcOffset * 60000));
            const localSunset = new Date(times.sunset.getTime() + (utcOffset * 60000));
            const localTime = new Date(now.getTime() + (utcOffset * 60000));

            const isDark = localTime < localSunrise || localTime > localSunset;
            currentTheme = isDark ? 'dark' : 'light';

            document.documentElement.setAttribute('data-theme', currentTheme);
            localStorage.setItem('theme', currentTheme);

            const nextCheck = localTime < localSunrise ? localSunrise : localSunset;
            const timeUntilNextCheck = nextCheck - localTime;
            const maxWait = 60 * 60 * 1000; // 1 saat
            const waitTime = Math.min(timeUntilNextCheck, maxWait);

            themeTimeout = setTimeout(checkLocationBasedTheme, waitTime);
        }
    }

    // UI Helpers
    function togglePanel(panel, button) {
        const isActive = panel.classList.contains('active');

        DOM.locationPanel.classList.remove('active');
        DOM.museumPanel.classList.remove('active');

        if (!isActive) {
            panel.classList.add('active');
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    }

    function showToast(message) {
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Location Management
    function saveLocation() {
        const latitude = DOM.latitudeInput.value;
        const longitude = DOM.longitudeInput.value;

        if (latitude && longitude) {
            localStorage.setItem('latitude', latitude);
            localStorage.setItem('longitude', longitude);
            showToast('Location saved successfully!');
            DOM.locationPanel.classList.remove('active');

            if (currentThemeState === 'auto') {
                checkLocationBasedTheme();
            }
        }
    }

    // Download Management
    async function downloadArtwork() {
        try {
            if (!currentArtwork || !currentArtwork.image_id) {
                showToast('No artwork available to download');
                return;
            }

            const highResUrl = `https://www.artic.edu/iiif/2/${currentArtwork.image_id}/full/1686,/0/default.jpg`;
            const response = await fetch(highResUrl);
            const blob = await response.blob();

            const fileName = `${currentArtwork.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = fileName;

            document.body.appendChild(a);
            a.click();

            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showToast('Download started');
        } catch (error) {
            console.error('Error downloading artwork:', error);
            showToast('Error downloading artwork');
        }
    }

    // Event Listeners
    function setupColorCopyEvents() {
        document.querySelectorAll('.color').forEach(color => {
            color.addEventListener('click', () => {
                const colorValue = color.getAttribute('data-color');
                navigator.clipboard.writeText(colorValue);
                showToast('Color copied to clipboard!');
            });
        });
    }

    // Initialize
    function initialize() {
        // Load saved location
        const savedLatitude = localStorage.getItem('latitude');
        const savedLongitude = localStorage.getItem('longitude');
        
        if (savedLatitude && savedLongitude) {
            DOM.latitudeInput.value = savedLatitude;
            DOM.longitudeInput.value = savedLongitude;
        }

        // Setup event listeners
        DOM.themeToggle.addEventListener('click', toggleTheme);
        DOM.locationToggle.addEventListener('click', () => togglePanel(DOM.locationPanel, DOM.locationToggle));
        DOM.museumToggle.addEventListener('click', () => togglePanel(DOM.museumPanel, DOM.museumToggle));
        DOM.downloadBtn.addEventListener('click', downloadArtwork);
        DOM.saveLocationBtn.addEventListener('click', saveLocation);

        // Initialize theme
        updateThemeIcon();
        if (currentThemeState === 'auto') {
            checkLocationBasedTheme();
        } else {
            document.documentElement.setAttribute('data-theme', currentTheme);
        }

        // Fetch initial artwork
        fetchArtwork();
    }

    // Start the application
    initialize();
});