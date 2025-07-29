import React, { useState } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Tab,
  Tabs,
  Paper
} from '@mui/material';
import {
  Link as LinkIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';

import URLShortenerForm from './components/URLShortenerForm';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import logger from './utils/logger';
import './App.css';

/**
 * Main Application Component
 * Provides navigation between URL shortener and analytics dashboard
 */
function App() {
  const [currentTab, setCurrentTab] = useState(0);

  // Create Material UI theme
  const theme = createTheme({
    palette: {
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
      background: {
        default: '#f5f5f5',
      },
    },
    typography: {
      fontFamily: 'Roboto, Arial, sans-serif',
      h4: {
        fontWeight: 600,
      },
      h5: {
        fontWeight: 500,
      },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
            fontWeight: 500,
          },
        },
      },
    },
  });

  /**
   * Handle tab change
   */
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    const tabName = newValue === 0 ? 'URL Shortener' : 'Analytics Dashboard';
    logger.info(`Switched to ${tabName} tab`, 'App');
  };

  /**
   * Custom tab panel component
   */
  const TabPanel = ({ children, value, index, ...other }) => (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* App Bar */}
        <AppBar position="static" elevation={0}>
          <Toolbar>
            <LinkIcon sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              URL Shortener Microservice
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Built with React & Material UI
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Navigation Tabs */}
        <Container maxWidth="lg" sx={{ mt: 2 }}>
          <Paper elevation={1}>
            <Tabs 
              value={currentTab} 
              onChange={handleTabChange} 
              centered
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab 
                icon={<LinkIcon />} 
                label="URL Shortener" 
                id="simple-tab-0"
                aria-controls="simple-tabpanel-0"
              />
              <Tab 
                icon={<AnalyticsIcon />} 
                label="Analytics Dashboard" 
                id="simple-tab-1"
                aria-controls="simple-tabpanel-1"
              />
            </Tabs>
          </Paper>

          {/* Tab Panels */}
          <TabPanel value={currentTab} index={0}>
            <URLShortenerForm />
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            <AnalyticsDashboard />
          </TabPanel>
        </Container>

        {/* Footer */}
        <Box 
          component="footer" 
          sx={{ 
            mt: 6, 
            py: 3, 
            textAlign: 'center',
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }}
        >
          <Container maxWidth="lg">
            <Typography variant="body2" color="text.secondary">
              URL Shortener Microservice • Built with Express.js, SQLite, React & Material UI
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Features: Custom shortcodes, Expiry management, Click analytics, Custom logging
            </Typography>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;