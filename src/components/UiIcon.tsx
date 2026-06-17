import type { JSX } from 'react';

/**
 * UiIcon — inline 24×24 stroke icons, the React-rendered counterparts of the
 * SVGs in `assets/ui-icons/`. Purely DECORATIVE: every instance is
 * `aria-hidden`, so it never adds to the accessible name of its row. Stroke
 * follows `currentColor`, so callers set color via CSS `color` (ink by
 * default). The `heart` glyph carries its own coral fill on purpose.
 */
export type UiIconName = 'voice' | 'child' | 'settings' | 'lock' | 'heart';

const PATHS: Record<UiIconName, JSX.Element> = {
  voice: (
    <>
      <path d="M4 13 L4 10 L8 10 L11 6 L11 18 L8 14 L4 14 Z" fill="#5A4633" />
      <path d="M15 9 Q18 12 15 15" />
      <path d="M18 7 Q22 12 18 17" />
    </>
  ),
  child: (
    <>
      <circle cx="12" cy="9" r="4" />
      <path d="M5 20 a7 7 0 0 1 14 0" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 4 v2.5 M12 17.5 v2.5 M4 12 h2.5 M17.5 12 h2.5 M6.3 6.3 l1.8 1.8 M15.9 15.9 l1.8 1.8 M17.7 6.3 l-1.8 1.8 M8.1 15.9 l-1.8 1.8" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="2.5" />
      <path d="M8 10 V7 a4 4 0 0 1 8 0 v3" />
    </>
  ),
  heart: (
    <path
      d="M12 21 C5 15 3 10 6 7 c2-2 5-1 6 2 1-3 4-4 6-2 3 3 1 8 -6 14 Z"
      fill="#FF8A7A"
      stroke="#5A4633"
    />
  ),
};

interface UiIconProps {
  name: UiIconName;
  /** Square size in px. Defaults to 24. */
  size?: number;
  className?: string;
}

export default function UiIcon({ name, size = 24, className }: UiIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
