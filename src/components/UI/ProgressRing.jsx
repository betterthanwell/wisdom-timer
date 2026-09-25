// Ring around an icon showing download progress (0-1)
export const ProgressRing = ({ progress }) => (
  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 28 28" aria-hidden="true">
    <circle cx="14" cy="14" r="12.5" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20" />
    <circle
      cx="14"
      cy="14"
      r="12.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      pathLength="100"
      strokeDasharray={`${progress * 100} 100`}
      className="text-white"
    />
  </svg>
);
