export const CircularProgress = ({ progress, size = 280, strokeWidth = 8, children, isRunning = false }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Radiant nimitta glow layers */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Outer glow - largest, softest */}
        <div
          className={`absolute rounded-full transition-all duration-1000 ${isRunning ? 'animate-pulse-slow' : ''}`}
          style={{
            width: '85%',
            height: '85%',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.05) 50%, transparent 70%)',
            filter: 'blur(30px)',
          }}
        />

        {/* Middle glow */}
        <div
          className={`absolute rounded-full transition-all duration-1000 ${isRunning ? 'animate-pulse-slow' : ''}`}
          style={{
            width: '70%',
            height: '70%',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.15) 40%, transparent 70%)',
            filter: 'blur(20px)',
            animationDelay: '0.3s'
          }}
        />

        {/* Inner bright core */}
        <div
          className={`absolute rounded-full transition-all duration-1000 ${isRunning ? 'animate-pulse-slow' : ''}`}
          style={{
            width: '50%',
            height: '50%',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.4) 50%, rgba(255, 255, 255, 0.1) 100%)',
            filter: 'blur(10px)',
            animationDelay: '0.6s'
          }}
        />

        {/* Central luminous point */}
        <div
          className={`absolute rounded-full transition-all duration-1000 ${isRunning ? 'animate-pulse-slow' : ''}`}
          style={{
            width: '30%',
            height: '30%',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.7) 60%, transparent 100%)',
            boxShadow: '0 0 40px rgba(255, 255, 255, 0.8), 0 0 60px rgba(255, 255, 255, 0.6), 0 0 80px rgba(255, 255, 255, 0.4)',
            animationDelay: '0.9s'
          }}
        />
      </div>

      <svg
        className="transform -rotate-90 relative z-10"
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress circle with gradient */}
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-300 ease-out"
        />
      </svg>

      {/* Content in center */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        {children}
      </div>
    </div>
  );
};
