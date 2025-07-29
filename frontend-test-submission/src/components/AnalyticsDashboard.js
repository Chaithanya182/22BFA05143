import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  Launch as LaunchIcon,
  Visibility as VisibilityIcon,
  Schedule as ScheduleIcon,
  Link as LinkIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import axios from 'axios';
import logger from '../utils/logger';

/**
 * Analytics Dashboard Component
 * Displays statistics for all created short URLs
 */
const AnalyticsDashboard = () => {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailsDialog, setDetailsDialog] = useState({ open: false, data: null });
  const [detailsLoading, setDetailsLoading] = useState(false);

  /**
   * Fetch all URLs statistics on component mount
   */
  useEffect(() => {
    fetchAllUrls();
  }, []);

  /**
   * Fetch all shortened URLs from backend
   */
  const fetchAllUrls = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8000/api/all-urls');
      setUrls(response.data);
      logger.info(`Loaded ${response.data.length} URLs in analytics dashboard`, 'AnalyticsDashboard');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to load URL statistics';
      setError(errorMessage);
      logger.error(`Failed to load URLs: ${errorMessage}`, 'AnalyticsDashboard', error.stack);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch detailed statistics for a specific shortcode
   */
  const fetchUrlDetails = async (shortcode) => {
    try {
      setDetailsLoading(true);
      const response = await axios.get(`http://localhost:8000/shorturls/${shortcode}`);
      setDetailsDialog({ open: true, data: response.data });
      logger.info(`Loaded detailed statistics for shortcode: ${shortcode}`, 'AnalyticsDashboard');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to load URL details';
      setError(errorMessage);
      logger.error(`Failed to load URL details: ${errorMessage}`, 'AnalyticsDashboard', error.stack);
    } finally {
      setDetailsLoading(false);
    }
  };

  /**
   * Copy short link to clipboard
   */
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      logger.info('Short link copied to clipboard from analytics', 'AnalyticsDashboard');
    } catch (error) {
      logger.error('Failed to copy to clipboard', 'AnalyticsDashboard');
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString();
  };

  /**
   * Calculate summary statistics
   */
  const getSummaryStats = () => {
    const totalUrls = urls.length;
    const totalClicks = urls.reduce((sum, url) => sum + url.total_clicks, 0);
    const activeUrls = urls.filter(url => !url.isExpired).length;
    const expiredUrls = urls.filter(url => url.isExpired).length;
    
    return { totalUrls, totalClicks, activeUrls, expiredUrls };
  };

  const summaryStats = getSummaryStats();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={fetchAllUrls}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" color="primary">
          <AnalyticsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          URL Analytics Dashboard
        </Typography>

        {/* Summary Statistics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {summaryStats.totalUrls}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total URLs
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {summaryStats.totalClicks}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Clicks
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">
                  {summaryStats.activeUrls}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active URLs
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {summaryStats.expiredUrls}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Expired URLs
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* URLs Table */}
        {urls.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <LinkIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No URLs created yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create your first short URL to see analytics here
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Shortcode</TableCell>
                  <TableCell>Original URL</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Clicks</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {urls.map((url) => (
                  <TableRow key={url.shortcode} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontFamily="monospace">
                          {url.shortcode}
                        </Typography>
                        <Tooltip title="Copy short link">
                          <IconButton 
                            size="small" 
                            onClick={() => copyToClipboard(url.shortLink)}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          maxWidth: 200, 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={url.original_url}
                      >
                        {url.original_url}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="center">
                      <Chip 
                        label={url.isExpired ? 'Expired' : 'Active'}
                        color={url.isExpired ? 'warning' : 'success'}
                        size="small"
                        icon={url.isExpired ? <ScheduleIcon /> : <LinkIcon />}
                      />
                    </TableCell>
                    
                    <TableCell align="center">
                      <Typography variant="body1" fontWeight="bold">
                        {url.total_clicks}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(url.created_at)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" color={url.isExpired ? 'error' : 'text.primary'}>
                        {formatDate(url.expires_at)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="View details">
                          <IconButton 
                            size="small" 
                            onClick={() => fetchUrlDetails(url.shortcode)}
                            disabled={detailsLoading}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        {!url.isExpired && (
                          <Tooltip title="Open short link">
                            <IconButton 
                              size="small" 
                              component="a"
                              href={url.shortLink}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <LaunchIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button variant="outlined" onClick={fetchAllUrls}>
            Refresh Data
          </Button>
        </Box>
      </Paper>

      {/* Details Dialog */}
      <Dialog 
        open={detailsDialog.open} 
        onClose={() => setDetailsDialog({ open: false, data: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          URL Statistics: {detailsDialog.data?.shortcode}
        </DialogTitle>
        
        <DialogContent>
          {detailsDialog.data && (
            <Box>
              {/* Basic Info */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Original URL
                  </Typography>
                  <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                    {detailsDialog.data.originalUrl}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(detailsDialog.data.createdAt)}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Expires
                  </Typography>
                  <Typography variant="body2" color={detailsDialog.data.isExpired ? 'error' : 'text.primary'}>
                    {formatDate(detailsDialog.data.expiresAt)}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Clicks
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {detailsDialog.data.totalClicks}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip 
                    label={detailsDialog.data.isExpired ? 'Expired' : 'Active'}
                    color={detailsDialog.data.isExpired ? 'warning' : 'success'}
                    size="small"
                  />
                </Grid>
              </Grid>

              {/* Click Details */}
              <Typography variant="h6" gutterBottom>
                Click History
              </Typography>
              
              {detailsDialog.data.clickDetails.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No clicks recorded yet
                </Typography>
              ) : (
                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {detailsDialog.data.clickDetails.map((click, index) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={`Click ${index + 1}`}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              Time: {formatDate(click.timestamp)}
                            </Typography>
                            <Typography variant="body2">
                              Referrer: {click.referrer}
                            </Typography>
                            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                              IP: {click.ipAddress}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDetailsDialog({ open: false, data: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AnalyticsDashboard;