import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { CycleData, calculateGains, formatCurrency, formatValuation, formatMultiple, parseValuationInput } from "@/lib/calculations";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
  cycles: CycleData[];
  currentValuation: number;
  onValuationChange: (val: number) => void;
}

const VALUATION_POINTS = [500e6, 1e9, 2.5e9, 5e9, 7.5e9, 10e9, 12.5e9, 15e9, 17.5e9, 20e9, 25e9, 30e9, 35e9, 40e9, 50e9];

const VALUATION_PRESETS: { value: number; label: string; sub?: string }[] = [
  { value: 1_200_000_000, label: "$1.2B", sub: "C1 entry" },
  { value: 7_500_000_000, label: "$7.5B", sub: "Current" },
  { value: 10_000_000_000, label: "$10B" },
  { value: 15_000_000_000, label: "$15B" },
  { value: 20_000_000_000, label: "$20B" },
  { value: 30_000_000_000, label: "$30B" },
  { value: 50_000_000_000, label: "$50B" },
];

const FUNDING_ROUNDS = [
  { round: "Seed $3M", date: "Mar 2019", investors: "Seedcamp, Mercuri", highlight: false },
  { round: "SAFE $24.7M", date: "2024", investors: "Various", highlight: false },
  { round: "Debt $37.5M", date: "2024", investors: "Macquarie", highlight: false },
  { round: "Series A $200M", date: "Feb 2025", investors: "$1.2B", highlight: true },
  { round: "Series B $450M", date: "Jan 2026", investors: "$7.5B", highlight: true },
];

function GainCard({ cycle, valuation }: { cycle: CycleData; valuation: number }) {
  const gain = calculateGains(cycle, valuation);
  const isPositive = gain.grossGain >= 0;
  const isNetPositive = gain.netGain >= 0;

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground">{cycle.label}</h4>
        <span className="text-xs text-muted-foreground">Class {cycle.memberClass}</span>
      </div>
      <div className="space-y-2 text-sm">
        <Row label="Valuation Multiple" value={formatMultiple(gain.valuationMultiple)} />
        <Row label="Gross Value" value={formatCurrency(gain.grossValue)} />
        <Row label="Gross Gain" value={formatCurrency(gain.grossGain)} highlight={isPositive} negative={!isPositive} />
        {cycle.memberClass === 'A' ? (
          <>
            <Row label="Carry Tier 1 (20%, up to 6.25×)" value={`-${formatCurrency(gain.carryTier1)}`} muted />
            <Row label="Carry Tier 2 (22.5%, above 6.25×)" value={`-${formatCurrency(gain.carryTier2)}`} muted />
          </>
        ) : (
          <Row
            label={gain.grossGain <= 0 ? "Carry: $0 (no gain)" : "Carry (22.5% on gains)"}
            value={`-${formatCurrency(gain.totalCarry)}`}
            muted
          />
        )}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <span className="text-secondary-foreground text-sm font-semibold">Net Gain to LP</span>
          <span className={`font-mono-nums font-semibold text-lg ${isNetPositive ? 'text-gain-positive' : ''} ${!isNetPositive && gain.netGain !== 0 ? 'text-gain-negative' : ''}`}>
            {formatCurrency(gain.netGain)}
          </span>
        </div>
        <Row label="Net Multiple" value={formatMultiple(gain.netMultipleOnOutlay)} muted />
      </div>
    </Card>
  );
}

