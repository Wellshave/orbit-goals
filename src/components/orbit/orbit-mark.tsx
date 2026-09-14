export function OrbitMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none">
      <defs>
        <linearGradient id="om-g" x1="0" y1="0" x2="32" y2="32"><stop offset="0" stopColor="#5B6CFF" /><stop offset="1" stopColor="#9B72F2" /></linearGradient>
      </defs>
      <circle cx="16" cy="16" r="6" fill="url(#om-g)" />
      <ellipse cx="16" cy="16" rx="13" ry="5.5" stroke="#172033" strokeOpacity="0.35" strokeWidth="1.6" transform="rotate(-24 16 16)" />
      <circle cx="27.3" cy="9.2" r="2.4" fill="#FF7B6B" />
      <circle cx="6" cy="21" r="1.6" fill="#48CFAE" />
    </svg>
  );
}
