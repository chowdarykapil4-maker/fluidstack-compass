import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatValuation } from "@/lib/calculations";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, Trash2, CircleDot } from "lucide-react";

export interface TimelineEvent {
  date: string;
  round: string;
  amount: number;
  valuation?: number;
  investors: string;
  isUserEntry?: boolean;
  userCycleLabel?: string;
}

interface Props {
  events: TimelineEvent[];
  onEventsChange: (events: TimelineEvent[]) => void;
}

export const DEFAULT_TIMELINE: TimelineEvent[] = [
  { date: "2019-03", round: "Seed", amount: 3_000_000, valuation: 3_000_000, investors: "Seedcamp, Mercuri, 7 Global Capital" },
  { date: "2024-01", round: "SAFE", amount: 24_700_000, investors: "Various" },
  { date: "2024-06", round: "Debt Financing", amount: 37_500_000, investors: "Macquarie" },
  { date: "2025-02", round: "Series A", amount: 200_000_000, valuation: 1_200_000_000, investors: "Led by Cacti — $1.0B pre / $1.2B post", isUserEntry: true, userCycleLabel: "YOUR ENTRY (Cycle 1)" },
  { date: "2026-01", round: "Series B", amount: 450_000_000, valuation: 7_500_000_000, investors: "Google ~$100M, $7.5B valuation", isUserEntry: true, userCycleLabel: "YOUR ENTRY (Cycle 2)" },
];

export default function FundingTimeline({ events, onEventsChange }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [newEvent, setNewEvent] = useState({ date: "", round: "", amount: "", valuation: "", investors: "" });

  const valuationData = events
    .filter(e => e.valuation)
    .map(e => ({ date: e.date, valuation: e.valuation!, label: formatValuation(e.valuation!) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const addEvent = () => {
    const evt: TimelineEvent = {
      date: newEvent.date,
      round: newEvent.round,
      amount: parseFloat(newEvent.amount) || 0,
      valuation: newEvent.valuation ? parseFloat(newEvent.valuation) : undefined,
      investors: newEvent.investors,
    };
    onEventsChange([...events, evt].sort((a, b) => a.date.localeCompare(b.date)));
    setNewEvent({ date: "", round: "", amount: "", valuation: "", investors: "" });
    setShowAdd(false);
  };

  const removeEvent = (i: number) => {
    onEventsChange(events.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-4">
          {events.map((event, i) => (
            <div key={i} className="relative flex items-start gap-4 pl-14">
              {/* Dot */}
              <div className={`absolute left-4 top-3 w-4 h-4 rounded-full border-2 ${event.isUserEntry ? 'bg-primary border-primary animate-pulse-emerald' : 'bg-secondary border-border'}`} />

              <Card className={`flex-1 p-4 ${event.isUserEntry ? 'emerald-border-glow gradient-emerald border' : 'bg-card border-border'}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground">{event.round}</h4>
                      <span className="text-xs text-muted-foreground">{event.date}</span>
                      {event.isUserEntry && (
                        <Badge className="bg-primary text-primary-foreground text-xs">{event.userCycleLabel}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-secondary-foreground">
                      Raised: <span className="font-mono-nums font-medium">{formatValuation(event.amount)}</span>
                      {event.valuation && (
                        <> · Valuation: <span className="font-mono-nums font-medium text-primary">{formatValuation(event.valuation)}</span></>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{event.investors}</p>
                  </div>
                  {!event.isUserEntry && (
                    <button onClick={() => removeEvent(i)} className="text-muted-foreground hover:text-gain-negative transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {showAdd ? (
        <Card className="p-4 bg-card border-border">
          <h4 className="font-semibold text-foreground mb-3">Add Funding Round</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Input placeholder="Date (YYYY-MM)" value={newEvent.date} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} className="bg-secondary border-border" />
            <Input placeholder="Round Name" value={newEvent.round} onChange={e => setNewEvent({ ...newEvent, round: e.target.value })} className="bg-secondary border-border" />
            <Input placeholder="Amount Raised ($)" value={newEvent.amount} onChange={e => setNewEvent({ ...newEvent, amount: e.target.value })} className="font-mono-nums bg-secondary border-border" />
            <Input placeholder="Valuation ($)" value={newEvent.valuation} onChange={e => setNewEvent({ ...newEvent, valuation: e.target.value })} className="font-mono-nums bg-secondary border-border" />
            <Input placeholder="Investors" value={newEvent.investors} onChange={e => setNewEvent({ ...newEvent, investors: e.target.value })} className="bg-secondary border-border" />
          </div>
          <div className="flex gap-2 mt-3">
            <Button onClick={addEvent} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">Add</Button>
            <Button onClick={() => setShowAdd(false)} size="sm" variant="outline" className="border-border">Cancel</Button>
          </div>
        </Card>
      ) : (
        <Button onClick={() => setShowAdd(true)} variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
          <Plus className="w-4 h-4 mr-1" /> Add Funding Round
        </Button>
      )}

      {valuationData.length > 1 && (
        <Card className="p-5 bg-card border-border">
          <h4 className="font-semibold text-foreground mb-4">Valuation Growth</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={valuationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(160 10% 16%)" />
              <XAxis dataKey="date" tick={{ fill: 'hsl(150 5% 55%)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'hsl(150 5% 55%)', fontSize: 11 }} tickFormatter={(v) => formatValuation(v)} />
              <Tooltip
                contentStyle={{ background: 'hsl(160 12% 9%)', border: '1px solid hsl(160 10% 16%)', borderRadius: 8, color: 'hsl(150 10% 92%)' }}
                formatter={(value: number) => formatValuation(value)}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line type="monotone" dataKey="valuation" stroke="hsl(152, 68%, 45%)" strokeWidth={3} dot={{ r: 5, fill: 'hsl(152, 68%, 45%)' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
