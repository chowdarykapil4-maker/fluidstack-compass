import { useState, type ChangeEvent } from "react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  CycleData,
  calculateGains,
  formatCurrency,
  formatValuation,
  formatMultiple,
  parseValuationInput,
  shortLabel,
} from "@/lib/calculations";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface Props {
  cycles: CycleData[];
  currentValuation: number;
  onValuationChange: (val: number) => void;
}

const VALUATION_POINTS = [1e9, 2.5e9, 5e9, 7.5e9, 10e9, 15e9, 20e9, 30e9, 50e9, 75e9, 100e9, 150e9, 200e9];

const VALUATION_PRESETS: { value: number; label: string }[] = [
  { value: 7_500_000_000, label: "$7.5B" },
  { value: 10_000_000_000, label: "$10B" },
  { value: 15_000_000_000, label: "$15B" },
  { value: 20_000_000_000, label: "$20B" },
  { value: 30_000_000_000, label: "$30B" },
  { value: 50_000_000_000, label: "$50B" },
];

function UnifiedCycleCard({ cycle, valuation }: { cycle: CycleData; valuation: number }) {
  const gain = calculateGains(cycle, valuation);
  const isNetPositive = gain.netGain >= 0;

  return (
    <Card className="p-4 bg-card border-border">
      <div className="space-y-1 mb-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">{cycle.label}</h4>
          <span className="text-xs text-muted-foreground">Class {cycle.memberClass}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(cycle.investmentDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          {" · "}Entry at <span className="font-mono-nums text-foreground">{formatValuation(cycle.entryValuation)}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono-nums text-foreground">{formatCurrency(cycle.netInvested)}</span> invested
          {" · "}<span className="font-mono-nums text-foreground">{formatCurrency(cycle.managementFee)}</span> fee
          {" · "}<span className="font-mono-nums text-foreground">{formatCurrency(cycle.totalOutlay)}</span> total outlay
        </p>
        <p className="text-primary text-xs italic">
          {cycle.memberClass === "A" ? "20% carry up to 6.25×, then 22.5% above" : "Carry from 1× on all gains (22.5%)"}
        </p>
      </div>

      <div className="border-t border-border my-3" />

      <div className="space-y-2 text-sm">
        <Row label="Valuation Multiple" value={formatMultiple(gain.valuationMultiple)} />
        <Row label="Gross Value" value={formatCurrency(gain.grossValue)} />
        <Row label="Gross Gain" value={formatCurrency(gain.grossGain)} highlight={gain.grossGain > 0} negative={gain.grossGain < 0} />
        {cycle.memberClass === "A" ? (
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
          <span className="text-secondary-foreground text-sm font-semibold">Your Net Gain</span>
          <span
            className={`font-mono-nums font-semibold text-lg ${isNetPositive ? "text-gain-positive" : ""} ${!isNetPositive && gain.netGain !== 0 ? "text-gain-negative" : ""}`}
          >
            {formatCurrency(gain.netGain)}
          </span>
        </div>
        <Row label="Net Multiple" value={formatMultiple(gain.netMultipleOnOutlay)} muted />
      </div>
    </Card>
  );
}

function Row({
  label,
  value,
  muted,
  bold,
  highlight,
  negative,
  large,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
  highlight?: boolean;
  negative?: boolean;
  large?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground text-xs" : "text-secondary-foreground text-sm"}>{label}</span>
      <span
        className={`font-mono-nums ${bold ? "font-semibold" : ""} ${large ? "text-base" : "text-sm"} ${highlight ? "text-gain-positive" : ""} ${negative ? "text-gain-negative" : ""} ${muted ? "text-muted-foreground text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function Dashboard({ cycles, currentValuation, onValuationChange }: Props) {
  const [inputText, setInputText] = useState("");
  const [inputFocused, setInputFocused] = useState(false);

  const valuation = currentValuation;
  const setValuation = onValuationChange;

  const totalOutlay = cycles.reduce((s, c) => s + c.totalOutlay, 0);
  const cycleCount = cycles.length;

  const chartData = VALUATION_POINTS.map((v) => {
    const g = cycles.map((c) => calculateGains(c, v));
    const entry: Record<string, number | string> = { valuation: v, label: formatValuation(v) };
    cycles.forEach((c, i) => {
      entry[shortLabel(c)] = g[i]?.netGain || 0;
    });
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
    if (parsed && parsed >= 500_000_000 && parsed <= 200_000_000_000) setValuation(parsed);
  };

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, "");
    setInputText(raw);
    const parsed = parseValuationInput(raw);
    if (parsed && parsed >= 500_000_000 && parsed <= 50_000_000_000) setValuation(parsed);
  };

  return (
    <div className="space-y-4">
      <div className="bg-primary/[0.03] border border-primary/15 rounded-lg px-3 py-2 sm:px-4 sm:py-3 space-y-1 sm:space-y-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
          <div className="shrink-0 text-center sm:text-left">
            <p className="text-base sm:text-xl font-semibold font-mono-nums text-primary">
              <span className="text-[11px] font-normal uppercase tracking-wider text-muted-foreground mr-1.5">Valuation</span>
              {formatValuation(valuation)}
            </p>
          </div>
          <div className="w-full sm:w-auto flex-1 flex items-center gap-2 min-h-[44px] sm:min-h-0">
            <span className="text-[11px] text-muted-foreground shrink-0">$500M</span>
            <Slider
              value={[valuation]}
              onValueChange={handleSlider}
              min={500_000_000}
              max={50_000_000_000}
              step={100_000_000}
              className="flex-1"
            />
            <span className="text-[11px] text-muted-foreground shrink-0">$50B</span>
          </div>
          <Input
            value={inputFocused ? inputText : formatValuation(valuation)}
            onChange={handleInput}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="e.g. 12"
            className="hidden sm:block font-mono-nums bg-secondary border-border text-xs h-8 w-20 text-center shrink-0"
          />
        </div>
        <div className="flex flex-nowrap gap-1.5">
          {VALUATION_PRESETS.map((p) => {
            const isActive = valuation === p.value;
            return (
              <button
                key={p.value}
                onClick={() => setValuation(p.value)}
                className={`flex-1 font-mono-nums text-xs rounded-md border px-2 py-1 transition-colors ${
                  isActive
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-secondary/30 border-border text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-primary/10" />
        <span className="text-[11px] uppercase tracking-wider text-primary/30">
          {cycleCount} position{cycleCount !== 1 ? "s" : ""} · ${Math.round(totalOutlay).toLocaleString()} deployed
        </span>
        <div className="flex-1 h-px bg-primary/10" />
      </div>

      <div className={`grid grid-cols-1 ${cycleCount > 1 ? "md:grid-cols-2" : ""} gap-4`}>
        {cycles.map((cycle, i) => (
          <UnifiedCycleCard key={i} cycle={cycle} valuation={valuation} />
        ))}
      </div>

      <Card className="p-3 sm:p-5 bg-card border-border">
        <h4 className="text-sm font-medium text-foreground mb-2">Net Gains Across Valuations</h4>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(160 10% 16%)" />
            <XAxis dataKey="label" tick={{ fill: "hsl(150 5% 55%)", fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: "hsl(150 5% 55%)", fontSize: 12 }} tickFormatter={(v) => { const abs = Math.abs(v); const formatted = abs >= 1000 ? '$' + (abs / 1000).toFixed(0) + 'k' : '$' + abs.toFixed(0); return v < 0 ? '-' + formatted : formatted; }} />
            <Tooltip
              wrapperStyle={{ maxWidth: "180px" }}
              contentStyle={{ background: "hsl(160 12% 9%)", border: "1px solid hsl(160 10% 16%)", borderRadius: 8, color: "hsl(150 10% 92%)" }}
              itemStyle={{ fontSize: 11 }}
              labelStyle={{ fontSize: 11 }}
              formatter={(value: number) => "$" + Math.round(value).toLocaleString()}
            />
            {cycleCount > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            <ReferenceLine x={selectedLabel} stroke="hsl(152, 68%, 45%)" strokeDasharray="4 4" label={{ value: "Selected", fill: "hsl(152, 68%, 45%)", fontSize: 11, position: "top" }} />
            {cycles.map((c, i) => (
              <Line key={c.label} type="monotone" dataKey={shortLabel(c)} stroke={i === 0 ? "hsl(152, 68%, 45%)" : "hsl(152, 40%, 35%)"} strokeWidth={2} strokeDasharray={i > 0 ? "6 3" : undefined} dot={{ r: 2 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
