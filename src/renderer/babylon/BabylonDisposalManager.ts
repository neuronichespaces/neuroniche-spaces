// Tracks disposable Babylon resources (meshes, materials, textures, containers) under a
// caller-chosen key so a whole group (e.g. "all meshes for placed object X") can be torn
// down in one call. Prevents the leak class the foundation spec calls out explicitly:
// resources created imperatively outside React's own unmount cleanup are otherwise easy
// to orphan on every re-sync.

type Disposable = { dispose: () => void };

export class BabylonDisposalManager {
  private readonly groups = new Map<string, Disposable[]>();

  track(key: string, disposable: Disposable): void {
    const group = this.groups.get(key);
    if (group) group.push(disposable);
    else this.groups.set(key, [disposable]);
  }

  disposeGroup(key: string): void {
    const group = this.groups.get(key);
    if (!group) return;
    for (const d of group) {
      try {
        d.dispose();
      } catch {
        // ponytail: a mesh/texture already disposed by Babylon's own scene teardown
        // shouldn't throw and abort the rest of the group's cleanup.
      }
    }
    this.groups.delete(key);
  }

  disposeAll(): void {
    for (const key of [...this.groups.keys()]) this.disposeGroup(key);
  }

  hasGroup(key: string): boolean {
    return this.groups.has(key);
  }
}
