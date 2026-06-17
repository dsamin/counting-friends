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
      style={{ position: 'absolute', top: 24, left: 26, zIndex: 6 }}
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
