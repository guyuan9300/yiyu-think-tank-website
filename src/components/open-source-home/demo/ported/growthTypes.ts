// 搬自益语智库 2.1：src/shared/types.ts（GrowthAbility* 部分）
// 仅供 AbilityRadar 和 GrowthScene 使用。逐字段搬运。

export type GrowthAbilityKey =
  | 'exec'
  | 'org'
  | 'strategy'
  | 'foresight'
  | 'crisis'
  | 'influence'
  | 'resource';

export interface GrowthAbilityScore {
  abilityKey: GrowthAbilityKey;
  label: string;
  currentScore: number;
  previousScore: number;
  totalXp: number;
  weeklyXp: number;
  stage: string;
  nextStage: string;
  evidence: string;
}

export interface GrowthAbilityGap {
  abilityKey: GrowthAbilityKey;
  label: string;
  currentScore: number;
  requiredScore: number;
  gap: number;
  reason: string;
  sourceLabel: string;
  sourceType: string;
  sourceId: string;
}
