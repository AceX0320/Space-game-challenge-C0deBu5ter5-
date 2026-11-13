import type { ResearchNode, SaveGame } from '@/types';
import { DEFAULT_FLAGS } from '@/config/feature-flags';

/**
 * Check if a research node can be unlocked.
 * See concept file section 10A (Research).
 */
export function canResearch(node: ResearchNode, save: SaveGame): boolean {
  if (!DEFAULT_FLAGS.research) return false;
  if (save.researched.includes(node.id)) return false;
  if (save.fundsM < node.costM) return false;
  for (const req of node.requiresNodes) {
    if (!save.researched.includes(req)) return false;
  }
  for (const { itemId, quantity } of node.requiresItems) {
    const inv = save.inventory.find((i) => i.itemId === itemId);
    if (!inv || inv.quantity < quantity) return false;
  }
  return true;
}

/**
 * Apply a research node to the save game — spend funds, consume items, mark researched.
 */
export function doResearch(node: ResearchNode, save: SaveGame): SaveGame {
  const updatedInventory = save.inventory
    .map((inv) => {
      const req = node.requiresItems.find((r) => r.itemId === inv.itemId);
      if (!req) return inv;
      return { ...inv, quantity: inv.quantity - req.quantity };
    })
    .filter((inv) => inv.quantity > 0);

  return {
    ...save,
    fundsM: save.fundsM - node.costM,
    researched: [...save.researched, node.id],
    inventory: updatedInventory,
  };
}

