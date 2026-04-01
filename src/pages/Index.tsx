import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserProfile, DEFAULT_PROFILE, buildCycles, calculateGains, formatValuation, formatCurrency, formatMultiple } from "@/lib/calculations";
import Dashboard from "@/components/Dashboard";
import ExitScenarioModeler from "@/components/ExitScenarioModeler";
import SettingsModal from "@/components/SettingsModal";
import { BarChart3, Table2, TrendingUp, Settings } from "lucide-react";

const STORAGE_KEY = "fluidstack-compass";
const STORAGE_VERSION = 3;

interface AppState {
  _version: number;
  currentValuation: number;
  profile: UserProfile;
  customExitRows: number[];
  hasCompletedSetup: boolean;
}

const defaultState: AppState = {
  _version: STORAGE_VERSION,
  currentValuation: 7_500_000_000,
  profile: DEFAULT_PROFILE,
  customExitRows: [],
  hasCompletedSetup: false,
};

function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed._version === STORAGE_VERSION) {
        return { ...defaultState, ...parsed };
      }
    }
  } catch {}
  return defaultState;
}

export default function Index() {
  const [state, setState] = useState<AppState>(loadState);
  const [settingsOpen, setSettingsOpen] = useState(!state.hasCompletedSetup);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const cycles = buildCycles(state.profile);
  const gains = cycles.map(c => calculateGains(c, state.currentValuation));

  const handleValuationChange = (val: number) => {
    setState(s => ({ ...s, currentValuation: val }));
  };

  const handleProfileSave = (profile: UserProfile) => {
    setState(s => ({ ...s, profile, hasCompletedSetup: true }));
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
              <h1 className="text-lg font-bold text-foreground">
                FluidStack Compass{state.profile.name && state.profile.name !== "Investor" ? ` · ${state.profile.name}` : ""}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono-nums text-primary font-semibold bg-primary/10 px-3 py-1.5 rounded-md border border-primary/20">
              Mark: {formatValuation(state.currentValuation)}
            </span>
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        profile={state.profile}
        onSave={handleProfileSave}
        isFirstTime={!state.hasCompletedSetup}
      />

      {/* Quick Stats Banner */}
      {cycles.length > 0 && (() => {
        const totalOutlay = cycles.reduce((s, c) => s + c.totalOutlay, 0);
        const totalNetInvested = cycles.reduce((s, c) => s + c.netInvested, 0);
        const combinedGrossValue = gains.reduce((s, g) => s + g.grossValue, 0);
        const totalCarry = gains.reduce((s, g) => s + g.totalCarry, 0);
        const combinedNetGain = combinedGrossValue - totalNetInvested - totalCarry;
        const combinedNetPosition = gains.reduce((s, g) => s + g.grossValue - g.totalCarry, 0);
        const blendedMultiple = combinedNetPosition / totalOutlay;
        const holdingMonths = (investmentDate: string) =>
          Math.round((Date.now() - new Date(investmentDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        const Divider = () => <span className="border-r border-border/50 h-4" />;

        const holdingText = cycles.map((c, i) => {
          const mo = holdingMonths(c.investmentDate);
          return `C${i + 1}: ${mo} mo`;
        }).join(" · ");

        return (
          <div className="py-2 px-4 bg-secondary/50 border-b border-border">
            <div className="container max-w-7xl mx-auto flex items-center justify-center gap-6 text-xs">
              <span className="text-muted-foreground">Gross Value: <span className={`font-mono-nums ${combinedGrossValue >= totalNetInvested ? 'text-gain-positive' : 'text-gain-negative'}`}>{formatCurrency(combinedGrossValue)}</span></span>
              <Divider />
              <span className="text-muted-foreground">Net Gain: <span className={`font-mono-nums ${combinedNetGain >= 0 ? 'text-gain-positive' : 'text-gain-negative'}`}>{formatCurrency(combinedNetGain)}</span></span>
              <Divider />
              <span className="text-muted-foreground">Net Multiple: <span className={`font-mono-nums ${blendedMultiple >= 1 ? 'text-gain-positive' : 'text-gain-negative'}`}>{formatMultiple(blendedMultiple)}</span></span>
              <Divider />
              <span className="text-muted-foreground"><span className="font-mono-nums text-foreground">{holdingText}</span></span>
            </div>
          </div>
        );
      })()}

      {/* Main */}
      <main className="container max-w-7xl mx-auto px-4 py-6">
        {cycles.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg mb-2">No cycles enabled</p>
            <p className="text-sm">Enable at least one cycle in <button onClick={() => setSettingsOpen(true)} className="text-primary underline">Settings</button> to start tracking.</p>
          </div>
        ) : (
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="bg-secondary border border-border">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                <BarChart3 className="w-4 h-4 mr-1.5" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="scenarios" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                <Table2 className="w-4 h-4 mr-1.5" /> Exit Scenarios
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <Dashboard
                cycles={cycles}
                currentValuation={state.currentValuation}
                onValuationChange={handleValuationChange}
              />
            </TabsContent>

            <TabsContent value="scenarios">
              <ExitScenarioModeler
                cycles={cycles}
                currentValuation={state.currentValuation}
                customExitRows={state.customExitRows}
                onCustomExitRowsChange={(rows) => setState(s => ({ ...s, customExitRows: rows }))}
              />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        For personal tracking only. Not financial advice. All gains are illiquid and unrealized.
      </footer>
    </div>
  );
}
