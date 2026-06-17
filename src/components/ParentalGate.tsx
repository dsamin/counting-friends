import type { Ref } from 'react';

/**
 * ParentalGate — a low-contrast dot bottom-right that must be pressed and held
 * for 3s (driven by the hook's RAF loop) to open settings. A coral ring fills
 * as you hold; releasing early resets it. A deliberate adult gesture, not a tap.
 */
interface ParentalGateProps {
  /** 0..1 hold progress, drives the ring fill. */
  gateProgress: number;
  gateDown: () => void;
  gateUp: () => void;
  /** The gate button — focus is restored here when settings close. */
  buttonRef?: Ref<HTMLButtonElement>;
}

const RING_RADIUS = 30;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function ParentalGate({
  gateProgress,
  gateDown,
  gateUp,
  buttonRef,
}: ParentalGateProps) {
  const dashoffset = RING_CIRCUMFERENCE * (1 - gateProgress);

  return (
    <button
      ref={buttonRef}
      type="button"
      className="cf-gate"
      onPointerDown={gateDown}
      onPointerUp={gateUp}
      onPointerLeave={gateUp}
      aria-label="Parent settings (press and hold)"
      style={{ touchAction: 'none', zIndex: 8, padding: 0 }}
    >
      <svg
        className="cf-gate-ring"
        viewBox="0 0 72 72"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
        aria-hidden="true"
      >
        <circle
          cx="36"
          cy="36"
          r={RING_RADIUS}
          fill="rgba(255,253,246,0.6)"
          stroke="#5A4633"
          strokeOpacity="0.16"
          strokeWidth="6"
        />
        <circle
          cx="36"
          cy="36"
          r={RING_RADIUS}
          fill="none"
          stroke="#FF8A7A"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={dashoffset}
        />
      </svg>
      <span className="cf-gate-dot" />
    </button>
  );
}
