import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { CycleData, calculateGains, formatCurrency, formatValuation, formatMultiple } from "@/lib/calculations";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Props {
  cycles: CycleData[];
}

interface WaterfallRow {
  label: string;
  fmt: string;
  muted?: boolean;
  bold?: boolean;
  highlight?: boolean;
  negative?: boolean;
}

function WaterfallCard({ cycle, valuation }: { cycle: CycleData; valuation: number }) {
  const gain = calculateGains(cycle, valuation);
  const isPositive = gain.grossGain >= 0;

  const baseRows = [
    { label: "Gross Position Value", fmt: formatCurrency(gain.grossValue) },
    { label: "− Net Invested Capital", fmt: `-${formatCurrency(cycle.netInvested)}`, muted: true },
    { label: "= Gross Gain", fmt: formatCurrency(gain.grossGain), bold: true, highlight: isPositive, negative: !isPositive },
  ];

  const carryRows = cycle.memberClass === 'A'
    ? [
        {
          label: gain.valuationMultiple <= 6.25
            ? "− Carry: $0 (below 6.25× pref)"
            : "− Carry (22.5% on excess above 6.25×)",
          fmt: `-${formatCurrency(gain.totalCarry)}`,
          muted: true,
        },
      ]
    : [
        { label: "− Carry Tier 1 (20%, 1×–6.25×)", fmt: `-${formatCurrency(gain.carryTier1)}`, muted: true },
        { label: "− Carry Tier 2 (22.5%, >6.25×)", fmt: `-${formatCurrency(gain.carryTier2)}`, muted: true },
      ];

  const bottomRows = [
    { label: "= Net Gain to LP", fmt: formatCurrency(gain.netGain), bold: true, highlight: isPositive, negative: !isPositive },
    { label: "Net Multiple on Outlay", fmt: formatMultiple(gain.netMultipleOnOutlay), bold: true, highlight: gain.netMultipleOnOutlay >= 1, negative: gain.netMultipleOnOutlay < 1 },
  ];

  const rows = [...baseRows, ...carryRows, ...bottomRows];

  return (
    <Card className="p-5 bg-card border-border">
      <h4 className="font-semibold text-foreground mb-1">{cycle.label}</h4>
      <p className="text-xs text-muted-foreground mb-4">Class {cycle.memberClass} Member</p>
      <div className="space-y-2.5 text-sm">
        {rows.map((r, i) => (
          <div key={i} className="flex justify-between items-center">
            <span className={r.muted ? 'text-muted-foreground' : 'text-secondary-foreground'}>{r.label}</span>
            <span className={`font-mono-nums ${r.bold ? 'font-semibold' : ''} ${r.highlight ? 'text-gain-positive' : ''} ${r.negative ? 'text-gain-negative' : ''} ${r.muted ? 'text-muted-foreground' : ''}`}>
              {r.fmt}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function PaperGainsCalculator({ cycles }: Props) {
  const [valuation, setValuation] = useState(7_500_000_000);
  const [inputText, setInputText] = useState("7500000000");

  const gains = cycles.map(c => calculateGains(c, valuation));
  const combinedNetGain = gains.reduce((s, g) => s + g.netGain, 0);
  const totalOutlay = cycles.reduce((s, c) => s + c.totalOutlay, 0);
  const totalNetInvested = cycles.reduce((s, c) => s + c.netInvested, 0);
  const blendedMultiple = (totalNetInvested + combinedNetGain) / totalOutlay;

  const chartData = [{
    name: "Net Gains at Selected Valuation",
    "Cycle 1": Math.max(0, gains[0]?.netGain || 0),
    "Cycle 2": Math.max(0, gains[1]?.netGain || 0),
  }];

  const handleSlider = (v: number[]) => {
    const val = v[0];
    setValuation(val);
    setInputText(String(val));
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setInputText(raw);
    const num = parseInt(raw);
    if (!isNaN(num) && num >= 500_000_000 && num <= 50_000_000_000) {
      setValuation(num);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 bg-card border-border">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-2 block">Exit Valuation</label>
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
          <div className="w-48">
            <label className="text-xs text-muted-foreground mb-2 block">Manual Input ($)</label>
            <Input
              value={inputText}
              onChange={handleInput}
              className="font-mono-nums bg-secondary border-border"
            />
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Selected</p>
            <p className="text-xl font-bold font-mono-nums text-primary">{formatValuation(valuation)}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {cycles.map((cycle, i) => (
          <WaterfallCard key={i} cycle={cycle} valuation={valuation} />
        ))}
      </div>

      <Card className="p-5 gradient-emerald emerald-border-glow border">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Combined Net Gain</p>
            <p className={`text-lg font-bold font-mono-nums ${combinedNetGain >= 0 ? 'text-gain-positive' : 'text-gain-negative'}`}>{formatCurrency(combinedNetGain)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Outlay</p>
            <p className="text-lg font-bold font-mono-nums text-foreground">{formatCurrency(totalOutlay)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Blended Multiple</p>
            <p className={`text-lg font-bold font-mono-nums ${blendedMultiple >= 1 ? 'text-gain-positive' : 'text-gain-negative'}`}>{formatMultiple(blendedMultiple)}</p>
          </div>
        </div>
      </Card>

      <Card className="p-5 bg-card border-border">
        <h4 className="font-semibold text-foreground mb-4">Net Gains Breakdown</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(160 10% 16%)" />
            <XAxis dataKey="name" tick={{ fill: 'hsl(150 5% 55%)', fontSize: 12 }} />
            <YAxis tick={{ fill: 'hsl(150 5% 55%)', fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: 'hsl(160 12% 9%)', border: '1px solid hsl(160 10% 16%)', borderRadius: 8, color: 'hsl(150 10% 92%)' }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend />
            <Bar dataKey="Cycle 1" fill="hsl(152, 68%, 45%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Cycle 2" fill="hsl(152, 40%, 25%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
