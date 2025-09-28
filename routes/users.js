const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key'
);

// GET /api/users/profile - Get authenticated user profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user profile from Supabase
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    // Return user data with profile
    const response = {
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          email_confirmed_at: req.user.email_confirmed_at,
          created_at: req.user.created_at,
          updated_at: req.user.updated_at,
          last_sign_in_at: req.user.last_sign_in_at
        },
        profile: profile || null
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile'
    });
  }
});

// PUT /api/users/profile - Update user profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { display_name, avatar_url, sustainability_goal } = req.body;

    // Validate required fields
    if (!display_name || !display_name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Display name is required'
      });
    }

    const profileData = {
      user_id: userId,
      display_name: display_name.trim(),
      sustainability_goal: sustainability_goal || null,
      avatar_url: avatar_url || null,
      updated_at: new Date().toISOString()
    };

    // Try to update existing profile, or create new one
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    let result;
    if (existingProfile) {
      // Update existing profile
      result = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', userId)
        .select()
        .single();
    } else {
      // Create new profile
      profileData.created_at = new Date().toISOString();
      result = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single();
    }

    if (result.error) {
      throw result.error;
    }

    res.json({
      success: true,
      data: {
        profile: result.data
      }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user profile'
    });
  }
});

module.exports = router;



