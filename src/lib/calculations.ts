export interface CycleData {
  label: string;
  investmentDate: string;
  roundName: string;
  roundSize: number;
  entryValuation: number;
  totalOutlay: number;
  managementFee: number;
  netInvested: number;
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
    investmentDate: "2025-08-15",
    roundName: "$200M Series A",
    roundSize: 200_000_000,
    entryValuation: 1_200_000_000,
    totalOutlay: 15_750,
    managementFee: 750,
    netInvested: 15_000,
  },
  {
    label: "Cycle 2 — Series B",
    investmentDate: "2026-01-29",
    roundName: "$450M Series B",
    roundSize: 450_000_000,
    entryValuation: 7_500_000_000,
    totalOutlay: 10_750,
    managementFee: 750,
    netInvested: 10_000,
  },
];

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

  if (grossGain > 0) {
    if (valuationMultiple <= carry.tier1Threshold) {
      carryTier1 = grossGain * carry.tier1Rate;
    } else {
      const gainUpToThreshold = cycle.netInvested * (carry.tier1Threshold - 1);
      carryTier1 = gainUpToThreshold * carry.tier1Rate;
      const gainAboveThreshold = grossGain - gainUpToThreshold;
      carryTier2 = gainAboveThreshold * carry.tier2Rate;
    }
  }

  const totalCarry = carryTier1 + carryTier2;
  const netGain = grossGain - totalCarry;
  const netMultipleOnOutlay = (cycle.netInvested + netGain) / cycle.totalOutlay;

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
