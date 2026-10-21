import type { ReactNode, SVGProps } from 'react';
import { cn } from '@/lib/cn';

type IconProps = SVGProps<SVGSVGElement>;

/** Decorative by default (aria-hidden); the surrounding control carries the accessible name. */
function Icon({ className, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn('size-5 shrink-0', className)}
      {...props}
    >
      {children}
    </svg>
  );
}

const icon = (paths: ReactNode) =>
  function NamedIcon(props: IconProps) {
    return <Icon {...props}>{paths}</Icon>;
  };

export const MenuIcon = icon(<path d="M4 6h16M4 12h16M4 18h16" />);
export const CloseIcon = icon(<path d="M6 6l12 12M18 6L6 18" />);
export const ChevronDownIcon = icon(<path d="M6 9l6 6 6-6" />);
export const PlusIcon = icon(<path d="M12 5v14M5 12h14" />);
export const GlobeIcon = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </>,
);
export const ClockIcon = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>,
);
export const CalendarIcon = icon(
  <>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M8 3v4M16 3v4M4 10h16" />
  </>,
);
export const UserIcon = icon(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </>,
);
export const UsersIcon = icon(
  <>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" />
  </>,
);
export const BriefcaseIcon = icon(
  <>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" />
  </>,
);
export const GraduationIcon = icon(
  <>
    <path d="M2 9l10-5 10 5-10 5L2 9Z" />
    <path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
  </>,
);
/** "Live" broadcast symbol used for live programs. */
export const LiveIcon = icon(
  <>
    <circle cx="12" cy="12" r="2" />
    <path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8" />
  </>,
);
export const PhoneIcon = icon(
  <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />,
);
export const QuoteIcon = icon(
  <path
    d="M8 6C5.5 7.2 4 9.5 4 13v5h6v-6H7c0-2.3 1-3.8 3-4.7L8 6Zm10 0c-2.5 1.2-4 3.5-4 7v5h6v-6h-3c0-2.3 1-3.8 3-4.7L18 6Z"
    fill="currentColor"
    stroke="none"
  />,
);

export const InfoIcon = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </>,
);
export const SearchIcon = icon(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2" />
  </>,
);
export const FiltersIcon = icon(<path d="M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6" />);

export const CheckIcon = icon(<path d="M5 12.5l4.5 4.5L19 7.5" />);
export const CheckCircleIcon = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l3 3 5-6" />
  </>,
);
export const PlayIcon = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M10 8.5v7l6-3.5-6-3.5Z" />
  </>,
);
export const DownloadIcon = icon(<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />);
export const MessageIcon = icon(
  <path d="M5 5h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 3.5V6a1 1 0 0 1 1-1Z" />,
);

/** Points "forward" in reading direction: flips automatically in Arabic and Hebrew. */
export function ArrowForwardIcon({ className, ...props }: IconProps) {
  return (
    <Icon className={cn('rtl:-scale-x-100', className)} {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  );
}
