// The radiant glow (nimitta) around the time, with the session's progress as
// a trail of light. Nothing bounds it: no card, no ring track - the glow
// reaches well past the ring and fades out to nothing. While `breathing` it
// swells and settles on an 8-second breath (4 s each way); otherwise it holds
// still where it is. The ring scales with its container; `size` is only the
// SVG's coordinate space.

// A radial glow that fades to nothing at its edge. Many stops along a smooth
// curve, so no rings show where straight gradient segments would meet.
const glow = (rgb, peak, falloff) => {
  const stops = Array.from({ length: 11 }, (_, i) => `rgba(${rgb}, ${(peak * falloff(i / 10)).toFixed(3)}) ${i * 10}%`);
  return `radial-gradient(circle closest-side, ${stops.join(', ')})`;
};

const GLOWS = [
  // [size relative to the ring, background]
  [2.85, glow('255, 246, 220', 0.36, (r) => (1 - r) ** 2.5)],
  [1.65, glow('255, 252, 240', 0.34, (r) => (1 - r * r) ** 2)],
  // The core stays soft enough that white text on top of it is readable
  [0.9, glow('255, 255, 255', 0.4, (r) => (1 - r * r) ** 2)],
];

export const CircularProgress = ({ progress, size = 280, strokeWidth = 5, children, breathing = false, className = '' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative aspect-square ${className}`}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {GLOWS.map(([scale, background]) => (
          <div
            key={scale}
            className="nimitta-breath absolute rounded-full"
            // The ring's box is square, so one percentage insets all sides
            style={{ inset: `${((1 - scale) / 2) * 100}%`, background, animationPlayState: breathing ? 'running' : 'paused' }}
          />
        ))}
      </div>

      {/* Only the time sat: no track, and nothing before the session starts */}
      <svg
        className={`absolute inset-0 w-full h-full -rotate-90 pointer-events-none transition-opacity duration-1000 ${
          progress > 0 ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.7))' }}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.8)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-300 ease-out"
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};
