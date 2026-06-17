import { render } from '@testing-library/react';
import UiIcon from './UiIcon';
import type { UiIconName } from './UiIcon';

const NAMES: UiIconName[] = ['voice', 'child', 'settings', 'lock', 'heart'];

describe('UiIcon', () => {
  it.each(NAMES)('renders an aria-hidden <svg> for %s', (name) => {
    const { container } = render(<UiIcon name={name} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('honours the size prop', () => {
    const { container } = render(<UiIcon name="heart" size={20} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('width', '20');
    expect(svg).toHaveAttribute('height', '20');
  });

  it('keeps the heart coral fill rather than currentColor', () => {
    const { container } = render(<UiIcon name="heart" />);
    expect(container.querySelector('path[fill="#FF8A7A"]')).not.toBeNull();
  });
});
