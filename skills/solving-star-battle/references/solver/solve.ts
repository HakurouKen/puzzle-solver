// Star Battle k=1 求解器
//
// 通用骨架 / 类型 / 辅助 / 通用策略 / 策略工厂 / deduce / search 全部复用 solve-k.ts。
// 本文件仅声明 k=1 的特化决策:启用哪些策略、各策略参数、调度顺序。

import {
  isAdjacent,
  uniqueRegion, uniqueRow, uniqueCol, saturationClear, rowColRegionLock, generalizedPair,
  makeForcedChain, makeHiddenLineGroup,
  solveWith,
} from './solve-k.ts';
import type { Strategy, SolveResult } from './solve-k.ts';

export type { Cell, BoardState, SolveContext, Strategy, StrategyResult, SolveResult } from './solve-k.ts';

// k=1 特化:
//  - 强制链同行/列也排他(每行/列只 1 颗星);
//  - 隐藏对偶(线 → 区域)在 k=1 下天然成立。
export const forcedChain: Strategy = makeForcedChain(
  ([or, oc], [r, c]) => or !== r && oc !== c && !isAdjacent([or, oc], [r, c]),
);
export const hiddenRowGroup: Strategy = makeHiddenLineGroup('row');
export const hiddenColGroup: Strategy = makeHiddenLineGroup('col');

export const STRATEGIES: Strategy[] = [
  uniqueRegion, uniqueRow, uniqueCol,
  saturationClear,
  rowColRegionLock, generalizedPair,
  hiddenRowGroup, hiddenColGroup,
  forcedChain,
];

function solve(regions: number[][]): SolveResult {
  return solveWith(regions, 1, STRATEGIES);
}

export { solve };
export default solve;
// drift
