import { cn } from "@/lib/utils";
import type { Market } from "@shared/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Check, Plus, Search } from "lucide-react";
import { useState } from "react";

interface MarketSelectorProps {
  allMarkets: Market[];
  selectedMarkets: Market[];
  onToggleMarket: (market: Market) => void;
  isLoading?: boolean;
}

export function MarketSelector({
  allMarkets,
  selectedMarkets,
  onToggleMarket,
  isLoading,
}: MarketSelectorProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filteredMarkets = allMarkets.filter((m) =>
    m.symbol.toLowerCase().includes(search.toLowerCase())
  );

  const isSelected = (market: Market) =>
    selectedMarkets.some((m) => m.marketId === market.marketId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 !border !border-[#a855f7]/50 hover:bg-[#a855f7]/20 hover:!border-[#a855f7]"
        >
          <Plus className="w-4 h-4" />
          <span className="font-mono text-xs tracking-wider">ADD MARKETS</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-black/90 backdrop-blur-xl border-primary/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary neon-glow-pink tracking-wider">
            SELECT MARKETS
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-black/40 border-primary/30 focus:border-primary/50 font-mono text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground animate-pulse">Loading markets...</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filteredMarkets.map((market) => {
                const selected = isSelected(market);
                return (
                  <button
                    key={market.marketIndex}
                    onClick={() => onToggleMarket(market)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded border transition-all",
                      "hover:bg-primary/10 hover:border-primary/50",
                      selected
                        ? "border-primary bg-[#c026d3]/35"
                        : "border-border/20 bg-black/30"
                    )}
                  >
                    <span
                      className={cn(
                        "font-mono text-sm font-bold",
                        selected ? "text-primary" : "text-foreground"
                      )}
                    >
                      {market.symbol}
                    </span>
                    {selected && <Check className="w-4 h-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <span className="text-xs text-muted-foreground">
            {selectedMarkets.length} markets selected
          </span>
          <Button
            variant="default"
            size="sm"
            onClick={() => setOpen(false)}
            className="font-mono tracking-wider"
          >
            DONE
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
