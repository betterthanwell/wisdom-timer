// One option in a row of choices (settle time, bell strikes, ambient sound):
// highlighted when selected, announced with aria-pressed.
export const ChoiceButton = ({ selected, className = '', children, ...props }) => (
  <button
    type="button"
    aria-pressed={selected}
    className={`rounded-lg border text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
      selected ? 'bg-white/25 border-white/40' : 'bg-white/5 border-white/15 hover:bg-white/10'
    } ${className}`}
    {...props}
  >
    {children}
  </button>
);
