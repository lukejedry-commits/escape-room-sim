/** Slim inventory hotbar (5 slots). Placeholder key can be picked up. */
export function createInventory(slotCount = 5) {
  const slots = Array.from({ length: slotCount }, () => null);
  let selected = 0;

  return {
    get slots() {
      return slots.slice();
    },
    get selected() {
      return selected;
    },
    setSelected(i) {
      if (i >= 0 && i < slotCount) selected = i;
    },
    canAdd() {
      return slots.some((s) => s == null);
    },
    add(item) {
      const idx = slots.findIndex((s) => s == null);
      if (idx < 0) return false;
      slots[idx] = item;
      return true;
    },
    has(id) {
      return slots.some((s) => s && s.id === id);
    },
  };
}

export function makePlaceholderKey() {
  return { id: 'placeholder-key', label: 'Key', kind: 'key' };
}
