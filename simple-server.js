const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/users');
const { router: productRoutes, initializeProductModel } = require('./routes/products');
const footprintRoutes = require('./routes/footprints');
const { connectMongoDB, getMongoDb } = require('./config/database');
const { seedTestData } = require('./scripts/seedTestData');

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ECTRACC Backend API - Phase 1',
    version: '1.0.0',
    endpoints: ['/api/healthcheck', '/api/ping']
  });
});

app.get('/api/healthcheck', (req, res) => {
  res.json({
    success: true,
    message: 'ECTRACC API is running successfully',
    data: {
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      phase: 'Phase 1 - Complete',
      uptime: process.uptime(),
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB'
    }
  });
});

app.get('/api/ping', (req, res) => {
  res.json({ 
    success: true, 
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

// User routes
app.use('/api/users', userRoutes);

// Product routes
app.use('/api/products', productRoutes);

// Footprint routes
app.use('/api/footprints', footprintRoutes);

// Initialize database and start server
async function startServer() {
  try {
    // Connect to MongoDB and initialize product model
    const db = await connectMongoDB();
    if (db) {
      initializeProductModel(db);
      
      // Seed test data if collection is empty
      try {
        const collection = db.collection('products');
        const count = await collection.countDocuments();
        if (count === 0) {
          console.log('📝 Seeding test data...');
          await seedTestData();
        }
      } catch (seedError) {
        console.log('⚠️ Could not seed test data:', seedError.message);
      }
    }
    
    app.listen(PORT, () => {
      console.log(`✅ ECTRACC Backend running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/healthcheck`);
      console.log(`🔍 Product search: http://localhost:${PORT}/api/products/search`);
      console.log(`📊 Product stats: http://localhost:${PORT}/api/products/stats`);
      console.log(`🌱 Carbon tracking: http://localhost:${PORT}/api/footprints/track`);
      console.log(`📈 Footprint history: http://localhost:${PORT}/api/footprints/history`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
