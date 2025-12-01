// Initialize selected time (12pm = 12)
let selectedTime = 12;
let selectedLocation = 'Kaldis';

// Coffee animation variables
let coffeeAnimationFrame = 1;
let coffeeAnimationInterval = null;
const coffeeFrames = 6; // coffee1.png through coffee6.png
const coffeeAnimationSpeed = 200; // milliseconds per frame

// Coffee animation loop
function startCoffeeAnimation() {
    // Clear any existing interval
    if (coffeeAnimationInterval) {
        clearInterval(coffeeAnimationInterval);
    }
    
    // Reset to frame 1
    coffeeAnimationFrame = 1;
    
    // Clear all frames except coffee1
    for (let i = 2; i <= coffeeFrames; i++) {
        const frame = document.getElementById(`coffeeFrame${i}`);
        if (frame) {
            frame.classList.remove('active');
            // Force immediate opacity update
            frame.style.opacity = '0';
        }
    }
    
    // Start animation loop - show first frame immediately
    const showNextFrame = () => {
        coffeeAnimationFrame++;
        
        // If we've reached the last frame, reset everything
        if (coffeeAnimationFrame > coffeeFrames) {
            // Remove active class from all frames 2-6
            for (let i = 2; i <= coffeeFrames; i++) {
                const frame = document.getElementById(`coffeeFrame${i}`);
                if (frame) {
                    frame.classList.remove('active');
                    frame.style.opacity = '0';
                }
            }
            // Reset to frame 1
            coffeeAnimationFrame = 1;
        } else {
            // Add active class to current frame (layers accumulate)
            const currentFrame = document.getElementById(`coffeeFrame${coffeeAnimationFrame}`);
            if (currentFrame) {
                currentFrame.classList.add('active');
                // Force immediate opacity update
                currentFrame.style.opacity = '1';
            }
        }
    };
    
    // Show first frame (frame 2) immediately
    showNextFrame();
    
    // Then continue with interval
    coffeeAnimationInterval = setInterval(showNextFrame, coffeeAnimationSpeed);
}

function stopCoffeeAnimation() {
    if (coffeeAnimationInterval) {
        clearInterval(coffeeAnimationInterval);
        coffeeAnimationInterval = null;
    }
    // Reset to first frame - show only coffee1
    for (let i = 1; i <= coffeeFrames; i++) {
        const frame = document.getElementById(`coffeeFrame${i}`);
        if (frame) {
            frame.classList.remove('active');
        }
    }
    // Coffee1 is always visible (opacity: 1 by default)
    coffeeAnimationFrame = 1;
}

// Update coffee animation and people opacity based on time and location
function updateTimeBasedElements() {
    const peopleGroup = document.querySelector('.people-group');
    const coffeeMachine = document.querySelector('.coffee-machine');
    
    if (selectedTime === 12 && selectedLocation === 'Kaldis') {
        // At 12pm with Kaldis selected: show coffee animation, lower people opacity
        startCoffeeAnimation();
        if (peopleGroup) {
            peopleGroup.style.opacity = '0.3';
        }
        if (coffeeMachine) {
            coffeeMachine.style.opacity = '0.4';
        }
    } else {
        // Other times or locations: stop animation, restore people opacity
        stopCoffeeAnimation();
        if (peopleGroup) {
            peopleGroup.style.opacity = '1';
        }
        if (coffeeMachine) {
            coffeeMachine.style.opacity = '0.22';
        }
    }
}

// Location selector interaction
const locationItems = document.querySelectorAll('.location-item');
locationItems.forEach(item => {
    item.addEventListener('click', function() {
        // Remove active class from all items
        locationItems.forEach(i => i.classList.remove('active'));
        // Add active class to clicked item
        this.classList.add('active');
        
        // Update selected location
        selectedLocation = this.dataset.location;
        
        // Update coffee animation and people opacity
        updateTimeBasedElements();
    });
});

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
        
        // Update coffee animation and people opacity
        updateTimeBasedElements();
        
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
        
        // Update coffee animation and people opacity
        updateTimeBasedElements();
        
        // Show info
        showInfo(this.dataset.info);
    });
});

// Initialize temperature icons on load
updateTemperatureIcons();

// Initialize coffee animation and time-based elements on load
updateTimeBasedElements();

