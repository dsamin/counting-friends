import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import AddActivity from './AddActivity';
import { makeState } from '../../test/fixtures';
import type { AddRound } from '../../game/activities/types';

describe('AddActivity', () => {
  it('asks an addition question and answers with the tapped total', async () => {
    const onAnswer = vi.fn(() => true);
    const round: AddRound = { kind: 'add', a: 2, b: 3, op: '+', choices: [5, 4, 6] };
    render(
      <AddActivity
        state={makeState({ activityId: 'add', round })}
        reduceMotion={false}
        onAnswer={onAnswer}
        registerButton={() => {}}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/altogether/i);
    await userEvent.click(screen.getByRole('button', { name: 'number 5' }));
    expect(onAnswer).toHaveBeenCalledWith({ kind: 'tile', value: 5 });
  });

  it('asks a take-away question for subtraction', () => {
    const round: AddRound = { kind: 'add', a: 5, b: 2, op: '-', choices: [3, 2, 4] };
    render(
      <AddActivity
        state={makeState({ activityId: 'add', round })}
        reduceMotion={false}
        onAnswer={vi.fn(() => true)}
        registerButton={() => {}}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/take away/i);
  });
});
