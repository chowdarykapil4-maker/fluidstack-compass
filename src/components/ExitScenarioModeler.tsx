import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CycleData, calculateGains, getCarryRateLabel, formatCurrency, formatValuation, formatMultiple } from "@/lib/calculations";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  cycles: CycleData[];
  currentValuation: number;
  customExitRows: number[];
  onCustomExitRowsChange: (rows: number[]) => void;
}

const PRESET_VALUATIONS = [1e9, 2.5e9, 5e9, 7.5e9, 10e9, 15e9, 20e9, 30e9, 50e9];

function shortLabel(cycle: CycleData): string {
  const num = cycle.label.match(/\d+/)?.[0] || "";
  const round = cycle.roundName.replace(/^\$[\d.]+[MBK]?\s*/, "");
  return `C${num} (${round})`;
}

export default function ExitScenarioModeler({ cycles, currentValuation, customExitRows, onCustomExitRowsChange }: Props) {
  const [newVal, setNewVal] = useState("");

  const allValuations = [...PRESET_VALUATIONS, ...customExitRows].sort((a, b) => a - b);

  const tableData = allValuations.map(v => {
    const g = cycles.map(c => calculateGains(c, v));
    const combinedNetGain = g.reduce((s, x) => s + x.netGain, 0);
    const totalOutlay = cycles.reduce((s, c) => s + c.totalOutlay, 0);
    const combinedNetPosition = g.reduce((s, x) => s + x.grossValue - x.totalCarry, 0);
    const combinedMultiple = combinedNetPosition / totalOutlay;
    const carryRates = cycles.map(c => getCarryRateLabel(c, v));
    return { valuation: v, gains: g, combinedNetGain, combinedMultiple, carryRates, isCustom: customExitRows.includes(v) };
  });

  const chartData = tableData.map(d => {
    const entry: Record<string, number | string> = { valuation: d.valuation, label: formatValuation(d.valuation) };
    cycles.forEach((c, i) => { entry[shortLabel(c)] = d.gains[i]?.netGain || 0; });
    return entry;
  });

  const addRow = () => {
    const num = parseFloat(newVal.replace(/[^0-9.]/g, ''));
    if (!isNaN(num) && num > 0) {
      const val = num >= 1000 ? num : num * 1_000_000_000;
      if (!allValuations.includes(val)) {
        onCustomExitRowsChange([...customExitRows, val]);
      }
    }
    setNewVal("");
  };

  const c1StepUpValuation = cycles.find(c => c.memberClass === 'A')
    ? (cycles.find(c => c.memberClass === 'A')!.entryValuation * 6.25)
    : null;

  return (
    <div className="space-y-6">
      {/* Mobile card layout */}
      <div className="md:hidden space-y-3">
        {tableData.map((row, i) => {
          const isCurrent = row.valuation === currentValuation;
          const isStepUp = c1StepUpValuation ? Math.abs(row.valuation - c1StepUpValuation) < 1e8 : false;
          return (
            <Card key={i} className={`p-3 space-y-2 text-sm bg-card ${isCurrent ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
              <div className="flex items-center justify-between">
                <span className="font-mono-nums font-semibold text-foreground">
                  {formatValuation(row.valuation)}
                  {isCurrent && <span className="ml-2 text-xs text-primary">● current</span>}
                  {isStepUp && <span className="ml-1 text-xs text-muted-foreground">⬆ 6.25×</span>}
                </span>
                {row.isCustom && (
                  <button onClick={() => onCustomExitRowsChange(customExitRows.filter(v => v !== row.valuation))} className="text-muted-foreground hover:text-gain-negative transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {row.gains.map((g, j) => (
                <div key={j} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{shortLabel(cycles[j])}</span>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono-nums ${g.netGain >= 0 ? 'text-gain-positive' : 'text-gain-negative'}`}>{formatCurrency(g.netGain)}</span>
                    <span className="font-mono-nums text-foreground">{formatMultiple(g.netMultipleOnOutlay)}</span>
                    <span className="text-muted-foreground">{row.carryRates[j]}</span>
                  </div>
                </div>
              ))}
              {cycles.length > 1 && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                  <span className="text-muted-foreground font-medium">Combined</span>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono-nums font-semibold ${row.combinedNetGain >= 0 ? 'text-gain-positive' : 'text-gain-negative'}`}>{formatCurrency(row.combinedNetGain)}</span>
                    <span className="font-mono-nums font-semibold text-foreground">{formatMultiple(row.combinedMultiple)}</span>
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        <div className="flex items-center gap-2">
          <Input
            placeholder="Add valuation (e.g. 12)"
            value={newVal}
            onChange={(e) => setNewVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addRow()}
            className="flex-1 font-mono-nums bg-secondary border-border"
          />
          <Button onClick={addRow} size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      {/* Desktop table layout */}
      <Card className="hidden md:block p-5 bg-card border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 text-muted-foreground font-medium" rowSpan={2}>Exit Valuation</th>
              {cycles.map((c, i) => (
                <th key={i} className="text-center py-1 px-2 font-medium border-b border-border" colSpan={4} style={{ color: i === 0 ? 'hsl(var(--primary))' : 'hsl(var(--emerald-dim))' }}>{c.label}</th>
              ))}
              {cycles.length > 1 && <th className="text-center py-1 px-2 text-foreground font-medium border-b border-border" colSpan={2}>Combined</th>}
              <th className="py-1 px-1" rowSpan={2}></th>
            </tr>
            <tr className="border-b border-border text-xs text-muted-foreground">
              {cycles.map((_, i) => (
                <React.Fragment key={i}>
                  <th className="py-1 px-2">Gross Val</th>
                  <th className="py-1 px-2">Net Gain</th>
                  <th className="py-1 px-2">Multiple</th>
                  <th className="py-1 px-2">Carry Rate</th>
                </React.Fragment>
              ))}
              {cycles.length > 1 && <>
                <th className="py-1 px-2">Net Gain</th>
                <th className="py-1 px-2">Multiple</th>
              </>}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, i) => {
              const isCurrent = row.valuation === currentValuation;
              const isStepUp = c1StepUpValuation ? Math.abs(row.valuation - c1StepUpValuation) < 1e8 : false;
              return (
                <tr key={i} className={`border-b border-border/50 ${isCurrent ? 'bg-primary/10' : ''} ${isStepUp && !isCurrent ? 'bg-secondary/50' : ''}`}>
                  <td className="py-2 px-2 font-mono-nums font-medium">
                    {formatValuation(row.valuation)}
                    {isCurrent && <span className="ml-2 text-xs text-primary">● current</span>}
                    {isStepUp && <span className="ml-1 text-xs text-muted-foreground">⬆ 6.25×</span>}
                  </td>
                  {row.gains.map((g, j) => (
                    <React.Fragment key={j}>
                      <td className="py-2 px-2 font-mono-nums text-right">{formatCurrency(g.grossValue)}</td>
                      <td className={`py-2 px-2 font-mono-nums text-right ${g.netGain >= 0 ? 'text-gain-positive' : 'text-gain-negative'}`}>{formatCurrency(g.netGain)}</td>
                      <td className="py-2 px-2 font-mono-nums text-right">{formatMultiple(g.netMultipleOnOutlay)}</td>
                      <td className="py-2 px-2 text-right text-xs text-muted-foreground">{row.carryRates[j]}</td>
                    </React.Fragment>
                  ))}
                  {cycles.length > 1 && <>
                    <td className={`py-2 px-2 font-mono-nums text-right font-semibold ${row.combinedNetGain >= 0 ? 'text-gain-positive' : 'text-gain-negative'}`}>{formatCurrency(row.combinedNetGain)}</td>
                    <td className="py-2 px-2 font-mono-nums text-right font-semibold">{formatMultiple(row.combinedMultiple)}</td>
                  </>}
                  <td className="py-2 px-1">
                    {row.isCustom && (
                      <button onClick={() => onCustomExitRowsChange(customExitRows.filter(v => v !== row.valuation))} className="text-muted-foreground hover:text-gain-negative transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex items-center gap-2 mt-4">
          <Input
            placeholder="Add valuation (e.g. 12000000000 or 12)"
            value={newVal}
            onChange={(e) => setNewVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addRow()}
            className="w-64 font-mono-nums bg-secondary border-border"
          />
          <Button onClick={addRow} size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
            <Plus className="w-4 h-4 mr-1" /> Add Row
          </Button>
        </div>
      </Card>

      <Card className="p-3 sm:p-5 bg-card border-border">
        <h4 className="text-sm font-medium text-foreground mb-2">Net Gains by Exit Valuation</h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(160 10% 16%)" />
            <XAxis dataKey="label" tick={{ fill: 'hsl(150 5% 55%)', fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
            <YAxis tick={{ fill: 'hsl(150 5% 55%)', fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
            <Tooltip
              wrapperStyle={{ maxWidth: '180px' }}
              contentStyle={{ background: 'hsl(160 12% 9%)', border: '1px solid hsl(160 10% 16%)', borderRadius: 8, color: 'hsl(150 10% 92%)' }}
              itemStyle={{ fontSize: 11 }}
              labelStyle={{ fontSize: 11 }}
              formatter={(value: number) => '$' + Math.round(value).toLocaleString()}
              labelFormatter={(label) => `Exit: ${label}`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine x={formatValuation(currentValuation)} stroke="hsl(152, 68%, 45%)" strokeDasharray="5 5" label={{ value: "Current", fill: "hsl(152, 68%, 45%)", fontSize: 11 }} />
            {cycles.length > 1 && <Line type="monotone" dataKey="Combined" stroke="hsl(150, 10%, 92%)" strokeWidth={2.5} dot={{ r: 2 }} />}
            {cycles.map((c, i) => (
              <Line key={c.label} type="monotone" dataKey={shortLabel(c)} stroke={i === 0 ? "hsl(152, 68%, 45%)" : "hsl(152, 40%, 25%)"} strokeWidth={2} strokeDasharray={i > 0 ? "6 3" : undefined} dot={{ r: 2 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
