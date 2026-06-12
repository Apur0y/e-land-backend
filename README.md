# ELand Backend

Backend server for **ELand** — an AI-powered land investment platform that helps users make smarter property decisions through price prediction, risk analysis, and ROI calculation.

🔗 **API Base URL:** [e-land-backend.onrender.com/api](https://e-land-backend.onrender.com/api)

---

## Overview

ELand helps investors and buyers evaluate land/property investments using built-in AI-driven analysis. This backend powers the core platform — handling data, authentication, and the AI logic behind price predictions, risk scoring, and ROI calculations.

## Features

- 🤖 **AI Price Prediction** — estimates land/property value based on input data
- ⚠️ **Risk Analysis** — evaluates investment risk factors
- 📈 **ROI Calculation** — projects potential return on investment
- 🔐 **Authentication & Authorization**
- 🗄️ **RESTful API** for the ELand frontend

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Express.js | Web framework |
| TypeScript | Type safety |
| MongoDB | Database |
| Mongoose | ODM |
| Docker | Containerization |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- MongoDB instance (local or cloud, e.g. MongoDB Atlas)

### Installation

```bash
# Clone the repository
git clone https://github.com/Apur0y/e-land-backend.git

# Navigate into the project directory
cd e-land-backend

# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the root directory with the required configuration (e.g. `PORT`, `DATABASE_URL`, `JWT_SECRET`, etc.).

### Running the Server

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

### Running with Docker

```bash
docker build -t e-land-backend .
docker run -p 5000:5000 e-land-backend
```

## Project Structure

```
e-land-backend/
├── src/                 # Application source code
├── Dockerfile           # Docker configuration
├── package.json         # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── railway.json          # Deployment configuration
```

## Author

**Apur0y**

- GitHub: [@Apur0y](https://github.com/Apur0y)
