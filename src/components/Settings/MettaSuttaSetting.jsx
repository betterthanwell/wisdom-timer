import { useState } from 'react';
import { HandHeart, Info } from 'lucide-react';
import { METTA_SUTTA_PACES } from '../../utils/settings';
import { METTA_SUTTA_LICENSE, METTA_SUTTA_SOURCE } from '../../utils/mettaSutta';
import { Switch } from '../UI/Switch';
import { SettingLabel } from '../UI/SettingLabel';
import { ChoiceButton } from '../UI/ChoiceButton';

// Metta Sutta mode on/off, and how long each word takes. The translation's
// license asks for its full text in every copy: the (i) button shows it,
// with the source.
export const MettaSuttaSetting = ({ enabled, pace, onToggle, onPaceChange }) => {
  const [licenseShown, setLicenseShown] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <SettingLabel icon={HandHeart}>Metta Sutta mode</SettingLabel>
        <Switch checked={enabled} onChange={onToggle} label="Metta Sutta mode" />
      </div>
      {enabled && (
        <div className="pl-6 space-y-2">
          <div className="flex items-start gap-1.5">
            <p className="text-xs text-white/70">The Buddha’s words on loving-kindness, a couplet at a time.</p>
            <button
              type="button"
              onClick={() => setLicenseShown((shown) => !shown)}
              aria-expanded={licenseShown}
              aria-label="Metta Sutta source and license"
              className="-m-1 shrink-0 rounded-full p-1 text-white/70 hover:text-white"
            >
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          {licenseShown && (
            <div className="space-y-1.5 rounded-lg bg-black/15 px-3 py-2 text-[11px] leading-snug text-white/80">
              <p>
                <a href={METTA_SUTTA_SOURCE.url} target="_blank" rel="noreferrer" className="underline decoration-white/40 hover:text-white">
                  {METTA_SUTTA_SOURCE.title}
                </a>
                , {METTA_SUTTA_SOURCE.translator}. Shown here a couplet at a time.
              </p>
              {METTA_SUTTA_LICENSE.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          )}
          <div role="group" aria-label="Metta Sutta pace" className="grid grid-cols-4 gap-2">
            {METTA_SUTTA_PACES.map((option) => (
              <ChoiceButton
                key={option}
                selected={option === pace}
                onClick={() => onPaceChange(option)}
                aria-label={`${option} ${option === 1 ? 'second' : 'seconds'} per word`}
                className="py-1.5"
              >
                {option}s
              </ChoiceButton>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
