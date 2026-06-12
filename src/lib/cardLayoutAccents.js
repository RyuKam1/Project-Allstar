export const LAYOUT_ACCENT_COUNT = 7;

export function getLayoutAccent(index, accents) {
  if (!accents?.length) return '';
  return accents[index % accents.length] || '';
}
