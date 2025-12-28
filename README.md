# Lighter Strat Analyzer

> Real-time cryptocurrency pattern scanner using "The Strat" trading methodology for Lighter.xyz perpetual futures markets.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://lighter-strat-analyzer.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 🚀 Live Application

**Frontend:** https://lighter-strat-analyzer.vercel.app  
**Backend API:** https://lighter-strat-api.onrender.com

## ✨ Features

- **12 Markets:** BTC, ETH, SOL, DOGE, PEPE, WIF, WLD, XRP, LINK, AVAX, FARTCOIN, HYPE
- **Multiple Timeframes:** 1m, 5m, 15m, 30m, 1h, 4h, 12h, 1d, 1w
- **Real-Time Pattern Detection:** Inside Bar, Directional Up/Down, Outside Bar
- **Predictive Signals:** Setup patterns and triggered breakouts
- **Interactive Charts:** Click any market for detailed candlestick analysis
- **Dark Cyberpunk UI:** Neon accents with smooth animations

## 🎯 The Strat Patterns

| Pattern | Color | Meaning |
|---------|-------|---------|
| **1** (Inside Bar) | 🟡 Yellow | Consolidation - potential breakout setup |
| **2U** (Directional Up) | 🟢 Green | Bullish directional movement |
| **2D** (Directional Down) | 🔴 Red | Bearish directional movement |
| **3** (Outside Bar) | 🩷 Pink | Volatility expansion |

## 🛠️ Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite
- tRPC v11 (type-safe API)
- Tailwind CSS
- Wouter (routing)

**Backend:**
- Node.js + Express
- tRPC v11
- TypeScript
- Lighter.xyz API integration

## 📦 Project Structure

```
lighter-strat-analyzer/
├── client/              # Frontend (Vite + React)
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Home & Chart pages
│   │   └── lib/         # tRPC client
│   └── package.json
├── server/              # Backend (Express + tRPC)
│   ├── lib/             # API clients & analyzers
│   ├── routers/         # tRPC routers
│   └── index.ts
├── shared/              # Shared types & constants
│   └── types.ts         # ⭐ Edit here to add/remove markets
└── package.json
```

## 🚀 Local Development

### Prerequisites
- Node.js 18+ 
- npm or pnpm

### Setup

```bash
# Clone repository
git clone https://github.com/higherorderbit69/lighter-strat-analyzer.git
cd lighter-strat-analyzer

# Install dependencies
npm install
cd client && npm install && cd ..

# Terminal 1 - Start backend
npx tsx server/index.ts

# Terminal 2 - Start frontend
cd client && npm run dev
```

Open http://localhost:5173

## 🎨 Customizing Markets

Edit `shared/types.ts`:

```typescript
export const DEFAULT_MARKETS: Market[] = [
  { symbol: "BTC", marketIndex: 0, marketId: 1 },
  { symbol: "ETH", marketIndex: 1, marketId: 0 },
  // Add more markets here...
];
```

**Available Market IDs:** ETH (0), BTC (1), SOL (2), DOGE (3), 1000PEPE (4), WIF (5), WLD (6), XRP (7), LINK (8), AVAX (9)

## 🌐 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment guide.

**Quick Deploy:**
- **Frontend:** Vercel (auto-deploy on push)
- **Backend:** Render (auto-deploy on push)

## 📸 Screenshots

### Dashboard
![Dashboard showing 12 markets with real-time Strat patterns](docs/dashboard.png)

### Chart Detail
![Detailed candlestick chart with pattern labels](docs/chart-detail.png)

## 📝 License

MIT License - see [LICENSE](LICENSE) file

## 🙏 Acknowledgments

- **The Strat** methodology by Rob Smith
- **Lighter.xyz** for providing public API access
- **Manus** for UI inspiration

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📧 Contact

Created by [@higherorderbit69](https://github.com/higherorderbit69)

---

**⭐ Star this repo if you find it useful!**
