const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/healthcheck', (req, res) => {
  const healthStatus = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      mongodb: 'placeholder',
      supabase: 'placeholder'
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    }
  };

  res.status(200).json({
    success: true,
    message: 'ECTRACC API is running successfully',
    data: healthStatus
  });
});

// Simple ping endpoint
router.get('/ping', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;



