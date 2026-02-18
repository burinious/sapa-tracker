import { useId } from "react";

export default function SapaLogo({
  size = 30,
  showWordmark = false,
  wordmark = "SapaTracker",
  className = "",
}) {
  const rawId = useId();
  const id = rawId.replace(/:/g, "");
  const bgId = `${id}-bg`;
  const sheenId = `${id}-sheen`;
  const iconShadowId = `${id}-shadow`;

  return (
    <span className={`sapa-logo ${className}`.trim()}>
      <svg
        className="sapa-logo-svg"
        width={size}
        height={size}
        viewBox="0 0 72 72"
        role="img"
        aria-label="SapaTracker logo"
      >
        <defs>
          <linearGradient id={bgId} x1="10" y1="8" x2="62" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2c9ad7" />
            <stop offset="0.56" stopColor="#1ab8a4" />
            <stop offset="1" stopColor="#f39a5f" />
          </linearGradient>
          <linearGradient id={sheenId} x1="12" y1="10" x2="52" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="rgba(255,255,255,0.80)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <filter id={iconShadowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(10,26,58,0.24)" />
          </filter>
        </defs>

        <rect x="3.5" y="3.5" width="65" height="65" rx="20" fill={`url(#${bgId})`} />
        <rect x="3.5" y="3.5" width="65" height="65" rx="20" fill={`url(#${sheenId})`} />
        <rect x="3.5" y="3.5" width="65" height="65" rx="20" fill="none" stroke="rgba(255,255,255,0.44)" />

        <path
          d="M47.2 20.3c-2.6-2.7-6.5-4.3-11.1-4.3-7.8 0-13.6 4.4-13.6 10.3 0 5.6 4.3 8.4 10.8 10.1l5.4 1.4c3.8 1 5.9 2.1 5.9 4.2 0 2.5-2.8 4.2-7.2 4.2-4.7 0-8.7-1.9-11.3-5.3l-5.9 5.9c3.5 4.9 9.8 8 17.5 8 9.4 0 16-4.8 16-11.7 0-5.9-4.1-8.9-12.2-11l-5.1-1.3c-3.4-.9-4.9-1.9-4.9-3.8 0-2.2 2.4-3.8 6.4-3.8 3.6 0 6.8 1.3 9.2 3.7z"
          fill="#ffffff"
          filter={`url(#${iconShadowId})`}
        />

        <path
          d="M43.8 51.6l5.3-5.1 4.5 4.2 7.1-7.1"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>

      {showWordmark ? <span className="sapa-logo-wordmark">{wordmark}</span> : null}
    </span>
  );
}
