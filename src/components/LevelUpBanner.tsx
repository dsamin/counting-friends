/**
 * LevelUpBanner — a calm celebratory banner shown above the play field for
 * streak milestones AND level-ups (§7.4). The `line` is announced via an
 * aria-live `role="status"` region so a non-reader hears it too (§13).
 *
 * Motion (§12.1): full motion slides the banner in (translateY); reduce-motion
 * fades it in place with NO slide. An optional "tap to continue" affordance
 * calls `onDismiss` — the banner is non-blocking, layered above the field.
 */
interface LevelUpBannerProps {
  /** The warm callout line, e.g. "Five in a row, Jayden — you're amazing!" */
  line: string;
  /** Honor the reduce-motion preference: fade vs slide (§12.1). */
  reduceMotion: boolean;
  /** Optional tap-to-continue handler. */
  onDismiss?: () => void;
}

export default function LevelUpBanner({
  line,
  reduceMotion,
  onDismiss,
}: LevelUpBannerProps) {
  // Full motion slides up into place; reduce-motion fades in (no translate).
  // The entrance offset is encoded inline (and consumed by the keyframe) so the
  // slide-vs-fade distinction is observable in the element's own style — full
  // motion carries a `translateY`, reduce-motion carries none (§12.1).
  const animation = reduceMotion
    ? 'cf-banner-fade 320ms ease-in-out both'
    : 'cf-banner-slide 460ms var(--cf-spring) both';
  const entranceTransform = reduceMotion ? undefined : 'translateY(-18px)';

  return (
    <div
      style={{
        position: 'absolute',
        top: 'max(96px, calc(env(safe-area-inset-top) + 72px))',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 18,
        pointerEvents: 'none',
      }}
    >
      <div
        data-testid="level-up-banner"
        role="status"
        aria-live="polite"
        onClick={onDismiss}
        style={{
          animation,
          transform: entranceTransform,
          pointerEvents: onDismiss ? 'auto' : 'none',
          cursor: onDismiss ? 'pointer' : 'default',
          maxWidth: 'min(86vw, 620px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          background: 'var(--cf-cream-raised)',
          border: 'var(--cf-stroke-w) solid var(--cf-ink)',
          borderRadius: 'var(--cf-r-card)',
          padding: '18px 30px',
          boxShadow: 'var(--cf-float)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--cf-font-display)',
            fontWeight: 800,
            fontSize: 30,
            lineHeight: 1.1,
            textAlign: 'center',
            color: 'var(--cf-ink)',
          }}
        >
          {line}
        </span>
        {onDismiss && (
          <span
            aria-hidden="true"
            style={{
              fontFamily: 'var(--cf-font-ui)',
              fontWeight: 600,
              fontSize: 13,
              color: 'var(--cf-ink-faint)',
            }}
          >
            tap to continue
          </span>
        )}
      </div>
    </div>
  );
}
