document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const artworkImage = document.getElementById('artworkImage');
    const artworkTitle = document.getElementById('artworkTitle');
    const artist = document.getElementById('artist');
    const date = document.getElementById('date');
    const tags = document.getElementById('tags');
    const colorPalette = document.getElementById('colorPalette');
    const themeToggle = document.getElementById('themeToggle');
    const locationToggle = document.getElementById('locationToggle');
    const museumToggle = document.getElementById('museumToggle');
    const downloadBtn = document.getElementById('downloadBtn');
    const locationPanel = document.querySelector('.location-panel');
    const museumPanel = document.querySelector('.museum-panel');
    const saveLocationBtn = document.getElementById('saveLocation');
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');
    const themeIcon = document.querySelector('.theme-icon');

    // Color Thief instance
    const colorThief = new ColorThief();

    // Theme states and icons
    const THEME_STATES = {
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
    };

    let currentThemeState = localStorage.getItem('themeState') || 'light';
    let currentTheme = localStorage.getItem('theme') || 'light';
    let themeTimeout = null;
    let currentArtwork = null;

    function updateThemeIcon() {
        const currentState = THEME_STATES[currentThemeState.toUpperCase()];
        themeIcon.textContent = currentState.icon;
        themeToggle.setAttribute('data-label', currentState.label);
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
            
            console.log('Theme check:', {
                location: `${latitude}, ${longitude}`,
                localTime: localTime.toLocaleTimeString(),
                sunrise: localSunrise.toLocaleTimeString(),
                sunset: localSunset.toLocaleTimeString(),
                isDark,
                themeState: currentThemeState
            });

            const nextCheck = localTime < localSunrise ? localSunrise : localSunset;
            const timeUntilNextCheck = nextCheck - localTime;
            const maxWait = 60 * 60 * 1000;
            const waitTime = Math.min(timeUntilNextCheck, maxWait);
            
            themeTimeout = setTimeout(checkLocationBasedTheme, waitTime);
        }
    }

    async function fetchArtwork() {
        try {
            const response = await fetch('https://api.artic.edu/api/v1/artworks/search?q=&fields=id,title,artist_display,date_display,style_titles,classification_titles,material_titles,image_id&limit=100');
            const data = await response.json();
            
            const artworksWithImages = data.data.filter(artwork => artwork.image_id);
            currentArtwork = artworksWithImages[Math.floor(Math.random() * artworksWithImages.length)];
            
            artworkTitle.textContent = currentArtwork.title;
            artist.textContent = currentArtwork.artist_display;
            date.textContent = currentArtwork.date_display;
            
            const allTags = [
                ...(currentArtwork.style_titles || []),
                ...(currentArtwork.classification_titles || []),
                ...(currentArtwork.material_titles || [])
            ];
            const limitedTags = allTags.slice(0, 5);
            tags.innerHTML = limitedTags.map(tag => `<span class="tag">${tag}</span>`).join('');
            
            const imageUrl = `https://www.artic.edu/iiif/2/${currentArtwork.image_id}/full/843,/0/default.jpg`;
            artworkImage.src = imageUrl;
            
            artworkImage.onload = function() {
                updateColorPalette(this);
            };
            
        } catch (error) {
            console.error('Error fetching artwork:', error);
            showToast('Error loading artwork');
        }
    }

    function updateColorPalette(image) {
        try {
            const colors = colorThief.getPalette(image, 5);
            colorPalette.innerHTML = colors.map(color => {
                const [r, g, b] = color;
                return `
                    <div class="color-wrapper">
                        <div class="color" style="background-color: rgb(${r}, ${g}, ${b})" data-color="rgb(${r}, ${g}, ${b})"></div>
                    </div>
                `;
            }).join('');

            document.querySelectorAll('.color').forEach(color => {
                color.addEventListener('click', () => {
                    const colorValue = color.getAttribute('data-color');
                    navigator.clipboard.writeText(colorValue);
                    showToast('Color copied to clipboard!');
                });
            });
        } catch (error) {
            console.error('Error generating color palette:', error);
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

    function togglePanel(panel, button) {
        const isActive = panel.classList.contains('active');
        
        locationPanel.classList.remove('active');
        museumPanel.classList.remove('active');
        
        if (!isActive) {
            panel.classList.add('active');
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    }

    function saveLocation() {
        const latitude = latitudeInput.value;
        const longitude = longitudeInput.value;
        
        if (latitude && longitude) {
            localStorage.setItem('latitude', latitude);
            localStorage.setItem('longitude', longitude);
            showToast('Location saved successfully!');
            locationPanel.classList.remove('active');
            
            if (currentThemeState === 'auto') {
                checkLocationBasedTheme();
            }
        }
    }

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
    themeToggle.addEventListener('click', toggleTheme);
    locationToggle.addEventListener('click', () => togglePanel(locationPanel, locationToggle));
    museumToggle.addEventListener('click', () => togglePanel(museumPanel, museumToggle));
    downloadBtn.addEventListener('click', downloadArtwork);
    saveLocationBtn.addEventListener('click', saveLocation);

    // Load saved location
    const savedLatitude = localStorage.getItem('latitude');
    const savedLongitude = localStorage.getItem('longitude');
    if (savedLatitude && savedLongitude) {
        latitudeInput.value = savedLatitude;
        longitudeInput.value = savedLongitude;
    }

    // Initialize
    updateThemeIcon();
    if (currentThemeState === 'auto') {
        checkLocationBasedTheme();
    } else {
        document.documentElement.setAttribute('data-theme', currentTheme);
    }
    fetchArtwork();
});