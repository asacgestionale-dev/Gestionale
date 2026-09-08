const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export const IconHome = (p) => (
  <svg {...base} {...p}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
  </svg>
)

export const IconUsers = (p) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
    <circle cx="17" cy="9" r="2.4" />
    <path d="M15.5 13.2a4.6 4.6 0 0 1 5 4.3" />
  </svg>
)

export const IconShield = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3.5 19 6v5.5c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-2.5Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)

export const IconSettings = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V19.5a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87A1.7 1.7 0 0 0 3.07 12.5H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.04 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.04-1.56V.99a2 2 0 1 1 4 0v.09c0 .68.4 1.29 1.04 1.56.62.26 1.34.13 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87c.27.63.88 1.04 1.56 1.04H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04Z" transform="translate(0 1)" />
  </svg>
)

export const IconFolder = (p) => (
  <svg {...base} {...p}>
    <path d="M3.5 7a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17V7Z" />
  </svg>
)

export const IconPackage = (p) => (
  <svg {...base} {...p}>
    <path d="m3.5 7.5 8.5-4 8.5 4-8.5 4-8.5-4Z" />
    <path d="M3.5 7.5V16l8.5 4 8.5-4V7.5" />
    <path d="M12 11.5V20" />
  </svg>
)

export const IconTeam = (p) => (
  <svg {...base} {...p}>
    <circle cx="8" cy="9" r="3" />
    <circle cx="16" cy="9" r="3" />
    <path d="M2.5 20a5.5 5.5 0 0 1 11 0" />
    <path d="M10.5 20a5.5 5.5 0 0 1 11 0" />
  </svg>
)

export const IconWrench = (p) => (
  <svg {...base} {...p}>
    <path d="M14.7 6.3a4 4 0 0 0-5.4 4.6L3.5 16.7a1.8 1.8 0 0 0 2.5 2.5l5.8-5.8a4 4 0 0 0 4.6-5.4l-2.6 2.6-2-2 2.6-2.6Z" />
  </svg>
)

export const IconChevronRight = (p) => (
  <svg {...base} {...p}>
    <path d="m9 6 6 6-6 6" />
  </svg>
)

export const IconBell = (p) => (
  <svg {...base} {...p}>
    <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </svg>
)

export const IconSearch = (p) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.3-4.3" />
  </svg>
)

export const IconClock = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
)

export const IconElmetto = (p) => (
  <svg {...base} {...p}>
    <path d="M3.5 16.5h17" />
    <path d="M5.5 16.5v-2.2a6.5 6.5 0 0 1 13 0v2.2" />
    <path d="M9.5 8.3V5.6a1.6 1.6 0 0 1 1.6-1.6h1.8a1.6 1.6 0 0 1 1.6 1.6v2.7" />
    <path d="M3.5 16.5v1a1.5 1.5 0 0 0 1.5 1.5h14a1.5 1.5 0 0 0 1.5-1.5v-1" />
  </svg>
)

export const IconEuro = (p) => (
  <svg {...base} {...p}>
    <path d="M16.5 6.4a6 6 0 1 0 0 11.2" />
    <path d="M4.5 10h8M4.5 14h8" />
  </svg>
)

export const IconCheckList = (p) => (
  <svg {...base} {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="m3.5 5.8 1.2 1.2 2-2.2" />
    <path d="m3.5 11.8 1.2 1.2 2-2.2" />
    <path d="m3.5 17.8 1.2 1.2 2-2.2" />
  </svg>
)

export const IconArchive = (p) => (
  <svg {...base} {...p}>
    <path d="M3.5 6.5h17v3h-17z" />
    <path d="M5 9.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    <path d="M10 13.5h4" />
  </svg>
)

export const IconPlus = (p) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const IconGroups = (p) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" />
  </svg>
)

export const IconFurgone = (p) => (
  <svg {...base} {...p}>
    <path d="M2.5 16.5V7.5a1 1 0 0 1 1-1h9v10" />
    <path d="M12.5 9.5h3.6l2.9 3.4v3.6" />
    <path d="M2.5 16.5h1.6M9.9 16.5h4.2M19.9 16.5h1.6" />
    <circle cx="6.8" cy="17" r="1.8" />
    <circle cx="17.2" cy="17" r="1.8" />
  </svg>
)
