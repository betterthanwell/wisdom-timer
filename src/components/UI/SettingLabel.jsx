// A setting's heading: small icon + name. `id` lets a group or control use
// it as its accessible name (aria-labelledby).
export const SettingLabel = ({ icon: Icon, id, children }) => (
  <div className="flex items-center gap-2 min-w-0">
    <Icon className="w-4 h-4 shrink-0 text-white/70" aria-hidden="true" />
    <span id={id} className="text-sm font-medium text-white">
      {children}
    </span>
  </div>
);
