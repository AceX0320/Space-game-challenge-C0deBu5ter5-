import type { Body, Contract, ItemDef, PartDef, ResearchNode } from '@/types';
import { validateBody, validateContract, validateItemDef, validatePartDef, validateResearchNode } from '@/core/validate';

import bodiesRaw from './bodies.json';
import contractsRaw from './contracts.json';
import itemsRaw from './items.json';
import partsRaw from './parts.json';
import researchRaw from './research.json';

export function getBodies(): Body[] {
  return (bodiesRaw as unknown[]).map((raw, i) => validateBody(raw, i));
}

export function getParts(): PartDef[] {
  return (partsRaw as unknown[]).map((raw, i) => validatePartDef(raw, i));
}

export function getContracts(): Contract[] {
  return (contractsRaw as unknown[]).map((raw, i) => validateContract(raw, i));
}

export function getItems(): ItemDef[] {
  return (itemsRaw as unknown[]).map((raw, i) => validateItemDef(raw, i));
}

export function getResearch(): ResearchNode[] {
  return (researchRaw as unknown[]).map((raw, i) => validateResearchNode(raw, i));
}
