// Waitz.io API Integration
// Location name mapping (maps your location names to Waitz location names)
const LOCATION_MAP = {
    'PG3': 'Price Gilbert Memorial Library',
    'Kaldis': 'Clough Undergraduate Learning Commons',
    'Blue Donkey': 'Crosland Tower'
};

// Store Waitz data globally
let waitzDataCache = null;

async function fetchWaitzData() {
    // Try multiple possible API endpoints
    const endpoints = [
        `https://api.waitz.io/v1/live/${CONFIG.WAITZ_SCHOOL}`,
        `https://waitz.io/live/${CONFIG.WAITZ_SCHOOL}`,
        `https://s3.amazonaws.com/waitz-web/live/${CONFIG.WAITZ_SCHOOL}.json`
    ];

    for (const url of endpoints) {
        try {
            console.log(`Trying Waitz endpoint: ${url}`);
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                console.log('Successfully fetched Waitz data:', data);
                waitzDataCache = data;
                return data;
            }
        } catch (error) {
            console.log(`Failed to fetch from ${url}:`, error);
        }
    }

    console.error('All Waitz endpoints failed');
    return null;
}

async function updateWaitzData() {
    console.log('Fetching Waitz data...');
    await fetchWaitzData();
    // Update all locations
    LOCATIONS.forEach(location => {
        updateWaitzForLocation(location);
    });
}

function updateWaitzForLocation(locationName) {
    if (!waitzDataCache || !waitzDataCache.data) return;

    const waitzLocationName = LOCATION_MAP[locationName] || locationName;
    const matchedLocation = waitzDataCache.data.find(loc => {
        const locName = loc.name || '';
        return locName.toLowerCase().includes(waitzLocationName.toLowerCase()) ||
               waitzLocationName.toLowerCase().includes(locName.toLowerCase());
    });

    const card = document.querySelector(`.location-card[data-location="${locationName}"]`);
    if (!card) return;

    const locationImage = card.querySelector('.location-image');
    
    // Update navigation legend occupancy
    const navItem = document.querySelector(`.nav-legend-item[data-location="${locationName}"]`);
    const occupancyText = navItem ? navItem.querySelector('.occupancy-text') : null;

    if (!matchedLocation) {
        if (occupancyText) occupancyText.textContent = '--';
        return;
    }

    const percentage = (matchedLocation.percentage || 0) * 100;
    let imageLevel = '0'; // default to 0% crowd image
    
    if (percentage < 40) {
        imageLevel = '0';
    } else if (percentage < 70) {
        imageLevel = '50';
    } else {
        imageLevel = '100';
    }
    
    // Update occupancy text in navigation
    if (occupancyText) {
        occupancyText.textContent = `${Math.round(percentage)}%`;
    }
    
    // Update background image based on occupancy
    const locationKey = locationName.toLowerCase().replace(/ /g, '');
    if (locationImage) {
        locationImage.style.backgroundImage = `url('images/${locationKey}-${imageLevel}.png')`;
    }
}

// Google Sheets API Integration
async function fetchGoogleSheetsData() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${CONFIG.SHEET_NAME}!${CONFIG.SHEET_RANGE}?key=${CONFIG.GOOGLE_API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        return result.values || [];
    } catch (error) {
        console.error('Error fetching Google Sheets data:', error);
        return [];
    }
}

// Parse data from Google Sheets
function parseGoogleSheetsData(rows) {
    const data = [];

    // Skip header row (index 0) if it exists
    const startIndex = rows[0] && (rows[0][0].toLowerCase().includes('time') || rows[0][0].toLowerCase().includes('location')) ? 1 : 0;

    for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i];
        if (row.length >= 3) {
            const time = row[0];
            const location = row[1];
            const decibel = parseFloat(row[2]);

            if (time && location && !isNaN(decibel)) {
                data.push({
                    time: time,
                    location: location,
                    decibel: decibel,
                    timeInMinutes: convertToMinutes(time)
                });
            }
        }
    }

    return data;
}

