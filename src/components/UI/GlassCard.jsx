export const GlassCard = ({ children, className = '', strong = false }) => {
  const baseClasses = 'rounded-2xl transition-all duration-300';
  const glassType = strong ? 'glass-card-strong' : 'glass-card';

  return (
    <div className={`${baseClasses} ${glassType} ${className}`}>
      {children}
    </div>
  );
};
