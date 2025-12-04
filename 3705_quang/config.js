// Configuration for Decibel Monitor Application

const CONFIG = {
    // Google Sheets Configuration
    GOOGLE_API_KEY: 'AIzaSyBl5Ra2ZdCVexEgcqDzuvclxOfocAKr7vc',
    SHEET_ID: '1ZSWLemG9L4hbOo7sg-ujzkbKklnSQGZef3tCGMNr4nA',
    SHEET_NAME: 'Form Responses 1',
    SHEET_RANGE: 'D:F',
    
    // Waitz.io Configuration
    WAITZ_SCHOOL: 'gatech',  // Change this to your school's Waitz identifier
    WAITZ_UPDATE_INTERVAL: 100  // Update every 1 second (in milliseconds)
};

// Make sure CONFIG is available globally
window.CONFIG = CONFIG;