// Fallback data (in case Google Sheets fails)
const fallbackData = `10:51:00 AM	Blue Donkey	60.1
10:51:00 AM	PG3	60.1
1:47:00 PM	Skiles	61.1
3:27:00 PM	PG3	63.2
6:04:00 AM	Student Center	60.2
6:37:00 PM	Skiles Courtyard	58.8
4:36:00 PM	Kaldis	70.4
12:05:00 PM	Skiles Walkway	59.8
2:36:00 PM	Kaldis	66.3
2:44:00 PM	Blue Donkey	64.5
12:52:00 PM	Kaldis	63.6
12:54:00 PM	Blue Donkey	68
12:58:00 PM	PG3	51
1:21:00 PM	PG3	57.7
1:24:00 PM	Blue Donkey	62.4
1:27:00 PM	Kaldis	84.7
3:06:00 PM	Kaldis	68.4
3:10:00 PM	PG3	50.2
3:14:00 PM	Blue Donkey	62.2
4:03:00 PM	Kaldis	71
4:06:00 PM	Blue Donkey	58
4:07:00 PM	PG3	59.9
11:30:00 AM	Kaldis	61.9
11:30:00 AM	Blue Donkey	59.8
11:30:00 AM	PG3	59.1
12:30:00 PM	Kaldis	57.2
12:30:00 PM	Blue Donkey	49
12:30:00 PM	PG3	48`;

// Parse fallback data
function parseFallbackData() {
    const lines = fallbackData.trim().split('\n');
    const data = [];

    lines.forEach(line => {
        const parts = line.split('\t').map(p => p.trim());
        if (parts.length === 3) {
            const time = parts[0];
            const location = parts[1];
            const decibel = parseFloat(parts[2]);

            data.push({
                time: time,
                location: location,
                decibel: decibel,
                timeInMinutes: convertToMinutes(time)
            });
        }
    });

    return data;
}

// Convert time string to minutes since midnight
function convertToMinutes(timeStr) {
    const match = timeStr.match(/(\d+):(\d+):(\d+)\s*(AM|PM)/);
    if (!match) return 0;
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[4];
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
}

// Get current time in minutes
function getCurrentTimeInMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
}

// Format time for display
function formatTime(timeStr) {
    return timeStr;
}

// Get unique locations
function getLocations(data) {
    // Only include these three locations
    const allowedLocations = ['Blue Donkey', 'Kaldis', 'PG3'];
    const locations = [...new Set(data.map(d => d.location))];
    return locations.filter(loc => allowedLocations.includes(loc)).sort();
}

// Interpolate decibel value for current time at a location
function getDecibelForTime(data, location, currentMinutes) {
    const locationData = data.filter(d => d.location === location).sort((a, b) => a.timeInMinutes - b.timeInMinutes);
    
    if (locationData.length === 0) return null;
    if (locationData.length === 1) return locationData[0];
    
    // Find surrounding data points
    let before = null, after = null;
    
    for (let i = 0; i < locationData.length; i++) {
        if (locationData[i].timeInMinutes <= currentMinutes) {
            before = locationData[i];
        }
        if (locationData[i].timeInMinutes >= currentMinutes && !after) {
            after = locationData[i];
        }
    }
    
    // If exact match
    if (before && before.timeInMinutes === currentMinutes) return before;
    if (after && after.timeInMinutes === currentMinutes) return after;
    
    // Interpolate
    if (before && after) {
        const ratio = (currentMinutes - before.timeInMinutes) / (after.timeInMinutes - before.timeInMinutes);
        const interpolatedDecibel = before.decibel + (after.decibel - before.decibel) * ratio;
        return {
            time: formatCurrentTime(),
            location: location,
            decibel: interpolatedDecibel,
            timeInMinutes: currentMinutes
        };
    }
    
    // Use closest point
    if (before) return before;
    if (after) return after;
    
    return locationData[0];
}

function formatCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
}

