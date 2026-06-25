import type { ActivityId } from '../game/activities/types';
import type { GameState } from '../game/gameState';
import type { GameActions } from '../game/useGame';
import { availableActivities } from '../game/gating';
import CharacterSprite from '../components/CharacterSprite';
import StarJar from '../components/StarJar';

/**
 * HomeBoard — the wordless "Play Board" that replaces v1's tier picker. Difficulty
 * is adaptive now, so there is no easy/medium/hard choice. It shows a friendly
 * lockup plus one illustrated tile per available activity (driven by the registry,
 * so new activities appear automatically as they ship). Tapping a tile enters the
 * activity, which immediately speaks its prompt — selection stays audio-mediated
 * like the rest of the app.
 */
interface HomeBoardProps {
  state: GameState;
  actions: GameActions;
}

interface ActivityTileMeta {
  /** Accessible name (the visible tile is wordless — a friend sprite). */
  aria: string;
  /** Friend sprite shown on the tile. */
  friendHref: string;
  size: number;
}

/** Tile presentation per activity. Extended as activities ship (§9.1). */
const TILE_META: Partial<Record<ActivityId, ActivityTileMeta>> = {
  count: { aria: 'Counting game', friendHref: '#duck', size: 132 },
  numeral: { aria: 'Find the number game', friendHref: '#cat', size: 132 },
  quicklook: { aria: 'Quick look game', friendHref: '#frog', size: 132 },
  match: { aria: 'Matching game', friendHref: '#bunny', size: 132 },
  compare: { aria: 'More or fewer game', friendHref: '#cat', size: 132 },
  order: { aria: 'Put in order game', friendHref: '#frog', size: 132 },
  onemore: { aria: 'One more game', friendHref: '#bunny', size: 132 },
  add: { aria: 'Add and take away game', friendHref: '#duck', size: 132 },
};

function ActivityTile({
  id,
  meta,
  onEnter,
  reduceMotion,
}: {
  id: ActivityId;
  meta: ActivityTileMeta;
  onEnter: (id: ActivityId) => void;
  reduceMotion: boolean;
}) {
  return (
    <button
      type="button"
      className="cf-tier-card"
      aria-label={meta.aria}
      onClick={() => onEnter(id)}
    >
      <div style={{ height: 152, display: 'flex', alignItems: 'flex-end' }}>
        <span
          style={{
            display: 'inline-flex',
            animation: reduceMotion ? 'none' : 'cf-bob 2700ms ease-in-out infinite',
          }}
        >
          <CharacterSprite href={meta.friendHref} size={meta.size} />
        </span>
      </div>
    </button>
  );
}

export default function HomeBoard({ state, actions }: HomeBoardProps) {
  const activities = availableActivities(
    state.unlocks,
    state.mastery,
    state.settings,
  ).filter((id) => TILE_META[id]);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Star Jar → the Sticker Book collection. */}
      <div
        style={{
          position: 'absolute',
          top: 'max(18px, env(safe-area-inset-top))',
          right: 'max(18px, env(safe-area-inset-right))',
        }}
      >
        <StarJar stars={state.stars} onClick={actions.openStickers} />
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            transformOrigin: 'center',
            animation: state.reduceMotion
              ? 'none'
              : 'cf-floaty 3.2s ease-in-out infinite',
          }}
        >
          <CharacterSprite href="#duck" size={88} />
        </span>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--cf-font-display)',
            fontWeight: 800,
            fontSize: 60,
            color: 'var(--cf-ink)',
            lineHeight: 1,
          }}
        >
          Counting <span style={{ color: 'var(--cf-coral)' }}>Friends</span>
        </h1>
      </div>
      <div
        style={{
          fontFamily: 'var(--cf-font-ui)',
          fontWeight: 600,
          color: 'var(--cf-ink-soft)',
          fontSize: 19,
          marginBottom: 46,
        }}
      >
        Pick a game to play
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 38,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {activities.map((id) => (
          <ActivityTile
            key={id}
            id={id}
            meta={TILE_META[id]!}
            onEnter={actions.enterActivity}
            reduceMotion={state.reduceMotion}
          />
        ))}
      </div>
    </div>
  );
}
