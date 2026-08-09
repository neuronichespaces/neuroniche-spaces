// Print-friendly room summary: floor plan + bill of materials. Triggered via window.print()
// from ExportPanel — no PDF library. Browser's native "Save as PDF" print destination
// produces the actual PDF. Screen styling is minimal; @media print governs the real output.
'use client';

import type { WallSegment, FloorDims, DoorPlacement, PlacedObject } from '@/lib/spatial/types.ts';
import type { BomLine } from '@/lib/spatial/bom.ts';
import { wallSegmentsWithDoorGap, wallLengthM, DEFAULT_WALL_HEIGHT_M } from '@/lib/spatial/geometry.ts';

const PADDING = 20;
const SCALE = 40; // px per metre

// North arrow — fixed convention (drawing "up" = +y = north), not user-configurable
// yet (no compass/orientation field on FloorDims). A simple triangle + "N" label,
// standard technical-drawing symbol, placed top-right of the floor plan.
function NorthArrow({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`} aria-label="North arrow">
      <polygon points="0,-14 5,6 0,2 -5,6" fill="#111" />
      <text x={0} y={20} fontSize={10} textAnchor="middle" fill="#111">
        N
      </text>
    </g>
  );
}

// Scale bar — a labelled ruler showing 1m/2m at the drawing's actual SCALE, so a
// printed/PDF'd page (which may not preserve exact px-to-mm) still carries a real
// reference the way "1:40" text alone doesn't survive a photocopy or a resize.
function ScaleBar({ x, y }: { x: number; y: number }) {
  const barLenPx = 2 * SCALE; // 2 metres
  return (
    <g transform={`translate(${x}, ${y})`} aria-label="Scale bar">
      <line x1={0} y1={0} x2={barLenPx} y2={0} stroke="#111" strokeWidth={2} />
      <line x1={0} y1={-4} x2={0} y2={4} stroke="#111" strokeWidth={1} />
      <line x1={SCALE} y1={-4} x2={SCALE} y2={4} stroke="#111" strokeWidth={1} />
      <line x1={barLenPx} y1={-4} x2={barLenPx} y2={4} stroke="#111" strokeWidth={1} />
      <text x={0} y={16} fontSize={9} fill="#111">
        0
      </text>
      <text x={SCALE} y={16} fontSize={9} textAnchor="middle" fill="#111">
        1m
      </text>
      <text x={barLenPx} y={16} fontSize={9} textAnchor="end" fill="#111">
        2m
      </text>
    </g>
  );
}

// One elevation per wall — a side-on projection (length x height) rather than the
// floor plan's top-down view, with the wall's door (if any) shown as a cutout. This
// is a real second projection of the model (CAD Gap 6's "generated section/elevation
// views"), not a rendering-only decoration: it's derived from the same WallSegment/
// DoorPlacement data the floor plan and 3D view already read.
function wallElevationSvg(wall: WallSegment, door: DoorPlacement | undefined, wallHeightM: number, index: number) {
  const lengthM = wallLengthM(wall);
  const w = lengthM * SCALE + PADDING * 2;
  const h = wallHeightM * SCALE + PADDING * 2;
  return (
    <svg key={wall.id} width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Wall ${index + 1} elevation`}>
      <rect x={PADDING} y={PADDING} width={lengthM * SCALE} height={wallHeightM * SCALE} fill="none" stroke="#111" strokeWidth={1.5} />
      {door && (
        <rect
          x={PADDING + door.offsetM * SCALE}
          y={PADDING + (wallHeightM - 2.0) * SCALE}
          width={door.widthM * SCALE}
          height={2.0 * SCALE}
          fill="#fff"
          stroke="#111"
          strokeWidth={1}
        />
      )}
      <text x={PADDING} y={h - 4} fontSize={9} fill="#111">
        Wall {index + 1} — {lengthM.toFixed(2)}m x {wallHeightM.toFixed(1)}m
      </text>
    </svg>
  );
}

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
      <NorthArrow x={w - PADDING - 10} y={PADDING + 16} />
      <ScaleBar x={PADDING} y={h - 8} />
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
  const printedDate = new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="mx-auto max-w-2xl p-6 text-black print:p-0">
      <h1 className="text-xl font-semibold">{roomName || 'Sensory room plan'}</h1>
      <p className="mt-1 text-sm text-gray-700">
        Room dimensions: {floorDims.widthM}m x {floorDims.lengthM}m
      </p>

      {/* Title block — export-metadata system (CAD Gap 6): project/date/scale, the
          minimum a printed technical drawing needs to be identifiable on its own,
          separated from the page. */}
      <table className="mt-3 w-full max-w-md border-collapse border border-gray-400 text-xs">
        <tbody>
          <tr>
            <td className="border border-gray-400 bg-gray-50 px-2 py-1 font-medium">Project</td>
            <td className="border border-gray-400 px-2 py-1">{roomName || 'Sensory room plan'}</td>
          </tr>
          <tr>
            <td className="border border-gray-400 bg-gray-50 px-2 py-1 font-medium">Date</td>
            <td className="border border-gray-400 px-2 py-1">{printedDate}</td>
          </tr>
          <tr>
            <td className="border border-gray-400 bg-gray-50 px-2 py-1 font-medium">Scale</td>
            {/* A fixed "1:N" ratio isn't printable-honest without knowing the output page's
                physical DPI (varies by printer/PDF settings) — the scale bar on the drawing
                itself is the reliable reference, this cell just points at it. */}
            <td className="border border-gray-400 px-2 py-1">See scale bar on floor plan (not a fixed ratio — depends on print/PDF output size)</td>
          </tr>
        </tbody>
      </table>

      {snapshotDataUrl && (
        <>
          <h2 className="mt-6 text-base font-semibold">3D view</h2>
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL, not an app asset */}
          <img src={snapshotDataUrl} alt="3D render of the room" className="mt-2 w-full max-w-lg rounded border border-gray-300" />
        </>
      )}

      <h2 className="mt-6 text-base font-semibold">Floor plan</h2>
      <div className="mt-2">{wallsToSvg(walls, doors, placedObjects, floorDims)}</div>

      {walls.length > 0 && (
        <>
          <h2 className="mt-6 text-base font-semibold">Wall elevations</h2>
          <div className="mt-2 flex flex-wrap gap-4">
            {walls.map((wall, i) => wallElevationSvg(wall, doors.find((d) => d.wallId === wall.id), DEFAULT_WALL_HEIGHT_M, i))}
          </div>
        </>
      )}

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
