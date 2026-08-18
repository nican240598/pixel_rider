/**
 * Utility to fix malformed umlauts, encoding artifacts (mojibake),
 * and double umlaut typos (such as "äÄ", "NamensäÄnderung").
 */
export function cleanUmlautText(text: string | null | undefined): string {
  if (!text) return '';

  let cleaned = text;

  // Fix UTF-8 double-encoding artifacts (Mojibake)
  cleaned = cleaned
    .replace(/Ã¤/g, 'ä')
    .replace(/Ã¶/g, 'ö')
    .replace(/Ã¼/g, 'ü')
    .replace(/Ã„/g, 'Ä')
    .replace(/Ã–/g, 'Ö')
    .replace(/Ãœ/g, 'Ü')
    .replace(/ÃŸ/g, 'ß');

  // Fix accidental double umlauts or weird casing combinations like "äÄ" -> "ä"
  cleaned = cleaned
    .replace(/äÄnderung/gi, 'änderung')
    .replace(/äÄ/g, 'ä')
    .replace(/öÖ/g, 'ö')
    .replace(/üÜ/g, 'ü')
    .replace(/Ää/g, 'Ä')
    .replace(/Öö/g, 'Ö')
    .replace(/Üü/g, 'Ü');

  return cleaned;
}