function Row({ label, value, muted, bold, highlight, negative, large }: {
  label: string; value: string; muted?: boolean; bold?: boolean; highlight?: boolean; negative?: boolean; large?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? 'text-muted-foreground text-xs' : 'text-secondary-foreground text-sm'}>{label}</span>
      <span className={`font-mono-nums ${bold ? 'font-semibold' : ''} ${large ? 'text-base' : 'text-sm'} ${highlight ? 'text-gain-positive' : ''} ${negative ? 'text-gain-negative' : ''} ${muted ? 'text-muted-foreground text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}

export default function Dashboard({ cycles, currentValuation, onValuationChange }: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [inputFocused, setInputFocused] = useState(false);

  const valuation = currentValuation;
  const setValuation = onValuationChange;

  const totalOutlay = cycles.reduce((s, c) => s + c.totalOutlay, 0);
  const cycleCount = cycles.length;

  const chartData = VALUATION_POINTS.map(v => {
    const g = cycles.map(c => calculateGains(c, v));
    const combined = g.reduce((s, x) => s + x.netGain, 0);
    const entry: Record<string, number | string> = { valuation: v, label: formatValuation(v), Combined: combined };
    cycles.forEach((c, i) => { entry[c.label] = g[i]?.netGain || 0; });
    return entry;
  });
  const selectedLabel = formatValuation(valuation);

  const handleSlider = (v: number[]) => setValuation(v[0]);

  const handleInputFocus = () => {
    setInputFocused(true);
    setInputText(String(valuation));
  };
  const handleInputBlur = () => {
    setInputFocused(false);
    const parsed = parseValuationInput(inputText);
    if (parsed && parsed >= 500_000_000 && parsed <= 50_000_000_000) setValuation(parsed);
  };
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setInputText(raw);
    const parsed = parseValuationInput(raw);
    if (parsed && parsed >= 500_000_000 && parsed <= 50_000_000_000) setValuation(parsed);
  };

  return (
    <div className="space-y-4">
      {/* Section 1: Investment Details (collapsible) */}
      <div className="border border-border rounded-lg bg-card/50">
        <button
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-secondary/30 transition-colors rounded-lg"
        >
          <span className="text-muted-foreground">
            <span className="text-foreground font-medium">Investment Details</span>
            <span className="ml-3 text-xs">{cycleCount} position{cycleCount !== 1 ? 's' : ''} · ${Math.round(totalOutlay).toLocaleString()} deployed · {cycles.map(c => `Class ${c.memberClass}`).join(' + ')}</span>
          </span>
          {detailsOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {detailsOpen && (
          <div className="px-4 pb-4 space-y-3">
            <div className={`grid grid-cols-1 ${cycleCount > 1 ? 'lg:grid-cols-2' : ''} gap-3`}>
              {cycles.map((cycle, i) => (
                <div key={i} className="rounded-md border border-border bg-secondary/30 px-4 py-3 text-xs space-y-1">
                  <p className="text-foreground font-medium text-sm">{cycle.label} <span className="text-muted-foreground font-normal">· Class {cycle.memberClass} Member · {cycle.fundEntity}</span></p>
                  <p className="text-muted-foreground">Date: {new Date(cycle.investmentDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · Round: {cycle.roundName}</p>
                  <p className="text-muted-foreground">Entry: <span className="font-mono-nums text-foreground">{formatValuation(cycle.entryValuation)}</span> · Outlay: <span className="font-mono-nums text-foreground">{formatCurrency(cycle.totalOutlay)}</span> · Fee: <span className="font-mono-nums text-foreground">{formatCurrency(cycle.managementFee)}</span></p>
                  <p className="text-muted-foreground">Net Invested: <span className="font-mono-nums text-foreground">{formatCurrency(cycle.netInvested)}</span></p>
                  <p className="text-primary text-xs italic">{cycle.memberClass === 'A' ? '6.25× preferred return, no carry below threshold' : 'Carry from 1× on all gains (22.5%)'}</p>
                </div>
              ))}
            </div>

            {/* Funding History */}
            <div className="rounded-md border border-border bg-secondary/30 px-4 py-3">
              <p className="text-xs font-medium text-foreground mb-1.5">FluidStack Funding History</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {FUNDING_ROUNDS.map((r, i) => (
                  <span key={i}>
                    {i > 0 && <span className="mx-1.5">→</span>}
                    <span className={r.highlight ? 'text-primary' : ''}>{r.round}</span>
                    <span className="mx-0.5">·</span>
                    <span className={r.highlight ? 'text-primary' : ''}>{r.date}</span>
                    <span className="mx-0.5">·</span>
                    <span className={r.highlight ? 'text-primary' : ''}>{r.investors}</span>
                  </span>
                ))}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Total raised: ~$715M across 5 rounds</p>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Compact Valuation Control Strip */}
      <div className="bg-primary/[0.03] border border-primary/15 rounded-lg px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Left: label + value */}
          <div className="shrink-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Valuation</p>
            <p className="text-xl font-semibold font-mono-nums text-primary">{formatValuation(valuation)}</p>
          </div>

          {/* Center: slider */}
          <div className="flex-1 flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground shrink-0">$500M</span>
            <Slider
              value={[valuation]}
              onValueChange={handleSlider}
              min={500_000_000}
              max={50_000_000_000}
              step={100_000_000}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground shrink-0">$50B</span>
          </div>

          {/* Right: direct entry */}
          <Input
            value={inputFocused ? inputText : formatValuation(valuation)}
            onChange={handleInput}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="e.g. 12"
            className="font-mono-nums bg-secondary border-border text-xs h-8 w-20 text-center shrink-0"
          />
        </div>
      </div>

      {/* Preset pills */}
      <div className="flex gap-1.5 flex-wrap">
        {VALUATION_PRESETS.map(p => {
          const isActive = valuation === p.value;
          return (
            <button
              key={p.value}
              onClick={() => setValuation(p.value)}
              className={`font-mono-nums text-xs rounded-md border px-2.5 py-1.5 transition-colors ${
                isActive
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-secondary/30 border-border text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
              }`}
            >
              {p.label}
              {p.sub && <span className="block text-[9px] leading-tight opacity-70">{p.sub}</span>}
            </button>
          );
        })}
      </div>

      {/* Contextual divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-primary/10" />
        <span className="text-[10px] uppercase tracking-wider text-primary/30">Your positions at this mark</span>
        <div className="flex-1 h-px bg-primary/10" />
      </div>

      {/* Gain cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {cycles.map((cycle, i) => (
          <GainCard key={i} cycle={cycle} valuation={valuation} />
        ))}
      </div>

      {/* Section 3: Gains Visualization */}
      <Card className="p-5 bg-card border-border">
        <h4 className="font-semibold text-foreground mb-4">Net Gains Across Valuations</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(160 10% 16%)" />
            <XAxis dataKey="label" tick={{ fill: 'hsl(150 5% 55%)', fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: 'hsl(150 5% 55%)', fontSize: 12 }} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v.toFixed(0)}`} />
            <Tooltip
              contentStyle={{ background: 'hsl(160 12% 9%)', border: '1px solid hsl(160 10% 16%)', borderRadius: 8, color: 'hsl(150 10% 92%)' }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend />
            <ReferenceLine x={selectedLabel} stroke="hsl(152, 68%, 45%)" strokeDasharray="4 4" label={{ value: "Selected", fill: "hsl(152, 68%, 45%)", fontSize: 11, position: "top" }} />
            {cycleCount > 1 && <Line type="monotone" dataKey="Combined" stroke="hsl(150, 10%, 92%)" strokeWidth={2.5} dot={{ r: 3 }} />}
            {cycles.map((c, i) => (
              <Line key={c.label} type="monotone" dataKey={c.label} stroke={i === 0 ? "hsl(152, 68%, 45%)" : "hsl(152, 40%, 35%)"} strokeWidth={2} strokeDasharray={i > 0 ? "6 3" : undefined} dot={{ r: 2.5 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
