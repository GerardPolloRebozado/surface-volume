export function Sparkline({
  values,
  width = 84,
  height = 22,
  className,
}: {
  values: number[]
  width?: number
  height?: number
  className?: string
}) {
  const max = Math.max(...values, 1)
  const barWidth = width / Math.max(values.length, 1)

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className={className}>
      {values.map((value, index) => {
        const barHeight = Math.max(2, Math.round((value / max) * (height - 2)))
        return (
          <rect
            key={index}
            x={(index * barWidth).toFixed(1)}
            y={height - barHeight}
            width={Math.max(1, barWidth - 1.5).toFixed(1)}
            height={barHeight}
            rx="1"
            fill="currentColor"
            opacity={index === values.length - 1 ? 0.95 : 0.28}
          />
        )
      })}
    </svg>
  )
}

export function BarChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1)
  return (
    <div className="flex h-20 items-end gap-[3px]" aria-hidden="true">
      {values.map((value, index) => (
        <div
          key={index}
          className="flex-1 rounded-t-[3px]"
          style={{
            height: `${Math.max(6, (value / max) * 100)}%`,
            background: 'var(--accent)',
            opacity: index === values.length - 1 ? 0.95 : 0.22,
          }}
        />
      ))}
    </div>
  )
}