// Particle system - now using connected path with multiple waves
const numParticles = 100;
const numWaves = 3;
const baseRadius = 84; // Adjusted for smaller SVG (240x240, 80% of 300)
const centerX = 120;
const centerY = 120;

// Store particles and paths for each location
const locationVisualizations = {};

function initParticlesForLocation(locationName, svgElement) {
    const particleLayer = d3.select(svgElement).select('.particle-layer');
    const particles = [];
    const wavePaths = [];

    // Create multiple wave rings at the same radius
    for (let waveIndex = 0; waveIndex < numWaves; waveIndex++) {
        const waveParticles = [];

        for (let i = 0; i < numParticles; i++) {
            const angle = (i / numParticles) * Math.PI * 2;
            const particle = {
                angle: angle,
                baseRadius: baseRadius,
                currentRadius: baseRadius,
                waveIndex: waveIndex
            };
            waveParticles.push(particle);
        }

        particles.push(waveParticles);

        // Create connected path for each wave
        const wavePath = particleLayer.append('path')
            .attr('class', 'wave-path')
            .attr('fill', 'none')
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 2)
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round')
            .attr('opacity', 0.4);

        wavePaths.push(wavePath);
    }

    locationVisualizations[locationName] = {
        particles: particles,
        wavePaths: wavePaths,
        svgElement: svgElement,
        pulsePhase: 0,
        currentIntensity: 0,
        targetIntensity: 0,
        isSoundActive: false,
        audioContext: null,
        analyser: null,
        dataArray: null,
        frequencyBands: new Array(numParticles).fill(0)
    };
}

// Analyze audio and update frequency bands
function analyzeAudioForLocation(locationName) {
    const viz = locationVisualizations[locationName];
    if (!viz || !viz.analyser || !viz.dataArray) return null;

    // Get frequency data
    viz.analyser.getByteFrequencyData(viz.dataArray);

    // Map frequency data to particles (create bands)
    const bandsPerParticle = Math.floor(viz.dataArray.length / numParticles);

    for (let i = 0; i < numParticles; i++) {
        let sum = 0;
        for (let j = 0; j < bandsPerParticle; j++) {
            const index = i * bandsPerParticle + j;
            if (index < viz.dataArray.length) {
                sum += viz.dataArray[index];
            }
        }
        // Normalize to 0-1 range
        viz.frequencyBands[i] = (sum / bandsPerParticle) / 255;
    }

    // Calculate overall intensity from frequency data
    const avgFrequency = viz.dataArray.reduce((a, b) => a + b, 0) / viz.dataArray.length;
    return avgFrequency / 255; // Return 0-1 intensity
}

