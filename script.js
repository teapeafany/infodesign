// Initialize selected time (12pm = 12)
let selectedTime = 12;
let selectedLocation = 'Kaldis';

// Coffee animation variables
let coffeeAnimationFrame = 0;
let coffeeAnimationInterval = null;
const coffeeFrames = 9; // coffee0.png through coffee8.png
const coffeeAnimationSpeed = 250; // milliseconds per frame

// Chatter animation variables
let chatterAnimationFrame = 0;
let chatterAnimationInterval = null;
const chatterFrames = 7; // chatter0.png through chatter6.png
const chatterAnimationSpeed = 300; // milliseconds per frame

// Mapping of location/time combinations to specific coffee frames
const locationTimeCoffeeFrameMap = {
    'Kaldis': {
        15: 6,  // 3pm - coffee6
        13: 8,  // 1pm - coffee8
        12: 5   // 12pm - coffee5
    },
    'Blue Donkey': {
        16: 3,  // 4pm - coffee3
        15: 2,  // 3pm - coffee2
        13: 6   // 1pm - coffee6
    }
};

// Mapping of location/time combinations to specific chatter frames
const locationTimeChatterFrameMap = {
    'Kaldis': {
        17: 5   // 5pm - chatter5
    },
    'Blue Donkey': {
        10: 3,  // 10am - chatter3
        12: 4,  // 12pm - chatter4
        14: 6   // 2pm - chatter6
    },
    'PG3': {
        10: 4,  // 10am - chatter4
        11: 3,  // 11am - chatter3
        12: 0,  // 12pm - chatter0
        13: 1,  // 1pm - chatter1
        14: 2,  // 2pm - chatter2
        15: 2,  // 3pm - chatter2
        16: 3,  // 4pm - chatter3
        17: 4,  // 5pm - chatter4
        18: 4   // 6pm - chatter4
    }
};

// Mapping of location/time combinations to decibel values
const locationTimeDecibelMap = {
    'Kaldis': {
        15: 68.4,  // 3pm - 68.4 DB
        13: 84.7,  // 1pm - 84.7 DB
        12: 63.6,  // 12pm - 63.6 DB
        17: 70.4   // 5pm - 70.4 DB
    },
    'Blue Donkey': {
        16: 58,    // 4pm - 58 DB
        15: 55,    // 3pm - 55 DB
        13: 68.6,  // 1pm - 68.6 DB
        10: 60.1,  // 10am - 60.1 DB
        12: 62.4,  // 12pm - 62.4 DB
        14: 75.8   // 2pm - 75.8 DB
    },
    'PG3': {
        10: 60.1,  // 10am - 60.1 DB
        11: 59.1,  // 11am - 59.1 DB
        12: 48,    // 12pm - 48 DB
        13: 51,    // 1pm - 51 DB
        14: 57.7,  // 2pm - 57.7 DB
        15: 57.6,  // 3pm - 57.6 DB
        16: 59.9,  // 4pm - 59.9 DB
        17: 63.2,  // 5pm - 63.2 DB
        18: 62.3   // 6pm - 62.3 DB
    }
};

// Coffee animation loop
function startCoffeeAnimation() {
    // Clear any existing interval
    if (coffeeAnimationInterval) {
        clearInterval(coffeeAnimationInterval);
    }
    
    // Reset to frame 0
    coffeeAnimationFrame = 0;
    
    // Clear all frames
    for (let i = 0; i < coffeeFrames; i++) {
        const frame = document.getElementById(`coffeeFrame${i}`);
        if (frame) {
            frame.classList.remove('active');
            // Force immediate opacity update
            frame.style.opacity = '0';
        }
    }
    
    // Start animation loop - show first frame immediately
    const showNextFrame = () => {
        // If we've reached the last frame, reset to 0
        if (coffeeAnimationFrame >= coffeeFrames - 1) {
            // Remove active class from all frames
            for (let i = 0; i < coffeeFrames; i++) {
                const frame = document.getElementById(`coffeeFrame${i}`);
                if (frame) {
                    frame.classList.remove('active');
                    frame.style.opacity = '0';
                }
            }
            // Reset to frame 0
            coffeeAnimationFrame = 0;
        } else {
            // Move to next frame
            coffeeAnimationFrame++;
        }
        
        // Show current frame
            const currentFrame = document.getElementById(`coffeeFrame${coffeeAnimationFrame}`);
            if (currentFrame) {
                currentFrame.classList.add('active');
                // Force immediate opacity update
                currentFrame.style.opacity = '1';
        }
    };
    
    // Show first frame (frame 0) immediately
    const frame0 = document.getElementById('coffeeFrame0');
    if (frame0) {
        frame0.classList.add('active');
        frame0.style.opacity = '1';
    }
    
    // Then continue with interval
    coffeeAnimationInterval = setInterval(showNextFrame, coffeeAnimationSpeed);
}

