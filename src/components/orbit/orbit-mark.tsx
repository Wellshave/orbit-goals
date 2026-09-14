export function OrbitMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none">
      <defs>
        <linearGradient id="om-g" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0" stopColor="#496CFF" />
          <stop offset="1" stopColor="#9567E8" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="5.5" fill="url(#om-g)" />
      <ellipse cx="16" cy="16" rx="13" ry="5.5" stroke="#E8F0FF" strokeOpacity="0.55" strokeWidth="1.4" transform="rotate(-24 16 16)" />
      <circle cx="27.3" cy="9.2" r="2" fill="#FF715B" />
    </svg>
  );
}
