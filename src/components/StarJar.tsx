/**
 * StarJar — a friendly jar showing how many stars have been collected (§7.1).
 * Warm and no-pressure: a star glyph plus the running total in the display
 * font. Stars only ever go up, so this is celebratory, never a countdown.
 *
 * Presentational: when `onClick` is supplied it renders as a button (e.g. to
 * show the total with a gentle shimmer); otherwise a plain, non-interactive
 * element. Either way it carries an aria-label naming the count so the number
 * isn't conveyed by the glyph alone.
 */
interface StarJarProps {
  /** Stars collected so far (monotonic — never decreases). */
  stars: number;
  /** Optional tap handler; presence switches the element to a <button>. */
  onClick?: () => void;
}

export default function StarJar({ stars, onClick }: StarJarProps) {
  const label = `${stars} stars collected`;

  const content = (
    <>
      <svg
        viewBox="0 0 24 24"
        width={28}
        height={28}
        aria-hidden="true"
        style={{ flex: '0 0 auto' }}
      >
        <path
          d="M12 2.4l2.7 5.9 6.4.7-4.8 4.3 1.3 6.3L12 16.6 6.4 19.9l1.3-6.3L2.9 9.3l6.4-.7z"
          fill="var(--cf-duck)"
          stroke="var(--cf-ink)"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
      <span
        style={{
          fontFamily: 'var(--cf-font-display)',
          fontWeight: 800,
          fontSize: 26,
          lineHeight: 1,
          color: 'var(--cf-ink)',
        }}
      >
        {stars}
      </span>
    </>
  );

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 9,
    background: 'var(--cf-cream-raised)',
    border: 'var(--cf-stroke-w) solid var(--cf-ink)',
    borderRadius: 'var(--cf-r-pill)',
    padding: '8px 18px 8px 13px',
    boxShadow: '0 6px 0 rgba(90,70,51,.14)',
  };

  if (onClick) {
    return (
      <button
        type="button"
        data-testid="star-jar"
        aria-label={label}
        onClick={onClick}
        style={{
          ...baseStyle,
          cursor: 'pointer',
          minHeight: 88,
          minWidth: 88,
          justifyContent: 'center',
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <div data-testid="star-jar" aria-label={label} role="img" style={baseStyle}>
      {content}
    </div>
  );
}