function updateParticlesForLocation(locationName, decibel) {
    const viz = locationVisualizations[locationName];
    if (!viz) return;

    // Analyze real-time audio if available
    const audioIntensity = analyzeAudioForLocation(locationName);

    // Use audio intensity if available, otherwise fall back to decibel data
    let intensity;
    if (audioIntensity !== null) {
        // Real-time audio is available
        viz.targetIntensity = audioIntensity;
        viz.isSoundActive = audioIntensity > 0.02; // Active if any sound detected (more sensitive)
    } else {
        // Fall back to CSV decibel data - but treat it as inactive by default
        viz.isSoundActive = false;
        viz.targetIntensity = 0;
    }

    // Smooth transition to target intensity
    viz.currentIntensity += (viz.targetIntensity - viz.currentIntensity) * 0.15;
    intensity = viz.currentIntensity;

    // Only increment pulse phase when sound is active
    if (viz.isSoundActive && intensity > 0.02) {
        viz.pulsePhase += 0.1 * (1 + intensity * 3);
    } else {
        viz.pulsePhase *= 0.95;
    }

    // Keep color constant
    const color = '#ffffff';

    // Idle rotation speed (very slow, calm rotation when no sound)
    const idleRotationSpeed = Date.now() / 5000; // Slow gentle rotation

    // Update each wave
    viz.particles.forEach((waveParticles, waveIndex) => {
        const points = [];

        waveParticles.forEach((particle, particleIndex) => {
            let currentRadius;

            if (viz.isSoundActive && intensity > 0.02) {
                // ACTIVE MODE: React to sound
                const frequencyIntensity = viz.frequencyBands[particleIndex] || 0;
                
                // Create wave effect
                const frequency = 3 + waveIndex;
                const phaseOffset = waveIndex * Math.PI * 2 / numWaves;
                const speed = 200 - (waveIndex * 30);

                // Base wave ripple
                const waveOffset = Math.sin(Date.now() / speed + particle.angle * frequency + phaseOffset) * 15 * intensity;

                // Add frequency-specific movement
                const frequencyOffset = frequencyIntensity * 40;

                // Breathing effect
                const breathingEffect = Math.sin(viz.pulsePhase) * 20 * intensity;

                // Combine all effects
                currentRadius = particle.baseRadius + waveOffset + breathingEffect + frequencyOffset;
            } else {
                // IDLE MODE: Just gentle circular motion, perfectly smooth
                currentRadius = particle.baseRadius;
            }

            // Calculate position with idle rotation
            const rotatedAngle = particle.angle + (viz.isSoundActive ? 0 : idleRotationSpeed);
            const x = centerX + Math.cos(rotatedAngle) * currentRadius;
            const y = centerY + Math.sin(rotatedAngle) * currentRadius;

            points.push([x, y]);
        });

        // Close the path
        points.push(points[0]);

        // Create smooth path
        const lineGenerator = d3.line()
            .curve(d3.curveCardinalClosed.tension(0.5));

        const pathData = lineGenerator(points);

        // Update the path - dimmer and thinner when idle
        const idleOpacity = 0.2;
        const activeOpacity = 0.4 + intensity * 0.4;
        const idleStrokeWidth = 1.5;
        const activeStrokeWidth = 2 + intensity * 5;

        viz.wavePaths[waveIndex]
            .attr('d', pathData)
            .attr('stroke', color)
            .attr('stroke-width', viz.isSoundActive ? activeStrokeWidth : idleStrokeWidth)
            .attr('opacity', viz.isSoundActive ? activeOpacity : idleOpacity);
    });
}

// Update display for a specific location card
function updateLocationCard(locationName, decibel) {
    const card = document.querySelector(`.location-card[data-location="${locationName}"]`);
    if (!card) return;

    const valueText = card.querySelector('.decibel-value');
    if (valueText) {
        valueText.textContent = decibel ? decibel.toFixed(1) : '--';
    }
}

// ==========================================
// ANIMAL SOUNDS CONFIGURATION
// Add or remove animals here as needed
// Use image paths for the icon field
// ==========================================
const ANIMAL_SOUNDS = [
    { name: "Dog", icon: "images/dog.png", soundFile: "sounds/dog.mp3" },
    { name: "Cat", icon: "images/cat.png", soundFile: "sounds/cat.mp3" },
    { name: "Lion", icon: "images/lion.png", soundFile: "sounds/lion.mp3" },
    { name: "Frog", icon: "images/frog.png", soundFile: "sounds/frog.mp3" },
    // Add more animals here:
    // { name: "Horse", icon: "images/horse.png", soundFile: "sounds/horse.mp3" },
];

// Audio player and analyzer setup
let globalAudioContext = null;
let globalAnalyser = null;
let globalDataArray = null;
let currentAudioSource = null;
let currentAudioElement = null;

function initAudioSystem() {
    if (globalAudioContext) return; // Already initialized
    
    // @ts-ignore - Safari compatibility
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    globalAudioContext = new AudioContextClass();
    globalAnalyser = globalAudioContext.createAnalyser();
    globalAnalyser.fftSize = 512;
    globalAnalyser.smoothingTimeConstant = 0.7;
    
    const bufferLength = globalAnalyser.frequencyBinCount;
    globalDataArray = new Uint8Array(bufferLength);
    
    // Share analyzer with all locations
    LOCATIONS.forEach(loc => {
        const viz = locationVisualizations[loc];
        if (viz) {
            viz.audioContext = globalAudioContext;
            viz.analyser = globalAnalyser;
            viz.dataArray = globalDataArray;
        }
    });
}

