// Print-friendly room summary: floor plan + bill of materials. Triggered via window.print()
// from ExportPanel — no PDF library. Browser's native "Save as PDF" print destination
// produces the actual PDF. Screen styling is minimal; @media print governs the real output.
'use client';

import type { WallSegment, FloorDims, DoorPlacement, PlacedObject } from '@/lib/spatial/types.ts';
import type { BomLine } from '@/lib/spatial/bom.ts';
import { wallSegmentsWithDoorGap } from '@/lib/spatial/geometry.ts';

const PADDING = 20;
const SCALE = 40; // px per metre

// Reuses wallSegmentsWithDoorGap (same helper as the 2D editor and 3D geometry)
// so exported walls show the same door cutouts, instead of a solid uncut line.
function wallsToSvg(walls: WallSegment[], doors: DoorPlacement[], placedObjects: PlacedObject[], floorDims: FloorDims) {
  const w = floorDims.widthM * SCALE + PADDING * 2;
  const h = floorDims.lengthM * SCALE + PADDING * 2;
  const px = (x: number) => PADDING + x * SCALE;
  const py = (y: number) => PADDING + y * SCALE;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Floor plan">
      <rect
        x={PADDING}
        y={PADDING}
        width={floorDims.widthM * SCALE}
        height={floorDims.lengthM * SCALE}
        fill="none"
        stroke="#999"
        strokeWidth={1}
      />
      {walls.map((wall) => {
        const door = doors.find((d) => d.wallId === wall.id);
        return wallSegmentsWithDoorGap(wall, door).map((seg, i) => (
          <line
            key={`${wall.id}-${i}`}
            x1={px(seg.start.x)}
            y1={py(seg.start.y)}
            x2={px(seg.end.x)}
            y2={py(seg.end.y)}
            stroke="#111"
            strokeWidth={Math.max(2, wall.thicknessM * SCALE)}
          />
        ));
      })}
      {placedObjects.map((obj) => {
        const rectW = obj.footprintM.w * SCALE;
        const rectL = obj.footprintM.l * SCALE;
        return (
          <g key={obj.id} transform={`translate(${px(obj.x)}, ${py(obj.y)}) rotate(${obj.rotationDeg})`}>
            <rect x={-rectW / 2} y={-rectL / 2} width={rectW} height={rectL} fill="#cdd8f0" stroke="#334" strokeWidth={1} />
            <text x={0} y={0} fontSize={9} textAnchor="middle" dominantBaseline="middle" fill="#111">
              {obj.productId}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function PrintableExport({
  roomName,
  floorDims,
  walls,
  doors = [],
  placedObjects = [],
  bomLines,
  snapshotDataUrl,
}: {
  roomName: string;
  floorDims: FloorDims;
  walls: WallSegment[];
  doors?: DoorPlacement[];
  placedObjects?: PlacedObject[];
  bomLines: BomLine[];
  /** Off-screen-captured 3D render (RoomViewer3D canvas.toDataURL) — omitted if capture failed. */
  snapshotDataUrl?: string | null;
}) {
  const total = bomLines.reduce((s, l) => s + l.lineTotal, 0);

  return (
    <div className="mx-auto max-w-2xl p-6 text-black print:p-0">
      <h1 className="text-xl font-semibold">{roomName || 'Sensory room plan'}</h1>
      <p className="mt-1 text-sm text-gray-700">
        Room dimensions: {floorDims.widthM}m x {floorDims.lengthM}m
      </p>

      {snapshotDataUrl && (
        <>
          <h2 className="mt-6 text-base font-semibold">3D view</h2>
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL, not an app asset */}
          <img src={snapshotDataUrl} alt="3D render of the room" className="mt-2 w-full max-w-lg rounded border border-gray-300" />
        </>
      )}

      <h2 className="mt-6 text-base font-semibold">Floor plan</h2>
      <div className="mt-2">{wallsToSvg(walls, doors, placedObjects, floorDims)}</div>

      <h2 className="mt-6 text-base font-semibold">Shopping list</h2>
      <table className="mt-2 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-400 text-left">
            <th className="py-1">Product</th>
            <th className="py-1">Qty</th>
            <th className="py-1">Unit price</th>
            <th className="py-1">Line total</th>
            <th className="py-1">Funding eligible</th>
          </tr>
        </thead>
        <tbody>
          {bomLines.map((l) => (
            <tr key={l.productId} className="border-b border-gray-200">
              <td className="py-1">{l.name}</td>
              <td className="py-1">{l.quantity}</td>
              <td className="py-1">${l.unitPrice.toFixed(2)}</td>
              <td className="py-1">${l.lineTotal.toFixed(2)}</td>
              <td className="py-1">{l.fundingEligible ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="pt-2 font-semibold" colSpan={3}>
              Total
            </td>
            <td className="pt-2 font-semibold">${total.toFixed(2)}</td>
            <td />
          </tr>
        </tfoot>
      </table>

      <p className="mt-4 text-xs text-gray-500">
        Prices shown are estimates from the current catalogue and are not guaranteed. Confirm against
        official funding source guidelines before applying.
      </p>
    </div>
  );
}
