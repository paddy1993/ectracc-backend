const Joi = require('joi');

// Search query validation
const searchValidation = Joi.object({
  q: Joi.string().max(100).trim().allow('').optional(),
  category: Joi.alternatives().try(
    Joi.string().max(50),
    Joi.array().items(Joi.string().max(50)).max(10)
  ).optional(),
  ecoScore: Joi.alternatives().try(
    Joi.string().valid('A', 'B', 'C', 'D', 'E'),
    Joi.array().items(Joi.string().valid('A', 'B', 'C', 'D', 'E')).max(5)
  ).optional(),
  page: Joi.number().integer().min(1).max(1000).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  sortBy: Joi.string().valid('relevance', 'carbon_asc', 'carbon_desc').default('relevance')
});

// Barcode validation
const barcodeValidation = Joi.object({
  code: Joi.string()
    .pattern(/^[0-9]{8,14}$/)
    .required()
    .messages({
      'string.pattern.base': 'Barcode must be 8-14 digits'
    })
});

// Pagination validation for with-footprint endpoint
const paginationValidation = Joi.object({
  page: Joi.number().integer().min(1).max(1000).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20)
});

// Alternatives validation
const alternativesValidation = Joi.object({
  id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    'string.pattern.base': 'Invalid product ID format'
  }),
  limit: Joi.number().integer().min(1).max(10).default(5)
});

module.exports = {
  searchValidation,
  barcodeValidation,
  paginationValidation,
  alternativesValidation
};



