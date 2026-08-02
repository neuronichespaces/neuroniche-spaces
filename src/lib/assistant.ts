// Phase 4 — application assistant (AU) + export (global).
// Calm UX: deadlines are shown as plain dates + days remaining.
// No countdown urgency styling, ever (BrightSprout calm-UX rule).

import type { FundingMatch, Organisation } from './funding/match.ts';
import type { RoomDims, ShoppingItem } from './planner/plan.ts';

export type ChecklistItem = { label: string; prefilled: string | null; done: boolean };

export function buildChecklist(
  org: Organisation & { name: string },
  room: RoomDims & { name: string },
  items: ShoppingItem[],
  match: FundingMatch,
): ChecklistItem[] {
  const total = items.reduce((s, i) => s + i.product.price, 0);
  return [
    { label: 'Organisation name', prefilled: org.name, done: true },
    { label: 'State / territory', prefilled: org.state_or_province, done: !!org.state_or_province },
    { label: 'Sector', prefilled: org.sector, done: !!org.sector },
    { label: 'Project description (sensory space plan attached)', prefilled: `Sensory space "${room.name}" (${room.width_m}m x ${room.length_m}m)`, done: true },
    { label: 'Itemised budget', prefilled: `${items.length} items, total $${total.toFixed(2)} AUD`, done: items.length > 0 },
    { label: 'Requested amount', prefilled: match.estimated_amount != null ? `$${match.estimated_amount.toFixed(2)} (indicative — confirm against guidelines)` : null, done: false },
    { label: `Eligibility check against official guidelines`, prefilled: match.eligibility_notes || null, done: false },
    { label: 'Read the official source', prefilled: match.source_url, done: false },
  ];
}

// Plain-date deadline info; null if no deadline.
export function deadlineInfo(deadline: string | null, today = new Date()): { date: string; daysRemaining: number } | null {
  if (!deadline) return null;
  const d = new Date(deadline + 'T23:59:59');
  const days = Math.floor((d.getTime() - today.getTime()) / 86_400_000);
  return { date: deadline, daysRemaining: days };
}

function csvCell(v: string | number): string {
  // S2: prefix formula-triggering leading chars so spreadsheet apps (Excel/Sheets)
  // don't execute the cell as a formula on import (CSV formula injection).
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// CSV export of the room plan + product list (global feature).
export function planToCsv(room: RoomDims & { name: string }, items: ShoppingItem[]): string {
  const rows = [
    ['Room', room.name, `${room.width_m}m x ${room.length_m}m`, ''],
    ['Product', 'Category', 'Price', 'Match score'],
    ...items.map((i) => [i.product.name, i.product.category, i.product.price, i.matchScore]),
    ['Total', '', items.reduce((s, i) => s + i.product.price, 0), ''],
  ];
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

// ponytail: Resend reminder email is a stub until an API key exists —
// the UI collects intent only; wire src/app/api/reminders when key arrives.
