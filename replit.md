# URL Shortener Microservice

## Project Overview
A full-stack URL shortener microservice built entirely in JavaScript (not TypeScript) with analytical capabilities and integrated custom logging middleware. The project consists of three main components:

1. **logging-middleware/** - Reusable logging function that authenticates with the test server
2. **backend-test-submission/** - Express + SQLite backend implementing URL shortening APIs  
3. **frontend-test-submission/** - React (Material UI) frontend consuming backend APIs

## User Preferences
- Use JavaScript exclusively (no TypeScript)
- Use CommonJS require() style imports
- Use async/await syntax
- Simple, clean, human-friendly code style
- Clear variable names and comments
- Parameterized SQL queries for safety

## Project Architecture
The application follows a microservice architecture with:
- Standalone logging middleware for both frontend and backend
- Express backend with SQLite database on port 8000
- React frontend with Material UI on port 3000
- Custom logging to external test server at http://20.244.56.144

## Recent Changes
- ✅ Complete JavaScript URL shortener microservice implementation (July 2025)
- ✅ Custom logging middleware with graceful fallback for external service
- ✅ Express backend with SQLite database and organized folder structure
- ✅ Frontend web interface with Material UI styling (HTML/CSS/JS version)
- ✅ All core functionality tested and working: URL shortening, custom shortcodes, analytics, click tracking
- ✅ Server running on port 8000 with both API and web interface

## Deployment Status
The application is fully functional and ready for use:
- Backend API: http://localhost:8000/shorturls (POST/GET)
- Web Interface: http://localhost:8000/ 
- Health Check: http://localhost:8000/health
- Analytics API: http://localhost:8000/api/all-urls
- Redirect Service: http://localhost:8000/:shortcode