import { Users } from 'lucide-react';
import { GlassCard } from '../UI/GlassCard';

// For someone leading a group, where the end bell matters most: what to set
// up so it rings. Folded away until opened (a native <details>).
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
      <ul className="mt-3 list-disc space-y-2 pl-5 text-white/90">
        <li>
          Ring the <strong>Test bell</strong> first: loud enough for the room, and from the phone's speaker, not
          someone's earbuds.
        </li>
        <li>
          Don't lock the phone while you sit: a locked phone may not ring the end bell on time. The app keeps the
          screen on and dims it.
        </li>
        <li>
          Turn on Do Not Disturb or a Focus mode, so calls are less likely to interrupt the sound. If something
          does, tap <strong>Restore the bell</strong>.
        </li>
        <li>Plug the phone in, or start with plenty of battery: on low battery it may not keep the screen on.</li>
        <li>Open the app once before, with a connection: after that it works offline.</li>
      </ul>
    </details>
  </GlassCard>
);
