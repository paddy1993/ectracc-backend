const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');

// MongoDB connection (placeholder for Phase 1)
let mongoClient;
let mongodb;

const connectMongoDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DATABASE || 'ectracc';
    
    console.log('📦 Connecting to MongoDB...');
    
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    mongodb = mongoClient.db(dbName);
    
    // Test the connection
    await mongodb.admin().ping();
    console.log('✅ Connected to MongoDB');
    
    return mongodb;
  } catch (error) {
    console.log('⚠️ MongoDB connection failed:', error.message);
    console.log('📝 Using test data mode for development');
    return null;
  }
};

const getMongoDb = () => {
  return mongodb; // Can return null if not connected
};

// Supabase connection (placeholder for Phase 1)
let supabase;

const initializeSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  console.log('🔐 Initializing Supabase...');
  
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
    console.log('⚠️ Supabase not configured - using placeholder mode');
    console.log('📝 Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables to enable Supabase');
    return;
  }
  
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false // Server-side doesn't need session persistence
      }
    });
    console.log('✅ Supabase connected successfully');
  } catch (error) {
    console.log('❌ Supabase connection failed:', error.message);
  }
};

const getSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase not initialized. Using placeholder for Phase 1.');
  }
  return supabase;
};

module.exports = {
  connectMongoDB,
  getMongoDb,
  initializeSupabase,
  getSupabase
};
