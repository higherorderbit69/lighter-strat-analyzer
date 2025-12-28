import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import type { Timeframe, StratPatternType } from "@shared/types";
import { TIMEFRAMES } from "@shared/types";
import { HudFrame } from "@/components/HudFrame";
import { CandlestickChart } from "@/components/CandlestickChart";
import { TimeframeSelector } from "@/components/TimeframeSelector";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Minus, Zap, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const REFRESH_INTERVALS = [
  { value: "0", label: "Manual" },
  { value: "5000", label: "5s" },
  { value: "10000", label: "10s" },
  { value: "30000", label: "30s" },
  { value: "60000", label: "1m" },
];

const patternIcons: Record<StratPatternType, React.ReactNode> = {
  "1": <Minus className="w-5 h-5" />,
  "2U": <TrendingUp className="w-5 h-5" />,
  "2D": <TrendingDown className="w-5 h-5" />,
  "3": <Zap className="w-5 h-5" />,
};

const patternNames: Record<StratPatternType, string> = {
  "1": "Inside Bar",
  "2U": "Directional Up",
  "2D": "Directional Down",
  "3": "Outside Bar",
};

const patternColors: Record<StratPatternType, { text: string; bg: string; glow: string }> = {
  "1": { text: "text-secondary", bg: "bg-secondary/15", glow: "neon-glow-cyan" },
  "2U": { text: "text-[oklch(0.75_0.22_145)]", bg: "bg-[oklch(0.75_0.22_145/0.15)]", glow: "neon-glow-green" },
  "2D": { text: "text-destructive", bg: "bg-destructive/15", glow: "neon-glow-red" },
  "3": { text: "text-primary", bg: "bg-primary/15", glow: "neon-glow-pink" },
};

