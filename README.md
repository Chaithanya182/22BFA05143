# URL Shortener Microservice

A full-stack URL shortener microservice built entirely in JavaScript with analytical capabilities and integrated custom logging middleware.

## 🏗️ Project Structure

```
├── logging-middleware/
│   ├── package.json
│   └── logger.js                 # Reusable logging middleware
├── backend-test-submission/
│   ├── db/
│   │   └── database.js          # SQLite database connection
│   ├── routes/
│   │   ├── redirect.js          # Redirect and analytics routes
│   │   └── shorturls.js         # URL shortening routes
│   ├── utils/
│   │   └── helpers.js           # Utility functions
│   ├── package.json
│   └── server.js                # Express server entry point
├── frontend-test-submission/
│   ├── public/
│   │   └── index.html           # Simple HTML frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── AnalyticsDashboard.js  # React analytics component
│   │   │   └── URLShortenerForm.js    # React URL form component
│   │   ├── utils/
│   │   │   └── logger.js        # Frontend logger
│   │   ├── App.css
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── public/
│   └── index.html               # Working frontend interface
├── server.js                    # Consolidated server (currently running)
└── README.md
```

## 🚀 Features

### Core Functionality
- ✅ **URL Shortening**: Convert long URLs to short codes
- ✅ **Custom Shortcodes**: Optional user-defined shortcodes (3-20 alphanumeric chars)
- ✅ **Expiry Management**: Configurable validity period (1-10080 minutes)
- ✅ **Click Tracking**: Track clicks with timestamp, referrer, IP, and user agent
- ✅ **Analytics Dashboard**: View statistics for all shortened URLs
- ✅ **Redirect Service**: Fast redirection to original URLs

### Technical Features
- ✅ **Custom Logging**: Integrated logging middleware for external service
- ✅ **SQLite Database**: Persistent storage with proper schema
- ✅ **Express Backend**: RESTful API with proper error handling
- ✅ **Frontend Interface**: Clean web interface for easy use
- ✅ **Input Validation**: Comprehensive validation for URLs and shortcodes
- ✅ **Security**: Parameterized SQL queries to prevent injection

## 🌐 API Endpoints

### URL Shortening
```http
POST /shorturls
Content-Type: application/json

{
  "url": "https://example.com/very-long-url",
  "validity": 60,           // Optional: minutes (default: 30)
  "shortcode": "my-code"    // Optional: custom shortcode
}
```

**Response:**
```json
{
  "shortLink": "http://localhost:8000/abc123",
  "expiry": "2025-07-29T08:30:00.000Z",
  "shortcode": "abc123",
  "originalUrl": "https://example.com/very-long-url",
  "validityMinutes": 60
}
```

### Get URL Statistics
```http
GET /shorturls/:shortcode
```

**Response:**
```json
{
  "shortcode": "abc123",
  "originalUrl": "https://example.com",
  "createdAt": "2025-07-29 07:30:00",
  "expiresAt": "2025-07-29T08:30:00.000Z",
  "validityMinutes": 60,
  "totalClicks": 5,
  "isExpired": false,
  "clickDetails": [
    {
      "timestamp": "2025-07-29 07:35:00",
      "referrer": "https://twitter.com",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    }
  ]
}
```

### Redirect to Original URL
```http
GET /:shortcode
```
Returns HTTP 302 redirect to original URL (if not expired) or HTTP 410 if expired.

### Get All URLs (Analytics)
```http
GET /api/all-urls
```

### Health Check
```http
GET /health
```

## 🎯 Usage Examples

### Create a Short URL
```bash
curl -X POST http://localhost:8000/shorturls \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/microsoft/vscode", "validity": 60}'
```

### Access Analytics
```bash
curl http://localhost:8000/api/all-urls
```

### Use the Short URL
Visit `http://localhost:8000/[shortcode]` in any browser

## 🖥️ Web Interface

Access the web interface at: **http://localhost:8000/**

Features:
- Clean, responsive design with gradient background
- URL shortening form with validation
- Analytics dashboard with statistics table
- Real-time click tracking display
- Copy-to-clipboard functionality

## 🔧 Technology Stack

### Backend
- **Node.js** with **Express.js** framework
- **SQLite** database with **sqlite3** package
- **Validator.js** for input validation
- **Axios** for HTTP requests
- **CORS** enabled for cross-origin requests

### Frontend  
- **HTML5/CSS3/JavaScript** for web interface
- **React + Material UI** components (alternative implementation)
- Responsive design with modern CSS gradients
- Vanilla JavaScript for API communication

### Logging
- Custom logging middleware with external service integration
- Graceful fallback when external service unavailable
- Structured logging with levels (info, error, debug, warn)

## 📊 Database Schema

### short_urls Table
```sql
CREATE TABLE short_urls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shortcode TEXT UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  validity_minutes INTEGER NOT NULL DEFAULT 30
);
```

### clicks Table
```sql
CREATE TABLE clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shortcode TEXT NOT NULL,
  clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  referrer TEXT,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (shortcode) REFERENCES short_urls(shortcode)
);
```

## 🚦 Current Status

✅ **FULLY FUNCTIONAL** - All features implemented and tested:

- Server running on port 8000
- Database initialized with proper schema
- All API endpoints working correctly
- Web interface accessible and functional
- Click tracking and analytics operational
- Custom shortcodes and expiry management working
- Logging middleware integrated (graceful fallback for external service)

## 🔗 Quick Start

The application is already running! Access it at:
- **Web Interface**: http://localhost:8000/
- **API Base**: http://localhost:8000/shorturls
- **Health Check**: http://localhost:8000/health

## 📝 Notes

- Default validity period: 30 minutes
- Maximum validity period: 10,080 minutes (1 week)
- Shortcodes must be 3-20 characters, alphanumeric only
- Expired URLs return HTTP 410 Gone status
- All responses are in JSON format
- Click tracking includes IP, referrer, and user agent
- External logging service failures don't affect core functionality