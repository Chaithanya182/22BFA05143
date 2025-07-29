import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Card,
  CardContent,
  IconButton,
  Snackbar,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  ContentCopy as CopyIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import axios from 'axios';
import logger from '../utils/logger';

/**
 * URL Shortener Form Component
 * Allows users to input up to 5 URLs with optional validity and shortcode
 */
const URLShortenerForm = () => {
  const [urls, setUrls] = useState([{ url: '', validity: 30, shortcode: '' }]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  /**
   * Add a new URL input field
   */
  const addUrlField = () => {
    if (urls.length < 5) {
      setUrls([...urls, { url: '', validity: 30, shortcode: '' }]);
      logger.info('Added new URL input field', 'URLShortenerForm');
    }
  };

  /**
   * Remove a URL input field
   */
  const removeUrlField = (index) => {
    if (urls.length > 1) {
      const newUrls = urls.filter((_, i) => i !== index);
      setUrls(newUrls);
      logger.info(`Removed URL input field at index ${index}`, 'URLShortenerForm');
    }
  };

  /**
   * Update URL field data
   */
  const updateUrlField = (index, field, value) => {
    const newUrls = [...urls];
    newUrls[index][field] = value;
    setUrls(newUrls);
  };

  /**
   * Validate URL format
   */
  const isValidURL = (url) => {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  /**
   * Validate shortcode format
   */
  const isValidShortcode = (shortcode) => {
    if (!shortcode) return true; // Optional field
    return /^[a-zA-Z0-9]{3,20}$/.test(shortcode);
  };

  /**
   * Validate all form inputs
   */
  const validateInputs = () => {
    const errors = [];
    
    urls.forEach((urlData, index) => {
      if (!urlData.url.trim()) {
        errors.push(`URL ${index + 1} is required`);
      } else if (!isValidURL(urlData.url.trim())) {
        errors.push(`URL ${index + 1} must be a valid URL (include http:// or https://)`);
      }
      
      if (urlData.validity && (isNaN(urlData.validity) || urlData.validity < 1 || urlData.validity > 10080)) {
        errors.push(`Validity for URL ${index + 1} must be between 1 and 10080 minutes`);
      }
      
      if (urlData.shortcode && !isValidShortcode(urlData.shortcode)) {
        errors.push(`Shortcode for URL ${index + 1} must be 3-20 characters (letters and numbers only)`);
      }
    });
    
    return errors;
  };

  /**
   * Submit URLs for shortening
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    const validationErrors = validateInputs();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      logger.warn('Form validation failed', 'URLShortenerForm');
      return;
    }
    
    setLoading(true);
    setError('');
    setResults([]);
    
    try {
      logger.info(`Starting URL shortening for ${urls.length} URLs`, 'URLShortenerForm');
      
      // Process each URL
      const shortResults = [];
      
      for (let i = 0; i < urls.length; i++) {
        const urlData = urls[i];
        
        try {
          const response = await axios.post('http://localhost:8000/shorturls', {
            url: urlData.url.trim(),
            validity: urlData.validity || 30,
            shortcode: urlData.shortcode.trim() || undefined
          });
          
          shortResults.push({
            success: true,
            originalUrl: urlData.url.trim(),
            ...response.data
          });
          
          logger.info(`Successfully shortened URL ${i + 1}: ${urlData.url}`, 'URLShortenerForm');
          
        } catch (error) {
          const errorMessage = error.response?.data?.message || error.message;
          shortResults.push({
            success: false,
            originalUrl: urlData.url.trim(),
            error: errorMessage
          });
          
          logger.error(`Failed to shorten URL ${i + 1}: ${errorMessage}`, 'URLShortenerForm', error.stack);
        }
      }
      
      setResults(shortResults);
      
      // Show success message
      const successCount = shortResults.filter(r => r.success).length;
      const totalCount = shortResults.length;
      
      if (successCount === totalCount) {
        setSnackbar({
          open: true,
          message: `Successfully shortened ${successCount} URL${successCount > 1 ? 's' : ''}!`,
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: `Shortened ${successCount} of ${totalCount} URLs. Check results below.`,
          severity: 'warning'
        });
      }
      
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
      logger.error(`Unexpected error during URL shortening: ${error.message}`, 'URLShortenerForm', error.stack);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Copy short link to clipboard
   */
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setSnackbar({
        open: true,
        message: 'Short link copied to clipboard!',
        severity: 'success'
      });
      logger.info('Short link copied to clipboard', 'URLShortenerForm');
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to copy to clipboard',
        severity: 'error'
      });
      logger.error('Failed to copy to clipboard', 'URLShortenerForm');
    }
  };

  /**
   * Format expiry date for display
   */
  const formatExpiryDate = (isoString) => {
    return new Date(isoString).toLocaleString();
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" color="primary">
          <LinkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          URL Shortener
        </Typography>
        
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Shorten up to 5 URLs with custom shortcodes and validity periods
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {urls.map((urlData, index) => (
            <Card key={index} variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    URL {index + 1}
                  </Typography>
                  {urls.length > 1 && (
                    <IconButton 
                      onClick={() => removeUrlField(index)}
                      color="error"
                      size="small"
                    >
                      <RemoveIcon />
                    </IconButton>
                  )}
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="URL to shorten"
                      placeholder="https://example.com/very-long-url"
                      value={urlData.url}
                      onChange={(e) => updateUrlField(index, 'url', e.target.value)}
                      required
                      variant="outlined"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Validity (minutes)"
                      type="number"
                      value={urlData.validity}
                      onChange={(e) => updateUrlField(index, 'validity', parseInt(e.target.value) || '')}
                      inputProps={{ min: 1, max: 10080 }}
                      helperText="Default: 30 minutes, Max: 10080 (1 week)"
                      variant="outlined"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Custom shortcode (optional)"
                      placeholder="my-code"
                      value={urlData.shortcode}
                      onChange={(e) => updateUrlField(index, 'shortcode', e.target.value)}
                      helperText="3-20 chars, letters and numbers only"
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            {urls.length < 5 && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addUrlField}
              >
                Add Another URL
              </Button>
            )}
            
            <Box sx={{ flexGrow: 1 }} />
            
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ minWidth: 120 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Shorten URLs'}
            </Button>
          </Box>
        </form>

        {/* Results Section */}
        {results.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom>
              Results
            </Typography>
            
            {results.map((result, index) => (
              <Card key={index} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                      {result.originalUrl}
                    </Typography>
                    
                    <Chip 
                      label={result.success ? 'Success' : 'Failed'} 
                      color={result.success ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                  
                  {result.success ? (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <TextField
                          fullWidth
                          value={result.shortLink}
                          variant="outlined"
                          size="small"
                          InputProps={{
                            readOnly: true,
                          }}
                        />
                        <IconButton 
                          onClick={() => copyToClipboard(result.shortLink)}
                          color="primary"
                        >
                          <CopyIcon />
                        </IconButton>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary">
                        Expires: {formatExpiryDate(result.expiry)} • 
                        Shortcode: {result.shortcode} • 
                        Valid for: {result.validityMinutes} minutes
                      </Typography>
                    </Box>
                  ) : (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      {result.error}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity={snackbar.severity} 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default URLShortenerForm;