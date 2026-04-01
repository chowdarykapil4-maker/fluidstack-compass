import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { UserProfile, DEFAULT_PROFILE, CYCLE1_FEE_RATE, CYCLE2_FEE_RATE, formatCurrency } from "@/lib/calculations";
import { HelpCircle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  isFirstTime?: boolean;
}

export default function SettingsModal({ open, onOpenChange, profile, onSave, isFirstTime }: Props) {
  const [draft, setDraft] = useState<UserProfile>(profile);

  useEffect(() => {
    if (open) setDraft(profile);
  }, [open, profile]);

  const c1Fee = draft.cycle1Committed * CYCLE1_FEE_RATE;
  const c1Outlay = draft.cycle1Committed + c1Fee;
  const c2Fee = draft.cycle2Committed * CYCLE2_FEE_RATE;
  const c2Outlay = draft.cycle2Committed + c2Fee;

  const hasValidCycle =
    (draft.cycle1Participating && draft.cycle1Committed > 0) ||
    (draft.cycle2Participating && draft.cycle2Committed > 0);

  const handleSave = () => {
    if (!hasValidCycle) return;
    onSave(draft);
    onOpenChange(false);
  };

  const handleReset = () => setDraft(DEFAULT_PROFILE);

  return (
    <Dialog open={open} onOpenChange={isFirstTime ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{isFirstTime ? "Welcome — Set Up Your Profile" : "Your Investment Profile"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Name</label>
            <Input
              value={draft.name}
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              placeholder="Enter your name"
              className="bg-secondary border-border"
            />
          </div>

          {/* Cycle 1 */}
          <div className="space-y-2 rounded-md border border-border p-3 bg-secondary/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">Cycle 1 — Series A (Class A)</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-[200px]">5% = 1.5% fund mgmt (side letter) + 3.5% TMC portfolio co fee</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                checked={draft.cycle1Participating}
                onCheckedChange={v => setDraft(d => ({ ...d, cycle1Participating: v }))}
              />
            </div>
            {draft.cycle1Participating && (
              <>
                <label className="text-xs text-muted-foreground">Capital Committed ($)</label>
                <Input
                  type="number"
                  value={draft.cycle1Committed}
                  onChange={e => setDraft(d => ({ ...d, cycle1Committed: Math.max(0, Number(e.target.value)) }))}
                  className="font-mono-nums bg-secondary border-border"
                />
                <div className="flex flex-col gap-0.5 text-xs text-muted-foreground font-mono-nums">
                  <span>Fee (5%): {formatCurrency(c1Fee)}</span>
                  <span>Net Invested: {formatCurrency(draft.cycle1Committed)}</span>
                  <span>Total Outlay: {formatCurrency(c1Outlay)}</span>
                </div>
              </>
            )}
          </div>

          {/* Cycle 2 */}
          <div className="space-y-2 rounded-md border border-border p-3 bg-secondary/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">Cycle 2 — Series B (Class B)</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-[200px]">7.5% management fee</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                checked={draft.cycle2Participating}
                onCheckedChange={v => setDraft(d => ({ ...d, cycle2Participating: v }))}
              />
            </div>
            {draft.cycle2Participating && (
              <>
                <label className="text-xs text-muted-foreground">Capital Committed ($)</label>
                <Input
                  type="number"
                  value={draft.cycle2Committed}
                  onChange={e => setDraft(d => ({ ...d, cycle2Committed: Math.max(0, Number(e.target.value)) }))}
                  className="font-mono-nums bg-secondary border-border"
                />
                <div className="flex flex-col gap-0.5 text-xs text-muted-foreground font-mono-nums">
                  <span>Fee (7.5%): {formatCurrency(c2Fee)}</span>
                  <span>Net Invested: {formatCurrency(draft.cycle2Committed)}</span>
                  <span>Total Outlay: {formatCurrency(c2Outlay)}</span>
                </div>
              </>
            )}
          </div>

          {!hasValidCycle && (
            <p className="text-xs text-gain-negative">Enable at least one cycle with a committed amount to save.</p>
          )}

          <div className="flex items-center justify-between pt-2">
            <button onClick={handleReset} className="text-xs text-muted-foreground hover:text-foreground underline transition-colors">
              Reset to Defaults
            </button>
            <Button
              onClick={handleSave}
              disabled={!hasValidCycle}
              className="px-6"
            >
              {isFirstTime ? "Get Started" : "Save"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-3">Your data stays on this device only — nothing is sent to any server.</p>
          {isFirstTime && (
            <p className="text-[11px] text-muted-foreground text-center mt-1">Tip: Add to Home Screen from Safari's share menu for the best experience.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
