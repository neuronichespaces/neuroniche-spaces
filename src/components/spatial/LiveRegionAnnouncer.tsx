// §11.5 gap close: screen-reader announcements for spatial mutations. Reuses
// store.ts's existing auditLog (already a plain-language description per structural
// mutation — add/move/delete/rotate/edit — pushed by the `mutate()` helper) instead of
// threading announcement calls through every store action call site. Selection is
// separate because selectObject() is transient and never goes through mutate/auditLog.
// Mount once near the top of the spatial page — visually hidden, calm phrasing (no
// exclamation marks, announced once per event, never repeated/urgent) per CLAUDE.md.
//
// Subscribes via useRoomLayoutStore.subscribe (same pattern RoomViewer3D.tsx already
// uses for imperative store sync) rather than useState+useEffect diffing — that keeps
// the previous-value bookkeeping in a plain closure instead of a React ref, which
// avoids both react-hooks/set-state-in-effect and react-hooks/refs (this repo's
// stricter React Compiler-aligned lint rules disallow ref reads/writes and derived
// setState calls during the render/effect body).
'use client';

import { useEffect, useState } from 'react';
import { useRoomLayoutStore } from '@/lib/spatial/store.ts';

const OBJECT_NAME_OVERRIDES: Record<string, string> = {};

function objectLabel(productId: string): string {
  return OBJECT_NAME_OVERRIDES[productId] ?? productId.replace(/-/g, ' ');
}

export function LiveRegionAnnouncer() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Baseline captured at subscribe time, not at import time — this must run after
    // hydrateFromLocalStorage() has already restored the prior session's auditLog, so
    // that first callback only reports genuinely new events, not the whole history.
    let lastAuditLength = useRoomLayoutStore.getState().auditLog.length;
    let lastSelectedId = useRoomLayoutStore.getState().selectedObjectId;

    return useRoomLayoutStore.subscribe((s) => {
      if (s.auditLog.length > lastAuditLength) {
        const latest = s.auditLog[s.auditLog.length - 1];
        if (latest) setMessage(latest.description);
      }
      lastAuditLength = s.auditLog.length;

      // Only announce a selection appearing, not a deselection (avoids a second,
      // redundant announcement right after "Delete object" clears the selection).
      if (s.selectedObjectId && s.selectedObjectId !== lastSelectedId) {
        const obj = s.placedObjects.find((o) => o.id === s.selectedObjectId);
        if (obj) setMessage(`Selected ${objectLabel(obj.productId)}`);
      }
      lastSelectedId = s.selectedObjectId;
    });
  }, []);

  return (
    <div aria-live="polite" role="status" className="sr-only">
      {message}
    </div>
  );
}
