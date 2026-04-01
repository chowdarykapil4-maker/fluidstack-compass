export interface CycleData {
  label: string;
  memberClass: 'A' | 'B';
  investmentDate: string;
  roundName: string;
  entryValuation: number;
  totalOutlay: number;
  managementFee: number;
  netInvested: number;
}

export function shortLabel(cycle: CycleData): string {
  const num = cycle.label.match(/\d+/)?.[0] || "";
  const round = cycle.roundName.replace(/^\$[\d.]+[MBK]?\s*/, "");
  return `C${num} (${round})`;
}
/** Parse shorthand valuation input: numbers < 1000 are treated as billions */
export function parseValuationInput(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return null;
  return num < 1000 ? num * 1_000_000_000 : num;
}


export interface CarryStructure {
  tier1Rate: number;
  tier1Threshold: number; // multiple
  tier2Rate: number;
}

export interface GainResult {
  valuationMultiple: number;
  grossValue: number;
  grossGain: number;
  carryTier1: number;
  carryTier2: number;
  totalCarry: number;
  netGain: number;
  netMultipleOnOutlay: number;
}

export const DEFAULT_CARRY: CarryStructure = {
  tier1Rate: 0.20,
  tier1Threshold: 6.25,
  tier2Rate: 0.225,
};

export interface UserProfile {
  name: string;
  cycle1Participating: boolean;
  cycle1Committed: number;
  cycle2Participating: boolean;
  cycle2Committed: number;
}

export const DEFAULT_PROFILE: UserProfile = {
  name: "Investor",
  cycle1Participating: false,
  cycle1Committed: 0,
  cycle2Participating: false,
  cycle2Committed: 0,
};

export const CYCLE1_FEE_RATE = 0.05;
export const CYCLE2_FEE_RATE = 0.075;

export function buildCycles(profile: UserProfile): CycleData[] {
  const cycles: CycleData[] = [];

  if (profile.cycle1Participating) {
    const fee = profile.cycle1Committed * CYCLE1_FEE_RATE;
    cycles.push({
      label: "Cycle 1 — Series A",
      memberClass: 'A',
      investmentDate: "2025-08-15",
      roundName: "$200M Series A",
      entryValuation: 1_200_000_000,
      totalOutlay: profile.cycle1Committed + fee,
      managementFee: fee,
      netInvested: profile.cycle1Committed,
    });
  }

  if (profile.cycle2Participating) {
    const fee = profile.cycle2Committed * CYCLE2_FEE_RATE;
    cycles.push({
      label: "Cycle 2 — Series B",
      memberClass: 'B',
      investmentDate: "2026-01-29",
      roundName: "$450M Series B",
      entryValuation: 7_500_000_000,
      totalOutlay: profile.cycle2Committed + fee,
      managementFee: fee,
      netInvested: profile.cycle2Committed,
    });
  }

  return cycles;
}

/**
 * Class A (Cycle 1): TWO-TIER carry.
 *   - 20% on gains from 1× to 6.25×
 *   - 22.5% on gains above 6.25×
 *
 * Class B (Cycle 2): FLAT 22.5% carry on ALL gains above 1×.
 *   - ≤ 1×: carry = $0
 *   - > 1×: 22.5% on all gains
 */
export function calculateGains(
  cycle: CycleData,
  currentValuation: number,
  carry: CarryStructure = DEFAULT_CARRY
): GainResult {
  const valuationMultiple = currentValuation / cycle.entryValuation;
  const grossValue = cycle.netInvested * valuationMultiple;
  const grossGain = grossValue - cycle.netInvested;

  let carryTier1 = 0;
  let carryTier2 = 0;

  if (cycle.memberClass === 'A') {
    // Class A: TWO-TIER carry
    // 20% on gains from 1× to 6.25×
    // 22.5% on gains above 6.25×
    if (grossGain > 0) {
      if (valuationMultiple <= carry.tier1Threshold) {
        // Below 6.25×: all gains get 20%
        carryTier1 = grossGain * carry.tier1Rate;
      } else {
        // Above 6.25×: split into two tiers
        const gainUpToThreshold = cycle.netInvested * (carry.tier1Threshold - 1);
        carryTier1 = gainUpToThreshold * carry.tier1Rate;
        const gainAboveThreshold = grossGain - gainUpToThreshold;
        carryTier2 = gainAboveThreshold * carry.tier2Rate;
      }
    }
  } else {
    // Class B: FLAT 22.5% on ALL gains above 1× (return of capital)
    if (grossGain > 0) {
      carryTier2 = grossGain * carry.tier2Rate;
      // carryTier1 stays 0 — no 20% tier for Class B
    }
  }

  const totalCarry = carryTier1 + carryTier2;
  const netGain = grossGain - totalCarry;
  const netMultipleOnOutlay = (grossValue - totalCarry) / cycle.totalOutlay;

  return {
    valuationMultiple,
    grossValue,
    grossGain,
    carryTier1,
    carryTier2,
    totalCarry,
    netGain,
    netMultipleOnOutlay,
  };
}

export function getCarryRateLabel(cycle: CycleData, valuation: number, carry: CarryStructure = DEFAULT_CARRY): string {
  const multiple = valuation / cycle.entryValuation;
  if (cycle.memberClass === 'A') {
    if (multiple <= 1) return "0%";
    if (multiple <= carry.tier1Threshold) return "20%";
    return "blended";
  } else {
    if (multiple <= 1) return "0%";
    return "22.5%";
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatValuation(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(0)}M`;
  }
  return formatCurrency(value);
}

export function formatMultiple(value: number): string {
  return `${value.toFixed(2)}×`;
}
