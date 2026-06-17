import CharacterSprite from './CharacterSprite';

/**
 * ReplayPill — the mascot duck plus three animated "sound bars," top-center.
 * Tapping re-speaks the current prompt. The bars animate (`cf-soundbar`) only
 * while `speaking` is true, giving a visible "I'm talking" affordance.
 */
interface ReplayPillProps {
  speaking: boolean;
  onReplay: () => void;
}

export default function ReplayPill({ speaking, onReplay }: ReplayPillProps) {
  return (
    <button
      type="button"
      className={`cf-replay${speaking ? ' cf-replay--speaking' : ''}`}
      onClick={onReplay}
      aria-label="Hear the question again"
      style={{
        position: 'absolute',
        top: 'max(22px, env(safe-area-inset-top))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 6,
      }}
    >
      <CharacterSprite href="#duck" size={44} />
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: 28,
        }}
      >
        <span className="cf-bar" />
        <span className="cf-bar" />
        <span className="cf-bar" />
      </span>
    </button>
  );
}
