const axios = require('axios');

/**
 * Custom Logger Middleware for URL Shortener Microservice
 * Authenticates with AffordMed test server and sends structured logs
 */
class CustomLogger {
  constructor() {
    this.baseURL = 'http://20.244.56.144';
    this.token = null;
    this.clientID = null;
    this.clientSecret = null;
    this.isRegistered = false;
    this.isAuthenticated = false;
  }

  /**
   * Register with the test server to get clientID and clientSecret
   * This should be called once during application startup
   */
  async register() {
    try {
      const response = await axios.post(`${this.baseURL}/evaluation-service/register`, {
        // Registration payload - adjust as needed based on test server requirements
      });
      
      if (response.data && response.data.clientID && response.data.clientSecret) {
        this.clientID = response.data.clientID;
        this.clientSecret = response.data.clientSecret;
        this.isRegistered = true;
        console.log('Logger registered successfully');
        return true;
      }
      
      throw new Error('Registration failed - invalid response');
    } catch (error) {
      console.error('Logger registration failed:', error.message);
      return false;
    }
  }

  /**
   * Authenticate with the test server to get Bearer token
   * Must be called before sending any logs
   */
  async authenticate() {
    if (!this.isRegistered) {
      throw new Error('Must register before authenticating');
    }

    try {
      const response = await axios.post(`${this.baseURL}/evaluation-service/auth`, {
        clientID: this.clientID,
        clientSecret: this.clientSecret
      });
      
      if (response.data && response.data.token) {
        this.token = response.data.token;
        this.isAuthenticated = true;
        return true;
      }
      
      throw new Error('Authentication failed - no token received');
    } catch (error) {
      console.error('Logger authentication failed:', error.message);
      this.isAuthenticated = false;
      return false;
    }
  }

  /**
   * Send a log entry to the test server
   * @param {string} level - Log level (info, error, debug, warn)
   * @param {string} message - Log message
   * @param {string} packageName - Package/module name
   * @param {object} stack - Stack trace (optional)
   */
  async log(level, message, packageName, stack = null) {
    // If not registered, skip logging silently
    if (!this.isRegistered) {
      return false;
    }

    // Ensure we're authenticated before logging
    if (!this.isAuthenticated) {
      try {
        if (!await this.authenticate()) {
          return false;
        }
      } catch (error) {
        return false;
      }
    }

    const logData = {
      level: level,
      message: message,
      package: packageName,
      timestamp: new Date().toISOString(),
      stack: stack
    };

    try {
      const response = await axios.post(`${this.baseURL}/evaluation-service/logs`, logData, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.status === 200;
    } catch (error) {
      // If token expired, try to re-authenticate once
      if (error.response && error.response.status === 401) {
        this.isAuthenticated = false;
        if (await this.authenticate()) {
          return this.log(level, message, packageName, stack);
        }
      }
      
      console.error('Failed to send log:', error.message);
      return false;
    }
  }

  /**
   * Log info level message
   */
  async info(message, packageName, stack = null) {
    return this.log('info', message, packageName, stack);
  }

  /**
   * Log error level message
   */
  async error(message, packageName, stack = null) {
    return this.log('error', message, packageName, stack);
  }

  /**
   * Log debug level message
   */
  async debug(message, packageName, stack = null) {
    return this.log('debug', message, packageName, stack);
  }

  /**
   * Log warning level message
   */
  async warn(message, packageName, stack = null) {
    return this.log('warn', message, packageName, stack);
  }
}

// Create singleton instance
const logger = new CustomLogger();

// Initialize logger on first require (gracefully handle failures)
(async () => {
  try {
    await logger.register();
  } catch (error) {
    // Silently fail and continue - external logging service might be unavailable
    console.log('Note: External logging service not available, continuing without remote logging');
  }
})();

module.exports = logger;