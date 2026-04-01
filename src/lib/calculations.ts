export interface CycleData {
  label: string;
  memberClass: 'A' | 'B';
  fundEntity: string;
  investmentDate: string;
  roundName: string;
  roundSize: number;
  entryValuation: number;
  totalOutlay: number;
  managementFee: number;
  managementFeeBreakdown: string;
  netInvested: number;
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

export const DEFAULT_CYCLES: CycleData[] = [
  {
    label: "Cycle 1 — Series A",
    memberClass: 'A',
    fundEntity: "TMC Fund 550 LLC",
    investmentDate: "2025-08-15",
    roundName: "$200M Series A",
    roundSize: 200_000_000,
    entryValuation: 1_200_000_000,
    totalOutlay: 15_750,
    managementFee: 750,
    managementFeeBreakdown: "Fund Mgmt 1.5% (side letter) + TMC Portfolio Co 3.5% = 5% effective",
    netInvested: 15_000,
  },
  {
    label: "Cycle 2 — Series B",
    memberClass: 'B',
    fundEntity: "TMC Fund 230 LLC",
    investmentDate: "2026-01-29",
    roundName: "$450M Series B",
    roundSize: 450_000_000,
    entryValuation: 7_500_000_000,
    totalOutlay: 10_750,
    managementFee: 750,
    managementFeeBreakdown: "7.5% effective ($750 on $10,000 commit)",
    netInvested: 10_000,
  },
];

/**
 * Class A (Cycle 1): 6.25× preferred return, NO carry below threshold.
 *   - ≤ 6.25×: carry = $0
 *   - > 6.25×: 22.5% on incremental gain above 6.25×
 *
 * Class B (Cycle 2): Return of capital (1×) first, then flat 22.5% carry on ALL gains.
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
    // Class A: NO carry below 6.25×. Only 22.5% on gain above 6.25×.
    if (valuationMultiple > carry.tier1Threshold) {
      const gainAboveThreshold = grossValue - (cycle.netInvested * carry.tier1Threshold);
      carryTier2 = gainAboveThreshold * carry.tier2Rate;
    }
    // carryTier1 stays 0 for Class A
  } else {
    // Class B: flat 22.5% carry on ALL gains above 1× (return of capital)
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
    if (multiple <= carry.tier1Threshold) return "0%";
    return "22.5% (marginal)";
  } else {
    if (multiple <= 1) return "0%";
    return "22.5%";
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
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
