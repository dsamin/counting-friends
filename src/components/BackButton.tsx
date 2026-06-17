/**
 * BackButton — top-left chrome circle that returns to the start screen
 * (cancelling timers + speech via the action). Adult-facing, 60px.
 */
interface BackButtonProps {
  onBack: () => void;
}

export default function BackButton({ onBack }: BackButtonProps) {
  return (
    <button
      type="button"
      className="cf-chrome-btn"
      onClick={onBack}
      aria-label="Back to start"
      style={{
        position: 'absolute',
        // Respect the iPad safe area (notch-free, but status bar / rounded
        // corners) while keeping the original offset as a floor.
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
  );
}
