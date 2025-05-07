import JAPVOC from '../app.js';

// Initialize application when DOM is ready
// eslint-disable-next-line no-undef
/* global document */
document.addEventListener('DOMContentLoaded', () => {
    // eslint-disable-next-line no-console
    console.log('DOM is ready, initializing application');
    const japvoc = new JAPVOC();
    japvoc.initialize();
});
