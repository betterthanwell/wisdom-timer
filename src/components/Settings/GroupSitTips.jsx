import { Users } from 'lucide-react';
import { GlassCard } from '../UI/GlassCard';

// For someone leading a group, where the end bell matters most: what to set
// up so it rings, step by step. Folded away until opened (a native <details>).
export const GroupSitTips = () => (
  <GlassCard className="px-5 py-4">
    <details className="group text-sm text-white">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium [&::-webkit-details-marker]:hidden">
        <Users className="w-4 h-4 text-white/70" aria-hidden="true" />
        <span>Leading a group sit?</span>
        <span aria-hidden="true" className="ml-auto text-white/70 transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>
      {/* In order: set up while online, then silence the phone, then the
          Test bell - last, so it checks the sit's real conditions */}
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-white/90">
        <li>
          <strong>Set up with a connection:</strong> open the app and choose your ambient sound or guided meditation.
          Once it's selected, it's kept on the phone, and the app works offline.
        </li>
        <li>
          <strong>Keep calls away:</strong> airplane mode with Wi-Fi off keeps them all out; Do Not Disturb, most. Silent
          mode is fine.
        </li>
        <li>
          <strong>Charge the phone,</strong> or plug it in. Around 20% battery, power saving may turn on and let the
          screen lock mid-sit.
        </li>
        <li>
          <strong>Ring the Test bell last,</strong> with everything set: loud enough for the room, and from the right
          speaker, not a pair of earbuds.
        </li>
        <li>
          <strong>Don't lock the phone while you sit.</strong> The app keeps the screen on and dims it; a locked phone
          may not ring the end bell on time.
        </li>
        <li>
          If the sound is interrupted anyway, tap <strong>Restore the bell</strong>.
        </li>
      </ol>
    </details>
  </GlassCard>
);
