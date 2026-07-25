import { effectiveFxPercent, effectiveSolidPercent } from './breakdown';
import type { Holding, PortfolioSettings } from '../types';

export type CalculatedHolding = Holding & {
  readonly currentAmountIls: number;
  readonly targetAmountIls: number;
  readonly currentWithinAccountPercent: number;
  readonly targetWithinAccountPercent: number;
  readonly targetProjectedAmountIls: number;
  readonly targetOverallPercent: number;
  readonly targetGapIls: number;
  readonly allocationIls: number;
  readonly allocationSharePercent: number;
  readonly projectedAmountIls: number;
  readonly projectedWithinAccountPercent: number;
  readonly projectedOverallPercent: number;
};

export type RebalanceResult = {
  readonly rows: readonly CalculatedHolding[];
  readonly currentTotalIls: number;
  readonly depositAmountIls: number;
  readonly postDepositTotalIls: number;
  readonly managedCurrentIls: number;
  readonly manualCurrentIls: number;
  readonly managedPostDepositIls: number;
  readonly manualPostDepositIls: number;
  readonly managedPostDepositSharePercent: number;
  readonly manualPostDepositSharePercent: number;
  readonly fxProjectedPercent: number;
  readonly solidProjectedPercent: number;
  readonly manualDriftPercent: number;
  readonly allocatedDepositIls: number;
  readonly unallocatedDepositIls: number;
  readonly allocationStrategy: 'gaps' | 'target_weights';
};

function nonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function divide(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  const value = numerator / denominator;
  return Number.isFinite(value) ? value : 0;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + nonNegative(value), 0);
}

export function calculateRebalance(holdings: readonly Holding[], settings: PortfolioSettings): RebalanceResult {
  const sanitized = holdings.map((holding) => ({
    ...holding,
    currentAmountIls: nonNegative(holding.currentAmountIls),
    targetAmountIls: nonNegative(holding.targetAmountIls),
  }));
  const managedRows = sanitized.filter((holding) => holding.account === 'managed');
  const manualRows = sanitized.filter((holding) => holding.account === 'manual');
  const managedCurrentIls = sum(managedRows.map((holding) => holding.currentAmountIls));
  const manualCurrentIls = sum(manualRows.map((holding) => holding.currentAmountIls));
  const currentTotalIls = managedCurrentIls + manualCurrentIls;
  const depositAmountIls = nonNegative(settings.depositAmountIls);
  const managedPostDepositIls = managedCurrentIls;
  const manualPostDepositIls = manualCurrentIls + depositAmountIls;
  const postDepositTotalIls = currentTotalIls + depositAmountIls;
  const manualTargetTotal = sum(manualRows.map((holding) => holding.targetAmountIls));
  const equalManualWeight = manualRows.length > 0 ? 1 / manualRows.length : 0;
  const targetWeightById = new Map(manualRows.map((holding) => [holding.id, manualTargetTotal > 0 ? divide(holding.targetAmountIls, manualTargetTotal) : equalManualWeight]));
  const gapById = new Map(
    manualRows.map((holding) => {
      const targetProjectedAmountIls = (targetWeightById.get(holding.id) ?? 0) * manualPostDepositIls;
      return [holding.id, Math.max(0, targetProjectedAmountIls - holding.currentAmountIls)];
    }),
  );
  const positiveGapTotal = sum([...gapById.values()]);
  const allocationStrategy = positiveGapTotal > 0 ? 'gaps' : 'target_weights';
  const allocationById = new Map(
    manualRows.map((holding) => {
      const targetWeight = targetWeightById.get(holding.id) ?? 0;
      const gapWeight = divide(gapById.get(holding.id) ?? 0, positiveGapTotal);
      return [holding.id, depositAmountIls * (allocationStrategy === 'gaps' ? gapWeight : targetWeight)];
    }),
  );

  const rows: CalculatedHolding[] = sanitized.map((holding) => {
    const accountCurrentIls = holding.account === 'managed' ? managedCurrentIls : manualCurrentIls;
    const accountPostDepositIls = holding.account === 'managed' ? managedPostDepositIls : manualPostDepositIls;
    const targetWeight = holding.account === 'manual' ? (targetWeightById.get(holding.id) ?? 0) : divide(holding.currentAmountIls, managedCurrentIls);
    const targetProjectedAmountIls = holding.account === 'manual' ? targetWeight * manualPostDepositIls : holding.currentAmountIls;
    const allocationIls = holding.account === 'manual' ? (allocationById.get(holding.id) ?? 0) : 0;
    const projectedAmountIls = holding.currentAmountIls + allocationIls;

    return {
      ...holding,
      currentWithinAccountPercent: divide(holding.currentAmountIls, accountCurrentIls) * 100,
      targetWithinAccountPercent: targetWeight * 100,
      targetProjectedAmountIls,
      targetOverallPercent: divide(targetProjectedAmountIls, postDepositTotalIls) * 100,
      targetGapIls: holding.account === 'manual' ? Math.max(0, targetProjectedAmountIls - holding.currentAmountIls) : 0,
      allocationIls,
      allocationSharePercent: divide(allocationIls, depositAmountIls) * 100,
      projectedAmountIls,
      projectedWithinAccountPercent: divide(projectedAmountIls, accountPostDepositIls) * 100,
      projectedOverallPercent: divide(projectedAmountIls, postDepositTotalIls) * 100,
    };
  });

  const allocatedDepositIls = sum(rows.map((row) => row.allocationIls));
  const fxProjectedIls = sum(rows.map((row) => row.projectedAmountIls * effectiveFxPercent(row) / 100));
  const solidProjectedIls = sum(rows.map((row) => row.projectedAmountIls * effectiveSolidPercent(row) / 100));
  const manualDriftPercent = sum(rows.filter((row) => row.account === 'manual').map((row) => Math.abs(row.projectedWithinAccountPercent - row.targetWithinAccountPercent))) / 2;

  return {
    rows,
    currentTotalIls,
    depositAmountIls,
    postDepositTotalIls,
    managedCurrentIls,
    manualCurrentIls,
    managedPostDepositIls,
    manualPostDepositIls,
    managedPostDepositSharePercent: divide(managedPostDepositIls, postDepositTotalIls) * 100,
    manualPostDepositSharePercent: divide(manualPostDepositIls, postDepositTotalIls) * 100,
    fxProjectedPercent: divide(fxProjectedIls, postDepositTotalIls) * 100,
    solidProjectedPercent: divide(solidProjectedIls, postDepositTotalIls) * 100,
    manualDriftPercent,
    allocatedDepositIls,
    unallocatedDepositIls: Math.max(0, depositAmountIls - allocatedDepositIls),
    allocationStrategy,
  };
}
