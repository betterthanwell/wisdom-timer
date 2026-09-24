import { ChoiceButton } from '../UI/ChoiceButton';

export const PresetButtons = ({ presets, currentDuration, onSelect, disabled = false }) => {
  return (
    <div className="grid grid-cols-4 gap-2">
      {presets.map((duration) => (
        <ChoiceButton
          key={duration}
          selected={currentDuration === duration}
          onClick={() => onSelect(duration)}
          disabled={disabled}
          className="py-1.5"
        >
          {duration / 60}m
        </ChoiceButton>
      ))}
    </div>
  );
};
