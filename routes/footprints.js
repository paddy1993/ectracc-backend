const express = require('express');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('../middleware/auth');
const {
  trackFootprintValidation,
  historyValidation,
  goalValidation,
  categoryBreakdownValidation
} = require('../validation/footprintValidation');

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key'
);

// Rate limiting for footprint tracking
const trackingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 tracking requests per minute
  message: {
    success: false,
    error: 'Too many tracking requests, please try again later'
  }
});

// POST /api/footprints/track - Log a carbon footprint entry
router.post('/track', trackingLimiter, requireAuth, async (req, res) => {
  try {
    // Validate request body
    const validationResult = trackFootprintValidation.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.errors[0].message
      });
    }

    const {
      product_barcode,
      manual_item,
      amount,
      carbon_total,
      category,
      logged_at
    } = validationResult.data;

    const userId = req.user.id;
    const now = new Date().toISOString();

    // Prepare footprint data
    const footprintData = {
      user_id: userId,
      product_barcode: product_barcode || null,
      manual_item: manual_item || null,
      amount: amount,
      carbon_total: carbon_total,
      category: category,
      logged_at: logged_at || now,
      created_at: now,
      updated_at: now
    };

    // Insert into Supabase footprints table
    const { data: footprint, error } = await supabase
      .from('footprints')
      .insert([footprintData])
      .select()
      .single();

    if (error) {
      console.error('Supabase footprint insert error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to log footprint'
      });
    }

    res.json({
      success: true,
      data: footprint
    });
  } catch (error) {
    console.error('Track footprint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track carbon footprint'
    });
  }
});

// GET /api/footprints/history - Get user's footprint history
router.get('/history', requireAuth, async (req, res) => {
  try {
    // Validate query parameters
    const validationResult = historyValidation.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.errors[0].message
      });
    }

    const { period, start_date, end_date, page, limit } = validationResult.data;
    const userId = req.user.id;

    // Calculate date range if not provided
    const endDate = end_date ? new Date(end_date) : new Date();
    const startDate = start_date ? new Date(start_date) : (() => {
      const date = new Date(endDate);
      if (period === 'weekly') {
        date.setDate(date.getDate() - 30); // Last 30 days for weekly view
      } else {
        date.setMonth(date.getMonth() - 12); // Last 12 months for monthly view
      }
      return date;
    })();

    // Build query for aggregated data
    let query = supabase
      .from('footprints')
      .select('carbon_total, category, logged_at')
      .eq('user_id', userId)
      .gte('logged_at', startDate.toISOString())
      .lte('logged_at', endDate.toISOString())
      .order('logged_at', { ascending: true });

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: footprints, error } = await query;

    if (error) {
      console.error('Supabase footprint history error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch footprint history'
      });
    }

    // Aggregate data by period
    const aggregatedData = aggregateFootprintData(footprints, period);

    res.json({
      success: true,
      data: {
        period,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        aggregated: aggregatedData,
        raw_data: footprints
      }
    });
  } catch (error) {
    console.error('Footprint history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get footprint history'
    });
  }
});

// GET /api/footprints/category-breakdown - Get category breakdown
router.get('/category-breakdown', requireAuth, async (req, res) => {
  try {
    // Validate query parameters
    const validationResult = categoryBreakdownValidation.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.errors[0].message
      });
    }

    const { period, start_date, end_date } = validationResult.data;
    const userId = req.user.id;

    // Calculate date range
    const endDate = end_date ? new Date(end_date) : new Date();
    const startDate = start_date ? new Date(start_date) : (() => {
      const date = new Date(endDate);
      if (period === 'weekly') {
        date.setDate(date.getDate() - 7);
      } else {
        date.setMonth(date.getMonth() - 1);
      }
      return date;
    })();

    // Get footprint data grouped by category
    const { data: footprints, error } = await supabase
      .from('footprints')
      .select('category, carbon_total')
      .eq('user_id', userId)
      .gte('logged_at', startDate.toISOString())
      .lte('logged_at', endDate.toISOString());

    if (error) {
      console.error('Supabase category breakdown error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch category breakdown'
      });
    }

    // Aggregate by category
    const categoryTotals = footprints.reduce((acc, footprint) => {
      acc[footprint.category] = (acc[footprint.category] || 0) + footprint.carbon_total;
      return acc;
    }, {});

    // Convert to chart-ready format
    const chartData = Object.entries(categoryTotals).map(([category, total]) => ({
      category,
      value: Math.round(total * 100) / 100, // Round to 2 decimal places
      percentage: 0 // Will be calculated on frontend
    }));

    const totalCarbon = chartData.reduce((sum, item) => sum + item.value, 0);
    chartData.forEach(item => {
      item.percentage = totalCarbon > 0 ? Math.round((item.value / totalCarbon) * 100) : 0;
    });

    res.json({
      success: true,
      data: {
        period,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        categories: chartData,
        total_carbon: Math.round(totalCarbon * 100) / 100
      }
    });
  } catch (error) {
    console.error('Category breakdown error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get category breakdown'
    });
  }
});

// GET /api/footprints/goals - Get user's goals
router.get('/goals', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: goals, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase goals fetch error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch goals'
      });
    }

    res.json({
      success: true,
      data: goals
    });
  } catch (error) {
    console.error('Goals fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get goals'
    });
  }
});

// POST /api/footprints/goals - Create or update goal
router.post('/goals', requireAuth, async (req, res) => {
  try {
    // Validate request body
    const validationResult = goalValidation.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.errors[0].message
      });
    }

    const { target_value, timeframe, description } = validationResult.data;
    const userId = req.user.id;
    const now = new Date().toISOString();

    // Check if goal already exists for this timeframe
    const { data: existingGoal } = await supabase
      .from('goals')
      .select('id')
      .eq('user_id', userId)
      .eq('timeframe', timeframe)
      .single();

    let result;
    const goalData = {
      user_id: userId,
      target_value,
      timeframe,
      description: description || null,
      updated_at: now
    };

    if (existingGoal) {
      // Update existing goal
      result = await supabase
        .from('goals')
        .update(goalData)
        .eq('id', existingGoal.id)
        .select()
        .single();
    } else {
      // Create new goal
      goalData.created_at = now;
      result = await supabase
        .from('goals')
        .insert([goalData])
        .select()
        .single();
    }

    if (result.error) {
      console.error('Supabase goal upsert error:', result.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to save goal'
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Goal creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create or update goal'
    });
  }
});

// Helper function to aggregate footprint data by period
function aggregateFootprintData(footprints, period) {
  const aggregated = {};

  footprints.forEach(footprint => {
    const date = new Date(footprint.logged_at);
    let key;

    if (period === 'weekly') {
      // Group by week (Monday as start of week)
      const monday = new Date(date);
      monday.setDate(date.getDate() - date.getDay() + 1);
      key = monday.toISOString().split('T')[0];
    } else {
      // Group by month
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    if (!aggregated[key]) {
      aggregated[key] = {
        period: key,
        total_carbon: 0,
        count: 0,
        categories: {}
      };
    }

    aggregated[key].total_carbon += footprint.carbon_total;
    aggregated[key].count += 1;
    
    const category = footprint.category;
    aggregated[key].categories[category] = (aggregated[key].categories[category] || 0) + footprint.carbon_total;
  });

  // Convert to array and sort by period
  return Object.values(aggregated)
    .map(item => ({
      ...item,
      total_carbon: Math.round(item.total_carbon * 100) / 100
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

module.exports = router;



