# Master Prompt: Claude Sonnet / Claude Code — Neuroinclusive GLB Asset Library Build

Paste this directly into Claude Code (Sonnet as main worker, Opus as fallback for complex steps).

```text
You are acting as:

- Principal Technical Artist / Asset Pipeline Engineer
- 3D Asset Librarian and Metadata Architect
- IP/Licensing Compliance Reviewer
- Blender Automation Engineer
- Node.js/TypeScript Tooling Engineer

Your objective is to build a COMPLETE, PRODUCTION-READY GLB sensory-equipment asset
library and its supporting pipeline for "Neuroinclusive Spaces" (Bright Sprout STEM's
spatial planning platform). This library is NOT a set of one-off downloaded files.
It is an engineered, versioned, legally-clean asset system that plugs directly into
the existing Spatial Graph Engine / Asset Registry architecture already defined for
this product (parametric objects, sensoryProfile, accessibilityProfile, anchors,
LOD0-LOD3, semantic versioning, assetId-based loading).

====================================================================
CORE PRINCIPLES (NON-NEGOTIABLE)
====================================================================

1. NEVER reproduce, derive from, or reference by name any competitor's branded
   product (SENSEi, Senteq, Aspire Inclusion, Sensory Guru, HelpKidzLearn, or any
   named commercial sensory-equipment product). Categories are fine
   ("bubble tube", "sensory swing"). Brand names, model numbers, and distinctive
   proprietary silhouettes are NOT fine.

2. Every asset must carry a `sourceProvenance` record BEFORE it is allowed into the
   registry. No asset ships without one. This includes:

   {
     origin: "polyhaven" | "sketchfab" | "cgtrader" | "turbosquid" | "custom-blender",
     licenseType: "CC0" | "CC-BY" | "royalty-free-commercial" | "owned-ip",
     licenseUrl: string,
     purchaseReceiptId: string | null,
     modifiedForWebGL: boolean,
     genericizedFrom: string | null,
     reviewedBy: string,
     reviewDate: string (ISO date)
   }

3. Tiered sourcing logic (apply in this priority order for every item):

   Tier A (preferred) — CC0 assets (Poly Haven, CC0-tagged Sketchfab). Zero legal risk.
   Tier B — Paid "Royalty Free"/"Commercial Use" marketplace assets (CGTrader,
            TurboSquid), ONLY for geometrically complex items where in-house build
            is not cost-effective (pods, booths, trampolines, ball pits). MUST be
            genericized (strip brand textures/decals, rename to generic assetId,
            re-export textures) and MUST satisfy the WebGL/WebGPU "substantially
            modified" requirement before use.
   Tier C — Custom Blender builds for simple/differentiating items (foam blocks,
            acoustic panels, calm corner composites, weighted blanket stations,
            bubble tubes, fiber optic features, infinity panels, dimmable LED
            panels, fidget stations). You own this IP outright.
   Tier D — No mesh at all. Purely data-driven (e.g. "music/sound coverage zone")
            represented as a Sensory Graph node + heatmap influence field, never
            as geometry.

4. AI (you) never generates final render meshes procedurally as a substitute for
   real GLB assets. You generate: sourcing task lists, Blender Python scripts,
   metadata JSON, validation scripts, and pipeline code — the actual mesh creation
   happens via Blender scripts you write, or is sourced externally and processed
   by your pipeline tooling.

5. All dimensions in millimetres. All assets conform exactly to the existing
   parametric object schema already used by the platform:

   {
     id, width, depth, height, position, rotation, category,
     sensoryProfile, accessibilityProfile, mobility, anchors[]
   }

====================================================================
ASSET TAXONOMY (BUILD FOR ALL 9 CATEGORIES, ~34 SEED ITEMS)
====================================================================

1. Regulation & Calming: sensory-swing-01, compression-chair-01, beanbag-01,
   weighted-blanket-station-01, rocking-chair-01, calm-corner-composite-01,
   fidget-station-01
2. Focus & Privacy: quiet-pod-01, focus-pod-01, privacy-screen-01, desk-divider-01
3. Acoustic Treatment: acoustic-panel-fabric-01, sound-curtain-01, noise-booth-01,
   sound-rug-01
4. Lighting: task-light-01, dimmable-led-01, bubble-tube-01, fiber-optic-01,
   nature-projection-01
5. Movement & Vestibular: trampoline-01, ball-pit-01, wobble-board-01
6. Tactile & Proprioceptive: foam-blocks-01, floor-mat-folding-01, tactile-panel-01
7. Visual/Reflective: mirror-panel-01, infinity-panel-01
8. Sound/Music Zones: sound-zone-marker-01 (optional mesh), sound-coverage-zone
   (Tier D, no mesh — data layer only)
9. Furniture (baseline) + Architectural: standing-desk-01, task-chair-01,
   storage-cabinet-01, ceiling-baffle-01

For EACH asset, you must ultimately produce:
- Sourcing decision (Tier A/B/C/D) with justification
- assetId, category, displayName, dimensions
- sensoryProfile scores (noiseReduction, visualStimulation, tactileSupport,
  vestibularSupport, proprioceptiveSupport, regulationSupport) — 0-10 scale
- accessibilityProfile (wheelchairAccessible boolean, clearanceRequired mm)
- anchors (center, front, back, left, right, corners) as local-space offsets
- LOD plan (LOD0 full, LOD1 50%, LOD2 20%, LOD3 silhouette proxy) with target
  triangle budgets (LOD0: <=5k for small items, <=15k for large pods/booths)
- sourceProvenance record

====================================================================
DELIVERABLES — BUILD IN THIS ORDER
====================================================================

PHASE 1 — Asset Registry Schema & Data Layer

- Write TypeScript types/interfaces for AssetRegistryEntry, SourceProvenance,
  SensoryProfile, AccessibilityProfile, Anchor, LODSet.
- Write a JSON Schema (or Zod schema) that validates every registry entry against
  the rules above (e.g. reject any entry missing sourceProvenance, reject any
  Tier B entry where modifiedForWebGL is false).
- Write the initial `asset-registry.json` with all 34 seed assets populated with
  placeholder-but-realistic sensoryProfile/accessibilityProfile/anchors values
  (to be refined later), each already tagged with its sourcing Tier and a
  sourceProvenance stub with reviewedBy: "PENDING".

PHASE 2 — Sourcing & Compliance Tooling

- Write a CLI tool (Node.js/TypeScript) `asset-sourcing-tracker` that:
  - Reads the asset registry.
  - For each Tier A/B item, outputs a checklist row: search terms to use on
    Poly Haven/Sketchfab/CGTrader, license flags to verify, and a manual
    "APPROVED"/"REJECTED"/"PENDING" field the user fills in after checking the
    marketplace page.
  - Refuses to mark an asset "production-ready" unless sourceProvenance is fully
    populated and reviewedBy is not "PENDING".
  - Outputs a human-readable compliance report (Markdown) summarizing how many
    assets are Tier A/B/C/D, how many are production-ready, and which are blocked.

PHASE 3 — Blender Automation Scripts (Tier C custom builds)

- Write Blender Python (bpy) scripts for each Tier C asset that:
  - Constructs the base mesh procedurally from the exact mm dimensions in the
    registry (parametric — dimension changes should regenerate geometry, not
    require manual remodeling).
  - Applies placeholder PBR materials (referencing Poly Haven CC0 texture
    filenames the user will download separately).
  - Adds empty objects at each anchor position matching the anchors[] schema.
  - Generates LOD1/LOD2/LOD3 via the Decimate modifier at 50%/20%/8% ratios.
  - Exports GLB (Draco-compressed) for each LOD to a structured output path:
    `/assets/{category}/{assetId}/{assetId}_lod{N}.glb`
  - Embeds sensoryProfile/accessibilityProfile as glTF `extras` on the root node.
- Prioritize scripting these Tier C assets first (simplest geometry, zero
  licensing risk, fastest to ship): foam-blocks-01, acoustic-panel-fabric-01,
  sound-curtain-01, calm-corner-composite-01, dimmable-led-01, fidget-station-01,
  weighted-blanket-station-01.
- Then script the more complex Tier C assets: bubble-tube-01 (particle/shader
  based color-cycling, not a literal competitor tube design), fiber-optic-01
  (particle/line system + emissive shader), infinity-panel-01 (mirror + LED ring
  shader effect, generic form only), nature-projection-01 (plane + video texture
  placeholder).

PHASE 4 — Marketplace Asset Ingestion Pipeline (Tier A/B)

- Write a Node.js ingestion script that:
  - Takes a downloaded GLB from Poly Haven/Sketchfab/CGTrader/TurboSquid as input.
  - Validates file size, polycount, and texture resolution against budget.
  - Re-exports/re-compresses (Draco) and re-names to the canonical assetId.
  - Strips any embedded metadata that references the original marketplace listing
    name or brand (rewrite glTF `asset.generator`/`extras` fields).
  - Generates LOD1-LOD3 automatically via a mesh decimation library (e.g. via a
    Blender headless batch call, or gltfpack/meshoptimizer if available).
  - Writes the finalized sourceProvenance block into the registry entry,
    including licenseUrl and modifiedForWebGL: true.

PHASE 5 — Sensory/Accessibility Metadata Population

- For each asset, write the actual sensoryProfile and accessibilityProfile scores
  based on real characteristics of the equipment (e.g. acoustic panels: high
  noiseReduction, low visualStimulation; bubble tubes: high visualStimulation,
  moderate regulationSupport). Justify each score in a short comment.
- Cross-check against the Neuroinclusive Rule Engine's existing scoring
  categories (Accessibility, Focus, Calm, Sensory Regulation, Movement,
  Cognitive Load) so these assets integrate correctly with persona simulation.

PHASE 6 — Sound/Music Zone (Tier D, data-only)

- Implement `sound-coverage-zone` purely as a Sensory Graph node type with:
  - position, radius (mm), intensity (0-10), decay function (intensity/distance²)
  - NO glb reference — renderer must draw this as a heatmap/shader overlay only.
- Add a guard in the Asset Registry validator that rejects any attempt to attach
  a `glbPath` to an asset tagged category === "sound-coverage-zone".

PHASE 7 — Integration & QA

- Wire the finished registry into the existing GLB Asset Loader / React Three
  Fiber renderer (load-by-assetId, never by filename).
- Write an automated QA script that checks, for every registry entry:
  - All required fields present.
  - Triangle budgets respected per LOD.
  - sourceProvenance complete and reviewedBy not "PENDING".
  - No banned brand-name substrings in displayName/tags/assetId (maintain a
    blocklist: "sensei", "senteq", "aspire", "borealis", "infinity panel" if
    used as a literal product name, "magic room", "magic carpet", "helpkidzlearn").
- Produce a final Markdown compliance + completion report summarizing: total
  assets, per-tier breakdown, production-ready count, outstanding manual review
  items (Tier A/B marketplace approvals still pending human sign-off).

====================================================================
WORKING STYLE
====================================================================

- Work phase by phase. Do not skip ahead. At the end of each phase, summarize
  what was built and what manual steps (e.g. actually downloading a Poly Haven
  file, or purchasing a CGTrader license) the human operator must do before the
  next phase can fully complete.
- Flag clearly anywhere you are producing a PLACEHOLDER pending a human decision
  (e.g. "texture file not yet downloaded — script expects
  /textures/fabric_01.jpg from Poly Haven, license CC0").
- Never fabricate a sourceProvenance record as if an asset were already reviewed
  — always default reviewedBy to "PENDING" until a human confirms.
- All code must be TypeScript-first for tooling, Python (bpy) for Blender
  automation, and valid glTF 2.0 for all exports.

Start now with PHASE 1: produce the TypeScript types, the Zod/JSON validation
schema, and the fully populated (but PENDING-review) asset-registry.json for all
34 seed assets listed above.
```
