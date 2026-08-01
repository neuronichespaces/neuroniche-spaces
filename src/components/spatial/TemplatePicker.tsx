// Presentational grid of scenario template cards. Does not touch the store —
// parent decides how to apply a template (e.g. scale geometry to actualDims
// before calling useRoomLayoutStore.loadLayout).
'use client';

import type { ScenarioTemplate } from '@/lib/spatial/templates.ts';
import type { FloorDims } from '@/lib/spatial/types.ts';

// >20% difference between actual room dims and a template's target range
// counts as "may need adjustment" — informational only, never blocks selection.
function dimsMismatch(actualDims: FloorDims | undefined, template: ScenarioTemplate): boolean {
  if (!actualDims) return false;
  const { widthM, lengthM } = actualDims;
  const outsideByMargin = (value: number, min: number, max: number) => {
    if (value >= min && value <= max) return false;
    const nearest = value < min ? min : max;
    return Math.abs(value - nearest) / nearest > 0.2;
  };
  return (
    outsideByMargin(widthM, template.targetWidthM.min, template.targetWidthM.max) ||
    outsideByMargin(lengthM, template.targetLengthM.min, template.targetLengthM.max)
  );
}

export function TemplatePicker({
  templates,
  actualDims,
  onSelect,
}: {
  templates: ScenarioTemplate[];
  actualDims?: FloorDims;
  onSelect: (template: ScenarioTemplate) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => {
        const mismatch = dimsMismatch(actualDims, template);
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template)}
            className="flex flex-col items-start gap-2 rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
          >
            <div className="flex w-full items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900">{template.name}</h3>
              {template.budgetRangeAud.max > 0 && (
                <span className="whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  ${template.budgetRangeAud.min}–${template.budgetRangeAud.max}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">{template.description}</p>
            {mismatch && (
              <span className="mt-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                may need adjustment for your room size
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