// Custom sounds - generate music pad buttons dynamically
function initAnimalSounds() {
    const soundPadGrid = document.getElementById('soundPadGrid');
    
    if (!soundPadGrid) {
        console.error('Sound pad grid not found');
        return;
    }
    
    // Generate buttons from ANIMAL_SOUNDS array
    ANIMAL_SOUNDS.forEach((animal, index) => {
        const button = document.createElement('button');
        button.className = 'sound-pad-btn';
        button.setAttribute('data-sound', animal.soundFile);
        button.setAttribute('data-animal-index', index);
        
        // Check if icon is an image path or emoji
        const isImagePath = animal.icon.includes('.png') || animal.icon.includes('.jpg') || animal.icon.includes('.jpeg') || animal.icon.includes('.gif') || animal.icon.includes('.svg');
        
        if (isImagePath) {
            button.innerHTML = `
                <img src="${animal.icon}" alt="${animal.name}" class="pad-image">
                <span class="pad-name">${animal.name}</span>
            `;
        } else {
            button.innerHTML = `
                <span class="pad-icon">${animal.icon}</span>
                <span class="pad-name">${animal.name}</span>
            `;
        }
        
        // Add click event
        button.addEventListener('click', () => {
            const soundFile = button.getAttribute('data-sound');
            if (!soundFile) return;
            
            // Initialize audio system on first interaction
            if (!globalAudioContext) {
                initAudioSystem();
            }
            
            // If this button is already playing, stop it
            if (button.classList.contains('playing')) {
                stopCurrentAudio();
                button.classList.remove('playing');
                return;
            }
            
            // Stop any currently playing audio
            stopCurrentAudio();
            
            // Remove playing class from all buttons
            const allButtons = soundPadGrid.querySelectorAll('.sound-pad-btn');
            allButtons.forEach(btn => btn.classList.remove('playing'));
            
            // Play the selected sound
            playSound(soundFile, button);
        });
        
        soundPadGrid.appendChild(button);
    });
}

function playSound(soundFile, button) {
    // Create new audio element
    currentAudioElement = new Audio(soundFile);
    currentAudioElement.loop = false;
    
    // Mark button as playing
    button.classList.add('playing');
    
    // Handle audio end
    currentAudioElement.onended = () => {
        button.classList.remove('playing');
        currentAudioElement = null;
    };
    
    // Handle audio error
    currentAudioElement.onerror = () => {
        console.error(`Failed to load audio: ${soundFile}`);
        button.classList.remove('playing');
        currentAudioElement = null;
        alert(`Sound file not found: ${soundFile}\n\nMake sure to add your MP3 files to the 'sounds/' folder.`);
    };
    
    // Disconnect previous source
    if (currentAudioSource) {
        try {
            currentAudioSource.disconnect();
        } catch (e) {}
    }
    
    // Create new source and connect to analyzer
    currentAudioSource = globalAudioContext.createMediaElementSource(currentAudioElement);
    currentAudioSource.connect(globalAnalyser);
    globalAnalyser.connect(globalAudioContext.destination);
    
    // Play the audio
    currentAudioElement.play().catch(err => {
        console.error('Error playing audio:', err);
        button.classList.remove('playing');
    });
}

function stopCurrentAudio() {
    if (currentAudioElement) {
        currentAudioElement.pause();
        currentAudioElement.currentTime = 0;
        currentAudioElement = null;
    }
}

// Main app state
let data = [];
const LOCATIONS = ['PG3', 'Kaldis', 'Blue Donkey'];

