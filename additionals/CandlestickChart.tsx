import { useEffect, useRef } from "react";
import type { StratCandle, StratPatternType } from "@shared/types";
import { cn } from "@/lib/utils";

interface CandlestickChartProps {
  candles: StratCandle[];
  width?: number;
  height?: number;
  className?: string;
}

const PATTERN_COLORS: Record<StratPatternType, string> = {
  "1": "#22d3ee", // cyan
  "2U": "#4ade80", // green
  "2D": "#f87171", // red
  "3": "#f472b6", // pink
};

export function CandlestickChart({
  candles,
  width = 800,
  height = 400,
  className,
}: CandlestickChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = "rgba(0, 0, 0, 0)";
    ctx.fillRect(0, 0, width, height);

    // Calculate price range
    const prices = candles.flatMap((c) => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    const padding = priceRange * 0.1;

    // Chart dimensions
    const chartPadding = { top: 30, right: 60, bottom: 40, left: 10 };
    const chartWidth = width - chartPadding.left - chartPadding.right;
    const chartHeight = height - chartPadding.top - chartPadding.bottom;

    // Candle dimensions
    const candleWidth = Math.max(4, (chartWidth / candles.length) * 0.7);
    const candleGap = (chartWidth - candleWidth * candles.length) / (candles.length - 1 || 1);

    // Helper functions
    const priceToY = (price: number) => {
      return (
        chartPadding.top +
        chartHeight -
        ((price - minPrice + padding) / (priceRange + 2 * padding)) * chartHeight
      );
    };

    const indexToX = (index: number) => {
      return chartPadding.left + index * (candleWidth + candleGap) + candleWidth / 2;
    };

    // Draw grid lines
    ctx.strokeStyle = "rgba(244, 114, 182, 0.1)";
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = chartPadding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(chartPadding.left, y);
      ctx.lineTo(width - chartPadding.right, y);
      ctx.stroke();

      // Price labels
      const price = maxPrice + padding - ((priceRange + 2 * padding) / gridLines) * i;
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.fillText(price.toFixed(2), width - chartPadding.right + 5, y + 3);
    }

    // Draw candles
    candles.forEach((candle, index) => {
      const x = indexToX(index);
      const openY = priceToY(candle.open);
      const closeY = priceToY(candle.close);
      const highY = priceToY(candle.high);
      const lowY = priceToY(candle.low);

      const isBullish = candle.close >= candle.open;
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.abs(closeY - openY) || 1;

      // Candle color based on direction
      const candleColor = isBullish ? "#4ade80" : "#f87171";

      // Draw wick
      ctx.strokeStyle = candleColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw body
      ctx.fillStyle = candleColor;
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

      // Draw pattern indicator
      if (candle.patternType) {
        const patternColor = PATTERN_COLORS[candle.patternType];
        
        // Pattern dot above candle
        ctx.beginPath();
        ctx.arc(x, highY - 8, 3, 0, Math.PI * 2);
        ctx.fillStyle = patternColor;
        ctx.fill();

        // Glow effect
        ctx.beginPath();
        ctx.arc(x, highY - 8, 5, 0, Math.PI * 2);
        ctx.fillStyle = `${patternColor}40`;
        ctx.fill();

        // Pattern label for last few candles
        if (index >= candles.length - 5) {
          ctx.fillStyle = patternColor;
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "center";
          ctx.fillText(candle.patternType, x, highY - 15);
        }
      }
    });

    // Draw time labels
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    const labelInterval = Math.ceil(candles.length / 6);
    candles.forEach((candle, index) => {
      if (index % labelInterval === 0) {
        const x = indexToX(index);
        const date = new Date(candle.timestamp);
        const label = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
        ctx.fillText(label, x, height - chartPadding.bottom + 15);
      }
    });

  }, [candles, width, height]);

  return (
    <div className={cn("relative", className)}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width, height }}
      />
    </div>
  );
}
