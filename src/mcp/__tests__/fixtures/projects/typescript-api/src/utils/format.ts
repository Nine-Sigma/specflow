/**
 * Format a date to ISO string.
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Format a currency value.
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}
