// Constants
const API_URL = 'https://api.artic.edu/api/v1/artworks/search';
const API_PARAMS = '?q=&fields=id,title,artist_display,date_display,style_titles,classification_titles,material_titles,image_id&limit=100';

const THEMES = {
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

// DOM Elements
let elements;

document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    initializeEventListeners();
    initializeTheme();
    fetchArtwork();
});

function initializeElements() {
    elements = {
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
}

function initializeEventListeners() {
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.locationToggle.addEventListener('click', () => togglePanel(elements.locationPanel, elements.locationToggle));
    elements.museumToggle.addEventListener('click', () => togglePanel(elements.museumPanel, elements.museumToggle));
    elements.downloadBtn.addEventListener('click', downloadArtwork);
    elements.saveLocationBtn.addEventListener('click', saveLocation);
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || THEMES.LIGHT.name;
    const savedThemeState = localStorage.getItem('themeState') || THEMES.LIGHT.name;
    
    setTheme(savedTheme);
    updateThemeIcon(savedThemeState);
    
    if (savedThemeState === THEMES.AUTO.name) {
        checkLocationBasedTheme();
    }
}

async function fetchArtwork() {
    try {
        const response = await fetch(`${API_URL}${API_PARAMS}`);
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();
        const artworksWithImages = data.data.filter(artwork => artwork.image_id);
        
        if (!artworksWithImages.length) {
            throw new Error('No artwork found');
        }

        displayRandomArtwork(artworksWithImages);
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to load artwork. Please try again.');
    }
}

function displayRandomArtwork(artworks) {
    const artwork = artworks[Math.floor(Math.random() * artworks.length)];
    
    elements.artworkTitle.textContent = artwork.title;
    elements.artist.textContent = artwork.artist_display;
    elements.date.textContent = artwork.date_display;
    
    displayTags(artwork);
    loadArtworkImage(artwork.image_id);
}

function displayTags(artwork) {
    const allTags = [
        ...(artwork.style_titles || []),
        ...(artwork.classification_titles || []),
        ...(artwork.material_titles || [])
    ];
    
    const limitedTags = allTags.slice(0, 5);
    elements.tags.innerHTML = limitedTags.map(tag => 
        `<span class="tag">${tag}</span>`
    ).join('');
}

function loadArtworkImage(imageId) {
    const imageUrl = `https://www.artic.edu/iiif/2/${imageId}/full/843,/0/default.jpg`;
    elements.artworkImage.src = imageUrl;
    elements.artworkImage.onload = () => updateColorPalette(elements.artworkImage);
}

function updateColorPalette(image) {
    try {
        const colorThief = new ColorThief();
        const colors = colorThief.getPalette(image, 5);
        
        elements.colorPalette.innerHTML = colors.map(color => {
            const [r, g, b] = color;
            return `
                <div class="color-wrapper">
                    <div class="color" 
                         style="background-color: rgb(${r}, ${g}, ${b})"
                         data-color="rgb(${r}, ${g}, ${b})">
                    </div>
                </div>`;
        }).join('');

        addColorClickListeners();
    } catch (error) {
        console.error('Error generating color palette:', error);
    }
}

function addColorClickListeners() {
    document.querySelectorAll('.color').forEach(color => {
        color.addEventListener('click', () => {
            const colorValue = color.getAttribute('data-color');
            navigator.clipboard.writeText(colorValue);
            showToast('Color copied to clipboard!');
        });
    });
}

function toggleTheme() {
    const currentState = localStorage.getItem('themeState') || THEMES.LIGHT.name;
    let newState;
    
    switch(currentState) {
        case THEMES.LIGHT.name:
            newState = THEMES.DARK.name;
            break;
        case THEMES.DARK.name:
            newState = THEMES.AUTO.name;
            break;
        default:
            newState = THEMES.LIGHT.name;
    }
    
    localStorage.setItem('themeState', newState);
    updateThemeIcon(newState);
    
    if (newState === THEMES.AUTO.name) {
        checkLocationBasedTheme();
    } else {
        setTheme(newState);
    }
}

function updateThemeIcon(themeState) {
    const theme = THEMES[themeState.toUpperCase()];
    elements.themeIcon.textContent = theme.icon;
    elements.themeToggle.setAttribute('data-label', theme.label);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

function checkLocationBasedTheme() {
    const latitude = parseFloat(localStorage.getItem('latitude'));
    const longitude = parseFloat(localStorage.getItem('longitude'));
    
    if (isNaN(latitude) || isNaN(longitude)) {
        showToast('Please set your location for automatic theme switching');
        return;
    }
    
    const times = SunCalc.getTimes(new Date(), latitude, longitude);
    const isDark = new Date() < times.sunrise || new Date() > times.sunset;
    setTheme(isDark ? THEMES.DARK.name : THEMES.LIGHT.name);
}

function togglePanel(panel, button) {
    const isActive = panel.classList.contains('active');
    
    elements.locationPanel.classList.remove('active');
    elements.museumPanel.classList.remove('active');
    
    if (!isActive) {
        panel.classList.add('active');
        button.classList.add('active');
    } else {
        button.classList.remove('active');
    }
}

function saveLocation() {
    const latitude = elements.latitudeInput.value;
    const longitude = elements.longitudeInput.value;
    
    if (!latitude || !longitude) {
        showToast('Please enter both latitude and longitude');
        return;
    }
    
    localStorage.setItem('latitude', latitude);
    localStorage.setItem('longitude', longitude);
    showToast('Location saved successfully!');
    elements.locationPanel.classList.remove('active');
    
    if (localStorage.getItem('themeState') === THEMES.AUTO.name) {
        checkLocationBasedTheme();
    }
}

async function downloadArtwork() {
    try {
        const imageUrl = elements.artworkImage.src;
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `artwork-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('Download started');
    } catch (error) {
        console.error('Error downloading artwork:', error);
        showToast('Failed to download artwork');
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
    
    setTimeout(() => toast.remove(), 3000);
}