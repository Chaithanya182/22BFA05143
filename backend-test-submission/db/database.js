const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');
const logger = require('../../logging-middleware/logger');

const dbPath = path.join(__dirname, '..', 'urlshortener.db');

/**
 * Database connection and initialization
 */
class Database {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize and connect to SQLite database
   */
  async initialize() {
    try {
      this.db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
      });

      // Create tables if they don't exist
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS short_urls (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          shortcode TEXT UNIQUE NOT NULL,
          original_url TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL,
          validity_minutes INTEGER NOT NULL DEFAULT 30
        );
      `);

      await this.db.exec(`
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

      await logger.info('Database initialized successfully', 'database');
      console.log('Database connected and tables created');
      return this.db;
    } catch (error) {
      await logger.error(`Database initialization failed: ${error.message}`, 'database', error.stack);
      console.error('Database initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Get database instance
   */
  getDb() {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

module.exports = new Database();