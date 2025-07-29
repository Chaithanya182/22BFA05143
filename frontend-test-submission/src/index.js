import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import logger from './utils/logger';

/**
 * Application entry point
 * Initializes React app and logs startup
 */

// Log application startup
logger.info('Frontend application starting', 'index');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Log successful render
logger.info('Frontend application rendered successfully', 'index');