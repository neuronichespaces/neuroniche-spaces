// Sidebar controls for the selected PlacedObject. Every change writes straight through
// to useRoomLayoutStore — no local state — so the 2D/3D views stay in sync automatically.
'use client';

import { useRoomLayoutStore } from '@/lib/spatial/store.ts';
import { clearanceToNearestWall } from '@/lib/spatial/measurements.ts';

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-sm text-gray-700">
      <span className="flex justify-between">
        <span>{label}</span>
        <span className="text-gray-500">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-600"
      />
    </label>
  );
}

export function PropertiesPanel() {
  const selectedObjectId = useRoomLayoutStore((s) => s.selectedObjectId);
  const placedObjects = useRoomLayoutStore((s) => s.placedObjects);
  const walls = useRoomLayoutStore((s) => s.walls);
  const updateObjectProps = useRoomLayoutStore((s) => s.updateObjectProps);
  const rotateObject = useRoomLayoutStore((s) => s.rotateObject);

  const obj = placedObjects.find((o) => o.id === selectedObjectId);
  if (!obj) return null;

  const props = obj.customProperties;
  const clearance = clearanceToNearestWall({ x: obj.x, y: obj.y }, walls);

  return (
    <aside className="w-64 shrink-0 space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">Object properties</h2>

      {clearance && (
        <p className="text-sm text-gray-600">
          Clearance to nearest wall: <span className="font-medium text-gray-900">{clearance.clearanceM.toFixed(2)}m</span>
        </p>
      )}

      <Slider
        label="Width"
        value={props.widthM ?? obj.footprintM.w}
        min={0.1}
        max={3}
        step={0.05}
        unit="m"
        onChange={(widthM) => updateObjectProps(obj.id, { widthM })}
      />
      <Slider
        label="Depth"
        value={props.depthM ?? obj.footprintM.l}
        min={0.1}
        max={3}
        step={0.05}
        unit="m"
        onChange={(depthM) => updateObjectProps(obj.id, { depthM })}
      />
      <Slider
        label="Height"
        value={props.heightM ?? 1}
        min={0.1}
        max={3}
        step={0.05}
        unit="m"
        onChange={(heightM) => updateObjectProps(obj.id, { heightM })}
      />

      <Slider
        label="Rotation"
        value={obj.rotationDeg}
        min={0}
        max={360}
        step={1}
        unit="°"
        onChange={(deg) => rotateObject(obj.id, deg)}
      />

      <Slider
        label="Brightness"
        value={props.brightness ?? 0}
        min={0}
        max={100}
        step={1}
        unit="%"
        onChange={(brightness) => updateObjectProps(obj.id, { brightness })}
      />

      <label className="block text-sm text-gray-700">
        <span className="flex justify-between">
          <span>Colour temperature</span>
          <span className="text-gray-500">{props.colourTempK ?? 4000}K</span>
        </span>
        <input
          type="range"
          min={2700}
          max={6500}
          step={100}
          value={props.colourTempK ?? 4000}
          onChange={(e) => updateObjectProps(obj.id, { colourTempK: Number(e.target.value) })}
          className="w-full"
          style={{
            accentColor: '#fdba74',
            background: 'linear-gradient(to right, #ffb347, #fff8e7, #cfe8ff)',
          }}
        />
      </label>

      <Slider
        label="Noise level"
        value={props.noiseLevelDb ?? 0}
        min={0}
        max={100}
        step={1}
        unit="dB"
        onChange={(noiseLevelDb) => updateObjectProps(obj.id, { noiseLevelDb })}
      />
    </aside>
  );
}
