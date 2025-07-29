const express = require('express');
const cors = require('cors');

// Import database and routes
const database = require('./db/database');
const logger = require('../logging-middleware/logger');
const shorturlsRoutes = require('./routes/shorturls');
const redirectRoutes = require('./routes/redirect');

const app = express();
const PORT = 8000;

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/shorturls', shorturlsRoutes);
app.use('/', redirectRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'URL Shortener Backend'
  });
});

// Start server
const startServer = async () => {
  try {
    // Initialize database
    await database.initialize();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running at http://localhost:${PORT}/`);
      logger.info(`Server started on port ${PORT}`, 'backend-server');
    });
  } catch (error) {
    await logger.error(`Failed to start server: ${error.message}`, 'backend-server', error.stack);
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();