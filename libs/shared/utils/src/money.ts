import { Decimal } from 'decimal.js';

/**
 * All money math goes through decimal.js and every function here takes/returns
 * strings (matching Prisma's `Decimal` serialization over JSON) so the exact
 * same calculation runs identically on the server (source of truth at
 * checkout) and on the client (live cart preview) with zero floating-point
 * drift between them.
 */

export function roundMoney(value: Decimal.Value): string {
  return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

export function formatCurrency(value: Decimal.Value, currency = 'INR'): string {
  const amount = new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}

export interface LineInput {
  unitPrice: Decimal.Value;
  quantity: Decimal.Value;
  discountAmount?: Decimal.Value;
  taxRatePercent: Decimal.Value;
  /** Whether unitPrice already includes tax. */
  pricesIncludeTax: boolean;
}

export interface LineResult {
  grossAmount: string;
  discountAmount: string;
  taxableAmount: string;
  taxAmount: string;
  lineTotal: string;
}

/**
 * Computes one invoice line's tax breakdown. Server-authoritative — the
 * client may call this for a live preview, but the server always re-runs it
 * from persisted product prices at checkout rather than trusting client totals.
 */
export function calculateLine(input: LineInput): LineResult {
  const unitPrice = new Decimal(input.unitPrice);
  const quantity = new Decimal(input.quantity);
  const discountAmount = new Decimal(input.discountAmount ?? 0);
  const rate = new Decimal(input.taxRatePercent).dividedBy(100);

  const grossAmount = unitPrice.times(quantity);
  const afterDiscount = grossAmount.minus(discountAmount);

  let taxableAmount: Decimal;
  let taxAmount: Decimal;
  if (input.pricesIncludeTax) {
    taxableAmount = afterDiscount.dividedBy(rate.plus(1));
    taxAmount = afterDiscount.minus(taxableAmount);
  } else {
    taxableAmount = afterDiscount;
    taxAmount = afterDiscount.times(rate);
  }

  const lineTotal = input.pricesIncludeTax ? afterDiscount : afterDiscount.plus(taxAmount);

  return {
    grossAmount: roundMoney(grossAmount),
    discountAmount: roundMoney(discountAmount),
    taxableAmount: roundMoney(taxableAmount),
    taxAmount: roundMoney(taxAmount),
    lineTotal: roundMoney(lineTotal),
  };
}

export interface InvoiceTotalsInput {
  lines: LineResult[];
  billDiscountAmount?: Decimal.Value;
}

export interface InvoiceTotalsResult {
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  roundOff: string;
  grandTotal: string;
}

export function calculateInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotalsResult {
  const subtotal = input.lines.reduce((sum, l) => sum.plus(l.grossAmount), new Decimal(0));
  const lineDiscounts = input.lines.reduce((sum, l) => sum.plus(l.discountAmount), new Decimal(0));
  const billDiscount = new Decimal(input.billDiscountAmount ?? 0);
  const discountTotal = lineDiscounts.plus(billDiscount);
  const taxTotal = input.lines.reduce((sum, l) => sum.plus(l.taxAmount), new Decimal(0));
  const lineTotalSum = input.lines.reduce((sum, l) => sum.plus(l.lineTotal), new Decimal(0));

  const rawGrandTotal = lineTotalSum.minus(billDiscount);
  const grandTotal = rawGrandTotal.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  const roundOff = grandTotal.minus(rawGrandTotal);

  return {
    subtotal: roundMoney(subtotal),
    discountTotal: roundMoney(discountTotal),
    taxTotal: roundMoney(taxTotal),
    roundOff: roundMoney(roundOff),
    grandTotal: roundMoney(grandTotal),
  };
}
