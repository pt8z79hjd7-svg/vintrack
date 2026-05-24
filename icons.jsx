// === Inline SVG icons (stroke-based, 1.6 stroke, lucide-style — original) ===
const Icon = ({ d, size = 18, fill = 'none', stroke = 'currentColor', sw = 1.7, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children || <path d={d} />}
  </svg>
);

const IDashboard = (p) => (
  <Icon {...p}>
    <rect x="3" y="3" width="8" height="9" rx="1.5" />
    <rect x="13" y="3" width="8" height="5" rx="1.5" />
    <rect x="13" y="10" width="8" height="11" rx="1.5" />
    <rect x="3" y="14" width="8" height="7" rx="1.5" />
  </Icon>
);
const IBox = (p) => (
  <Icon {...p}>
    <path d="M3 7.5 12 3l9 4.5" />
    <path d="M3 7.5v9L12 21l9-4.5v-9" />
    <path d="M12 12 3 7.5M12 12l9-4.5M12 12v9" />
  </Icon>
);
const IScan = (p) => (
  <Icon {...p}>
    <path d="M4 7V5a1 1 0 0 1 1-1h2" />
    <path d="M17 4h2a1 1 0 0 1 1 1v2" />
    <path d="M20 17v2a1 1 0 0 1-1 1h-2" />
    <path d="M7 20H5a1 1 0 0 1-1-1v-2" />
    <path d="M8 8v8M11 8v8M14 8v8M17 8v8" />
  </Icon>
);
const ITruck = (p) => (
  <Icon {...p}>
    <path d="M3 7h11v9H3z" />
    <path d="M14 10h4l3 3v3h-7" />
    <circle cx="7" cy="18" r="1.6" />
    <circle cx="17" cy="18" r="1.6" />
  </Icon>
);
const IUsers = (p) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 19c.6-3 3-5 6-5s5.4 2 6 5" />
    <path d="M16 11.5a3 3 0 0 0 0-6" />
    <path d="M21 19c-.4-2-1.6-3.7-3.2-4.5" />
  </Icon>
);
const IReport = (p) => (
  <Icon {...p}>
    <path d="M5 4h10l4 4v12H5z" />
    <path d="M14 4v4h4" />
    <path d="M8 14v3M11 11v6M14 13v4" />
  </Icon>
);
const IBell = (p) => (
  <Icon {...p}>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </Icon>
);
const ISearch = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);
const IPlus = (p) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
const IFilter = (p) => <Icon {...p}><path d="M4 5h16l-6 8v6l-4-2v-4Z" /></Icon>;
const IDownload = (p) => (
  <Icon {...p}>
    <path d="M12 4v11" />
    <path d="m7 10 5 5 5-5" />
    <path d="M4 19h16" />
  </Icon>
);
const IUpload = (p) => (
  <Icon {...p}>
    <path d="M12 20V9" />
    <path d="m7 14 5-5 5 5" />
    <path d="M4 5h16" />
  </Icon>
);
const ISettings = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </Icon>
);
const IAlert = (p) => (
  <Icon {...p}>
    <path d="M12 3 2 20h20Z" />
    <path d="M12 10v4M12 17v.5" />
  </Icon>
);
const IArrowUp = (p) => <Icon {...p}><path d="M7 14l5-5 5 5" /></Icon>;
const IArrowDown = (p) => <Icon {...p}><path d="M7 10l5 5 5-5" /></Icon>;
const IChevronLeft = (p) => <Icon {...p}><path d="m14 6-6 6 6 6" /></Icon>;
const IChevronRight = (p) => <Icon {...p}><path d="m10 6 6 6-6 6" /></Icon>;
const IClose = (p) => <Icon {...p}><path d="M6 6l12 12M18 6l-12 12" /></Icon>;
const IEdit = (p) => (
  <Icon {...p}>
    <path d="M4 20h4l11-11-4-4L4 16Z" />
    <path d="m13.5 6.5 4 4" />
  </Icon>
);
const ICheck = (p) => <Icon {...p}><path d="m5 12 5 5 9-11" /></Icon>;
const ITag = (p) => (
  <Icon {...p}>
    <path d="M3 12V4h8l10 10-8 8Z" />
    <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" />
  </Icon>
);
const ICoin = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M9 14c0 1 1 2 3 2s3-.8 3-2-1-1.7-3-2-3-1-3-2 1-2 3-2 3 1 3 2" />
    <path d="M12 7v1.5M12 15.5V17" />
  </Icon>
);

const ICamera = (p) => (
  <Icon {...p}>
    <path d="M3 8h3l2-3h8l2 3h3v11H3z" />
    <circle cx="12" cy="13" r="3.5" />
  </Icon>
);
const ITransfer = (p) => (
  <Icon {...p}>
    <path d="M4 9h13" />
    <path d="m14 6 3 3-3 3" />
    <path d="M20 15H7" />
    <path d="m10 18-3-3 3-3" />
  </Icon>
);
const ICalendar = (p) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 3v4M16 3v4" />
  </Icon>
);
const ITrend = (p) => (
  <Icon {...p}>
    <path d="M3 17l5-5 4 3 8-9" />
    <path d="M14 6h6v6" />
  </Icon>
);
const IPercent = (p) => (
  <Icon {...p}>
    <circle cx="7" cy="7" r="3" />
    <circle cx="17" cy="17" r="3" />
    <path d="m5 19 14-14" />
  </Icon>
);
const ISplit = (p) => (
  <Icon {...p}>
    <path d="M12 4v8" />
    <path d="M12 12c0 4-3 4-3 8" />
    <path d="M12 12c0 4 3 4 3 8" />
    <circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none" />
  </Icon>
);
const IExpand = (p) => (
  <Icon {...p}>
    <path d="M9 5H5v4" />
    <path d="M15 5h4v4" />
    <path d="M5 15v4h4" />
    <path d="M19 15v4h-4" />
  </Icon>
);
const ITrash = (p) => (
  <Icon {...p}>
    <path d="M4 7h16" />
    <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    <path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7" />
  </Icon>
);

const IWhatsApp = (p) => (
  <Icon {...p}>
    <path d="M3 21l1.5-5A8 8 0 1 1 8 19.5L3 21Z" />
    <path d="M8.5 9c0 4 2.5 6.5 6.5 6.5" sw="1.4" />
    <path d="M9.5 8c.4-.4 1.3-.7 1.7-.4l.8 1.4c.2.4 0 .9-.4 1.2 0 0 .5 1.6 2.2 2.3.4-.3.9-.6 1.3-.4l1.4.8c.3.4 0 1.3-.4 1.7l-.5.5c-.5.5-1.4.6-2 .4-2.5-.6-4-2.2-4.6-4.7-.2-.6-.1-1.5.4-2l.5-.5Z" sw="1.4" />
  </Icon>
);

const IFile = (p) => (
  <Icon {...p}>
    <path d="M5 4h9l5 5v11H5z" />
    <path d="M14 4v5h5" />
    <path d="M8 13h8M8 16h5" />
  </Icon>
);

const ICopy = (p) => (
  <Icon {...p}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </Icon>
);

Object.assign(window, {
  Icon, IDashboard, IBox, IScan, ITruck, IUsers, IReport, IBell, ISearch,
  IPlus, IFilter, IDownload, IUpload, ISettings, IAlert, IArrowUp, IArrowDown,
  IChevronLeft, IChevronRight, IClose, IEdit, ICheck, ITag, ICoin,
  ICamera, ITransfer, ICalendar, ITrend, IPercent, ISplit, IExpand, ITrash,
  IWhatsApp, IFile, ICopy
});
