// NeuroNiche enhancement (2026-08-10): scene lighting presets — Calm/Active/Assessment.
// Isolated module, no changes to BabylonSceneController.ts's createLights(): looks up
// the existing 'ambient'/'sun' lights by name and mutates intensity/colour, so it
// composes with whatever lighting setup already exists instead of replacing it.
import { Color3, type Light, type Scene } from '@babylonjs/core';

export type ScenePresetName = 'calm' | 'active' | 'assessment';

export const SCENE_PRESET_NAMES: ScenePresetName[] = ['calm', 'active', 'assessment'];

type PresetConfig = { hemiIntensity: number; sunIntensity: number; tint: Color3 };

// Calm: dim, warm — lower arousal. Active: bright, cool — higher alertness/engagement.
// Assessment: neutral, even, colour-true — a clinical/observation baseline, not a
// mood setting. Intensities are relative to createLights' existing 0.5-1.1 range, not
// arbitrary.
const PRESETS: Record<ScenePresetName, PresetConfig> = {
  calm: { hemiIntensity: 0.45, sunIntensity: 0.5, tint: Color3.FromHexString('#ffe8cf') },
  active: { hemiIntensity: 0.9, sunIntensity: 1.2, tint: Color3.FromHexString('#eaf4ff') },
  assessment: { hemiIntensity: 0.85, sunIntensity: 0.85, tint: Color3.FromHexString('#ffffff') },
};

function setLightProps(light: Light | null, intensity: number, tint: Color3) {
  if (!light) return;
  light.intensity = intensity;
  // HemisphericLight/DirectionalLight both expose `diffuse: Color3`, but the base
  // `Light` type doesn't — a narrow, deliberate cast rather than importing both
  // concrete light classes just to type-guard this one property.
  if ('diffuse' in light) (light as unknown as { diffuse: Color3 }).diffuse = tint;
}

export function applyScenePreset(scene: Scene, preset: ScenePresetName): void {
  const cfg = PRESETS[preset];
  setLightProps(scene.getLightByName('ambient'), cfg.hemiIntensity, cfg.tint);
  setLightProps(scene.getLightByName('sun'), cfg.sunIntensity, cfg.tint);
}
