// Progress ring with a soft radiant glow (nimitta) behind the time. The ring
// scales with its container; `size` is only the SVG's coordinate space.
const GLOWS = [
  // [width %, background, blur]
  ['90%', 'radial-gradient(circle, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.05) 50%, transparent 70%)', 'blur(28px)'],
  ['70%', 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.12) 45%, transparent 70%)', 'blur(18px)'],
  // The core stays soft enough that white text on top of it is readable
  ['45%', 'radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.2) 55%, transparent 100%)', 'blur(12px)'],
];

export const CircularProgress = ({ progress, size = 280, strokeWidth = 8, children, isRunning = false, className = '' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative aspect-square ${className}`}>
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        {GLOWS.map(([width, background, filter], i) => (
          <div
            key={width}
            className={`absolute aspect-square rounded-full ${isRunning ? 'animate-pulse-slow' : ''}`}
            style={{ width, background, filter, animationDelay: `${i * 0.3}s` }}
          />
        ))}
      </div>

      <svg
        className="absolute inset-0 w-full h-full -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.85)"
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
