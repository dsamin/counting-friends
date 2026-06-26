import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import StarJar from './StarJar';

describe('StarJar', () => {
  it('renders the star count as text', () => {
    render(<StarJar stars={7} />);
    const jar = screen.getByTestId('star-jar');
    expect(jar).toHaveTextContent('7');
  });

  it('exposes an aria-label including the number', () => {
    render(<StarJar stars={12} />);
    expect(
      screen.getByLabelText('12 stars collected'),
    ).toBeInTheDocument();
  });

  it('renders as a plain (non-button) element when no onClick is given', () => {
    render(<StarJar stars={3} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByTestId('star-jar')).toBeInTheDocument();
  });

  it('renders as a button and calls onClick when clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<StarJar stars={5} onClick={onClick} />);
    const btn = screen.getByRole('button', { name: '5 stars collected' });
    await user.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
