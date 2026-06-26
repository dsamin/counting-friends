import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import OrderActivity from './OrderActivity';
import { makeState } from '../../test/fixtures';
import type { OrderRound } from '../../game/activities/types';

describe('OrderActivity', () => {
  it('next mode: shows the run and answers with the tapped next number', async () => {
    const onAnswer = vi.fn(() => true);
    const round: OrderRound = { kind: 'order', mode: 'next', numbers: [5, 6, 7], answer: [8] };
    render(
      <OrderActivity
        state={makeState({ activityId: 'order', round })}
        reduceMotion={false}
        onAnswer={onAnswer}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/what comes next/i);
    // The derived choices always include the answer (8).
    await userEvent.click(screen.getByRole('button', { name: 'number 8' }));
    expect(onAnswer).toHaveBeenCalledWith({ kind: 'tile', value: 8 });
  });

  it('build mode: tapping a tile submits the running sequence', async () => {
    const onAnswer = vi.fn(() => true);
    const round: OrderRound = { kind: 'order', mode: 'build', numbers: [5, 2, 8], answer: [2, 5, 8] };
    const { container } = render(
      <OrderActivity
        state={makeState({ activityId: 'order', round })}
        reduceMotion={false}
        onAnswer={onAnswer}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/in order/i);
    expect(container.querySelectorAll('[data-order-tile]')).toHaveLength(3);
    await userEvent.click(
      container.querySelector('[data-order-tile][data-value="2"]') as HTMLElement,
    );
    expect(onAnswer).toHaveBeenCalledWith({ kind: 'sequence', values: [2] });
  });
});
