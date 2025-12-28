import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import type { Market, Timeframe, MarketAnalysis } from "@shared/types";
import { DEFAULT_MARKETS } from "@shared/types";
import { HudFrame } from "@/components/HudFrame";
import { MarketCard } from "@/components/MarketCard";
import { TimeframeSelector } from "@/components/TimeframeSelector";
import { MarketSelector } from "@/components/MarketSelector";
import { PatternLegend } from "@/components/PatternLegend";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Activity, Zap, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

const REFRESH_INTERVALS = [
  { value: "0", label: "Manual" },
  { value: "5000", label: "5s" },
  { value: "10000", label: "10s" },
  { value: "30000", label: "30s" },
  { value: "60000", label: "1m" },
];

const STORAGE_KEY = "lighter-selected-markets";

// Load selected markets from localStorage or use defaults
const loadSelectedMarkets = (): Market[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate that it's an array with proper market shape
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Failed to load selected markets from localStorage:", error);
  }
  return DEFAULT_MARKETS;
};

export default function Home() {
  const [selectedMarkets, setSelectedMarkets] = useState<Market[]>(loadSelectedMarkets);
  const [timeframe, setTimeframe] = useState<Timeframe>(() => {
    const stored = localStorage.getItem("lighter-timeframe");
    return (stored as Timeframe) || "15m";
  });
  const [refreshInterval, setRefreshInterval] = useState("30000");
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [, setLocation] = useLocation();

  // Fetch all available markets
  const { data: allMarkets, isLoading: marketsLoading } = trpc.strat.getMarkets.useQuery();

  // Analyze selected markets
  const {
    data: analyses,
    isLoading: analysisLoading,
    refetch,
    dataUpdatedAt,
  } = trpc.strat.analyzeMultipleMarkets.useQuery(
    {
      markets: selectedMarkets,
      timeframe,
      candleCount: 20,
    },
    {
      refetchInterval: refreshInterval === "0" ? false : parseInt(refreshInterval),
      staleTime: 5000,
    }
  );

  // Save selected markets to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedMarkets));
    } catch (error) {
      console.error("Failed to save selected markets to localStorage:", error);
    }
  }, [selectedMarkets]);

  // Save timeframe to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("lighter-timeframe", timeframe);
  }, [timeframe]);

  const handleToggleMarket = useCallback((market: Market) => {
    setSelectedMarkets((prev) => {
      const exists = prev.some((m) => m.marketId === market.marketId);
      if (exists) {
        return prev.filter((m) => m.marketId !== market.marketId);
      }
      return [...prev, market];
    });
  }, []);

  const handleMarketClick = (analysis: MarketAnalysis) => {
    setSelectedMarket(analysis.market);
    // Use 'default' as placeholder - Chart page will use its own saved timeframe preference
    setLocation(`/chart/${analysis.market.symbol}/${analysis.market.marketId}/default`);
  };

  // Count actionable setups
  const actionableCount = analyses?.filter((a) => a.actionableSetup).length || 0;

  return (
    <div className="min-h-screen bg-background cyber-grid">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Activity className="w-8 h-8 text-primary" />
                <div className="absolute inset-0 blur-lg bg-primary/50" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-wider text-foreground">
                  <span className="text-primary neon-glow-pink">STRAT</span>
                  <span className="text-secondary neon-glow-cyan"> SCANNER</span>
                </h1>
                <p className="text-xs text-muted-foreground tracking-widest">
                  LIGHTER.XYZ PERPETUALS
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <TimeframeSelector selected={timeframe} onChange={setTimeframe} />

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
                disabled={analysisLoading}
                className="gap-2 border-secondary/50 hover:bg-secondary/20 hover:border-secondary"
              >
                <RefreshCw className={cn("w-4 h-4", analysisLoading && "animate-spin")} />
                <span className="font-mono text-xs tracking-wider hidden sm:inline">REFRESH</span>
              </Button>

              <MarketSelector
                allMarkets={allMarkets || []}
                selectedMarkets={selectedMarkets}
                onToggleMarket={handleToggleMarket}
                isLoading={marketsLoading}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6 space-y-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <HudFrame className="bg-card/30">
            <div className="text-center">
              <div className="text-2xl font-bold font-mono text-foreground">
                {selectedMarkets.length}
              </div>
              <div className="text-xs text-muted-foreground tracking-wider">MARKETS</div>
            </div>
          </HudFrame>

          <HudFrame className="bg-card/30">
            <div className="text-center">
              <div className="text-2xl font-bold font-mono text-secondary neon-glow-cyan">
                {timeframe.toUpperCase()}
              </div>
              <div className="text-xs text-muted-foreground tracking-wider">TIMEFRAME</div>
            </div>
          </HudFrame>

          <HudFrame variant={actionableCount > 0 ? "highlight" : "default"} className="bg-card/30">
            <div className="text-center">
              <div className={cn(
                "text-2xl font-bold font-mono",
                actionableCount > 0 ? "text-[oklch(0.75_0.22_145)] neon-glow-green" : "text-foreground"
              )}>
                {actionableCount}
              </div>
              <div className="text-xs text-muted-foreground tracking-wider flex items-center justify-center gap-1">
                <Zap className="w-3 h-3" />
                SETUPS
              </div>
            </div>
          </HudFrame>

          <HudFrame className="bg-card/30">
            <div className="text-center">
              <div className="text-sm font-mono text-muted-foreground">
                {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "--:--:--"}
              </div>
              <div className="text-xs text-muted-foreground tracking-wider">LAST UPDATE</div>
            </div>
          </HudFrame>
        </div>

        {/* Pattern Legend */}
        <PatternLegend />

        {/* Market Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-widest text-muted-foreground">
              MARKET ANALYSIS
            </h2>
            {analysisLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Scanning...
              </div>
            )}
          </div>

          {analyses && analyses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
              {analyses.map((analysis) => (
                <MarketCard
                  key={analysis.market.marketIndex}
                  analysis={analysis}
                  onClick={() => handleMarketClick(analysis)}
                  selected={selectedMarket?.marketIndex === analysis.market.marketIndex}
                />
              ))}
            </div>
          ) : (
            <HudFrame className="bg-card/30">
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {analysisLoading ? "Loading market data..." : "No markets selected"}
                </p>
              </div>
            </HudFrame>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-4 mt-8">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Data from</span>
              <a
                href="https://lighter.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Lighter.xyz
              </a>
            </div>
            <div className="tracking-wider">
              THE STRAT PATTERN SCANNER v1.0
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
