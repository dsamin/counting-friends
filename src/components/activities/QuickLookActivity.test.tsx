import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import QuickLookActivity from './QuickLookActivity';
import { makeState } from '../../test/fixtures';
import { CHARACTERS } from '../../game/characters';
import type { QuickLookRound } from '../../game/activities/types';

const round: QuickLookRound = {
  kind: 'quicklook',
  count: 3,
  choices: [3, 1, 4],
  revealMs: 1000,
  arrangement: 'dice',
};

function setup(revealPhase: 'revealed' | 'hidden', onAnswer = vi.fn(() => true)) {
  const state = makeState({
    activityId: 'quicklook',
    round,
    count: round.count,
    choices: round.choices,
    animal: CHARACTERS[0],
    revealPhase,
  });
  const { container } = render(
    <QuickLookActivity
      state={state}
      reduceMotion={false}
      onAnswer={onAnswer}
      registerButton={() => {}}
    />,
  );
  return { container, onAnswer };
}

describe('QuickLookActivity', () => {
  it('shows the friends (and no tiles) while revealed', () => {
    const { container } = setup('revealed');
    expect(container.querySelectorAll('.cf-animal')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'number 3' })).not.toBeInTheDocument();
    expect(container.querySelector('[data-phase="revealed"]')).toBeInTheDocument();
  });

  it('hides the friends and shows number tiles once hidden', async () => {
    const { container, onAnswer } = setup('hidden');
    expect(container.querySelectorAll('.cf-animal')).toHaveLength(0);
    const btn = screen.getByRole('button', { name: 'number 3' });
    await userEvent.click(btn);
    expect(onAnswer).toHaveBeenCalledWith({ kind: 'tile', value: 3 });
  });
});
