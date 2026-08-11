// axe-core pass against the real rendered app (Playwright, chromium-only). Dev-only —
// see playwright.config.ts. Fails on any WCAG 2.2 AA violation. Route list from
// `src/app/*/page.tsx` — the ones named in the phase-1 a11y handoff plus every other
// top-level route, so a new page doesn't silently ship unaudited.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = [
  '/',
  '/spatial',
  '/audit',
  '/grants',
  '/costing',
  '/catalogue',
  '/organisations',
  '/business-case',
  '/resources',
  '/training',
  '/login',
  '/accessibility',
  '/privacy',
  '/terms',
  '/dpa',
  '/subprocessors',
  '/aup',
  '/child-safety',
  '/complaints',
];

for (const route of ROUTES) {
  test(`${route} has no WCAG 2.2 AA violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}
