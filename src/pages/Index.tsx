import { useState, useEffect, useCallback, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { DEFAULT_CYCLES, CycleData, calculateGains, formatValuation, formatCurrency, formatMultiple, parseValuationInput } from "@/lib/calculations";
import InvestmentOverview from "@/components/InvestmentOverview";
import PaperGainsCalculator from "@/components/PaperGainsCalculator";
import ExitScenarioModeler from "@/components/ExitScenarioModeler";
import FundingTimeline, { DEFAULT_TIMELINE, TimelineEvent } from "@/components/FundingTimeline";
import { BarChart3, Calculator, Table2, Clock, TrendingUp } from "lucide-react";

const STORAGE_KEY = "fluidstack-tracker";

interface AppState {
  currentValuation: number;
  cycles: CycleData[];
  customExitRows: number[];
  timelineEvents: TimelineEvent[];
}

const defaultState: AppState = {
  currentValuation: 7_500_000_000,
  cycles: DEFAULT_CYCLES,
  customExitRows: [],
  timelineEvents: DEFAULT_TIMELINE,
};

function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...defaultState, ...JSON.parse(saved) };
  } catch {}
  return defaultState;
}

export default function Index() {
  const [state, setState] = useState<AppState>(loadState);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [valFocused, setValFocused] = useState(false);
  const [valInput, setValInput] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setLastUpdated(new Date());
  }, [state]);

  const gains = state.cycles.map(c => calculateGains(c, state.currentValuation));

  const handleValFocus = () => {
    setValFocused(true);
    setValInput(String(state.currentValuation));
  };

  const handleValBlur = () => {
    setValFocused(false);
    const parsed = parseValuationInput(valInput);
    if (parsed) setState(s => ({ ...s, currentValuation: parsed }));
  };

  const handleValChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setValInput(raw);
    const parsed = parseValuationInput(raw);
    if (parsed) setState(s => ({ ...s, currentValuation: parsed }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">FluidStack Tracker</h1>
              <p className="text-xs text-muted-foreground">Root Capital LLC SPV</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <label className="text-xs text-muted-foreground block">Current Mark:</label>
              <Input
                value={valFocused ? valInput : formatValuation(state.currentValuation)}
                onChange={handleValChange}
                onFocus={handleValFocus}
                onBlur={handleValBlur}
                className="w-40 font-mono-nums bg-secondary border-border text-sm"
              />
              <span className="text-xs text-muted-foreground mt-0.5 block">Enter value in $</span>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Stats Banner */}
      {(() => {
        const totalOutlay = state.cycles.reduce((s, c) => s + c.totalOutlay, 0);
        const totalNetInvested = state.cycles.reduce((s, c) => s + c.netInvested, 0);
        const combinedGrossValue = gains.reduce((s, g) => s + g.grossValue, 0);
        const combinedNetPosition = gains.reduce((s, g) => s + g.grossValue - g.totalCarry, 0);
        const blendedMultiple = combinedNetPosition / totalOutlay;
        const isPositive = combinedGrossValue >= totalNetInvested;
        const holdingMonths = (cycle: CycleData) =>
          Math.round((Date.now() - new Date(cycle.investmentDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        const Divider = () => <span className="border-r border-border/50 h-4" />;
        return (
          <div className="py-2 px-4 bg-secondary/50 border-b border-border">
            <div className="container max-w-7xl mx-auto flex items-center justify-center gap-6 text-xs flex-wrap">
              <span className="text-muted-foreground">Total Outlay: <span className="font-mono-nums text-foreground">{formatCurrency(totalOutlay)}</span></span>
              <Divider />
              <span className="text-muted-foreground">Net Invested: <span className="font-mono-nums text-foreground">{formatCurrency(totalNetInvested)}</span></span>
              <Divider />
              <span className="text-muted-foreground">Gross Value: <span className={`font-mono-nums ${isPositive ? 'text-gain-positive' : 'text-gain-negative'}`}>{formatCurrency(combinedGrossValue)}</span></span>
              <Divider />
              <span className="text-muted-foreground">Net Multiple: <span className={`font-mono-nums ${blendedMultiple >= 1 ? 'text-gain-positive' : 'text-gain-negative'}`}>{formatMultiple(blendedMultiple)}</span></span>
              <Divider />
              <span className="text-muted-foreground">C1 Holding: <span className="font-mono-nums text-foreground">{holdingMonths(state.cycles[0])} mo</span></span>
              <Divider />
              <span className="text-muted-foreground">C2 Holding: <span className="font-mono-nums text-foreground">{holdingMonths(state.cycles[1])} mo</span></span>
              <Divider />
              <span className="text-muted-foreground">Updated: {lastUpdated.toLocaleString()}</span>
            </div>
          </div>
        );
      })()}

      {/* Main */}
      <main className="container max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-secondary border border-border">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <BarChart3 className="w-4 h-4 mr-1.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="calculator" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <Calculator className="w-4 h-4 mr-1.5" /> Paper Gains
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <Table2 className="w-4 h-4 mr-1.5" /> Exit Scenarios
            </TabsTrigger>
            <TabsTrigger value="timeline" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <Clock className="w-4 h-4 mr-1.5" /> Funding Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <InvestmentOverview
              cycles={state.cycles}
              gains={gains}
              currentValuation={state.currentValuation}
              lastUpdated={lastUpdated}
            />
          </TabsContent>

          <TabsContent value="calculator">
            <PaperGainsCalculator cycles={state.cycles} />
          </TabsContent>

          <TabsContent value="scenarios">
            <ExitScenarioModeler
              cycles={state.cycles}
              currentValuation={state.currentValuation}
              customExitRows={state.customExitRows}
              onCustomExitRowsChange={(rows) => setState(s => ({ ...s, customExitRows: rows }))}
            />
          </TabsContent>

          <TabsContent value="timeline">
            <FundingTimeline
              events={state.timelineEvents}
              onEventsChange={(events) => setState(s => ({ ...s, timelineEvents: events }))}
            />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        For personal tracking only. Not financial advice. All gains are illiquid and unrealized.
      </footer>
    </div>
  );
}
