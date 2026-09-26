import { Stepper } from '../UI/Stepper';
import { minuteSteps } from '../../utils/minuteSteps';

const STEPS = minuteSteps(99);

// The custom length, in whole minutes (presets cover the usual ones)
export const DurationSelector = ({ duration, onChange, disabled = false }) => (
  <div className="flex items-center justify-center gap-3 text-sm text-white/70">
    <span>Custom</span>
    <Stepper
      value={Math.round(duration / 60)}
      steps={STEPS}
      onChange={(minutes) => onChange(minutes * 60)}
      label="Custom length"
      unit="min"
      disabled={disabled}
    />
  </div>
);
