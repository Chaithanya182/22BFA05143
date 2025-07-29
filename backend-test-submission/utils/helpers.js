const validator = require('validator');
const logger = require('../../logging-middleware/logger');

/**
 * Helper utilities for URL shortener backend
 */

/**
 * Generate a random shortcode
 * @param {number} length - Length of shortcode (default: 6)
 * @returns {string} Random shortcode
 */
const generateShortcode = (length = 6) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Validate shortcode format
 * @param {string} shortcode - Shortcode to validate
 * @returns {boolean} True if valid format
 */
const isValidShortcode = (shortcode) => {
  return /^[a-zA-Z0-9]{3,20}$/.test(shortcode);
};

/**
 * Check if shortcode is unique in database
 * @param {string} shortcode - Shortcode to check
 * @param {object} db - Database instance
 * @returns {boolean} True if unique
 */
const isShortcodeUnique = async (shortcode, db) => {
  try {
    const existing = await db.get(
      'SELECT shortcode FROM short_urls WHERE shortcode = ?',
      [shortcode]
    );
    return !existing;
  } catch (error) {
    await logger.error(`Error checking shortcode uniqueness: ${error.message}`, 'helpers', error.stack);
    return false;
  }
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
const isValidURL = (url) => {
  return validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true
  });
};

/**
 * Validate validity period
 * @param {number|string} validity - Validity in minutes
 * @returns {object} {isValid: boolean, minutes: number, error?: string}
 */
const validateValidityPeriod = (validity) => {
  const validityMinutes = parseInt(validity);
  
  if (isNaN(validityMinutes)) {
    return {
      isValid: false,
      error: 'Validity must be a number'
    };
  }
  
  if (validityMinutes < 1) {
    return {
      isValid: false,
      error: 'Validity must be at least 1 minute'
    };
  }
  
  if (validityMinutes > 10080) { // Max 1 week
    return {
      isValid: false,
      error: 'Validity cannot exceed 10080 minutes (1 week)'
    };
  }
  
  return {
    isValid: true,
    minutes: validityMinutes
  };
};

/**
 * Calculate expiry date from validity minutes
 * @param {number} validityMinutes - Validity period in minutes
 * @returns {Date} Expiry date
 */
const calculateExpiryDate = (validityMinutes) => {
  return new Date(Date.now() + validityMinutes * 60 * 1000);
};

/**
 * Check if a short URL has expired
 * @param {string} expiresAt - ISO date string
 * @returns {boolean} True if expired
 */
const isExpired = (expiresAt) => {
  return new Date() > new Date(expiresAt);
};

/**
 * Format click data for storage
 * @param {string} shortcode - Shortcode
 * @param {object} req - Express request object
 * @returns {object} Formatted click data
 */
const formatClickData = (shortcode, req) => {
  return {
    shortcode: shortcode,
    referrer: req.get('Referer') || null,
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || null
  };
};

/**
 * Generate a unique shortcode
 * @param {object} db - Database instance
 * @param {number} maxAttempts - Maximum attempts to generate unique code
 * @returns {string|null} Unique shortcode or null if failed
 */
const generateUniqueShortcode = async (db, maxAttempts = 10) => {
  let attempts = 0;
  let shortcode;
  
  do {
    shortcode = generateShortcode();
    attempts++;
    
    if (attempts > maxAttempts) {
      await logger.error(`Failed to generate unique shortcode after ${maxAttempts} attempts`, 'helpers');
      return null;
    }
  } while (!(await isShortcodeUnique(shortcode, db)));
  
  return shortcode;
};

/**
 * Create standard API response format
 * @param {boolean} success - Success status
 * @param {object|string} data - Response data or error message
 * @param {string} message - Optional message
 * @returns {object} Formatted response
 */
const createApiResponse = (success, data, message = null) => {
  if (success) {
    return {
      success: true,
      data: data,
      message: message
    };
  } else {
    return {
      success: false,
      error: data,
      message: message
    };
  }
};

module.exports = {
  generateShortcode,
  isValidShortcode,
  isShortcodeUnique,
  isValidURL,
  validateValidityPeriod,
  calculateExpiryDate,
  isExpired,
  formatClickData,
  generateUniqueShortcode,
  createApiResponse
};