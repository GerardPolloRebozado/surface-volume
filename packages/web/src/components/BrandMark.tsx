export function BrandMark({ size = 25 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true" className="shrink-0">
      <path
        d="M7 19.5C7 13 12.5 7 19.5 7"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="7" cy="19.5" r="3.1" fill="var(--accent)" />
      <circle cx="19.5" cy="7" r="2.6" fill="var(--card)" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  )
}