function stopCoffeeAnimation() {
    if (coffeeAnimationInterval) {
        clearInterval(coffeeAnimationInterval);
        coffeeAnimationInterval = null;
    }
    // Hide all coffee frames
    for (let i = 0; i < coffeeFrames; i++) {
        const frame = document.getElementById(`coffeeFrame${i}`);
        if (frame) {
            frame.classList.remove('active');
            frame.style.opacity = '0';
        }
    }
    coffeeAnimationFrame = 0;
}

// Show a specific coffee frame based on location and time
// Animates from coffee0 up to the target frame, then resets to coffee0 in a continuous loop
function showCoffeeFrame(frameNumber) {
    // Stop any running animation
    if (coffeeAnimationInterval) {
        clearInterval(coffeeAnimationInterval);
        coffeeAnimationInterval = null;
    }
    
    // Store target frame for looping
    let targetFrame = frameNumber;
    const frame0 = document.getElementById('coffeeFrame0');
    
    // Initialize: clear all frames and show frame 0
    const resetToStart = () => {
        for (let i = 0; i < coffeeFrames; i++) {
            const frame = document.getElementById(`coffeeFrame${i}`);
            if (frame) {
                frame.classList.remove('active');
                frame.style.opacity = '0';
            }
        }
        coffeeAnimationFrame = 0;
        if (frame0) {
            frame0.classList.add('active');
            frame0.style.opacity = '1';
        }
    };
    
    resetToStart();
    
    // Animate from 0 to target frame, then loop
    const animateToFrame = () => {
        coffeeAnimationFrame++;
        
        if (coffeeAnimationFrame <= targetFrame) {
            // Show current frame
            const currentFrame = document.getElementById(`coffeeFrame${coffeeAnimationFrame}`);
            if (currentFrame) {
                currentFrame.classList.add('active');
                currentFrame.style.opacity = '1';
            }
            
            // Continue animating if not at target yet
            if (coffeeAnimationFrame < targetFrame) {
                coffeeAnimationInterval = setTimeout(animateToFrame, coffeeAnimationSpeed);
            } else {
                // Reached target frame, now reset to 0 after a brief pause, then loop
                coffeeAnimationInterval = setTimeout(() => {
                    resetToStart();
                    // Start the loop again
                    coffeeAnimationInterval = setTimeout(animateToFrame, coffeeAnimationSpeed);
                }, coffeeAnimationSpeed);
            }
        }
    };
    
    // Start animation after a brief delay
    coffeeAnimationInterval = setTimeout(animateToFrame, coffeeAnimationSpeed);
}

function stopChatterAnimation() {
    if (chatterAnimationInterval) {
        clearInterval(chatterAnimationInterval);
        chatterAnimationInterval = null;
    }
    // Hide all chatter frames
    for (let i = 0; i < chatterFrames; i++) {
        const frame = document.getElementById(`chatterFrame${i}`);
        if (frame) {
            frame.classList.remove('active');
            frame.style.opacity = '0';
        }
    }
    chatterAnimationFrame = 0;
}

// Show a specific chatter frame based on location and time
// Animates from chatter0 up to the target frame, then resets to chatter0 in a continuous loop
function showChatterFrame(frameNumber) {
    // Stop any running animation
    if (chatterAnimationInterval) {
        clearInterval(chatterAnimationInterval);
        chatterAnimationInterval = null;
    }
    
    // Store target frame for looping
    let targetFrame = frameNumber;
    const frame0 = document.getElementById('chatterFrame0');
    
    // Initialize: clear all frames and show frame 0
    const resetToStart = () => {
        for (let i = 0; i < chatterFrames; i++) {
            const frame = document.getElementById(`chatterFrame${i}`);
            if (frame) {
                frame.classList.remove('active');
                frame.style.opacity = '0';
            }
        }
        chatterAnimationFrame = 0;
        if (frame0) {
            frame0.classList.add('active');
            frame0.style.opacity = '1';
        }
    };
    
    resetToStart();
    
    // Animate from 0 to target frame, then loop
    const animateToFrame = () => {
        chatterAnimationFrame++;
        
        if (chatterAnimationFrame <= targetFrame) {
            // Show current frame
            const currentFrame = document.getElementById(`chatterFrame${chatterAnimationFrame}`);
            if (currentFrame) {
                currentFrame.classList.add('active');
                currentFrame.style.opacity = '1';
            }
            
            // Continue animating if not at target yet
            if (chatterAnimationFrame < targetFrame) {
                chatterAnimationInterval = setTimeout(animateToFrame, chatterAnimationSpeed);
            } else {
                // Reached target frame, now reset to 0 after a brief pause, then loop
                chatterAnimationInterval = setTimeout(() => {
                    resetToStart();
                    // Start the loop again
                    chatterAnimationInterval = setTimeout(animateToFrame, chatterAnimationSpeed);
                }, chatterAnimationSpeed);
            }
        }
    };
    
    // Start animation after a brief delay
    chatterAnimationInterval = setTimeout(animateToFrame, chatterAnimationSpeed);
}

