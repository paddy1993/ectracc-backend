const { z } = require('zod');

// Carbon footprint tracking validation
const trackFootprintValidation = z.object({
  product_barcode: z.string().regex(/^[0-9]{8,14}$/).optional(),
  manual_item: z.string().min(1).max(100).optional(),
  amount: z.number().positive().max(10000), // max 10kg
  carbon_total: z.number().positive().max(100000), // max 100kg CO₂e
  category: z.enum(['food', 'transport', 'energy', 'shopping', 'misc']),
  logged_at: z.string().datetime().optional() // ISO datetime string
}).refine(
  (data) => data.product_barcode || data.manual_item,
  {
    message: "Either product_barcode or manual_item must be provided",
    path: ["product_barcode", "manual_item"]
  }
);

// History query validation
const historyValidation = z.object({
  period: z.enum(['weekly', 'monthly']).default('weekly'),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  page: z.number().int().positive().max(100).default(1),
  limit: z.number().int().positive().max(100).default(50)
});

// Goals validation
const goalValidation = z.object({
  target_value: z.number().positive().max(1000000), // max 1000kg CO₂e
  timeframe: z.enum(['weekly', 'monthly']),
  description: z.string().max(200).optional()
});

// Category validation for breakdown queries
const categoryBreakdownValidation = z.object({
  period: z.enum(['weekly', 'monthly']).default('monthly'),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional()
});

module.exports = {
  trackFootprintValidation,
  historyValidation,
  goalValidation,
  categoryBreakdownValidation
};



