import type { SVGProps } from 'react'

const ICONS = {
  mail: '<rect x="3.2" y="6" width="17.6" height="12" rx="1.6"/><path d="m4 7.2 8 5.8 8-5.8"/>',
  folder:
    '<path d="M3.4 8.2a2 2 0 0 1 2-2h3.5l2 2h7.7a2 2 0 0 1 2 2v7.4a2 2 0 0 1-2 2H5.4a2 2 0 0 1-2-2z"/>',
  chat: '<path d="M4.2 6.5a2 2 0 0 1 2-2h11.6a2 2 0 0 1 2 2v6.8a2 2 0 0 1-2 2H9.5L5 19v-3.7h-.8a2 2 0 0 1 0-4z"/><path d="M8 9.5h8"/>',
  page: '<path d="M6.2 3.6h7.6l4 4v12.8H6.2z"/><path d="M13.8 3.6v4h4M9 12h6M9 15.5h6"/>',
  calendar:
    '<rect x="3.8" y="5.8" width="16.4" height="14" rx="2"/><path d="M8 3.5v4M16 3.5v4M3.8 10.5h16.4M8 14h2M14 14h2"/>',
  branch:
    '<circle cx="6.5" cy="5" r="1.6"/><circle cx="17.5" cy="9" r="1.6"/><circle cx="6.5" cy="19" r="1.6"/><path d="M6.5 6.6v10.8M8 9h4.5a5 5 0 0 1 5 5v-3.4"/>',
  hash: '<path d="M9.2 3.8 7.3 20.2M16.7 3.8l-1.9 16.4M3.8 9h16.4M3 15h16.4"/>',
  github:
    '<circle cx="6.4" cy="6" r="2"/><circle cx="6.4" cy="18" r="2"/><circle cx="17.4" cy="10" r="2"/><path d="M6.4 8v8M8.4 6h4.4a2.6 2.6 0 0 1 2.6 2.6v1.4M8.4 18H13a2.6 2.6 0 0 0 2.6-2.6V12"/>',
  layers: '<path d="M12 3.6 20 8l-8 4.4L4 8zM4 12l8 4.4 8-4.4M4 16l8 4.4 8-4.4"/>',
  card: '<rect x="3.2" y="6" width="17.6" height="12" rx="2"/><path d="M3.2 10h17.6M7 14.6h4"/>',
  code: '<path d="m8.5 7.5-4.6 4.5 4.6 4.5M15.5 7.5l4.6 4.5-4.6 4.5"/>',
  bolt: '<path d="M13.4 3.2 5.8 13.4h5.3L10 20.8l8-11h-5.4z"/>',
  phone: '<rect x="6.5" y="3" width="11" height="18" rx="2.4"/><path d="M10 18.2h4"/>',
  check: '<path d="m4.6 12.4 4.9 4.9L19.4 7.4"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  alert: '<path d="M12 4.2 3 19.6h18z"/><path d="M12 9.2v5M12 17.1h.01"/>',
  info: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5M12 7.8h.01"/>',
  clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3.2 2"/>',
  'chevron-down': '<path d="m6.5 9.5 5.5 5.5 5.5-5.5"/>',
  'chevron-right': '<path d="m9.5 6.5 5.5 5.5-5.5 5.5"/>',
  'chevron-left': '<path d="M14.5 6.5 9 12l5.5 5.5"/>',
  'chevron-up': '<path d="m6.5 14.5 5.5-5.5 5.5 5.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  search: '<circle cx="10.6" cy="10.6" r="6.4"/><path d="m15.3 15.3 4.5 4.5"/>',
  filter: '<path d="M4 6.5h16M6.5 12h11M9.5 17.5h5"/>',
  play: '<path d="M8.2 5.4v13.2l10-6.6z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8.8 5.5v13M15.2 5.5v13" stroke-width="2.6"/>',
  undo: '<path d="M5 9.5A7 7 0 1 1 6.5 16M5 4.5v5h5"/>',
  redo: '<path d="M19 9.5A7 7 0 1 0 17.5 16M19 4.5v5h-5"/>',
  'zoom-in':
    '<circle cx="10.6" cy="10.6" r="6.4"/><path d="m15.3 15.3 4.5 4.5M10.6 7.8v5.6M7.8 10.6h5.6"/>',
  'zoom-out': '<circle cx="10.6" cy="10.6" r="6.4"/><path d="m15.3 15.3 4.5 4.5M7.8 10.6h5.6"/>',
  fit: '<path d="M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15"/>',
  keyboard:
    '<rect x="2.8" y="6.2" width="18.4" height="11.6" rx="2"/><path d="M6.5 9.6h.01M10 9.6h.01M13.5 9.6h.01M17 9.6h.01M8 13.4h8"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/>',
  moon: '<path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2z"/>',
  user: '<circle cx="12" cy="8.2" r="3.7"/><path d="M4.8 20c.7-3.6 3.7-5.6 7.2-5.6s6.5 2 7.2 5.6"/>',
  logout:
    '<path d="M10 4.5H5.8a1.8 1.8 0 0 0-1.8 1.8v11.4a1.8 1.8 0 0 0 1.8 1.8H10M15 8l4 4-4 4M19 12H9"/>',
  trash:
    '<path d="M4.8 7h14.4M9.5 7V4.8h5V7M6.6 7l.9 12.4h9l.9-12.4M10 10.6v5.4M14 10.6v5.4"/>',
  copy: '<rect x="8" y="8" width="11.6" height="11.6" rx="2"/><path d="M16 8V6.2A2.2 2.2 0 0 0 13.8 4H6.2A2.2 2.2 0 0 0 4 6.2v7.6A2.2 2.2 0 0 0 6.2 16H8"/>',
  link: '<path d="M10 13.8a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.4 1.4M14 10.2a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.4-1.4"/>',
  eye: '<path d="M2.8 12S6 6.4 12 6.4 21.2 12 21.2 12 18 17.6 12 17.6 2.8 12 2.8 12z"/><circle cx="12" cy="12" r="2.8"/>',
  refresh: '<path d="M19.4 12a7.4 7.4 0 1 1-2.2-5.2M19.4 4.6v4.8h-4.8"/>',
  'wifi-off':
    '<path d="M3 3l18 18M8.5 15.5a5 5 0 0 1 6 0M5 12a10 10 0 0 1 4-2.3M15 9.7a10 10 0 0 1 4 2.3M2 8.5a14 14 0 0 1 3.4-2M18.6 6.5A14 14 0 0 1 22 8.5M12 18.6h.01"/>',
  external:
    '<path d="M14 4.5h5.5V10M19 5 11 13M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 18.5V7.5A1.5 1.5 0 0 1 5.5 6H10"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h5M13 17h7M13 4.5V9.5M9 14.5v5"/>',
  shield:
    '<path d="M12 3.5 4.8 6v6c0 4.4 3.1 7.4 7.2 8.5 4.1-1.1 7.2-4.1 7.2-8.5V6z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/>',
  book: '<path d="M4.5 5.2A2 2 0 0 1 6.5 3.5H19v17H6.5a2 2 0 0 0-2 1.7z"/><path d="M4.5 18.4h14.5"/>',
  grid: '<rect x="3.8" y="3.8" width="7" height="7" rx="1.6"/><rect x="13.2" y="3.8" width="7" height="7" rx="1.6"/><rect x="3.8" y="13.2" width="7" height="7" rx="1.6"/><rect x="13.2" y="13.2" width="7" height="7" rx="1.6"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  map: '<path d="m3.5 6.5 5-2 7 2 5-2v13l-5 2-7-2-5 2zM8.5 4.5v13M15.5 6.5v13"/>',
  more: '<circle cx="5.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
  'arrow-right': '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
  'arrow-left': '<path d="M19.5 12h-15M10.5 6l-6 6 6 6"/>',
  download: '<path d="M12 4v10.5M7.5 10l4.5 4.5 4.5-4.5M4.5 19.5h15"/>',
  bell: '<path d="M18 9.5a6 6 0 0 0-12 0c0 6-2.5 7-2.5 7h17S18 15.5 18 9.5z"/><path d="M10 20h4"/>',
  globe:
    '<circle cx="12" cy="12" r="8.6"/><path d="M3.5 12h17M12 3.4c2.4 2.4 3.6 5.4 3.6 8.6s-1.2 6.2-3.6 8.6c-2.4-2.4-3.6-5.4-3.6-8.6S9.6 5.8 12 3.4z"/>',
  palette:
    '<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.4 0 2-.8 2-1.8 0-.9-.6-1.4-.6-2.2 0-1 .8-1.8 1.8-1.8h1.6a3.7 3.7 0 0 0 3.7-3.7c0-4.1-3.8-7.5-8.5-7.5z"/><circle cx="8" cy="9" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="7" r="1.1" fill="currentColor" stroke="none"/><circle cx="16" cy="9.5" r="1.1" fill="currentColor" stroke="none"/>',
  grip: '<circle cx="9" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.2" fill="currentColor" stroke="none"/>',
  dot: '<circle cx="12" cy="12" r="3.4" fill="currentColor" stroke="none"/>',
  activity: '<path d="M3 12h4l2.5-7 4 14L16.5 12H21"/>',
  star: '<path d="m12 3.8 2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z"/>',
  split: '<path d="M5 4v5.5a4 4 0 0 0 4 4h10M15 9.5l4 4-4 4M5 20v-4.5a4 4 0 0 1 4-4"/>',
} as const

export type IconName = keyof typeof ICONS

type IconProps = {
  name: IconName
  size?: number
  strokeWidth?: number
  className?: string
} & Omit<SVGProps<SVGSVGElement>, 'name' | 'width' | 'height' | 'viewBox' | 'fill' | 'stroke'>

export function Icon({ name, size = 16, strokeWidth = 1.65, className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      dangerouslySetInnerHTML={{ __html: ICONS[name] ?? ICONS.dot }}
    />
  )
}
