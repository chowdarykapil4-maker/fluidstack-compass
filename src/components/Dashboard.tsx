import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { CycleData, GainResult, calculateGains, formatCurrency, formatValuation, formatMultiple, parseValuationInput } from "@/lib/calculations";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
  cycles: CycleData[];
  currentValuation: number;
  onValuationChange: (val: number) => void;
}

const VALUATION_POINTS = [500e6, 1e9, 2.5e9, 5e9, 7.5e9, 10e9, 12.5e9, 15e9, 17.5e9, 20e9, 25e9, 30e9, 35e9, 40e9, 50e9];

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
          <Row
            label={gain.valuationMultiple <= 6.25 ? "Carry: $0 (below 6.25× pref)" : "Carry (22.5% on excess)"}
            value={`-${formatCurrency(gain.totalCarry)}`}
            muted
          />
        ) : (
          <>
            <Row label="Carry Tier 1 (20%)" value={`-${formatCurrency(gain.carryTier1)}`} muted />
            <Row label="Carry Tier 2 (22.5%)" value={`-${formatCurrency(gain.carryTier2)}`} muted />
          </>
        )}
        <div className="border-t border-border my-1" />
        <Row label="Net Gain to LP" value={formatCurrency(gain.netGain)} highlight={isNetPositive} negative={!isNetPositive && gain.netGain !== 0} bold large />
        <Row label="Net Multiple" value={formatMultiple(gain.netMultipleOnOutlay)} highlight={gain.netMultipleOnOutlay >= 1} negative={gain.netMultipleOnOutlay < 1} />
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

  const gains = cycles.map(c => calculateGains(c, valuation));
  const totalOutlay = cycles.reduce((s, c) => s + c.totalOutlay, 0);
  const totalNetInvested = cycles.reduce((s, c) => s + c.netInvested, 0);
  const combinedGrossValue = gains.reduce((s, g) => s + g.grossValue, 0);
  const combinedNetGain = gains.reduce((s, g) => s + g.netGain, 0);
  const combinedNetPosition = gains.reduce((s, g) => s + g.grossValue - g.totalCarry, 0);
  const blendedMultiple = combinedNetPosition / totalOutlay;

  const areaChartData = VALUATION_POINTS.map(v => {
    const g = cycles.map(c => calculateGains(c, v));
    return {
      valuation: v,
      label: formatValuation(v),
      "Cycle 1": Math.max(0, g[0]?.netGain || 0),
      "Cycle 2": Math.max(0, g[1]?.netGain || 0),
    };
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
    <div className="space-y-5">
      {/* Section 1: Investment Details (collapsible) */}
      <div className="border border-border rounded-lg bg-card/50">
        <button
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-secondary/30 transition-colors rounded-lg"
        >
          <span className="text-muted-foreground">
            <span className="text-foreground font-medium">Investment Details</span>
            <span className="ml-3 text-xs">2 positions · {formatCurrency(totalOutlay)} total outlay · {formatCurrency(totalNetInvested)} net invested · Class A + B</span>
          </span>
          {detailsOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {detailsOpen && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 px-4 pb-4">
            {/* Cycle 1 detail card */}
            <div className="rounded-md border border-border bg-secondary/30 px-4 py-3 text-xs space-y-1">
              <p className="text-foreground font-medium text-sm">Cycle 1 — Series A <span className="text-muted-foreground font-normal">· Class A Member · TMC Fund 550 LLC</span></p>
              <p className="text-muted-foreground">Date: August 15, 2025 · Round: $200M Series A</p>
              <p className="text-muted-foreground">Entry: <span className="font-mono-nums text-foreground">{formatValuation(cycles[0].entryValuation)}</span> · Outlay: <span className="font-mono-nums text-foreground">{formatCurrency(cycles[0].totalOutlay)}</span> · Fee: <span className="font-mono-nums text-foreground">{formatCurrency(cycles[0].managementFee)}</span> (5%)</p>
              <p className="text-muted-foreground">Net Invested: <span className="font-mono-nums text-foreground">{formatCurrency(cycles[0].netInvested)}</span></p>
              <p className="text-primary text-xs italic">6.25× preferred return, no carry below threshold</p>
            </div>
            {/* Cycle 2 detail card */}
            <div className="rounded-md border border-border bg-secondary/30 px-4 py-3 text-xs space-y-1">
              <p className="text-foreground font-medium text-sm">Cycle 2 — Series B <span className="text-muted-foreground font-normal">· Class B Member · TMC Fund 230 LLC</span></p>
              <p className="text-muted-foreground">Date: January 29, 2026 · Round: $450M Series B</p>
              <p className="text-muted-foreground">Entry: <span className="font-mono-nums text-foreground">{formatValuation(cycles[1].entryValuation)}</span> · Outlay: <span className="font-mono-nums text-foreground">{formatCurrency(cycles[1].totalOutlay)}</span> · Fee: <span className="font-mono-nums text-foreground">{formatCurrency(cycles[1].managementFee)}</span> (7.5%)</p>
              <p className="text-muted-foreground">Net Invested: <span className="font-mono-nums text-foreground">{formatCurrency(cycles[1].netInvested)}</span></p>
              <p className="text-primary text-xs italic">Carry from 1× on all gains (20%/22.5%)</p>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Valuation Modeler */}
      <Card className="p-5 bg-card border-border">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-2 block">Modeled Exit Valuation</label>
            <Slider
              value={[valuation]}
              onValueChange={handleSlider}
              min={500_000_000}
              max={50_000_000_000}
              step={100_000_000}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>$500M</span><span>$50B</span>
            </div>
          </div>
          <div className="w-40">
            <label className="text-xs text-muted-foreground mb-1 block">Manual Input</label>
            <Input
              value={inputFocused ? inputText : formatValuation(valuation)}
              onChange={handleInput}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              className="font-mono-nums bg-secondary border-border text-sm"
            />
            <span className="text-xs text-muted-foreground mt-0.5 block">Enter value in $</span>
          </div>
          <div className="text-center md:text-right">
            <p className="text-2xl font-bold font-mono-nums text-primary">{formatValuation(valuation)}</p>
            {valuation !== currentValuation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setValuation(currentValuation)}
                className="text-xs text-muted-foreground hover:text-primary mt-1 h-auto py-1 px-2"
              >
                <RotateCcw className="w-3 h-3 mr-1" /> Reset to current mark
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Gain cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {cycles.map((cycle, i) => (
          <GainCard key={i} cycle={cycle} valuation={valuation} />
        ))}
      </div>

      {/* Combined summary banner */}
      <Card className="p-4 gradient-emerald emerald-border-glow border">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <Stat label="Total Outlay" value={formatCurrency(totalOutlay)} />
          <Stat label="Net Invested" value={formatCurrency(totalNetInvested)} />
          <Stat label="Combined Gross Value" value={formatCurrency(combinedGrossValue)} />
          <Stat label="Combined Net Gain" value={formatCurrency(combinedNetGain)} highlight={combinedNetGain >= 0} negative={combinedNetGain < 0} />
          <Stat label="Blended Multiple" value={formatMultiple(blendedMultiple)} highlight={blendedMultiple >= 1} negative={blendedMultiple < 1} />
        </div>
      </Card>

      {/* Section 3: Gains Visualization */}
      <Card className="p-5 bg-card border-border">
        <h4 className="font-semibold text-foreground mb-4">Net Gains Across Valuations</h4>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={areaChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(160 10% 16%)" />
            <XAxis dataKey="label" tick={{ fill: 'hsl(150 5% 55%)', fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: 'hsl(150 5% 55%)', fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: 'hsl(160 12% 9%)', border: '1px solid hsl(160 10% 16%)', borderRadius: 8, color: 'hsl(150 10% 92%)' }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend />
            <Area type="monotone" dataKey="Cycle 1" stackId="1" fill="hsl(152, 68%, 45%)" fillOpacity={0.3} stroke="hsl(152, 68%, 45%)" />
            <Area type="monotone" dataKey="Cycle 2" stackId="1" fill="hsl(152, 40%, 25%)" fillOpacity={0.3} stroke="hsl(152, 40%, 35%)" />
            <ReferenceLine x={selectedLabel} stroke="hsl(152, 68%, 45%)" strokeDasharray="4 4" label={{ value: "Selected", fill: "hsl(152, 68%, 45%)", fontSize: 11, position: "top" }} />
            {valuation !== currentValuation && (
              <ReferenceLine x={currentMarkLabel} stroke="hsl(150 5% 55%)" strokeDasharray="4 4" label={{ value: "Current", fill: "hsl(150 5% 55%)", fontSize: 11, position: "top" }} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

function Stat({ label, value, highlight, negative }: { label: string; value: string; highlight?: boolean; negative?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-base font-semibold font-mono-nums ${highlight ? 'text-gain-positive' : ''} ${negative ? 'text-gain-negative' : ''}`}>{value}</p>
    </div>
  );
}
