const { MongoClient, ObjectId } = require('mongodb');

class ProductModel {
  constructor(db) {
    this.db = db;
    this.collection = db.collection('products');
    this.initializeIndexes();
  }

  async initializeIndexes() {
    try {
      // Create indexes for optimal search performance
      await this.collection.createIndex({ barcode: 1 }, { unique: true });
      await this.collection.createIndex(
        { 
          product_name: 'text', 
          brands: 'text', 
          categories: 'text' 
        },
        { 
          name: 'product_search_text',
          weights: {
            product_name: 10,
            brands: 5,
            categories: 1
          }
        }
      );
      await this.collection.createIndex({ ecoscore_grade: 1 });
      await this.collection.createIndex({ carbon_footprint: 1 });
      await this.collection.createIndex({ categories: 1, ecoscore_grade: 1 });
      
      console.log('✅ Product indexes created successfully');
    } catch (error) {
      console.log('⚠️ Product indexes already exist or error:', error.message);
    }
  }

  // Search products with filters and pagination
  async search(options = {}) {
    const {
      query = '',
      category = null,
      ecoScore = null,
      page = 1,
      limit = 20,
      sortBy = 'relevance'
    } = options;

    const pipeline = [];
    const matchStage = {};

    // Text search if query provided
    if (query && query.trim()) {
      pipeline.push({
        $match: {
          $text: { $search: query.trim() }
        }
      });
      // Add text score for relevance sorting
      pipeline.push({
        $addFields: {
          score: { $meta: 'textScore' }
        }
      });
    }

    // Category filter
    if (category) {
      const categories = Array.isArray(category) ? category : [category];
      matchStage.categories = { 
        $in: categories.map(cat => new RegExp(cat, 'i'))
      };
    }

    // EcoScore filter
    if (ecoScore) {
      const ecoScores = Array.isArray(ecoScore) ? ecoScore : [ecoScore];
      matchStage.ecoscore_grade = { $in: ecoScores };
    }

    // Add match stage if we have filters
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Sorting
    const sortStage = {};
    switch (sortBy) {
      case 'carbon_asc':
        sortStage.carbon_footprint = 1;
        break;
      case 'carbon_desc':
        sortStage.carbon_footprint = -1;
        break;
      case 'relevance':
      default:
        if (query && query.trim()) {
          sortStage.score = { $meta: 'textScore' };
        } else {
          sortStage.product_name = 1;
        }
        break;
    }
    pipeline.push({ $sort: sortStage });

    // Project only needed fields
    pipeline.push({
      $project: {
        _id: 1,
        barcode: 1,
        product_name: 1,
        brands: 1,
        categories: 1,
        ecoscore_grade: 1,
        carbon_footprint: 1,
        last_updated: 1,
        score: query ? { $meta: 'textScore' } : undefined
      }
    });

    // Get total count
    const totalPipeline = [...pipeline];
    totalPipeline.push({ $count: 'total' });
    
    // Add pagination
    const skip = (page - 1) * limit;
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    try {
      const [results, countResult] = await Promise.all([
        this.collection.aggregate(pipeline).toArray(),
        this.collection.aggregate(totalPipeline).toArray()
      ]);

      const total = countResult.length > 0 ? countResult[0].total : 0;
      const hasMore = skip + results.length < total;

      return {
        data: results,
        pagination: {
          page,
          limit,
          total,
          hasMore,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  // Find product by barcode
  async findByBarcode(barcode) {
    try {
      const product = await this.collection.findOne(
        { barcode: barcode },
        {
          projection: {
            _id: 1,
            barcode: 1,
            product_name: 1,
            brands: 1,
            categories: 1,
            ecoscore_grade: 1,
            carbon_footprint: 1,
            nutrition_info: 1,
            last_updated: 1
          }
        }
      );
      return product;
    } catch (error) {
      throw new Error(`Barcode lookup failed: ${error.message}`);
    }
  }

  // Get products with carbon footprint data (for Phase 4)
  async getWithFootprint(page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const pipeline = [
        {
          $match: {
            carbon_footprint: { $exists: true, $ne: null, $gt: 0 }
          }
        },
        {
          $project: {
            _id: 1,
            barcode: 1,
            product_name: 1,
            brands: 1,
            categories: 1,
            ecoscore_grade: 1,
            carbon_footprint: 1
          }
        },
        { $sort: { carbon_footprint: 1 } },
        { $skip: skip },
        { $limit: limit }
      ];

      const countPipeline = [
        {
          $match: {
            carbon_footprint: { $exists: true, $ne: null, $gt: 0 }
          }
        },
        { $count: 'total' }
      ];

      const [results, countResult] = await Promise.all([
        this.collection.aggregate(pipeline).toArray(),
        this.collection.aggregate(countPipeline).toArray()
      ]);

      const total = countResult.length > 0 ? countResult[0].total : 0;
      const hasMore = skip + results.length < total;

      return {
        data: results,
        pagination: {
          page,
          limit,
          total,
          hasMore,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get products with footprint: ${error.message}`);
    }
  }

  // Get basic statistics
  async getStats() {
    try {
      const pipeline = [
        {
          $facet: {
            totalProducts: [{ $count: 'count' }],
            ecoScoreDistribution: [
              {
                $group: {
                  _id: '$ecoscore_grade',
                  count: { $sum: 1 }
                }
              },
              { $sort: { _id: 1 } }
            ],
            topCategories: [
              { $unwind: '$categories' },
              {
                $group: {
                  _id: '$categories',
                  count: { $sum: 1 }
                }
              },
              { $sort: { count: -1 } },
              { $limit: 10 }
            ],
            carbonFootprintStats: [
              {
                $match: {
                  carbon_footprint: { $exists: true, $ne: null, $gt: 0 }
                }
              },
              {
                $group: {
                  _id: null,
                  avg: { $avg: '$carbon_footprint' },
                  min: { $min: '$carbon_footprint' },
                  max: { $max: '$carbon_footprint' },
                  count: { $sum: 1 }
                }
              }
            ]
          }
        }
      ];

      const [result] = await this.collection.aggregate(pipeline).toArray();
      
      return {
        totalProducts: result.totalProducts[0]?.count || 0,
        ecoScoreDistribution: result.ecoScoreDistribution || [],
        topCategories: result.topCategories || [],
        carbonFootprintStats: result.carbonFootprintStats[0] || {
          avg: 0, min: 0, max: 0, count: 0
        }
      };
    } catch (error) {
      throw new Error(`Failed to get stats: ${error.message}`);
    }
  }

  // Suggest alternatives (same category, better eco score or lower carbon footprint)
  async getSuggestedAlternatives(productId, limit = 5) {
    try {
      const product = await this.collection.findOne({ _id: new ObjectId(productId) });
      if (!product) return [];

      const pipeline = [
        {
          $match: {
            _id: { $ne: new ObjectId(productId) },
            categories: { $in: product.categories || [] },
            $or: [
              {
                ecoscore_grade: {
                  $lt: product.ecoscore_grade || 'Z'
                }
              },
              {
                carbon_footprint: {
                  $lt: product.carbon_footprint || 999999,
                  $exists: true,
                  $ne: null
                }
              }
            ]
          }
        },
        {
          $project: {
            _id: 1,
            barcode: 1,
            product_name: 1,
            brands: 1,
            ecoscore_grade: 1,
            carbon_footprint: 1
          }
        },
        { $limit: limit }
      ];

      return await this.collection.aggregate(pipeline).toArray();
    } catch (error) {
      throw new Error(`Failed to get alternatives: ${error.message}`);
    }
  }
}

module.exports = ProductModel;



