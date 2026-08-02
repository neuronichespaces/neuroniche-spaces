// Phase 6 — Bill of Materials for a room layout. Pure functions, no UI/CSV lib.
// Follows the same plain-string-building CSV style as planToCsv() in assistant.ts.

import type { PlacedObject } from './types.ts';

export type BomLine = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  fundingEligible: boolean;
};

export function buildBillOfMaterials(
  placedObjects: PlacedObject[],
  productLookup: (productId: string) => { name: string; price: number; funding_eligible: boolean } | undefined,
): BomLine[] {
  const byProduct = new Map<string, BomLine>();

  for (const obj of placedObjects) {
    const product = productLookup(obj.productId);
    const existing = byProduct.get(obj.productId);
    if (existing) {
      existing.quantity += 1;
      existing.lineTotal = existing.quantity * existing.unitPrice;
      continue;
    }
    const unitPrice = product?.price ?? 0;
    byProduct.set(obj.productId, {
      productId: obj.productId,
      name: product?.name ?? obj.productId,
      quantity: 1,
      unitPrice,
      lineTotal: unitPrice,
      fundingEligible: product?.funding_eligible ?? false,
    });
  }

  return [...byProduct.values()];
}

function csvCell(v: string | number): string {
  // S2: prefix formula-triggering leading chars so spreadsheet apps (Excel/Sheets)
  // don't execute the cell as a formula on import (CSV formula injection).
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function bomToCsv(lines: BomLine[]): string {
  const rows = [
    ['Product', 'Quantity', 'Unit price', 'Line total', 'Funding eligible'],
    ...lines.map((l) => [l.name, l.quantity, l.unitPrice, l.lineTotal, l.fundingEligible ? 'Yes' : 'No']),
    ['Total', '', '', lines.reduce((s, l) => s + l.lineTotal, 0), ''],
  ];
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}
