const express = require('express');
const rateLimit = require('express-rate-limit');
const ProductModel = require('../models/Product');
const { 
  searchValidation, 
  barcodeValidation, 
  paginationValidation,
  alternativesValidation 
} = require('../validation/productValidation');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Rate limiting configurations
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    success: false,
    error: 'Too many search requests, please try again later'
  }
});

const barcodeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    error: 'Too many barcode requests, please try again later'
  }
});

// Initialize ProductModel (will be set when database connects)
let productModel = null;

// Middleware to ensure ProductModel is available
const requireProductModel = (req, res, next) => {
  if (!productModel) {
    return res.status(503).json({
      success: false,
      error: 'Product service temporarily unavailable'
    });
  }
  next();
};

// Initialize product model when database is ready
const initializeProductModel = (db) => {
  productModel = new ProductModel(db);
};

// GET /api/products/search - Search products with filters and pagination
router.get('/search', searchLimiter, optionalAuth, requireProductModel, async (req, res) => {
  try {
    // Validate query parameters
    const { error, value } = searchValidation.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const result = await productModel.search(value);

    res.json({
      success: true,
      data: result.data,
      meta: {
        pagination: result.pagination,
        query: value
      }
    });
  } catch (error) {
    console.error('Product search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
});

// GET /api/products/barcode/:code - Find product by barcode
router.get('/barcode/:code', barcodeLimiter, optionalAuth, requireProductModel, async (req, res) => {
  try {
    // Validate barcode
    const { error, value } = barcodeValidation.validate({ code: req.params.code });
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const product = await productModel.findByBarcode(value.code);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Barcode lookup error:', error);
    res.status(500).json({
      success: false,
      error: 'Barcode lookup failed'
    });
  }
});

// GET /api/products/with-footprint - Get products with carbon footprint data
router.get('/with-footprint', optionalAuth, requireProductModel, async (req, res) => {
  try {
    // Validate pagination parameters
    const { error, value } = paginationValidation.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const result = await productModel.getWithFootprint(value.page, value.limit);

    res.json({
      success: true,
      data: result.data,
      meta: {
        pagination: result.pagination
      }
    });
  } catch (error) {
    console.error('With-footprint lookup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products with footprint data'
    });
  }
});

// GET /api/products/stats - Get basic product statistics
router.get('/stats', optionalAuth, requireProductModel, async (req, res) => {
  try {
    const stats = await productModel.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Stats lookup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product statistics'
    });
  }
});

// GET /api/products/:id/alternatives - Get suggested alternatives
router.get('/:id/alternatives', optionalAuth, requireProductModel, async (req, res) => {
  try {
    // Validate product ID and limit
    const { error, value } = alternativesValidation.validate({
      id: req.params.id,
      limit: req.query.limit
    });
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const alternatives = await productModel.getSuggestedAlternatives(value.id, value.limit);

    res.json({
      success: true,
      data: alternatives
    });
  } catch (error) {
    console.error('Alternatives lookup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product alternatives'
    });
  }
});

module.exports = { router, initializeProductModel };



