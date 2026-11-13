export type ChipVariant = 'orange' | 'green' | 'amber' | 'blue' | 'dim';

export function createTagChip(label: string, variant: ChipVariant = 'dim', tutorialId?: string): HTMLElement {
  const chip = document.createElement('span');
  chip.className = `ls-chip ls-chip-${variant}`;
  chip.textContent = label;
  if (tutorialId) {
    chip.setAttribute('data-tutorial', tutorialId);
  }
  return chip;
}
