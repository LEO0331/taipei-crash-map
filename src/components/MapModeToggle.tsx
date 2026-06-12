import type { MapMode } from '../types/accident';
import type { Translation } from '../i18n';

type Props = {
  mode: MapMode;
  t: Translation;
  onChange: (mode: MapMode) => void;
};

export function MapModeToggle({ mode, t, onChange }: Props) {
  const options: Array<{ mode: MapMode; label: string }> = [
    { mode: 'heatmap', label: t.heatmap },
    { mode: 'clusters', label: t.clusters },
    { mode: 'hotspots', label: t.hotspots },
  ];

  return (
    <div className="segmented map-mode" aria-label="Map mode">
      {options.map((option) => (
        <button
          className={mode === option.mode ? 'active' : ''}
          key={option.mode}
          type="button"
          onClick={() => onChange(option.mode)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
