// Star Battle k=2 求解器
//
// 通用骨架 / 类型 / 辅助 / 通用策略 / 策略工厂 / deduce / search 全部复用 solve-k.ts。
// 本文件仅声明 k=2 的特化决策:启用哪些策略、各策略参数、调度顺序。

import {
  isAdjacent,
  uniqueRegion, uniqueRow, uniqueCol, saturationClear, rowColRegionLock, generalizedPair,
  makeRegionShapeEnum, makeForcedChain,
  solveWith,
} from './solve-k.ts';
import type { Strategy, SolveResult } from './solve-k.ts';

// 重导出:测试 / 下游 import from solve-2.ts 仍可用,无须改 import 源。
export {
  cellKey, getCounts, deriveCandidates, validateCounts, applyResult, deduce, search,
  uniqueRegion, uniqueRow, uniqueCol, saturationClear, rowColRegionLock, generalizedPair,
} from './solve-k.ts';
export type { Cell, BoardState, SolveContext, Strategy, StrategyResult, SolveResult } from './solve-k.ts';

// k=2 特化:形状枚举上限 6 格(k=2 实测平衡点);强制链允许同行/列不相邻共存。
export const regionShapeEnum: Strategy = makeRegionShapeEnum({ maxCells: 6 });
export const forcedChain: Strategy = makeForcedChain((other, cand) => !isAdjacent(other, cand));

export const STRATEGIES: Strategy[] = [
  uniqueRegion, uniqueRow, uniqueCol,
  saturationClear, regionShapeEnum,
  rowColRegionLock, generalizedPair, forcedChain,
];

function solve(regions: number[][]): SolveResult {
  return solveWith(regions, 2, STRATEGIES);
}

export { solve };
export default solve;
