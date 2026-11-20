export function Stat({
  value,
  label,
  tone,
}: {
  value: string
  label: string
  tone?: 'bad'
}) {
  return (
    <div>
      <div className={`text-[22px] font-semibold tracking-tight ${tone === 'bad' ? 'text-bad' : ''}`}>
        {value}
      </div>
      <div className="text-[11.5px] text-mute">{label}</div>
    </div>
  )
}
