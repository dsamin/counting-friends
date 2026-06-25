import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import UnlockReveal from './UnlockReveal';
import { getCharacter } from '../game/characters';

describe('UnlockReveal', () => {
  it("renders the newly-unlocked friend's name", () => {
    render(<UnlockReveal characterKey="dog" reduceMotion={false} />);
    expect(
      screen.getByText(getCharacter('dog').name),
    ).toBeInTheDocument();
  });

  it('announces via a polite status live region', () => {
    render(<UnlockReveal characterKey="owl" reduceMotion={false} />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('shows the friend sprite for the unlocked key', () => {
    const { container } = render(
      <UnlockReveal characterKey="pig" reduceMotion={false} />,
    );
    expect(
      container.querySelector('use[href="#pig"]'),
    ).toBeInTheDocument();
  });

  it('pops in (scale transform) under full motion', () => {
    render(<UnlockReveal characterKey="dog" reduceMotion={false} />);
    const reveal = screen.getByTestId('unlock-reveal-sprite');
    expect(reveal.getAttribute('style') ?? '').toMatch(/scale/i);
  });

  it('cross-fades at full size (no pop transform) under reduce-motion', () => {
    render(<UnlockReveal characterKey="dog" reduceMotion />);
    const reveal = screen.getByTestId('unlock-reveal-sprite');
    expect(reveal.getAttribute('style') ?? '').not.toMatch(/scale\(/i);
  });

  it('calls onDismiss when tapped', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(
      <UnlockReveal characterKey="dog" reduceMotion={false} onDismiss={onDismiss} />,
    );
    await user.click(screen.getByText(getCharacter('dog').name));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
