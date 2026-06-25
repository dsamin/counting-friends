import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import OneMoreActivity from './OneMoreActivity';
import { makeState } from '../../test/fixtures';
import type { OneMoreRound } from '../../game/activities/types';

const round: OneMoreRound = { kind: 'onemore', base: 4, delta: 1, choices: [5, 3, 4] };

describe('OneMoreActivity', () => {
  it('renders the choice tiles and answers with the tapped value', async () => {
    const onAnswer = vi.fn(() => true);
    render(
      <OneMoreActivity
        state={makeState({ activityId: 'onemore', round })}
        reduceMotion={false}
        onAnswer={onAnswer}
        registerButton={() => {}}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/one more/i);
    await userEvent.click(screen.getByRole('button', { name: 'number 5' }));
    expect(onAnswer).toHaveBeenCalledWith({ kind: 'tile', value: 5 });
  });
});
