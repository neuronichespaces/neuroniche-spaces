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
  const leaders = useRoomLayoutStore((s) => s.leaders);
  const revisionClouds = useRoomLayoutStore((s) => s.revisionClouds);
  const sectionLines = useRoomLayoutStore((s) => s.sectionLines);
  // CAD-upgrade Gap 6 (named/versioned drawing sheets, 2026-08-10): local draft fields
  // for the title block, loadable/saveable as a named DrawingSheet preset. Local, not
  // store state — these only matter at export time, unlike every other panel's fields.
  const drawingSheets = useRoomLayoutStore((s) => s.drawingSheets);
  const saveDrawingSheet = useRoomLayoutStore((s) => s.saveDrawingSheet);
  const deleteDrawingSheet = useRoomLayoutStore((s) => s.deleteDrawingSheet);
  const [drawnBy, setDrawnBy] = useState('');
  const [checkedBy, setCheckedBy] = useState('');
  const [revision, setRevision] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [selectedSheetId, setSelectedSheetId] = useState('');

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

  function handleLoadSheet(id: string) {
    setSelectedSheetId(id);
    const sheet = drawingSheets.find((s) => s.id === id);
    if (!sheet) return;
    setDrawnBy(sheet.drawnBy);
    setCheckedBy(sheet.checkedBy);
    setRevision(sheet.revision);
  }

  function handleSaveSheet() {
    const name = sheetName.trim();
    if (!name) return;
    saveDrawingSheet({ name, drawnBy, checkedBy, revision });
    setSheetName('');
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* CAD-upgrade Gap 6 (export metadata + drawing sheets, 2026-08-10): drawn-by/
          checked-by/revision feed PrintableExport's title block; a named sheet is
          just these three fields saved/restored together. */}
      <details className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700">
        <summary className="cursor-pointer select-none">Drawing details</summary>
        <div className="mt-2 flex flex-col gap-1">
          <input
            value={drawnBy}
            onChange={(e) => setDrawnBy(e.target.value)}
            placeholder="Drawn by"
            className="min-h-11 rounded border border-gray-300 px-2 py-1"
            aria-label="Drawn by"
          />
          <input
            value={checkedBy}
            onChange={(e) => setCheckedBy(e.target.value)}
            placeholder="Checked by"
            className="min-h-11 rounded border border-gray-300 px-2 py-1"
            aria-label="Checked by"
          />
          <input
            value={revision}
            onChange={(e) => setRevision(e.target.value)}
            placeholder="Revision (e.g. A)"
            className="min-h-11 rounded border border-gray-300 px-2 py-1"
            aria-label="Revision"
          />
          {drawingSheets.length > 0 && (
            <select
              value={selectedSheetId}
              onChange={(e) => handleLoadSheet(e.target.value)}
              className="min-h-11 rounded border border-gray-300 px-2 py-1"
              aria-label="Load a saved drawing sheet"
            >
              <option value="">Load saved sheet…</option>
              {drawingSheets.map((sheet) => (
                <option key={sheet.id} value={sheet.id}>
                  {sheet.name}
                </option>
              ))}
            </select>
          )}
          {selectedSheetId && (
            <button
              type="button"
              onClick={() => {
                deleteDrawingSheet(selectedSheetId);
                setSelectedSheetId('');
              }}
              className="min-h-11 rounded border border-red-300 px-2 py-1 text-red-700 hover:bg-red-50"
            >
              Delete &quot;{drawingSheets.find((s) => s.id === selectedSheetId)?.name}&quot;
            </button>
          )}
          <div className="flex gap-1">
            <input
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="Save as sheet name"
              className="min-h-11 flex-1 rounded border border-gray-300 px-2 py-1"
              aria-label="New drawing sheet name"
            />
            <button type="button" onClick={handleSaveSheet} className="min-h-11 rounded border border-gray-300 px-2 py-1 hover:bg-gray-50">
              Save
            </button>
          </div>
        </div>
      </details>
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
              leaders={leaders}
              revisionClouds={revisionClouds}
              sectionLines={sectionLines}
              drawnBy={drawnBy}
              checkedBy={checkedBy}
              revision={revision}
            />
          </div>
        </>
      )}
    </div>
  );
}
