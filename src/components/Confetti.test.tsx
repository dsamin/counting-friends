import { createRef } from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import Confetti, { type ConfettiHandle } from './Confetti';

describe('Confetti', () => {
  it('renders a decorative canvas overlay', () => {
    const { container } = render(<Confetti />);
    const canvas = container.querySelector('canvas.cf-confetti');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
  });

  it('burst() does not throw when the 2d context is unavailable (jsdom)', () => {
    // Force the no-context path deterministically (jsdom would otherwise emit a
    // noisy "not implemented" warning). burst must no-op safely.
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(null);
    const ref = createRef<ConfettiHandle>();
    render(<Confetti ref={ref} />);
    expect(() => ref.current?.burst(10, 20, false)).not.toThrow();
    expect(() => ref.current?.burst(10, 20, true)).not.toThrow();
    getContext.mockRestore();
  });

  it('burst() runs the particle loop when a 2d context exists', () => {
    // Provide a minimal stub context so the draw path executes without throwing.
    const ctx = {
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      globalAlpha: 1,
      fillStyle: '',
    };
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(ctx as unknown as CanvasRenderingContext2D);

    const ref = createRef<ConfettiHandle>();
    render(<Confetti ref={ref} />);
    expect(() => ref.current?.burst(50, 50, false)).not.toThrow();

    getContext.mockRestore();
  });
});
