/**
 * Format a number or numeric string as Indonesian Rupiah.
 * Output: "Rp1.500.000" (no space, dot separators, no decimals)
 */
export function rupiah(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "Rp0";
  const isNegative = num < 0;
  const abs = Math.abs(Math.round(num));
  const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${isNegative ? "-" : ""}Rp${formatted}`;
}

/**
 * Parse a Rupiah-formatted input string, returning both the display string and the raw number.
 * Strips everything except digits, then formats with dot separators.
 * 
 * Usage in TextInput onChangeText:
 *   const { display, raw } = parseRupiahInput(text);
 *   setDisplayAmount(display);  // "1.500.000"
 *   setRawAmount(raw);          // 1500000
 */
export function parseRupiahInput(text: string): { display: string; raw: number } {
  const digits = text.replace(/\D/g, "");
  const raw = digits ? parseInt(digits, 10) : 0;
  const display = raw === 0 ? "" : raw.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return { display, raw };
}

/**
 * Format a date string as "DD MMM" (e.g., "29 Mei").
 */
export function shortDate(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}
