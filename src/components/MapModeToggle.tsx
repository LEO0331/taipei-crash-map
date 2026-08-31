import type { MapMode } from '../types/accident';
import type { Translation } from '../i18n';

type Props = {
  mode: MapMode;
  t: Translation;
  onChange: (mode: MapMode) => void;
};

export function MapModeToggle({ mode, t, onChange }: Props) {
  const options: Array<{ mode: MapMode; label: string }> = [
    { mode: 'hotspots', label: t.hotspots },
    { mode: 'clusters', label: t.clusters },
  ];

  return (
    <div className="segmented map-mode" aria-label={t.mapMode}>
      {options.map((option) => (
        <button
          className={mode === option.mode ? 'active' : ''}
          key={option.mode}
          type="button"
          aria-pressed={mode === option.mode}
          onClick={() => onChange(option.mode)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
