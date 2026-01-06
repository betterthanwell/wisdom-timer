import { Button } from '../UI/Button';

export const PresetButtons = ({ presets, currentDuration, onSelect, disabled = false }) => {
  return (
    <div className="grid grid-cols-4 gap-2">
      {presets.map((duration) => {
        const minutes = duration / 60;
        const isActive = currentDuration === duration;

        return (
          <Button
            key={duration}
            variant={isActive ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onSelect(duration)}
            disabled={disabled}
            className={`${isActive ? 'ring-2 ring-white/50' : ''}`}
          >
            {minutes}m
          </Button>
        );
      })}
    </div>
  );
};
