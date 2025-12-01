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
let data = [];
let isPlaying = false;
let currentTimeIndex = 0;
let animationInterval = null;
let animationSpeed = 5;
let selectedLocations = new Set(['PG3', 'Kaldis', 'Blue Donkey']);

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

// Draw legend
function drawLegend() {
    const legendContainer = document.getElementById('legendContainer');
    const locations = ['PG3', 'Kaldis', 'Blue Donkey'];
    
    const colorMap = {
        'PG3': 'linear-gradient(135deg, #10b981, #059669)',
        'Kaldis': 'linear-gradient(135deg, #3b82f6, #1e40af)',
        'Blue Donkey': 'linear-gradient(135deg, #f59e0b, #d97706)'
    };
    
    locations.forEach((location) => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.setAttribute('data-location', location);
        legendItem.style.opacity = selectedLocations.has(location) ? '1' : '0.3';
        
        const circle = document.createElement('div');
        circle.className = 'legend-circle';
        circle.style.background = colorMap[location];
        
        const text = document.createElement('div');
        text.className = 'legend-text';
        text.textContent = location;
        
        legendItem.appendChild(circle);
        legendItem.appendChild(text);
        legendContainer.appendChild(legendItem);
        
        legendItem.addEventListener('click', () => toggleLocation(location));
    });
}

function toggleLocation(location) {
    if (selectedLocations.has(location)) {
        selectedLocations.delete(location);
    } else {
        selectedLocations.add(location);
    }
    updateLegendStyle();
    updateBubbles();
}

function updateLegendStyle() {
    document.querySelectorAll('.legend-item').forEach(item => {
        const location = item.getAttribute('data-location');
        const isSelected = selectedLocations.has(location);
        item.style.opacity = isSelected ? '1' : '0.3';
    });
}

// Update bubbles based on current time
function updateBubbles() {
    const bubblesGroup = d3.select('#bubblesGroup');
    
    // Get all data up to current time
    const visibleData = data.slice(0, currentTimeIndex + 1)
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
}

function updateProgressIndicator() {
    const progressGroup = d3.select('#centerInfo');
    progressGroup.selectAll('*').remove();
    
    if (currentTimeIndex >= 0 && currentTimeIndex < data.length) {
        const currentData = data[currentTimeIndex];
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
        
        // Draw indicator circle
        progressGroup.append('circle')
            .attr('class', 'progress-indicator')
            .attr('cx', coords.x)
            .attr('cy', coords.y)
            .attr('r', 4);
        
        // Display current time in center
        progressGroup.append('text')
            .attr('class', 'center-label')
            .attr('x', CENTER_X)
            .attr('y', CENTER_Y - 15)
            .text('Current Time');
        
        progressGroup.append('text')
            .attr('class', 'center-value')
            .attr('x', CENTER_X)
            .attr('y', CENTER_Y + 15)
            .text(currentData.time);
        
        // Update UI
        document.getElementById('currentTimeDisplay').textContent = currentData.time;
    }
}

function updateStats() {
    const visibleData = data.slice(0, currentTimeIndex + 1)
        .filter(d => selectedLocations.has(d.location));
    
    const actualData = visibleData.filter(d => !d.isInterpolated);
    const predictedData = visibleData.filter(d => d.isInterpolated);
    
    const totalReadings = visibleData.length;
    const avgDecibel = totalReadings > 0 
        ? (visibleData.reduce((sum, d) => sum + d.decibel, 0) / totalReadings).toFixed(1)
        : '--';
    const maxDecibel = totalReadings > 0
        ? Math.max(...visibleData.map(d => d.decibel)).toFixed(1)
        : '--';
    
    document.getElementById('totalReadings').textContent = `${totalReadings} (${actualData.length} actual, ${predictedData.length} predicted)`;
    document.getElementById('avgDecibel').textContent = avgDecibel + ' dB';
    document.getElementById('maxDecibel').textContent = maxDecibel + ' dB';
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

// Animation controls
function play() {
    if (isPlaying) return;
    
    isPlaying = true;
    document.getElementById('playBtn').textContent = '⏸ Pause';
    
    animationInterval = setInterval(() => {
        currentTimeIndex++;
        if (currentTimeIndex >= data.length) {
            currentTimeIndex = data.length - 1;
            pause();
        } else {
            updateBubbles();
        }
    }, 1000 / animationSpeed);
}

function pause() {
    isPlaying = false;
    document.getElementById('playBtn').textContent = '▶ Play';
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }
}

function reset() {
    pause();
    currentTimeIndex = 0;
    updateBubbles();
}

// Initialize
async function init() {
    console.log('Fetching data from Google Sheets...');
    const sheetsData = await fetchGoogleSheetsData();

    let rawData = [];
    if (sheetsData.length > 0) {
        console.log('Successfully fetched data from Google Sheets');
        rawData = parseGoogleSheetsData(sheetsData);
    } else {
        console.log('Using fallback data');
        rawData = parseFallbackData();
    }
    
    // Generate interpolated data (every 30 minutes)
    console.log('Original data points:', rawData.length);
    data = generateInterpolatedData(rawData);
    console.log('After interpolation (every 30 min):', data.length);
    
    // Draw static elements
    drawTimeline();
    drawLegend();
    updateLegendStyle();
    
    // Initial display
    updateBubbles();
    
    // Setup controls
    document.getElementById('playBtn').addEventListener('click', () => {
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    });
    
    document.getElementById('resetBtn').addEventListener('click', reset);
    
    document.getElementById('speedSlider').addEventListener('input', (e) => {
        animationSpeed = parseInt(e.target.value);
        document.getElementById('speedValue').textContent = animationSpeed + 'x';
        
        if (isPlaying) {
            pause();
            play();
        }
    });
}

// Start the app
init();
