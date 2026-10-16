export function isExpiringWithinDays(expiryDate: string | Date, days: number, now: Date = new Date()): boolean {
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= days;
}

export function formatSequentialCode(prefix: string, sequence: number, width = 4): string {
  return `${prefix}-${String(sequence).padStart(width, '0')}`;
}
