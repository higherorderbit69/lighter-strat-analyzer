# Lighter Strat Analyzer - TODO

## Core Features
- [x] Fetch candlestick data from Lighter.xyz API for multiple crypto perpetual markets
- [x] Support configurable timeframes: 1m, 5m, 15m, 30m, 1h, 4h, 12h, 1d, 1w
- [x] Implement Strat pattern classification (Type 1, Type 2-Up, Type 2-Down, Type 3)
- [x] Display real-time market dashboard with current Strat pattern for each pair
- [x] Allow users to select reference timeframe and specific markets to monitor
- [x] Show pattern sequences (2-1-2, 3-1-2) and highlight actionable setups
- [x] Provide candlestick chart visualization with Strat pattern annotations
- [x] Auto-refresh market data at configurable intervals

## UI/UX
- [x] Cyberpunk aesthetic with deep black background
- [x] Neon pink and electric cyan typography with glow effects
- [x] Bold geometric sans-serif fonts
- [x] HUD-style elements with thin technical lines and corner brackets
- [x] Visual indicators for pattern types
- [x] Directional signals display

## Backend
- [x] tRPC procedures for fetching market data
- [x] Strat pattern classification algorithm
- [x] Market list endpoint from Lighter.xyz
- [x] Candlestick data endpoint with timeframe support

## Testing
- [x] Unit tests for Strat pattern classification logic
- [x] API integration tests

## Bug Fixes
- [ ] Fix refresh button not working on dashboard