export default function Chart() {
  const params = useParams<{ symbol: string; marketId: string; timeframe: string }>();
  const [, setLocation] = useLocation();

  const symbol = params.symbol || "BTC";
  const marketId = parseInt(params.marketId || "1", 10);

  const [timeframe, setTimeframe] = useState<Timeframe>(() => {
    // Priority: localStorage > URL param > default
    // Use same key as Home page so timeframe is shared across pages
    const stored = localStorage.getItem("lighter-timeframe");
    if (stored && TIMEFRAMES.includes(stored as Timeframe)) {
      return stored as Timeframe;
    }
    if (params.timeframe && TIMEFRAMES.includes(params.timeframe as Timeframe)) {
      return params.timeframe as Timeframe;
    }
    return "15m";
  });
  const [refreshInterval, setRefreshInterval] = useState("30000");
  const [candleCount, setCandleCount] = useState(() => {
    const stored = localStorage.getItem("lighter-chart-candlecount");
    return stored ? parseInt(stored, 10) : 50;
  });

  // Fetch candle data
  const {
    data,
    isLoading,
    refetch,
    dataUpdatedAt,
  } = trpc.strat.getCandles.useQuery(
    {
      marketId,
      timeframe,
      candleCount,
    },
    {
      refetchInterval: refreshInterval === "0" ? false : parseInt(refreshInterval),
      staleTime: 5000,
    }
  );

  // Save timeframe and candleCount to localStorage
  useEffect(() => {
    // Use same key as Home page to keep timeframe in sync
    localStorage.setItem("lighter-timeframe", timeframe);
  }, [timeframe]);

  useEffect(() => {
    localStorage.setItem("lighter-chart-candlecount", candleCount.toString());
  }, [candleCount]);

  const handleTimeframeChange = (tf: Timeframe) => {
    setTimeframe(tf);
    setLocation(`/chart/${symbol}/${marketId}/${tf}`);
  };

  const currentCandle = data?.candles[data.candles.length - 1];
  const currentPattern = currentCandle?.patternType;
  const patternStyle = currentPattern ? patternColors[currentPattern] : null;

  // Calculate chart dimensions based on container
  const [chartDimensions, setChartDimensions] = useState({ width: 800, height: 400 });

  useEffect(() => {
    const updateDimensions = () => {
      const container = document.getElementById("chart-container");
      if (container) {
        setChartDimensions({
          width: container.clientWidth - 32,
          height: Math.min(500, window.innerHeight * 0.5),
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  return (
    <div className="min-h-screen bg-background cyber-grid">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Back & Title */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>

              <div>
                <h1 className="text-xl font-bold tracking-wider">
                  <span className="text-primary neon-glow-pink">{symbol}</span>
                  <span className="text-muted-foreground text-sm ml-2">PERP</span>
                </h1>
                <p className="text-xs text-muted-foreground tracking-widest">
                  STRAT PATTERN ANALYSIS
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <TimeframeSelector selected={timeframe} onChange={handleTimeframeChange} />

              <Select value={candleCount.toString()} onValueChange={(v) => setCandleCount(parseInt(v))}>
                <SelectTrigger className="w-24 h-9 bg-card/50 border-border/50 font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="150">150</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Select value={refreshInterval} onValueChange={setRefreshInterval}>
                  <SelectTrigger className="w-24 h-9 bg-card/50 border-border/50 font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REFRESH_INTERVALS.map((interval) => (
                      <SelectItem key={interval.value} value={interval.value}>
                        {interval.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
                className="gap-2 border-secondary/50 hover:bg-secondary/20 hover:border-secondary"
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Current Price */}
          <HudFrame className="bg-card/30">
            <div className="text-center">
              <div className="text-xs text-muted-foreground tracking-wider mb-1">PRICE</div>
              <div className="text-2xl font-bold font-mono text-foreground">
                ${currentCandle?.close.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6
                }) || "--"}
              </div>
            </div>
          </HudFrame>

          {/* Current Pattern */}
          <HudFrame
            variant={currentPattern === "3" ? "alert" : currentPattern ? "highlight" : "default"}
            className="bg-card/30"
          >
            <div className="text-center">
              <div className="text-xs text-muted-foreground tracking-wider mb-1">PATTERN</div>
              {currentPattern && patternStyle ? (
                <div className={cn("flex items-center justify-center gap-2", patternStyle.text)}>
                  {patternIcons[currentPattern]}
                  <span className={cn("text-lg font-bold", patternStyle.glow)}>
                    {patternNames[currentPattern]}
                  </span>
                </div>
              ) : (
                <div className="text-lg font-bold text-muted-foreground">--</div>
              )}
            </div>
          </HudFrame>

          {/* Pattern Sequence */}
          <HudFrame className="bg-card/30">
            <div className="text-center">
              <div className="text-xs text-muted-foreground tracking-wider mb-1">SEQUENCE</div>
              <div className="flex items-center justify-center gap-1">
                {data?.patternSequence.split("-").map((p, i) => {
                  const pStyle = patternColors[p as StratPatternType];
                  return (
                    <span
                      key={i}
                      className={cn(
                        "text-sm font-mono font-bold px-2 py-0.5 rounded",
                        pStyle ? pStyle.bg : "bg-muted",
                        pStyle ? pStyle.text : "text-muted-foreground"
                      )}
                    >
                      {p}
                    </span>
                  );
                })}
              </div>
            </div>
          </HudFrame>

          {/* Last Update */}
          <HudFrame className="bg-card/30">
            <div className="text-center">
              <div className="text-xs text-muted-foreground tracking-wider mb-1">UPDATED</div>
              <div className="text-lg font-mono text-muted-foreground">
                {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "--:--:--"}
              </div>
            </div>
          </HudFrame>
        </div>

        {/* Actionable Setup Alert */}
        {data?.actionableSetup && (
          <HudFrame
            variant="highlight"
            title="ACTIONABLE SETUP"
            className={cn(
              "pulse-border",
              data.actionableSetup.direction === "bullish"
                ? "bg-[oklch(0.75_0.22_145/0.1)]"
                : "bg-destructive/10"
            )}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Zap className={cn(
                  "w-8 h-8",
                  data.actionableSetup.direction === "bullish"
                    ? "text-[oklch(0.75_0.22_145)]"
                    : "text-destructive"
                )} />
                <div>
                  <div className={cn(
                    "text-lg font-bold tracking-wider",
                    data.actionableSetup.direction === "bullish"
                      ? "text-[oklch(0.75_0.22_145)] neon-glow-green"
                      : "text-destructive neon-glow-red"
                  )}>
                    {data.actionableSetup.pattern} - {data.actionableSetup.direction.toUpperCase()}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {data.actionableSetup.description}
                  </p>
                </div>
              </div>
              {data.actionableSetup.triggerPrice && (
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">TRIGGER</div>
                  <div className="text-xl font-mono font-bold text-foreground">
                    ${data.actionableSetup.triggerPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })}
                  </div>
                </div>
              )}
            </div>
          </HudFrame>
        )}

        {/* Chart */}
        <HudFrame title="PRICE ACTION" className="bg-card/30">
          <div id="chart-container" className="w-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : data?.candles && data.candles.length > 0 ? (
              <CandlestickChart
                candles={data.candles}
                width={chartDimensions.width}
                height={chartDimensions.height}
              />
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                No data available
              </div>
            )}
          </div>
        </HudFrame>

        {/* Pattern History Table */}
        <HudFrame title="RECENT PATTERNS" className="bg-card/30">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground tracking-wider">TIME</th>
                  <th className="text-right py-2 px-3 text-xs text-muted-foreground tracking-wider">OPEN</th>
                  <th className="text-right py-2 px-3 text-xs text-muted-foreground tracking-wider">HIGH</th>
                  <th className="text-right py-2 px-3 text-xs text-muted-foreground tracking-wider">LOW</th>
                  <th className="text-right py-2 px-3 text-xs text-muted-foreground tracking-wider">CLOSE</th>
                  <th className="text-center py-2 px-3 text-xs text-muted-foreground tracking-wider">PATTERN</th>
                </tr>
              </thead>
              <tbody>
                {data?.candles.slice(-10).reverse().map((candle, i) => {
                  const pStyle = candle.patternType ? patternColors[candle.patternType] : null;
                  const isBullish = candle.close >= candle.open;
                  return (
                    <tr key={i} className="border-b border-border/10 hover:bg-card/50">
                      <td className="py-2 px-3 font-mono text-muted-foreground">
                        {new Date(candle.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">{candle.open.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-mono text-[oklch(0.75_0.22_145)]">
                        {candle.high.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-destructive">
                        {candle.low.toFixed(2)}
                      </td>
                      <td className={cn(
                        "py-2 px-3 text-right font-mono font-bold",
                        isBullish ? "text-[oklch(0.75_0.22_145)]" : "text-destructive"
                      )}>
                        {candle.close.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {candle.patternType && pStyle ? (
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-bold",
                            pStyle.bg,
                            pStyle.text
                          )}>
                            {candle.patternType}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </HudFrame>
      </main>
    </div>
  );
}
