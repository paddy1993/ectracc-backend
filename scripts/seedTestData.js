const { MongoClient } = require('mongodb');

// Test product data for Phase 3 development
const testProducts = [
  {
    barcode: '3017620422003',
    product_name: 'Nutella Spread',
    brands: ['Ferrero'],
    categories: ['Spreads', 'Sweet spreads', 'Chocolate spreads'],
    ecoscore_grade: 'D',
    carbon_footprint: 3.2,
    nutrition_info: {
      energy_100g: 2255,
      fat_100g: 30.9,
      saturated_fat_100g: 10.6,
      carbohydrates_100g: 57.5,
      sugars_100g: 56.3,
      proteins_100g: 6.3,
      salt_100g: 0.107
    },
    last_updated: new Date()
  },
  {
    barcode: '3017624047434',
    product_name: 'Organic Peanut Butter',
    brands: ['Earth Natural'],
    categories: ['Spreads', 'Nut spreads', 'Peanut butter'],
    ecoscore_grade: 'B',
    carbon_footprint: 1.8,
    nutrition_info: {
      energy_100g: 2580,
      fat_100g: 51.0,
      carbohydrates_100g: 12.0,
      proteins_100g: 26.0,
      salt_100g: 0.5
    },
    last_updated: new Date()
  },
  {
    barcode: '8076800195057',
    product_name: 'San Pellegrino Sparkling Water',
    brands: ['San Pellegrino'],
    categories: ['Beverages', 'Waters', 'Sparkling waters'],
    ecoscore_grade: 'A',
    carbon_footprint: 0.3,
    nutrition_info: {
      energy_100g: 0,
      carbohydrates_100g: 0,
      salt_100g: 0.036
    },
    last_updated: new Date()
  },
  {
    barcode: '3168930010883',
    product_name: 'Organic Bananas',
    brands: ['Bio Organic'],
    categories: ['Plant-based foods', 'Fruits', 'Fresh fruits', 'Bananas'],
    ecoscore_grade: 'A',
    carbon_footprint: 0.7,
    nutrition_info: {
      energy_100g: 371,
      carbohydrates_100g: 20.0,
      sugars_100g: 17.2,
      proteins_100g: 1.5,
      salt_100g: 0.001
    },
    last_updated: new Date()
  },
  {
    barcode: '4000417025005',
    product_name: 'Beef Burger Patties',
    brands: ['Premium Meat Co'],
    categories: ['Meats', 'Prepared meats', 'Beef preparations'],
    ecoscore_grade: 'E',
    carbon_footprint: 15.2,
    nutrition_info: {
      energy_100g: 1050,
      fat_100g: 20.0,
      proteins_100g: 18.0,
      salt_100g: 1.2
    },
    last_updated: new Date()
  },
  {
    barcode: '3560070014439',
    product_name: 'Whole Wheat Bread',
    brands: ['Artisan Bakery'],
    categories: ['Bakery products', 'Breads', 'Whole grain breads'],
    ecoscore_grade: 'B',
    carbon_footprint: 1.2,
    nutrition_info: {
      energy_100g: 1050,
      fat_100g: 3.5,
      carbohydrates_100g: 43.0,
      proteins_100g: 9.0,
      salt_100g: 1.1
    },
    last_updated: new Date()
  },
  {
    barcode: '3033710065967',
    product_name: 'Greek Yogurt Natural',
    brands: ['Mediterranean Dairy'],
    categories: ['Dairy products', 'Fermented dairy products', 'Yogurts'],
    ecoscore_grade: 'B',
    carbon_footprint: 2.1,
    nutrition_info: {
      energy_100g: 590,
      fat_100g: 10.0,
      carbohydrates_100g: 4.0,
      proteins_100g: 9.0,
      salt_100g: 0.13
    },
    last_updated: new Date()
  },
  {
    barcode: '8001505005707',
    product_name: 'Olive Oil Extra Virgin',
    brands: ['Italian Gold'],
    categories: ['Plant-based foods', 'Fats', 'Vegetable fats', 'Olive oils'],
    ecoscore_grade: 'A',
    carbon_footprint: 3.5,
    nutrition_info: {
      energy_100g: 3700,
      fat_100g: 100.0,
      saturated_fat_100g: 14.0
    },
    last_updated: new Date()
  },
  {
    barcode: '4099200177434',
    product_name: 'Dark Chocolate 70%',
    brands: ['Cacao Masters'],
    categories: ['Sweet snacks', 'Cocoa and derivatives', 'Dark chocolate'],
    ecoscore_grade: 'C',
    carbon_footprint: 4.8,
    nutrition_info: {
      energy_100g: 2190,
      fat_100g: 42.0,
      carbohydrates_100g: 24.0,
      sugars_100g: 22.0,
      proteins_100g: 12.0,
      salt_100g: 0.024
    },
    last_updated: new Date()
  },
  {
    barcode: '2000000000015',
    product_name: 'Organic Quinoa',
    brands: ['Healthy Grains'],
    categories: ['Plant-based foods', 'Cereals and potatoes', 'Cereals', 'Quinoa'],
    ecoscore_grade: 'A',
    carbon_footprint: 1.4,
    nutrition_info: {
      energy_100g: 1540,
      fat_100g: 6.1,
      carbohydrates_100g: 57.0,
      proteins_100g: 14.0,
      salt_100g: 0.013
    },
    last_updated: new Date()
  }
];

async function seedTestData() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DATABASE || 'ectracc';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🔗 Connected to MongoDB for seeding');
    
    const db = client.db(dbName);
    const collection = db.collection('products');
    
    // Check if products already exist
    const existingCount = await collection.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️ Products collection already has ${existingCount} documents`);
      console.log('Run with --force to override existing data');
      return;
    }
    
    // Insert test products
    const result = await collection.insertMany(testProducts);
    console.log(`✅ Inserted ${result.insertedCount} test products`);
    
    // Create indexes
    await collection.createIndex({ barcode: 1 }, { unique: true });
    await collection.createIndex({ 
      product_name: 'text', 
      brands: 'text', 
      categories: 'text' 
    });
    await collection.createIndex({ ecoscore_grade: 1 });
    await collection.createIndex({ carbon_footprint: 1 });
    await collection.createIndex({ categories: 1, ecoscore_grade: 1 });
    
    console.log('✅ Created product indexes');
    
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
  } finally {
    await client.close();
  }
}

// Run if called directly
if (require.main === module) {
  seedTestData().catch(console.error);
}

module.exports = { seedTestData, testProducts };