// Update decibel number display
function updateDecibelNumber() {
    const decibelElement = document.getElementById('decibelNumber');
    if (!decibelElement) return;
    
    // Check if there's a decibel value for this location/time combination
    const locationDecibelMap = locationTimeDecibelMap[selectedLocation];
    const decibelValue = locationDecibelMap && locationDecibelMap[selectedTime];
    
    // Update only the number part, keeping the DB unit
    if (decibelValue !== undefined) {
        decibelElement.firstChild.textContent = decibelValue;
    } else {
        // No decibel value for this combination: show default
        decibelElement.firstChild.textContent = '0';
    }
}

// Update coffee animation and people opacity based on time and location
function updateTimeBasedElements() {
    const coffeeMachine = document.querySelector('.coffee-machine');
    
    // Check if there's a coffee frame for this location/time combination
    const coffeeLocationMap = locationTimeCoffeeFrameMap[selectedLocation];
    const coffeeTargetFrame = coffeeLocationMap && coffeeLocationMap[selectedTime];
    
    // Check if there's a chatter frame for this location/time combination
    const chatterLocationMap = locationTimeChatterFrameMap[selectedLocation];
    const chatterTargetFrame = chatterLocationMap && chatterLocationMap[selectedTime];
    
    // Update decibel number
    updateDecibelNumber();
    
    // Always stop both animations first to ensure only one shows
    stopCoffeeAnimation();
    stopChatterAnimation();
    
    if (coffeeTargetFrame !== undefined) {
        // Show coffee animation only
        showCoffeeFrame(coffeeTargetFrame);
        if (coffeeMachine) {
            coffeeMachine.classList.add('active');
            coffeeMachine.style.opacity = '1';
        }
    } else if (chatterTargetFrame !== undefined) {
        // Show chatter animation only
        showChatterFrame(chatterTargetFrame);
        if (coffeeMachine) {
            coffeeMachine.classList.remove('active');
            coffeeMachine.style.opacity = '0.22';
        }
    } else {
        // No specific frame for this combination: everything is already hidden
        if (coffeeMachine) {
            coffeeMachine.classList.remove('active');
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
        
        // Update layout based on location
        updateLocationLayout();
        
        // Update coffee animation and people opacity
        updateTimeBasedElements();
    });
});

// Update layout based on selected location
function updateLocationLayout() {
    const kaldisContainer = document.querySelector('.kaldis-container');
    const blueDonkey = document.querySelector('.blue-donkey-full');
    
    if (selectedLocation === 'Blue Donkey') {
        // Move bluedonkey down 33%
        const moveAmount = '33%';
        if (blueDonkey) {
            blueDonkey.style.top = moveAmount;
            blueDonkey.style.opacity = '1';
        }
        // Move kaldis down by the same amount (33%) to join with bluedonkey
        if (kaldisContainer) {
            kaldisContainer.style.top = '98%'; // 50% (center) + 33% = 83%
            kaldisContainer.style.left = '42%';
            
        }
    } else {
        // Reset positions for other locations
        if (kaldisContainer) {
            kaldisContainer.style.top = '50%';
        }
        if (blueDonkey) {
            blueDonkey.style.top = '0';
            blueDonkey.style.opacity = '0';
        }
    }
}

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
        
        // Update coffee animation and people opacity
        updateTimeBasedElements();
        
        // Update info panel
        showInfo(`Selected time: ${this.dataset.timeLabel}`);
    });
});

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
            this.style.opacity = '0.8';
    });

    element.addEventListener('mouseleave', function() {
            this.style.opacity = '1';
    });
});


// Initialize coffee animation and time-based elements on load
updateTimeBasedElements();

// Initialize location layout on load
updateLocationLayout();


