// Phase 6 — CSV + PDF export. CSV downloads client-side via Blob (no server round-trip).
// PDF export uses the browser's native print-to-PDF: we show a print-only overlay
// (visibility trick below, no dedicated route needed) and call window.print().
// ponytail: no Puppeteer/react-to-pdf — window.print() is the zero-dependency default
// for a one-click MVP PDF export; upgrade to server-side rendering only if users need
// print-less automated PDF generation (e.g. emailed reports).
'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRoomLayoutStore } from '@/lib/spatial/store.ts';
import { buildBillOfMaterials, bomToCsv } from '@/lib/spatial/bom.ts';
import { PrintableExport } from './PrintableExport.tsx';
import type { Product } from '@/lib/planner/plan.ts';

// Same code-split as page.tsx's 2D/3D view toggle: ExportPanel is mounted
// unconditionally in the page header (for its off-screen snapshot capture), so a
// static import here would pull three.js back into the initial bundle regardless
// of the 2D/3D dynamic import in page.tsx.
const RoomViewer3D = dynamic(() => import('./RoomViewer3D.tsx'), { ssr: false });

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportPanel({ roomName, catalogue }: { roomName: string; catalogue: Product[] }) {
  const [printing, setPrinting] = useState(false);
  const [snapshotDataUrl, setSnapshotDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const walls = useRoomLayoutStore((s) => s.walls);
  const doors = useRoomLayoutStore((s) => s.doors);
  const floorDims = useRoomLayoutStore((s) => s.floorDims);
  const placedObjects = useRoomLayoutStore((s) => s.placedObjects);
  const layers = useRoomLayoutStore((s) => s.layers);

  const lookup = (productId: string) => {
    const p = catalogue.find((c) => c.id === productId);
    return p ? { name: p.name, price: p.price, funding_eligible: p.funding_eligible } : undefined;
  };
  const bomLines = buildBillOfMaterials(placedObjects, lookup);

  function handleExportCsv() {
    downloadCsv(bomToCsv(bomLines), `${roomName || 'sensory-room'}-shopping-list.csv`);
  }

  function handleExportPdf() {
    // Capture the off-screen high-detail 3D canvas (see hidden <RoomViewer3D> below) as a PNG
    // for the PDF's 3D view. Two rAFs: one to let R3F flush the latest frame to the canvas
    // after any pending re-render, one more so the browser has actually painted it before we
    // read pixels back out with toDataURL — a single rAF was empirically one frame too early.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          setSnapshotDataUrl(canvasRef.current ? canvasRef.current.toDataURL('image/png') : null);
        } catch {
          // ponytail: toDataURL can throw (tainted canvas / unsupported context) — PDF still
          // works without the 3D snapshot, just falls back to floor-plan-only like before.
          setSnapshotDataUrl(null);
        }
        setPrinting(true);
        requestAnimationFrame(() => {
          window.print();
          setPrinting(false);
        });
      });
    });
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={handleExportCsv}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Export Shopping List (CSV)
      </button>
      <button
        type="button"
        onClick={handleExportPdf}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Export PDF
      </button>

      {/* Always-mounted, visually hidden (not display:none — R3F needs real layout to render)
          high-detail viewer solely so Export PDF has a live canvas ready to snapshot on click. */}
      <div className="pointer-events-none fixed -left-[9999px] top-0 h-[480px] w-[640px]" aria-hidden="true">
        <RoomViewer3D highDetail hideControls onCanvasReady={(canvas) => (canvasRef.current = canvas)} />
      </div>

      {printing && (
        <>
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #noniche-print-root, #noniche-print-root * { visibility: visible; }
              #noniche-print-root { position: absolute; left: 0; top: 0; width: 100%; }
            }
          `}</style>
          <div id="noniche-print-root">
            <PrintableExport
              roomName={roomName}
              floorDims={floorDims}
              walls={walls}
              doors={doors}
              placedObjects={placedObjects}
              bomLines={bomLines}
              snapshotDataUrl={snapshotDataUrl}
              layers={layers}
            />
          </div>
        </>
      )}
    </div>
  );
}
