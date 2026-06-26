import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import LevelUpBanner from './LevelUpBanner';

describe('LevelUpBanner', () => {
  it('renders the line', () => {
    render(<LevelUpBanner line="Five in a row!" reduceMotion={false} />);
    expect(screen.getByText('Five in a row!')).toBeInTheDocument();
  });

  it('announces via a polite status live region', () => {
    render(
      <LevelUpBanner line="Let's try something bigger!" reduceMotion={false} />,
    );
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent("Let's try something bigger!");
  });

  it('calls onDismiss when tapped if provided', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(
      <LevelUpBanner
        line="Great job!"
        reduceMotion={false}
        onDismiss={onDismiss}
      />,
    );
    await user.click(screen.getByText('Great job!'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('slides in (translateY) under full motion', () => {
    render(<LevelUpBanner line="Level up!" reduceMotion={false} />);
    const banner = screen.getByTestId('level-up-banner');
    expect(banner.getAttribute('style') ?? '').toMatch(/translateY/i);
  });

  it('does not apply a slide transform under reduce-motion', () => {
    render(<LevelUpBanner line="Level up!" reduceMotion />);
    const banner = screen.getByTestId('level-up-banner');
    expect(banner.getAttribute('style') ?? '').not.toMatch(/translateY/i);
  });
});
