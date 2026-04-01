import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CycleData, GainResult, formatCurrency, formatValuation, formatMultiple } from "@/lib/calculations";
import { TrendingUp, TrendingDown, DollarSign, Calendar, Layers, Shield } from "lucide-react";

interface Props {
  cycles: CycleData[];
  gains: GainResult[];
  currentValuation: number;
  lastUpdated: Date;
}

const CLASS_DESCRIPTIONS: Record<string, string> = {
  A: "Class A Member — 6.25× preferred return, no carry below threshold",
  B: "Class B Member — carry from 1× on all gains",
};

function CycleCard({ cycle, gain, index }: { cycle: CycleData; gain: GainResult; index: number }) {
  const isPositive = gain.grossGain >= 0;

  return (
    <Card className="p-6 border-border bg-card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-foreground">{cycle.label}</h3>
        <Badge variant="outline" className="border-primary/30 text-primary text-xs">
          Class {cycle.memberClass}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
        <Shield className="w-3 h-3" />
        {CLASS_DESCRIPTIONS[cycle.memberClass]}
      </p>
      <p className="text-xs text-muted-foreground mb-5">
        Fund: {cycle.fundEntity}
      </p>

      <div className="space-y-3 text-sm">
        <Row label="Investment Date" value={new Date(cycle.investmentDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} icon={<Calendar className="w-3.5 h-3.5" />} />
        <Row label="Round" value={cycle.roundName} icon={<Layers className="w-3.5 h-3.5" />} />
        <Row label="Entry Valuation" value={formatValuation(cycle.entryValuation)} />
        <div className="border-t border-border my-3" />
        <Row label="Total Capital Outlay" value={formatCurrency(cycle.totalOutlay)} icon={<DollarSign className="w-3.5 h-3.5" />} />
        <Row label="Management Fee" value={formatCurrency(cycle.managementFee)} muted />
        <p className="text-xs text-muted-foreground pl-5 -mt-1">{cycle.managementFeeBreakdown}</p>
        <Row label="Net Invested Capital" value={formatCurrency(cycle.netInvested)} bold />
        <div className="border-t border-border my-3" />
        <Row label="Valuation Multiple" value={formatMultiple(gain.valuationMultiple)} highlight={isPositive} />
        <Row label="Gross Position Value" value={formatCurrency(gain.grossValue)} />
        <Row label="Gross Gain" value={formatCurrency(gain.grossGain)} highlight={isPositive} negative={!isPositive} />
        <div className="border-t border-border my-3" />
        {cycle.memberClass === 'A' ? (
          <>
            <Row
              label={gain.valuationMultiple <= 6.25 ? "Carry: $0 (below 6.25× pref)" : "Carry (22.5% on excess above 6.25×)"}
              value={`-${formatCurrency(gain.totalCarry)}`}
              muted
            />
          </>
        ) : (
          <>
            <Row label="Carry Tier 1 (20%, 1×–6.25×)" value={`-${formatCurrency(gain.carryTier1)}`} muted />
            <Row label="Carry Tier 2 (22.5%, >6.25×)" value={`-${formatCurrency(gain.carryTier2)}`} muted />
            <Row label="Total Carry" value={`-${formatCurrency(gain.totalCarry)}`} />
          </>
        )}
        <div className="border-t border-border my-3" />
        <Row label="Net Gain to LP" value={formatCurrency(gain.netGain)} highlight={isPositive} negative={!isPositive} bold />
        <Row label="Net Multiple on Outlay" value={formatMultiple(gain.netMultipleOnOutlay)} highlight={gain.netMultipleOnOutlay >= 1} negative={gain.netMultipleOnOutlay < 1} bold />
      </div>
    </Card>
  );
}

function Row({ label, value, icon, muted, bold, highlight, negative }: {
  label: string; value: string; icon?: React.ReactNode; muted?: boolean; bold?: boolean; highlight?: boolean; negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`flex items-center gap-1.5 ${muted ? 'text-muted-foreground' : 'text-secondary-foreground'}`}>
        {icon}{label}
      </span>
      <span className={`font-mono-nums ${bold ? 'font-semibold' : ''} ${highlight ? 'text-gain-positive' : ''} ${negative ? 'text-gain-negative' : ''} ${muted ? 'text-muted-foreground' : ''}`}>
        {value}
      </span>
    </div>
  );
}

export default function InvestmentOverview({ cycles, gains, currentValuation, lastUpdated }: Props) {
  const totalOutlay = cycles.reduce((s, c) => s + c.totalOutlay, 0);
  const totalNetInvested = cycles.reduce((s, c) => s + c.netInvested, 0);
  const combinedGrossValue = gains.reduce((s, g) => s + g.grossValue, 0);
  const combinedNetGain = gains.reduce((s, g) => s + g.netGain, 0);
  const combinedNetPosition = gains.reduce((s, g) => s + g.grossValue - g.totalCarry, 0);
  const blendedMultiple = combinedNetPosition / totalOutlay;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-1">Current Mark</p>
        <p className="text-2xl font-bold font-mono-nums text-primary">{formatValuation(currentValuation)}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {cycles.map((cycle, i) => (
          <CycleCard key={i} cycle={cycle} gain={gains[i]} index={i} />
        ))}
      </div>

      <Card className="p-5 gradient-emerald emerald-border-glow border">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <Stat label="Total Outlay" value={formatCurrency(totalOutlay)} />
          <Stat label="Total Net Invested" value={formatCurrency(totalNetInvested)} />
          <Stat label="Combined Gross Value" value={formatCurrency(combinedGrossValue)} />
          <Stat label="Combined Net Gain" value={formatCurrency(combinedNetGain)} highlight={combinedNetGain >= 0} negative={combinedNetGain < 0} />
          <Stat label="Blended Net Multiple" value={formatMultiple(blendedMultiple)} highlight={blendedMultiple >= 1} negative={blendedMultiple < 1} />
        </div>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Last updated: {lastUpdated.toLocaleString()}
      </p>
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
