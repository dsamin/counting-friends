import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import CountAlongField from './CountAlongField';
import { makeState } from '../../test/fixtures';
import type { GameActions } from '../../game/useGame';
import { CHARACTERS } from '../../game/characters';

function actions(): GameActions {
  return {
    enterActivity: vi.fn(),
    answer: vi.fn(),
    choose: vi.fn(),
    tapAnimal: vi.fn(),
    replay: vi.fn(),
    back: vi.fn(),
    openStickers: vi.fn(),
    closeOverlay: vi.fn(),
    countSpeak: vi.fn(),
    gateDown: vi.fn(),
    gateUp: vi.fn(),
    closeSettings: vi.fn(),
    setName: vi.fn(),
    toggleReduceMotion: vi.fn(),
    toggleVoice: vi.fn(),
    toggleArithmetic: vi.fn(),
  };
}

function setup() {
  const a = actions();
  const state = makeState({
    activityId: 'count',
    countAlong: true,
    count: 3,
    choices: [2, 3, 4],
    animal: CHARACTERS[0],
  });
  const view = render(
    <CountAlongField
      state={state}
      reduceMotion={false}
      actions={a}
      registerButton={() => {}}
    />,
  );
  return { a, ...view };
}

describe('CountAlongField', () => {
  it('renders one tappable friend per count and hides the tiles until counting is done', () => {
    const { container } = setup();
    expect(container.querySelectorAll('[data-count-friend]')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'number 3' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/count them together/i);
  });

  it('counts aloud as each friend is tapped, then reveals the number tiles', async () => {
    const { a, container } = setup();
    const user = userEvent.setup();
    const friends = container.querySelectorAll('[data-count-friend]');

    await user.click(friends[0]);
    expect(a.countSpeak).toHaveBeenLastCalledWith(1);
    await user.click(friends[1]);
    expect(a.countSpeak).toHaveBeenLastCalledWith(2);
    await user.click(friends[2]);
    expect(a.countSpeak).toHaveBeenLastCalledWith(3);

    // All counted → the choice tiles appear so the child can answer.
    expect(screen.getByRole('button', { name: 'number 3' })).toBeInTheDocument();
  });
});
