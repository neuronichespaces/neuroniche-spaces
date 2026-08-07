// Typed result wrapper for engine/scene creation — spec §1's "if WebGL initialization
// fails, enter recoverable renderer error state" and §10's "handle device/context loss
// with a clear recoverable error state" applies just as much to *startup* failure as to
// mid-session device loss. Before this, a thrown error inside RoomViewer3D's async IIFE
// left the status pill stuck on "Starting renderer…" forever with no visible recovery
// path — this makes that failure a typed value the component can render instead.

export type RendererInitResult<T> = { ok: true; value: T } | { ok: false; reason: string };

export async function withRendererErrorBoundary<T>(fn: () => Promise<T>): Promise<RendererInitResult<T>> {
  try {
    const value = await fn();
    return { ok: true, value };
  } catch (err) {
    // ponytail: message-only, not the full Error object — this reason string is meant
    // for a plain-language status pill, not a stack trace dump in the UI.
    const reason = err instanceof Error ? err.message : 'Unknown renderer initialization failure';
    return { ok: false, reason };
  }
}
