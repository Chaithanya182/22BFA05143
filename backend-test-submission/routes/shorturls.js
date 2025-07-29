const express = require('express');
const database = require('../db/database');
const logger = require('../../logging-middleware/logger');
const {
  isValidURL,
  validateValidityPeriod,
  calculateExpiryDate,
  isValidShortcode,
  isShortcodeUnique,
  generateUniqueShortcode,
  createApiResponse
} = require('../utils/helpers');

const router = express.Router();

/**
 * POST /shorturls - Create a shortened URL
 */
router.post('/', async (req, res) => {
  try {
    const { url, validity = 30, shortcode } = req.body;
    const db = database.getDb();

    // Validate required URL
    if (!url) {
      await logger.warn('URL shortening attempt without URL', 'shorturls-api');
      return res.status(400).json({
        error: 'URL is required',
        message: 'Please provide a valid URL to shorten'
      });
    }

    // Validate URL format
    if (!isValidURL(url)) {
      await logger.warn(`Invalid URL format attempted: ${url}`, 'shorturls-api');
      return res.status(400).json({
        error: 'Invalid URL format',
        message: 'Please provide a valid URL (including http:// or https://)'
      });
    }

    // Validate validity period
    const validityCheck = validateValidityPeriod(validity);
    if (!validityCheck.isValid) {
      await logger.warn(`Invalid validity period: ${validity}`, 'shorturls-api');
      return res.status(400).json({
        error: 'Invalid validity period',
        message: validityCheck.error
      });
    }

    // Generate or validate shortcode
    let finalShortcode = shortcode;
    
    if (shortcode) {
      // Validate custom shortcode format
      if (!isValidShortcode(shortcode)) {
        await logger.warn(`Invalid shortcode format: ${shortcode}`, 'shorturls-api');
        return res.status(400).json({
          error: 'Invalid shortcode format',
          message: 'Shortcode must be 3-20 characters long and contain only letters and numbers'
        });
      }

      // Check if custom shortcode is unique
      if (!(await isShortcodeUnique(shortcode, db))) {
        await logger.warn(`Shortcode already exists: ${shortcode}`, 'shorturls-api');
        return res.status(409).json({
          error: 'Shortcode already exists',
          message: 'The requested shortcode is already in use. Please choose a different one.'
        });
      }
    } else {
      // Generate unique shortcode
      finalShortcode = await generateUniqueShortcode(db);
      if (!finalShortcode) {
        return res.status(500).json({
          error: 'Server error',
          message: 'Unable to generate unique shortcode. Please try again.'
        });
      }
    }

    // Calculate expiry time
    const expiresAt = calculateExpiryDate(validityCheck.minutes);

    // Insert into database
    await db.run(
      `INSERT INTO short_urls (shortcode, original_url, expires_at, validity_minutes) 
       VALUES (?, ?, ?, ?)`,
      [finalShortcode, url, expiresAt.toISOString(), validityCheck.minutes]
    );

    const shortLink = `http://localhost:8000/${finalShortcode}`;
    const responseData = {
      shortLink: shortLink,
      expiry: expiresAt.toISOString(),
      shortcode: finalShortcode,
      originalUrl: url,
      validityMinutes: validityCheck.minutes
    };

    await logger.info(`URL shortened successfully: ${url} -> ${finalShortcode}`, 'shorturls-api');
    res.status(201).json(responseData);

  } catch (error) {
    await logger.error(`Error creating short URL: ${error.message}`, 'shorturls-api', error.stack);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while creating the short URL'
    });
  }
});

/**
 * GET /shorturls/:shortcode - Get statistics for a short URL
 */
router.get('/:shortcode', async (req, res) => {
  try {
    const { shortcode } = req.params;
    const db = database.getDb();

    // Get short URL details
    const shortUrl = await db.get(
      'SELECT * FROM short_urls WHERE shortcode = ?',
      [shortcode]
    );

    if (!shortUrl) {
      await logger.warn(`Statistics requested for non-existent shortcode: ${shortcode}`, 'shorturls-api');
      return res.status(404).json({
        error: 'Short URL not found',
        message: 'The requested shortcode does not exist'
      });
    }

    // Get click statistics
    const clicks = await db.all(
      `SELECT clicked_at, referrer, ip_address, user_agent 
       FROM clicks 
       WHERE shortcode = ? 
       ORDER BY clicked_at DESC`,
      [shortcode]
    );

    const clickCount = clicks.length;

    const statistics = {
      shortcode: shortUrl.shortcode,
      originalUrl: shortUrl.original_url,
      createdAt: shortUrl.created_at,
      expiresAt: shortUrl.expires_at,
      validityMinutes: shortUrl.validity_minutes,
      totalClicks: clickCount,
      isExpired: new Date() > new Date(shortUrl.expires_at),
      clickDetails: clicks.map(click => ({
        timestamp: click.clicked_at,
        referrer: click.referrer || 'Direct',
        ipAddress: click.ip_address,
        userAgent: click.user_agent
      }))
    };

    await logger.info(`Statistics retrieved for shortcode: ${shortcode}`, 'shorturls-api');
    res.json(statistics);

  } catch (error) {
    await logger.error(`Error retrieving statistics: ${error.message}`, 'shorturls-api', error.stack);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while retrieving statistics'
    });
  }
});

module.exports = router;