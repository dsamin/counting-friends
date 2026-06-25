import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import NumeralActivity from './NumeralActivity';
import { makeState } from '../../test/fixtures';
import type { NumeralRound } from '../../game/activities/types';

const round: NumeralRound = {
  kind: 'numeral',
  target: 7,
  choices: [7, 3, 5],
  lookAlike: false,
};

function renderActivity(onAnswer = vi.fn(() => true)) {
  const state = makeState({ activityId: 'numeral', round, choices: round.choices });
  render(
    <NumeralActivity
      state={state}
      reduceMotion={false}
      onAnswer={onAnswer}
      registerButton={() => {}}
    />,
  );
  return onAnswer;
}

describe('NumeralActivity', () => {
  it('announces the find-the-number prompt for the target', () => {
    renderActivity();
    expect(screen.getByRole('status')).toHaveTextContent('Find the seven!');
  });

  it('renders a number tile for each choice', () => {
    renderActivity();
    for (const v of round.choices) {
      expect(
        screen.getByRole('button', { name: `number ${v}` }),
      ).toBeInTheDocument();
    }
  });

  it('answers with a tile payload when a number is tapped', async () => {
    const onAnswer = renderActivity();
    await userEvent.click(screen.getByRole('button', { name: 'number 7' }));
    expect(onAnswer).toHaveBeenCalledWith({ kind: 'tile', value: 7 });
  });
});
