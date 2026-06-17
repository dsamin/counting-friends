import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ParentalGate from './ParentalGate';

const C = 2 * Math.PI * 30;

describe('ParentalGate', () => {
  it('calls gateDown on pointer down and gateUp on pointer up', () => {
    const gateDown = vi.fn();
    const gateUp = vi.fn();
    render(
      <ParentalGate gateProgress={0} gateDown={gateDown} gateUp={gateUp} />,
    );
    const gate = screen.getByRole('button', {
      name: /parent settings/i,
    });
    fireEvent.pointerDown(gate);
    expect(gateDown).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(gate);
    expect(gateUp).toHaveBeenCalledTimes(1);
  });

  it('calls gateUp on pointer leave', () => {
    const gateUp = vi.fn();
    render(
      <ParentalGate gateProgress={0} gateDown={() => {}} gateUp={gateUp} />,
    );
    fireEvent.pointerLeave(
      screen.getByRole('button', { name: /parent settings/i }),
    );
    expect(gateUp).toHaveBeenCalledTimes(1);
  });

  it('reflects gateProgress in the ring stroke-dashoffset', () => {
    const { container, rerender } = render(
      <ParentalGate gateProgress={0} gateDown={() => {}} gateUp={() => {}} />,
    );
    const ring = container.querySelector('.cf-gate-ring circle:last-of-type')!;
    // At 0 progress the ring is fully hidden: offset == circumference.
    expect(ring.getAttribute('stroke-dashoffset')).toBe(String(C * 1));

    rerender(
      <ParentalGate gateProgress={0.5} gateDown={() => {}} gateUp={() => {}} />,
    );
    expect(ring.getAttribute('stroke-dashoffset')).toBe(String(C * 0.5));

    rerender(
      <ParentalGate gateProgress={1} gateDown={() => {}} gateUp={() => {}} />,
    );
    expect(ring.getAttribute('stroke-dashoffset')).toBe(String(C * 0));
  });
});
