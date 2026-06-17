import type { Tier } from '../game/types';
import type { GameState } from '../game/gameState';
import type { GameActions } from '../game/useGame';
import CharacterSprite from '../components/CharacterSprite';

/**
 * StartScreen — wordless tier select. A floating duck mascot beside the
 * "Counting Friends" lockup, an adult-only subtitle cue, and three white cards
 * each showing a duck at a different size (the difficulty metaphor: bigger duck
 * = bigger numbers) with 1/2/3 coral dots. Tapping a card enters play.
 */
interface StartScreenProps {
  state: GameState;
  actions: GameActions;
}

interface TierCardSpec {
  tier: Tier;
  duckSize: number;
  dots: number;
  label: string;
}

const TIERS: TierCardSpec[] = [
  { tier: 'easy', duckSize: 96, dots: 1, label: 'Easy — count 1 to 5' },
  { tier: 'medium', duckSize: 134, dots: 2, label: 'Medium — count 1 to 10' },
  { tier: 'hard', duckSize: 176, dots: 3, label: 'Hard — count 1 to 20' },
];

function TierCard({
  spec,
  onPick,
  reduceMotion,
}: {
  spec: TierCardSpec;
  onPick: (tier: Tier) => void;
  reduceMotion: boolean;
}) {
  return (
    <button
      type="button"
      className="cf-tier-card"
      aria-label={spec.label}
      onClick={() => onPick(spec.tier)}
    >
      <div
        style={{
          height: 184,
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            animation: reduceMotion
              ? 'none'
              : 'cf-bob 2700ms ease-in-out infinite',
          }}
        >
          <CharacterSprite href="#duck" size={spec.duckSize} />
        </span>
      </div>
      <div style={{ display: 'flex', gap: 9 }}>
        {Array.from({ length: spec.dots }).map((_, i) => (
          <span key={i} className="cf-tier-dot" />
        ))}
      </div>
    </button>
  );
}

export default function StartScreen({ state, actions }: StartScreenProps) {
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
        Pick a friend to start counting
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 38 }}>
        {TIERS.map((spec) => (
          <TierCard
            key={spec.tier}
            spec={spec}
            onPick={actions.pick}
            reduceMotion={state.reduceMotion}
          />
        ))}
      </div>
    </div>
  );
}
