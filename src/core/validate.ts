import type { Body, Contract, ItemDef, PartDef, ResearchNode } from '@/types';

export class ValidationError extends Error {
  constructor(context: string, message: string) {
    super(`[validate] ${context}: ${message}`);
    this.name = 'ValidationError';
  }
}

function requireField(obj: Record<string, unknown>, key: string, context: string): void {
  if (obj[key] === undefined || obj[key] === null) {
    throw new ValidationError(context, `Missing required field "${key}"`);
  }
}

export function validateBody(raw: unknown, index: number): Body {
  const ctx = `bodies[${index}]`;
  const o = raw as Record<string, unknown>;
  requireField(o, 'id', ctx); requireField(o, 'name', ctx); requireField(o, 'gravityMs2', ctx);
  if (typeof o['gravityMs2'] !== 'number') throw new ValidationError(ctx, 'gravityMs2 must be a number');
  return raw as Body;
}

export function validatePartDef(raw: unknown, index: number): PartDef {
  const ctx = `parts[${index}]`;
  const o = raw as Record<string, unknown>;
  requireField(o, 'id', ctx); requireField(o, 'name', ctx); requireField(o, 'category', ctx);
  requireField(o, 'params', ctx);
  if (!Array.isArray(o['params'])) throw new ValidationError(ctx, 'params must be an array');
  return raw as PartDef;
}

export function validateContract(raw: unknown, index: number): Contract {
  const ctx = `contracts[${index}]`;
  const o = raw as Record<string, unknown>;
  requireField(o, 'id', ctx); requireField(o, 'title', ctx); requireField(o, 'bodyId', ctx);
  requireField(o, 'budgetCapM', ctx); requireField(o, 'rewardM', ctx); requireField(o, 'fundingGateM', ctx);
  return raw as Contract;
}

export function validateItemDef(raw: unknown, index: number): ItemDef {
  const ctx = `items[${index}]`;
  const o = raw as Record<string, unknown>;
  requireField(o, 'id', ctx); requireField(o, 'name', ctx); requireField(o, 'bodyIds', ctx);
  return raw as ItemDef;
}

export function validateResearchNode(raw: unknown, index: number): ResearchNode {
  const ctx = `research[${index}]`;
  const o = raw as Record<string, unknown>;
  requireField(o, 'id', ctx); requireField(o, 'name', ctx); requireField(o, 'branch', ctx);
  return raw as ResearchNode;
}