async function init() {
    // Try to fetch data from Google Sheets
    console.log('Fetching data from Google Sheets...');
    const sheetsData = await fetchGoogleSheetsData();

    if (sheetsData.length > 0) {
        console.log('Successfully fetched data from Google Sheets');
        data = parseGoogleSheetsData(sheetsData);
    } else {
        console.log('Using fallback data');
        data = parseFallbackData();
    }

    // Initialize animal sounds
    initAnimalSounds();

    // Initialize particles for each location
    LOCATIONS.forEach(locationName => {
        const card = document.querySelector(`.location-card[data-location="${locationName}"]`);
        if (card) {
            const svg = card.querySelector('.decibel-circle');
            initParticlesForLocation(locationName, svg);
        }
    });

    updateAllDisplays();

    // Update every second for time and decibel values
    setInterval(updateAllDisplays, 1000);

    // Fetch Waitz data immediately and then every 5 minutes
    updateWaitzData();
    setInterval(updateWaitzData, CONFIG.WAITZ_UPDATE_INTERVAL);

    // Animate particles at 60fps for all locations
    function animate() {
        const currentMinutes = getCurrentTimeInMinutes();

        LOCATIONS.forEach(locationName => {
            const dataPoint = getDecibelForTime(data, locationName, currentMinutes);
            if (dataPoint) {
                updateParticlesForLocation(locationName, dataPoint.decibel);
            }
        });

        requestAnimationFrame(animate);
    }
    animate();
}

function updateAllDisplays() {
    const currentMinutes = getCurrentTimeInMinutes();

    // Update time display
    const timeDisplay = document.getElementById('timeDisplay');
    if (timeDisplay) {
        timeDisplay.textContent = formatCurrentTime();
    }

    // Calculate average decibel across all locations
    let totalDecibel = 0;
    let locationCount = 0;

    // Update each location
    LOCATIONS.forEach(locationName => {
        const dataPoint = getDecibelForTime(data, locationName, currentMinutes);
        if (dataPoint) {
            updateLocationCard(locationName, dataPoint.decibel);
            totalDecibel += dataPoint.decibel;
            locationCount++;
        }
    });

    // Update thermometer with average decibel
    if (locationCount > 0) {
        const avgDecibel = totalDecibel / locationCount;
        updateThermometer(avgDecibel);
    }
}

// Update thermometer fill based on decibel level
function updateThermometer(decibel) {
    const thermometerFill = document.getElementById('thermometerFill');
    if (!thermometerFill) return;

    // Map decibel (0-140) to percentage (0-100)
    // Invert so 140dB is at top (0%) and 0dB is at bottom (100%)
    const percentage = Math.max(0, Math.min(100, ((140 - decibel) / 140) * 100));
    
    thermometerFill.style.height = `${100 - percentage}%`;
}

// Initialize on load
init();

// Dot Navigation Functionality
document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.querySelector('.main-content');
    const navLegendItems = document.querySelectorAll('.nav-legend-item');
    const locationCards = document.querySelectorAll('.location-card');
    const locationNames = ['PG3', 'Kaldis', 'Blue Donkey'];

    // Handle nav-legend item click
    navLegendItems.forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.index);
            const location = item.dataset.location;
            
            // Scroll to location card
            locationCards[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // Update bubble chart legend to match
            updateBubbleChartLocation(location);
        });
    });

    // Update active item on scroll
    mainContent.addEventListener('scroll', () => {
        const scrollPosition = mainContent.scrollTop;
        const viewportHeight = mainContent.clientHeight;
        
        locationCards.forEach((card, index) => {
            const cardTop = card.offsetTop;
            const cardBottom = cardTop + card.offsetHeight;
            const scrollCenter = scrollPosition + viewportHeight / 2;
            
            if (scrollCenter >= cardTop && scrollCenter < cardBottom) {
                navLegendItems.forEach(item => item.classList.remove('active'));
                navLegendItems[index].classList.add('active');
                
                // Update bubble chart legend to match
                updateBubbleChartLocation(locationNames[index]);
            }
        });
    });
    
    // Function to update bubble chart legend
    function updateBubbleChartLocation(locationName) {
        // Update the selected location in the bubble chart
        if (window.toggleLocation) {
            window.toggleLocation(locationName);
        }
    }
});