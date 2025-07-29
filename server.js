const express = require('express');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const cors = require('cors');
const validator = require('validator');
const path = require('path');
const fs = require('fs');

// Import custom logger
const logger = require('./logging-middleware/logger');

const app = express();
const PORT = 8000;
const dbPath = path.join(__dirname, 'urlshortener.db');

// Middleware
app.use(express.json());
app.use(cors());

// Database connection
let db = null;

/**
 * Initialize and connect to SQLite database
 */
const initializeDatabase = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Create tables if they don't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS short_urls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shortcode TEXT UNIQUE NOT NULL,
        original_url TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        validity_minutes INTEGER NOT NULL DEFAULT 30
      );
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS clicks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shortcode TEXT NOT NULL,
        clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        referrer TEXT,
        ip_address TEXT,
        user_agent TEXT,
        FOREIGN KEY (shortcode) REFERENCES short_urls(shortcode)
      );
    `);

    await logger.info('Database initialized successfully', 'backend-server');
    console.log('Database connected and tables created');
  } catch (error) {
    await logger.error(`Database initialization failed: ${error.message}`, 'backend-server', error.stack);
    console.error('Database initialization failed:', error.message);
    process.exit(1);
  }
};

/**
 * Generate a random shortcode
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
 */
const isValidShortcode = (shortcode) => {
  return /^[a-zA-Z0-9]{3,20}$/.test(shortcode);
};

/**
 * Check if shortcode is unique
 */
const isShortcodeUnique = async (shortcode) => {
  try {
    const existing = await db.get(
      'SELECT shortcode FROM short_urls WHERE shortcode = ?',
      [shortcode]
    );
    return !existing;
  } catch (error) {
    await logger.error(`Error checking shortcode uniqueness: ${error.message}`, 'backend-server', error.stack);
    return false;
  }
};

/**
 * Generate unique shortcode
 */
const generateUniqueShortcode = async (maxAttempts = 10) => {
  let attempts = 0;
  let shortcode;
  
  do {
    shortcode = generateShortcode();
    attempts++;
    
    if (attempts > maxAttempts) {
      await logger.error(`Failed to generate unique shortcode after ${maxAttempts} attempts`, 'backend-server');
      return null;
    }
  } while (!(await isShortcodeUnique(shortcode)));
  
  return shortcode;
};

/**
 * API Route: POST /shorturls - Create a shortened URL
 */
app.post('/shorturls', async (req, res) => {
  try {
    const { url, validity = 30, shortcode } = req.body;

    // Validate required URL
    if (!url) {
      await logger.warn('URL shortening attempt without URL', 'backend-api');
      return res.status(400).json({ 
        error: 'URL is required',
        message: 'Please provide a valid URL to shorten'
      });
    }

    // Validate URL format
    if (!validator.isURL(url, { protocols: ['http', 'https'], require_protocol: true })) {
      await logger.warn(`Invalid URL format attempted: ${url}`, 'backend-api');
      return res.status(400).json({
        error: 'Invalid URL format',
        message: 'Please provide a valid URL (including http:// or https://)'
      });
    }

    // Validate validity period
    const validityMinutes = parseInt(validity);
    if (isNaN(validityMinutes) || validityMinutes < 1 || validityMinutes > 10080) { // Max 1 week
      await logger.warn(`Invalid validity period: ${validity}`, 'backend-api');
      return res.status(400).json({
        error: 'Invalid validity period',
        message: 'Validity must be between 1 and 10080 minutes (1 week)'
      });
    }

    // Generate or validate shortcode
    let finalShortcode = shortcode;
    
    if (shortcode) {
      // Validate custom shortcode format
      if (!isValidShortcode(shortcode)) {
        await logger.warn(`Invalid shortcode format: ${shortcode}`, 'backend-api');
        return res.status(400).json({
          error: 'Invalid shortcode format',
          message: 'Shortcode must be 3-20 characters long and contain only letters and numbers'
        });
      }

      // Check if custom shortcode is unique
      if (!(await isShortcodeUnique(shortcode))) {
        await logger.warn(`Shortcode already exists: ${shortcode}`, 'backend-api');
        return res.status(409).json({
          error: 'Shortcode already exists',
          message: 'The requested shortcode is already in use. Please choose a different one.'
        });
      }
    } else {
      // Generate unique shortcode
      finalShortcode = await generateUniqueShortcode();
      if (!finalShortcode) {
        return res.status(500).json({
          error: 'Server error',
          message: 'Unable to generate unique shortcode. Please try again.'
        });
      }
    }

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + validityMinutes * 60 * 1000);

    // Insert into database
    await db.run(
      `INSERT INTO short_urls (shortcode, original_url, expires_at, validity_minutes) 
       VALUES (?, ?, ?, ?)`,
      [finalShortcode, url, expiresAt.toISOString(), validityMinutes]
    );

    const shortLink = `http://localhost:${PORT}/${finalShortcode}`;
    const responseData = {
      shortLink: shortLink,
      expiry: expiresAt.toISOString(),
      shortcode: finalShortcode,
      originalUrl: url,
      validityMinutes: validityMinutes
    };

    await logger.info(`URL shortened successfully: ${url} -> ${finalShortcode}`, 'backend-api');
    res.status(201).json(responseData);

  } catch (error) {
    await logger.error(`Error creating short URL: ${error.message}`, 'backend-api', error.stack);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while creating the short URL'
    });
  }
});

