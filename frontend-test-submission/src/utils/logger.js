import axios from 'axios';

/**
 * Frontend Logger Utility
 * Integrates with the custom logging middleware for browser-side logging
 */
class FrontendLogger {
  constructor() {
    this.baseURL = 'http://20.244.56.144';
    this.token = null;
    this.clientID = null;
    this.clientSecret = null;
    this.isRegistered = false;
    this.isAuthenticated = false;
    
    // Initialize logger on creation
    this.initialize();
  }

  /**
   * Initialize the logger with registration and authentication
   */
  async initialize() {
    try {
      await this.register();
      await this.authenticate();
    } catch (error) {
      console.error('Failed to initialize frontend logger:', error.message);
    }
  }

  /**
   * Register with the test server to get clientID and clientSecret
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
        console.log('Frontend logger registered successfully');
        return true;
      }
      
      throw new Error('Registration failed - invalid response');
    } catch (error) {
      console.error('Frontend logger registration failed:', error.message);
      return false;
    }
  }

  /**
   * Authenticate with the test server to get Bearer token
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
      console.error('Frontend logger authentication failed:', error.message);
      this.isAuthenticated = false;
      return false;
    }
  }

  /**
   * Send a log entry to the test server
   * @param {string} level - Log level (info, error, debug, warn)
   * @param {string} message - Log message
   * @param {string} component - Component/module name
   * @param {object} stack - Stack trace (optional)
   */
  async log(level, message, component, stack = null) {
    // Ensure we're authenticated before logging
    if (!this.isAuthenticated) {
      if (!await this.authenticate()) {
        console.error('Cannot log - authentication failed');
        return false;
      }
    }

    const logData = {
      level: level,
      message: message,
      package: `frontend-${component}`,
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
          return this.log(level, message, component, stack);
        }
      }
      
      console.error('Failed to send frontend log:', error.message);
      return false;
    }
  }

  /**
   * Log info level message
   */
  async info(message, component, stack = null) {
    return this.log('info', message, component, stack);
  }

  /**
   * Log error level message
   */
  async error(message, component, stack = null) {
    return this.log('error', message, component, stack);
  }

  /**
   * Log debug level message
   */
  async debug(message, component, stack = null) {
    return this.log('debug', message, component, stack);
  }

  /**
   * Log warning level message
   */
  async warn(message, component, stack = null) {
    return this.log('warn', message, component, stack);
  }
}

// Create singleton instance
const frontendLogger = new FrontendLogger();

export default frontendLogger;