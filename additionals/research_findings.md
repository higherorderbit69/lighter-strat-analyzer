# Research Findings: Lighter.xyz API and Strat Patterns

## Lighter.xyz API Details
- **Base URL**: `https://mainnet.zklighter.elliot.ai/api/v1`
- **Candlestick Endpoint**: `GET /candles`
  - **Parameters**:
    - `market_id`: (int16) e.g., BTC=1, ETH=0, SOL=2.
    - `resolution`: (string) `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `12h`, `1d`, `1w`.
    - `start_timestamp`: (integer)
    - `end_timestamp`: (integer)
    - `count_back`: (integer) Number of candles to return.
    - `set_timestamp_to_end`: (boolean) If true, timestamp is close time.
- **Market List**: `https://explorer.elliot.ai/api/markets`
  - Returns a list of symbols and their `market_index`.

## Strat Pattern Classification
The Strat methodology uses three basic candle types:
1. **Type 1 (Inside Bar)**: The current candle's high is lower than the previous high, and its low is higher than the previous low. (Consolidation)
2. **Type 2 (Directional Bar)**: The current candle breaks either the previous high or the previous low, but not both.
   - **2-Up**: Breaks previous high.
   - **2-Down**: Breaks previous low.
3. **Type 3 (Outside Bar)**: The current candle breaks both the previous high and the previous low. (Broadening/Volatility)

### Actionable Combinations (Examples)
- **2-1-2 Continuation**: A directional move followed by an inside bar, then another directional move in the same direction.
- **3-1-2 Reversal**: An outside bar followed by an inside bar, then a directional move.
- **2-2 Reversal**: Two consecutive directional bars in opposite directions.

## Implementation Plan
- **Backend**: Fetch candle data for selected markets and timeframes.
- **Logic**: Compare `high` and `low` of current candle (C) with previous candle (P).
  - `Type 1`: `C.high < P.high` AND `C.low > P.low`
  - `Type 2 Up`: `C.high > P.high` AND `C.low >= P.low`
  - `Type 2 Down`: `C.high <= P.high` AND `C.low < P.low`
  - `Type 3`: `C.high > P.high` AND `C.low < P.low`
- **Frontend**: Display a dashboard with market cards showing the current Strat pattern and actionable signals.