/**
 * API Route: GET /shorturls/:shortcode - Get statistics for a short URL
 */
app.get('/shorturls/:shortcode', async (req, res) => {
  try {
    const { shortcode } = req.params;

    // Get short URL details
    const shortUrl = await db.get(
      'SELECT * FROM short_urls WHERE shortcode = ?',
      [shortcode]
    );

    if (!shortUrl) {
      await logger.warn(`Statistics requested for non-existent shortcode: ${shortcode}`, 'backend-api');
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

    await logger.info(`Statistics retrieved for shortcode: ${shortcode}`, 'backend-api');
    res.json(statistics);

  } catch (error) {
    await logger.error(`Error retrieving statistics: ${error.message}`, 'backend-api', error.stack);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while retrieving statistics'
    });
  }
});

/**
 * API Route: GET /api/all-urls - Get all short URLs (for frontend statistics page)
 */
app.get('/api/all-urls', async (req, res) => {
  try {
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
      isExpired: new Date() > new Date(url.expires_at),
      shortLink: `http://localhost:${PORT}/${url.shortcode}`
    }));

    await logger.info(`All URLs statistics retrieved (${shortUrls.length} URLs)`, 'backend-api');
    res.json(urlsWithStatus);

  } catch (error) {
    await logger.error(`Error retrieving all URLs: ${error.message}`, 'backend-api', error.stack);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while retrieving URL statistics'
    });
  }
});

// Health check endpoint (must be before shortcode handler)
app.get('/health', async (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'URL Shortener Backend'
  });
});

/**
 * API Route: GET /:shortcode - Redirect to original URL
 */
app.get('/:shortcode', async (req, res) => {
  try {
    const { shortcode } = req.params;

    // Skip if it's a special route
    if (['api', 'shorturls', 'static', 'favicon.ico'].includes(shortcode)) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Get short URL details
    const shortUrl = await db.get(
      'SELECT * FROM short_urls WHERE shortcode = ?',
      [shortcode]
    );

    if (!shortUrl) {
      await logger.warn(`Redirect attempted for non-existent shortcode: ${shortcode}`, 'backend-api');
      return res.status(404).json({
        error: 'Short URL not found',
        message: 'The requested shortcode does not exist'
      });
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(shortUrl.expires_at);
    
    if (now > expiresAt) {
      await logger.warn(`Redirect attempted for expired shortcode: ${shortcode}`, 'backend-api');
      return res.status(410).json({
        error: 'Short URL expired',
        message: 'This short URL has expired and is no longer valid',
        expiredAt: shortUrl.expires_at
      });
    }

    // Log the click
    const clickData = {
      shortcode: shortcode,
      referrer: req.get('Referer') || null,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || null
    };

    await db.run(
      `INSERT INTO clicks (shortcode, referrer, ip_address, user_agent) 
       VALUES (?, ?, ?, ?)`,
      [clickData.shortcode, clickData.referrer, clickData.ipAddress, clickData.userAgent]
    );

    await logger.info(`Successful redirect: ${shortcode} -> ${shortUrl.original_url}`, 'backend-api');
    
    // Perform redirect
    res.redirect(302, shortUrl.original_url);

  } catch (error) {
    await logger.error(`Error during redirect: ${error.message}`, 'backend-api', error.stack);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred during redirect'
    });
  }
});



// Serve static frontend files
const publicPath = path.join(__dirname, 'public');
app.use('/static', express.static(publicPath));

// Serve main frontend page
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Start server
const startServer = async () => {
  try {
    await initializeDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 URL Shortener Server running at http://localhost:${PORT}/`);
      console.log(`📊 Backend API available at http://localhost:${PORT}/shorturls`);
      console.log(`🔗 Short URLs redirect at http://localhost:${PORT}/:shortcode`);
      console.log(`📈 Analytics API at http://localhost:${PORT}/api/all-urls`);
      
      logger.info(`Server started on port ${PORT}`, 'backend-server');
    });
  } catch (error) {
    await logger.error(`Failed to start server: ${error.message}`, 'backend-server', error.stack);
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();