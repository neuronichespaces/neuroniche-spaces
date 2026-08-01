// WebGPU capability detection for RoomViewer3D. Feature-detect via navigator.gpu
// existence AND a successful adapter/device request — not a blind try/catch —
// so we don't attempt WebGPURenderer.init() on browsers that will predictably fail.
export async function detectWebGPU(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) return false;
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
    const adapter = await gpu?.requestAdapter();
    if (!adapter) return false;
    return true;
  } catch {
    return false;
  }
}
