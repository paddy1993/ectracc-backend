# ECTRACC Backend API

**Phase 1: Project Setup & Architecture**

Node.js/Express backend for ECTRACC carbon footprint tracking application.

## 🛠️ Tech Stack

- **Node.js + Express.js** - REST API framework
- **MongoDB** - Product database (placeholder for Phase 1)
- **Supabase** - Authentication & user data (placeholder for Phase 1)
- **Security** - Helmet, CORS, compression
- **Logging** - Morgan + custom logger

## 🚀 Quick Start

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## 📡 API Endpoints

- `GET /` - API information
- `GET /api/healthcheck` - Detailed health status
- `GET /api/ping` - Simple ping test

## 🔧 Environment Variables

Create `.env` file:
```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=ectracc
SUPABASE_URL=placeholder
SUPABASE_ANON_KEY=placeholder
```

## 📁 Project Structure

```
backend/
├── config/          # Database configurations
├── routes/          # API route handlers  
├── controllers/     # Business logic (future phases)
├── models/          # Data models (future phases)
├── utils/           # Utility functions
├── index.js         # Express server
└── package.json     # Dependencies
```

## ✅ Phase 1 Features

- ✅ Express server with security middleware
- ✅ CORS configuration for frontend
- ✅ Health check endpoints
- ✅ Logging system
- ✅ Error handling
- ✅ Database placeholder connections
- ✅ Environment configuration
- ✅ Clean folder structure

## 🔄 Next Phases

- **Phase 2** - Authentication with Supabase
- **Phase 3** - Product search & barcode scanning
- **Phase 4** - Carbon tracking & analytics
- **Phase 5** - PWA features & mobile app



