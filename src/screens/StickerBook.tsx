import {
  allCollectibleKeys,
  isCharacterUnlocked,
  type UnlocksState,
} from '../game/content';
import { getCharacter } from '../game/characters';
import type { AnimalKey } from '../game/types';
import CharacterSprite from '../components/CharacterSprite';
import StarJar from '../components/StarJar';

/**
 * StickerBook — a calm collectibles gallery (§7, §8). Every collectible key
 * gets a tile: unlocked friends show their sprite + name and are tappable;
 * locked ones show a soft silhouette placeholder with a "locked" aria-label so
 * they read as not-yet-earned without any failure framing. The header carries
 * the Star Jar total and a "best streak" badge; a Back button returns home.
 *
 * Presentational only — all state arrives via props, all behavior via callbacks.
 */
interface StickerBookProps {
  unlocks: UnlocksState;
  stars: number;
  streakBest: number;
  onBack: () => void;
  /** Tapping an UNLOCKED sticker calls this with its key (e.g. to play a sound). */
  onTapSticker?: (key: string) => void;
}

const TILE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 8,
  width: 132,
  minHeight: 144,
  padding: '14px 10px 12px',
  background: 'var(--cf-cream-raised)',
  border: 'var(--cf-stroke-w) solid var(--cf-ink)',
  borderRadius: 'var(--cf-r-tile)',
  boxShadow: 'var(--cf-card)',
};

function StickerTile({
  characterKey,
  unlocked,
  onTap,
}: {
  characterKey: string;
  unlocked: boolean;
  onTap?: (key: string) => void;
}) {
  const character = getCharacter(characterKey as AnimalKey);

  if (!unlocked) {
    // Locked: a soft silhouette placeholder. Not interactive, labelled "locked".
    return (
      <div
        data-testid={`sticker-tile-${characterKey}`}
        aria-label="locked sticker"
        style={TILE}
      >
        <span style={{ opacity: 0.16 }} aria-hidden="true">
          <CharacterSprite href={character.href} size={92} />
        </span>
        <span
          aria-hidden="true"
          style={{
            fontFamily: 'var(--cf-font-display)',
            fontWeight: 800,
            fontSize: 22,
            color: 'var(--cf-ink-faint)',
            lineHeight: 1,
          }}
        >
          ?
        </span>
      </div>
    );
  }

  // Unlocked: tappable, shows the friend + name.
  return (
    <button
      type="button"
      data-testid={`sticker-tile-${characterKey}`}
      aria-label={character.name}
      onClick={() => onTap?.(characterKey)}
      style={{ ...TILE, cursor: 'pointer' }}
    >
      <CharacterSprite href={character.href} size={92} />
      <span
        style={{
          fontFamily: 'var(--cf-font-display)',
          fontWeight: 700,
          fontSize: 18,
          color: 'var(--cf-ink)',
          lineHeight: 1,
        }}
      >
        {character.name}
      </span>
    </button>
  );
}

export default function StickerBook({
  unlocks,
  stars,
  streakBest,
  onBack,
  onTapSticker,
}: StickerBookProps) {
  const keys = allCollectibleKeys();

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding:
          'max(28px, env(safe-area-inset-top)) 24px max(28px, env(safe-area-inset-bottom))',
        overflowY: 'auto',
      }}
    >
      <button
        type="button"
        className="cf-chrome-btn"
        onClick={onBack}
        aria-label="Back home"
        style={{
          position: 'absolute',
          top: 'max(24px, env(safe-area-inset-top))',
          left: 'max(26px, env(safe-area-inset-left))',
          zIndex: 6,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="26"
          height="26"
          fill="none"
          stroke="#5A4633"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 5 L8 12 L15 19" />
          <path d="M9 12 L19 12" />
        </svg>
      </button>

      <h1
        style={{
          margin: '4px 0 2px',
          fontFamily: 'var(--cf-font-display)',
          fontWeight: 800,
          fontSize: 40,
          color: 'var(--cf-ink)',
          lineHeight: 1,
        }}
      >
        Sticker Book
      </h1>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          margin: '14px 0 26px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <StarJar stars={stars} />
        <span
          aria-label={`best streak: ${streakBest}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--cf-cream-raised)',
            border: 'var(--cf-stroke-w) solid var(--cf-ink)',
            borderRadius: 'var(--cf-r-pill)',
            padding: '8px 18px',
            boxShadow: '0 6px 0 rgba(90,70,51,.14)',
            fontFamily: 'var(--cf-font-ui)',
            fontWeight: 700,
            fontSize: 16,
            color: 'var(--cf-ink-soft)',
          }}
        >
          best streak{' '}
          <span
            style={{
              fontFamily: 'var(--cf-font-display)',
              fontWeight: 800,
              fontSize: 22,
              lineHeight: 1,
              color: 'var(--cf-ink)',
            }}
          >
            {streakBest}
          </span>
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 18,
          justifyContent: 'center',
          maxWidth: 760,
        }}
      >
        {keys.map((key) => (
          <StickerTile
            key={key}
            characterKey={key}
            unlocked={isCharacterUnlocked(unlocks, key)}
            onTap={onTapSticker}
          />
        ))}
      </div>
    </div>
  );
}
