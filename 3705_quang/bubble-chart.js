// Bubble Chart Module - wrapped to avoid global conflicts
(function() {
    'use strict';
    
// Configuration
const SVG_WIDTH = 500;
const SVG_HEIGHT = 500;
const CENTER_X = SVG_WIDTH / 2;
const CENTER_Y = SVG_HEIGHT / 2;
const TIMELINE_RADIUS = 190;
const BUBBLE_MIN_RADIUS = 2.5;
const BUBBLE_MAX_RADIUS = 20;

// Location colors
const LOCATION_COLORS = {
    'PG3': 'url(#pg3Gradient)',
    'Kaldis': 'url(#kaldisGradient)',
    'Blue Donkey': 'url(#blueDonkeyGradient)'
};

// State
let bubbleChartData = [];
let currentTimeIndex = 0;
let selectedLocations = new Set(['PG3']); // Start with only PG3 selected
let autoSyncEnabled = true;
let syncInterval = null;

// Fetch and parse data (same as main script)
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

function parseGoogleSheetsData(rows) {
    const data = [];
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

const bubbleChartFallbackData = `10:51:00 AM	Blue Donkey	60.1
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

function parseFallbackData() {
    const lines = bubbleChartFallbackData.trim().split('\n');
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

// Convert minutes back to time string
function minutesToTimeString(minutes) {
    let hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    
    if (hours === 0) hours = 12;
    else if (hours > 12) hours -= 12;
    
    const secs = '00';
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs} ${period}`;
}

// Interpolate data points for a specific location
function interpolateLocationData(locationData, targetMinutes) {
    if (locationData.length === 0) return null;
    if (locationData.length === 1) return locationData[0].decibel;
    
    // Find surrounding data points
    let before = null, after = null;
    
    for (let i = 0; i < locationData.length; i++) {
        if (locationData[i].timeInMinutes <= targetMinutes) {
            before = locationData[i];
        }
        if (locationData[i].timeInMinutes >= targetMinutes && !after) {
            after = locationData[i];
        }
    }
    
    // If exact match
    if (before && before.timeInMinutes === targetMinutes) return before.decibel;
    if (after && after.timeInMinutes === targetMinutes) return after.decibel;
    
    // Interpolate between two points
    if (before && after) {
        const ratio = (targetMinutes - before.timeInMinutes) / (after.timeInMinutes - before.timeInMinutes);
        return before.decibel + (after.decibel - before.decibel) * ratio;
    }
    
    // Use closest point
    if (before) return before.decibel;
    if (after) return after.decibel;
    
    return locationData[0].decibel;
}

// Generate interpolated dataset every 30 minutes
function generateInterpolatedData(rawData) {
    const locations = ['PG3', 'Kaldis', 'Blue Donkey'];
    const interpolatedData = [];
    
    // Group data by location
    const dataByLocation = {};
    locations.forEach(loc => {
        dataByLocation[loc] = rawData
            .filter(d => d.location === loc)
            .sort((a, b) => a.timeInMinutes - b.timeInMinutes);
    });
    
    // Generate interpolated points every 30 minutes for full 24-hour period
    const startTime = 0;  // Midnight (0:00 AM)
    const endTime = 24 * 60 - 30;  // 11:30 PM
    
    // Generate interpolated points every 30 minutes
    for (let time = startTime; time <= endTime; time += 30) {
        locations.forEach(location => {
            const locationData = dataByLocation[location];
            if (locationData.length > 0) {
                const interpolatedDecibel = interpolateLocationData(locationData, time);
                
                if (interpolatedDecibel !== null) {
                    // Check if this is an actual data point or interpolated
                    const isActual = locationData.some(d => d.timeInMinutes === time);
                    
                    interpolatedData.push({
                        time: minutesToTimeString(time),
                        location: location,
                        decibel: interpolatedDecibel,
                        timeInMinutes: time,
                        isInterpolated: !isActual
                    });
                }
            }
        });
    }
    
    return interpolatedData.sort((a, b) => a.timeInMinutes - b.timeInMinutes);
}

// Convert minutes to angle (0 minutes = top of circle, clockwise)
function minutesToAngle(minutes) {
    return (minutes / (24 * 60)) * 360 - 90; // -90 to start at top
}

// Convert angle to x,y coordinates
function angleToCoords(angle, radius) {
    const radians = (angle * Math.PI) / 180;
    return {
        x: CENTER_X + radius * Math.cos(radians),
        y: CENTER_Y + radius * Math.sin(radians)
    };
}

// Scale decibel to bubble radius
function decibelToRadius(decibel) {
    const minDb = 40;
    const maxDb = 90;
    const normalized = (decibel - minDb) / (maxDb - minDb);
    return BUBBLE_MIN_RADIUS + normalized * (BUBBLE_MAX_RADIUS - BUBBLE_MIN_RADIUS);
}

// Draw circular timeline
function drawTimeline() {
    const svg = d3.select('#timelineCircle');
    
    // Draw main circle
    svg.append('circle')
        .attr('class', 'timeline-circle')
        .attr('cx', CENTER_X)
        .attr('cy', CENTER_Y)
        .attr('r', TIMELINE_RADIUS);
    
    // Draw time markers (every hour)
    const timeLabelsGroup = d3.select('#timeLabels');
    
    for (let hour = 0; hour < 24; hour++) {
        const minutes = hour * 60;
        const angle = minutesToAngle(minutes);
        const innerCoords = angleToCoords(angle, TIMELINE_RADIUS - 10);
        const outerCoords = angleToCoords(angle, TIMELINE_RADIUS + 10);
        
        // Draw tick
        svg.append('line')
            .attr('class', 'time-tick')
            .attr('x1', innerCoords.x)
            .attr('y1', innerCoords.y)
            .attr('x2', outerCoords.x)
            .attr('y2', outerCoords.y);
        
        // Draw label
        const labelCoords = angleToCoords(angle, TIMELINE_RADIUS + 25);
        const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
        const period = hour < 12 ? 'AM' : 'PM';
        
        // Show all hour labels
        timeLabelsGroup.append('text')
            .attr('class', 'time-label')
            .attr('x', labelCoords.x)
            .attr('y', labelCoords.y)
            .attr('dy', '0.35em')
            .text(`${displayHour}${period}`);
    }
}

// Draw legend - now uses the combined nav-legend
function drawLegend() {
    // Don't create a separate legend - it's already combined with the dot navigation
    // Just set up click handlers for the nav-legend items to update the chart
    const navLegendItems = document.querySelectorAll('.nav-legend-item');
    
    navLegendItems.forEach(item => {
        item.addEventListener('click', () => {
            const location = item.getAttribute('data-location');
            toggleLocation(location);
        });
    });
}

function toggleLocation(location) {
    // Only allow one location to be selected at a time
    selectedLocations.clear();
    selectedLocations.add(location);
    updateLegendStyle();
    updateBubbles();
}

// Make toggleLocation available globally for script.js
window.toggleLocation = toggleLocation;

function updateLegendStyle() {
    // Update the combined nav-legend items instead of separate legend
    const navLegendItems = document.querySelectorAll('.nav-legend-item');
    navLegendItems.forEach(item => {
        const location = item.getAttribute('data-location');
        const isSelected = selectedLocations.has(location);
        
        if (isSelected) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Update bubbles based on current time
function updateBubbles() {
    const bubblesGroup = d3.select('#bubblesGroup');
    
    // Get all data up to current time
    const visibleData = bubbleChartData.slice(0, currentTimeIndex + 1)
        .filter(d => selectedLocations.has(d.location));
    
    // Bind data
    const bubbles = bubblesGroup.selectAll('.bubble-group')
        .data(visibleData, d => `${d.time}-${d.location}`);
    
    // Enter new bubbles
    const bubbleEnter = bubbles.enter()
        .append('g')
        .attr('class', 'bubble-group');
    
    bubbleEnter.append('circle')
        .attr('class', 'bubble')
        .attr('cx', d => {
            const angle = minutesToAngle(d.timeInMinutes);
            return angleToCoords(angle, TIMELINE_RADIUS).x;
        })
        .attr('cy', d => {
            const angle = minutesToAngle(d.timeInMinutes);
            return angleToCoords(angle, TIMELINE_RADIUS).y;
        })
        .attr('r', 0)
        .attr('fill', d => LOCATION_COLORS[d.location])
        .style('opacity', d => d.isInterpolated ? 0.4 : 0.7)
        .style('stroke-dasharray', d => d.isInterpolated ? '2,2' : 'none')
        .on('mouseover', showTooltip)
        .on('mouseout', hideTooltip)
        .transition()
        .duration(500)
        .attr('r', d => decibelToRadius(d.decibel));
    
    // Update existing bubbles
    bubbles.select('circle')
        .transition()
        .duration(300)
        .attr('r', d => decibelToRadius(d.decibel))
        .style('opacity', d => d.isInterpolated ? 0.4 : 0.7);
    
    // Remove old bubbles
    bubbles.exit()
        .select('circle')
        .transition()
        .duration(300)
        .attr('r', 0)
        .on('end', function() {
            d3.select(this.parentNode).remove();
        });
    
    // Update progress indicator
    updateProgressIndicator();
    updateStats();
    updateLocationCards();
}

// Update location cards with current chart data
function updateLocationCards() {
    if (currentTimeIndex >= 0 && currentTimeIndex < bubbleChartData.length) {
        const currentTime = bubbleChartData[currentTimeIndex].timeInMinutes;
        
        // Get the data for each location at the current time
        const locationData = {};
        
        // Find the most recent data point for each location up to current time
        for (let i = currentTimeIndex; i >= 0; i--) {
            const d = bubbleChartData[i];
            if (!locationData[d.location]) {
                locationData[d.location] = d.decibel;
            }
            // Stop if we have all three locations
            if (Object.keys(locationData).length === 3) break;
        }
        
        // Update each location card
        ['PG3', 'Kaldis', 'Blue Donkey'].forEach(location => {
            if (locationData[location] !== undefined) {
                const card = document.querySelector(`.location-card[data-location="${location}"]`);
                if (card) {
                    const valueEl = card.querySelector('.decibel-value');
                    if (valueEl) {
                        valueEl.textContent = locationData[location].toFixed(1);
                    }
                }
            }
        });
    }
}

function updateProgressIndicator() {
    const progressGroup = d3.select('#centerInfo');
    progressGroup.selectAll('*').remove();
    
    if (currentTimeIndex >= 0 && currentTimeIndex < bubbleChartData.length) {
        const currentData = bubbleChartData[currentTimeIndex];
        const angle = minutesToAngle(currentData.timeInMinutes);
        const coords = angleToCoords(angle, TIMELINE_RADIUS);
        
        // Draw line from center to current time
        progressGroup.append('line')
            .attr('x1', CENTER_X)
            .attr('y1', CENTER_Y)
            .attr('x2', coords.x)
            .attr('y2', coords.y)
            .attr('stroke', '#3b82f6')
            .attr('stroke-width', 3)
            .style('opacity', 0.5);
        
        // Draw indicator circle (draggable)
        const indicator = progressGroup.append('circle')
            .attr('class', 'progress-indicator')
            .attr('cx', coords.x)
            .attr('cy', coords.y)
            .attr('r', 12)
            .style('cursor', 'grab');
        
        // Make indicator draggable
        setupDragging(indicator);
        
        // Get current location data
        const currentLocation = Array.from(selectedLocations)[0];
        const locationData = bubbleChartData.filter(d => d.location === currentLocation && d.timeInMinutes <= currentData.timeInMinutes);
        const latestData = locationData.length > 0 ? locationData[locationData.length - 1] : null;
        
        // Display only decibel info in center
        if (latestData) {
            progressGroup.append('text')
                .attr('class', 'center-decibel')
                .attr('x', CENTER_X)
                .attr('y', CENTER_Y + 10)
                .text(latestData.decibel.toFixed(1));
            
            progressGroup.append('text')
                .attr('class', 'center-db-unit')
                .attr('x', CENTER_X)
                .attr('y', CENTER_Y + 35)
                .text('dB');
        }
    }
}

// Setup dragging for the clock arm
function setupDragging(indicator) {
    const svg = d3.select('#bubbleChart');
    
    const drag = d3.drag()
        .on('start', function(event) {
            disableAutoSync(); // Disable auto-sync when user drags
            d3.select(this).style('cursor', 'grabbing');
        })
        .on('drag', function(event) {
            // Get mouse position relative to center
            const dx = event.x - CENTER_X;
            const dy = event.y - CENTER_Y;
            
            // Calculate angle
            let angle = Math.atan2(dy, dx) * 180 / Math.PI;
            angle = (angle + 90 + 360) % 360; // Adjust so 0Â° is at top
            
            // Convert angle to minutes
            const minutes = (angle / 360) * (24 * 60);
            
            // Find closest data point
            let closestIndex = 0;
            let minDiff = Math.abs(bubbleChartData[0].timeInMinutes - minutes);
            
            for (let i = 1; i < bubbleChartData.length; i++) {
                const diff = Math.abs(bubbleChartData[i].timeInMinutes - minutes);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestIndex = i;
                }
            }
            
            // Update current time index
            currentTimeIndex = closestIndex;
            updateBubbles();
        })
        .on('end', function(event) {
            d3.select(this).style('cursor', 'grab');
        });
    
    indicator.call(drag);
}

function updateStats() {
    // Stats display removed, keeping function for compatibility
}

function showTooltip(event, d) {
    // Create tooltip (simple version)
    const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('background', 'rgba(30, 58, 138, 0.9)')
        .style('color', 'white')
        .style('padding', '10px')
        .style('border-radius', '8px')
        .style('pointer-events', 'none')
        .style('z-index', '1000')
        .html(`
            <strong>${d.location}</strong><br/>
            Time: ${d.time}<br/>
            Decibel: ${d.decibel.toFixed(1)} dB<br/>
            ${d.isInterpolated ? '<em style="color:#fbbf24;">(Predicted)</em>' : '<em style="color:#10b981;">(Actual)</em>'}
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
}

function hideTooltip() {
    d3.selectAll('.tooltip').remove();
}

// Enable/disable auto-sync to real time
function enableAutoSync() {
    autoSyncEnabled = true;
    const btn = document.getElementById('syncTimeBtn');
    if (btn) {
        btn.classList.add('synced');
    }
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(() => {
        if (autoSyncEnabled) {
            setToCurrentTime();
            updateBubbles();
        }
    }, 1000);
}

function disableAutoSync() {
    autoSyncEnabled = false;
    const btn = document.getElementById('syncTimeBtn');
    if (btn) {
        btn.classList.remove('synced');
    }
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}

// Initialize
async function init() {
    const sheetsData = await fetchGoogleSheetsData();

    let rawData = [];
    if (sheetsData.length > 0) {
        rawData = parseGoogleSheetsData(sheetsData);
    } else {
        rawData = parseFallbackData();
    }
    
    // Generate interpolated data (every 30 minutes)
    bubbleChartData = generateInterpolatedData(rawData);
    
    // Set initial position to current real time
    setToCurrentTime();
    
    // Draw static elements
    drawTimeline();
    drawLegend();
    updateLegendStyle();
    
    // Initial display
    updateBubbles();
    
    // Setup sync button
    const syncBtn = document.getElementById('syncTimeBtn');
    if (syncBtn) {
        syncBtn.addEventListener('click', () => {
            enableAutoSync();
            setToCurrentTime();
            updateBubbles();
        });
    }
    
    // Auto-sync to match real time every second
    enableAutoSync();
}

// Set chart to current real time
function setToCurrentTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const currentMinutes = hours * 60 + minutes;
    
    // Find closest data point to current time
    let closestIndex = 0;
    let minDiff = Math.abs(bubbleChartData[0].timeInMinutes - currentMinutes);
    
    for (let i = 1; i < bubbleChartData.length; i++) {
        const diff = Math.abs(bubbleChartData[i].timeInMinutes - currentMinutes);
        if (diff < minDiff) {
            minDiff = diff;
            closestIndex = i;
        }
    }
    
    currentTimeIndex = closestIndex;
}

// Start the app
if (document.getElementById('bubbleChart')) {
    init();
}

})(); // End of bubble chart module