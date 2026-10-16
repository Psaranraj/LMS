import { describe, expect, it } from 'vitest';
import { calculateInvoiceTotals, calculateLine, formatCurrency, roundMoney } from './money.js';

describe('roundMoney', () => {
  it('rounds to 2 decimal places, half up', () => {
    expect(roundMoney('10.005')).toBe('10.01');
    expect(roundMoney(10)).toBe('10.00');
  });
});

describe('formatCurrency', () => {
  it('formats as INR by default', () => {
    expect(formatCurrency('322')).toBe('₹322.00');
  });
});

describe('calculateLine', () => {
  it('computes tax-exclusive line correctly', () => {
    const result = calculateLine({
      unitPrice: '28.00',
      quantity: 2,
      taxRatePercent: '5',
      pricesIncludeTax: false,
    });
    expect(result.grossAmount).toBe('56.00');
    expect(result.taxAmount).toBe('2.80');
    expect(result.lineTotal).toBe('58.80');
  });

  it('computes tax-inclusive line correctly (extracts tax from the price)', () => {
    const result = calculateLine({
      unitPrice: '105.00',
      quantity: 1,
      taxRatePercent: '5',
      pricesIncludeTax: true,
    });
    // 105 / 1.05 = 100 taxable, 5 tax
    expect(result.taxableAmount).toBe('100.00');
    expect(result.taxAmount).toBe('5.00');
    expect(result.lineTotal).toBe('105.00');
  });

  it('applies a line discount before computing tax', () => {
    const result = calculateLine({
      unitPrice: '20.00',
      quantity: 3,
      discountAmount: '20.00',
      taxRatePercent: '0',
      pricesIncludeTax: false,
    });
    expect(result.grossAmount).toBe('60.00');
    expect(result.lineTotal).toBe('40.00');
  });
});

describe('calculateInvoiceTotals', () => {
  it('sums line items and applies an additional bill-level discount, rounding the grand total', () => {
    const lines = [
      calculateLine({ unitPrice: '28.00', quantity: 2, taxRatePercent: '5', pricesIncludeTax: false }),
      calculateLine({ unitPrice: '40.00', quantity: 1, taxRatePercent: '5', pricesIncludeTax: false }),
    ];
    const totals = calculateInvoiceTotals({ lines, billDiscountAmount: '5.00' });
    expect(totals.subtotal).toBe('96.00');
    expect(totals.discountTotal).toBe('5.00');
    // taxable = 96 - 5 = 91 lineTotal-based, tax already baked per-line: (58.80+42.00)-5 = 95.80
    expect(totals.grandTotal).toBe('96.00');
    expect(totals.roundOff).toBe('0.20');
  });
});
