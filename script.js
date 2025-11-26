// Initialize selected time (12pm = 12)
let selectedTime = 12;

// Timeline interaction
const timelineItems = document.querySelectorAll('.timeline-item');
timelineItems.forEach(item => {
    item.addEventListener('click', function() {
        // Remove active class from all items
        timelineItems.forEach(i => i.classList.remove('active'));
        // Add active class to clicked item
        this.classList.add('active');
        
        // Update selected time
        selectedTime = parseInt(this.dataset.time);
        
        // Update temperature icons visibility
        updateTemperatureIcons();
        
        // Update info panel
        showInfo(`Selected time: ${this.dataset.timeLabel}`);
    });
});

// Update temperature icons based on selected time
function updateTemperatureIcons() {
    const tempIcons = document.querySelectorAll('.temp-icon');
    tempIcons.forEach(icon => {
        const iconTime = parseInt(icon.dataset.time);
        if (iconTime === selectedTime) {
            icon.classList.add('active');
        } else {
            icon.classList.remove('active');
        }
    });
}

// Interactive elements
const interactiveElements = document.querySelectorAll('[data-info]');
const infoPanel = document.getElementById('infoPanel');
const infoText = document.getElementById('infoText');

function showInfo(message) {
    infoText.textContent = message;
    infoPanel.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        infoPanel.classList.remove('show');
    }, 3000);
}

interactiveElements.forEach(element => {
    element.addEventListener('click', function() {
        showInfo(this.dataset.info);
    });

    element.addEventListener('mouseenter', function() {
        if (!this.classList.contains('temp-icon')) {
            this.style.opacity = '0.8';
        }
    });

    element.addEventListener('mouseleave', function() {
        if (!this.classList.contains('temp-icon')) {
            this.style.opacity = '1';
        }
    });
});

// Temperature icon interactions
const tempIcons = document.querySelectorAll('.temp-icon');
tempIcons.forEach(icon => {
    icon.addEventListener('click', function() {
        const iconTime = parseInt(this.dataset.time);
        selectedTime = iconTime;
        
        // Update timeline
        timelineItems.forEach(item => {
            if (parseInt(item.dataset.time) === iconTime) {
                timelineItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            }
        });
        
        // Update all icons
        updateTemperatureIcons();
        
        // Show info
        showInfo(this.dataset.info);
    });
});

// Initialize temperature icons on load
updateTemperatureIcons();

