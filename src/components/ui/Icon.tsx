import type { SVGProps } from 'react'

/**
 * Минималистичные линейные иконки (stroke), в духе «тонких линий» бренда.
 * Без заливок и мультяшности.
 */

type IconProps = SVGProps<SVGSVGElement>

const base = (props: IconProps) => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
})

export const ArrowRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

export const ArrowUpRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
)

export const Calendar = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="16" rx="1" />
    <path d="M3 9h18M8 3v4M16 3v4" />
  </svg>
)

export const Bell = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0" />
  </svg>
)

export const Book = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 0 2 2h12" />
  </svg>
)

export const Play = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 5v14l11-7z" />
  </svg>
)

export const Document = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 2h8l4 4v16H6zM14 2v4h4M9 13h6M9 17h6" />
  </svg>
)

export const Grid = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
  </svg>
)

export const Chat = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5" />
  </svg>
)

export const Newspaper = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 5h13v15H5a1 1 0 0 1-1-1zM17 8h3v11a1 1 0 0 1-1 1M7 9h7M7 13h7M7 17h5" />
  </svg>
)

export const Clipboard = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="5" y="4" width="14" height="17" rx="1" />
    <path d="M9 4a3 3 0 0 1 6 0M9 11h6M9 15h4" />
  </svg>
)

export const Home = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 11 12 4l8 7M6 10v10h12V10" />
  </svg>
)

export const Check = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12.5 10 17l9-10" />
  </svg>
)

export const Clock = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
  </svg>
)

export const Lock = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="5" y="11" width="14" height="9" rx="1" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
)

export const User = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
)

export const Logout = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M9 12h11M16 8l4 4-4 4" />
  </svg>
)

export const Menu = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
)

export const Close = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const Pin = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" />
  </svg>
)
