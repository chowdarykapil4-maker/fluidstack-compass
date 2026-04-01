import { useState, type ChangeEvent } from "react";
...
  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setInputText(raw);
    const parsed = parseValuationInput(raw);
    if (parsed && parsed >= 500_000_000 && parsed <= 50_000_000_000) setValuation(parsed);
  };

  return (
    <div className="space-y-4">
      {/* Valuation Control Strip + Preset Pills */}
      <div className="bg-primary/[0.03] border border-primary/15 rounded-lg px-3 py-2 sm:px-4 sm:py-3 space-y-1 sm:space-y-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
          <div className="shrink-0 text-center sm:text-left">
            <p className="text-base sm:text-xl font-semibold font-mono-nums text-primary"><span className="text-[11px] font-normal uppercase tracking-wider text-muted-foreground mr-1.5">Valuation</span>{formatValuation(valuation)}</p>
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
          {VALUATION_PRESETS.map(p => {
            const isActive = valuation === p.value;
            return (
              <button
                key={p.value}
                onClick={() => setValuation(p.value)}
                className={`flex-1 font-mono-nums text-xs rounded-md border px-2 py-1 transition-colors ${
                  isActive
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-secondary/30 border-border text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contextual divider with portfolio summary */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-primary/10" />
        <span className="text-[11px] uppercase tracking-wider text-primary/30">
          {cycleCount} position{cycleCount !== 1 ? 's' : ''} · ${Math.round(totalOutlay).toLocaleString()} deployed
        </span>
        <div className="flex-1 h-px bg-primary/10" />
      </div>

      {/* Unified cycle cards */}
      <div className={`grid grid-cols-1 ${cycleCount > 1 ? 'md:grid-cols-2' : ''} gap-4`}>
        {cycles.map((cycle, i) => (
          <UnifiedCycleCard key={i} cycle={cycle} valuation={valuation} />
        ))}
      </div>

      {/* Net Gains Chart */}
      <Card className="p-3 sm:p-5 bg-card border-border">
        <h4 className="text-sm font-medium text-foreground mb-2">Net Gains Across Valuations</h4>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(160 10% 16%)" />
            <XAxis dataKey="label" tick={{ fill: 'hsl(150 5% 55%)', fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: 'hsl(150 5% 55%)', fontSize: 12 }} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v.toFixed(0)}`} />
            <Tooltip
              wrapperStyle={{ maxWidth: '180px' }}
              contentStyle={{ background: 'hsl(160 12% 9%)', border: '1px solid hsl(160 10% 16%)', borderRadius: 8, color: 'hsl(150 10% 92%)' }}
              itemStyle={{ fontSize: 11 }}
              labelStyle={{ fontSize: 11 }}
              formatter={(value: number) => '$' + Math.round(value).toLocaleString()}
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
