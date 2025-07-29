const express = require('express');
const database = require('../db/database');
const logger = require('../../logging-middleware/logger');
const { formatClickData, isExpired } = require('../utils/helpers');

const router = express.Router();

/**
 * GET /:shortcode - Redirect to original URL
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
      await logger.warn(`Redirect attempted for non-existent shortcode: ${shortcode}`, 'redirect-api');
      return res.status(404).json({
        error: 'Short URL not found',
        message: 'The requested shortcode does not exist'
      });
    }

    // Check if expired
    if (isExpired(shortUrl.expires_at)) {
      await logger.warn(`Redirect attempted for expired shortcode: ${shortcode}`, 'redirect-api');
      return res.status(410).json({
        error: 'Short URL expired',
        message: 'This short URL has expired and is no longer valid',
        expiredAt: shortUrl.expires_at
      });
    }

    // Log the click
    const clickData = formatClickData(shortcode, req);

    await db.run(
      `INSERT INTO clicks (shortcode, referrer, ip_address, user_agent) 
       VALUES (?, ?, ?, ?)`,
      [clickData.shortcode, clickData.referrer, clickData.ipAddress, clickData.userAgent]
    );

    await logger.info(`Successful redirect: ${shortcode} -> ${shortUrl.original_url}`, 'redirect-api');
    
    // Perform redirect
    res.redirect(302, shortUrl.original_url);

  } catch (error) {
    await logger.error(`Error during redirect: ${error.message}`, 'redirect-api', error.stack);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred during redirect'
    });
  }
});

/**
 * GET /api/all-urls - Get all short URLs (for frontend statistics page)
 */
router.get('/api/all-urls', async (req, res) => {
  try {
    const db = database.getDb();
    
    const shortUrls = await db.all(`
      SELECT 
        s.shortcode,
        s.original_url,
        s.created_at,
        s.expires_at,
        s.validity_minutes,
        COUNT(c.id) as total_clicks
      FROM short_urls s
      LEFT JOIN clicks c ON s.shortcode = c.shortcode
      GROUP BY s.shortcode
      ORDER BY s.created_at DESC
    `);

    const urlsWithStatus = shortUrls.map(url => ({
      ...url,
      isExpired: isExpired(url.expires_at),
      shortLink: `http://localhost:8000/${url.shortcode}`
    }));

    await logger.info(`All URLs statistics retrieved (${shortUrls.length} URLs)`, 'redirect-api');
    res.json(urlsWithStatus);

  } catch (error) {
    await logger.error(`Error retrieving all URLs: ${error.message}`, 'redirect-api', error.stack);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while retrieving URL statistics'
    });
  }
});

module.exports = router;