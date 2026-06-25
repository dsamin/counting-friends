import CharacterSprite from './CharacterSprite';
import { getCharacter } from '../game/characters';
import type { AnimalKey } from '../game/types';

/**
 * UnlockReveal — a celebratory overlay for a newly-unlocked collectible (§7,
 * §8). Shows a warm headline, the friend's sprite large, and its name. The
 * event is announced via an aria-live `role="status"` region (§13).
 *
 * Motion (§12.1): full motion pops/bounces the sticker in; reduce-motion
 * cross-fades it in at full size with no pop. `onDismiss` is called on tap.
 */
interface UnlockRevealProps {
  /** The unlocked character key, e.g. "dog" (must be a known roster key). */
  characterKey: string;
  /** Honor the reduce-motion preference: cross-fade vs pop (§12.1). */
  reduceMotion: boolean;
  /** Tap-to-continue handler. */
  onDismiss?: () => void;
}

export default function UnlockReveal({
  characterKey,
  reduceMotion,
  onDismiss,
}: UnlockRevealProps) {
  const character = getCharacter(characterKey as AnimalKey);

  // Full motion pops in (scale); reduce-motion cross-fades at full size (no
  // pop). The entrance transform is encoded inline so the distinction is
  // observable on the sprite's own style.
  const spriteAnimation = reduceMotion
    ? 'cf-unlock-fade 360ms ease-in-out both'
    : 'cf-unlock-pop 560ms var(--cf-spring) both';
  const spriteTransform = reduceMotion ? undefined : 'scale(0.4)';

  return (
    <div
      className="cf-overlay"
      role="status"
      aria-live="polite"
      onClick={onDismiss}
      style={{ cursor: onDismiss ? 'pointer' : 'default' }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          background: 'var(--cf-cream-raised)',
          border: 'var(--cf-stroke-w) solid var(--cf-ink)',
          borderRadius: 'var(--cf-r-card)',
          padding: '34px 44px 30px',
          boxShadow: 'var(--cf-float)',
          minWidth: 280,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--cf-font-display)',
            fontWeight: 800,
            fontSize: 30,
            color: 'var(--cf-ink)',
            lineHeight: 1,
          }}
        >
          New friend!
        </span>
        <span
          data-testid="unlock-reveal-sprite"
          style={{
            display: 'inline-flex',
            animation: spriteAnimation,
            transform: spriteTransform,
          }}
        >
          <CharacterSprite href={character.href} size={168} />
        </span>
        <span
          style={{
            fontFamily: 'var(--cf-font-display)',
            fontWeight: 700,
            fontSize: 26,
            color: 'var(--cf-coral)',
            lineHeight: 1,
          }}
        >
          {character.name}
        </span>
        {onDismiss && (
          <span
            aria-hidden="true"
            style={{
              fontFamily: 'var(--cf-font-ui)',
              fontWeight: 600,
              fontSize: 13,
              color: 'var(--cf-ink-faint)',
              marginTop: 2,
            }}
          >
            tap to continue
          </span>
        )}
      </div>
    </div>
  );
}
