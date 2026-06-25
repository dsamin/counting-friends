import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import HomeBoard from './HomeBoard';
import type { GameState } from '../game/gameState';
import type { GameActions } from '../game/useGame';
import { CHARACTERS } from '../game/characters';

function baseState(over: Partial<GameState> = {}): GameState {
  return {
    screen: 'home',
    activityId: 'count',
    round: null,
    mastery: { count: { level: 1, window: [] } },
    streak: 0,
    count: 0,
    choices: [],
    animal: CHARACTERS[0],
    status: 'asking',
    animatingValue: null,
    animType: null,
    animKey: 0,
    roundId: 0,
    gateProgress: 0,
    settingsOpen: false,
    childName: '',
    reduceMotion: false,
    voiceOn: true,
    speaking: false,
    ...over,
  };
}

function spyActions(): GameActions {
  return {
    enterActivity: vi.fn(),
    choose: vi.fn(),
    tapAnimal: vi.fn(),
    replay: vi.fn(),
    back: vi.fn(),
    gateDown: vi.fn(),
    gateUp: vi.fn(),
    closeSettings: vi.fn(),
    setName: vi.fn(),
    toggleReduceMotion: vi.fn(),
    toggleVoice: vi.fn(),
  };
}

describe('HomeBoard', () => {
  it('renders the title lockup and adult subtitle', () => {
    render(<HomeBoard state={baseState()} actions={spyActions()} />);
    expect(
      screen.getByRole('heading', { name: /counting friends/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/pick a game to play/i)).toBeInTheDocument();
  });

  it('renders a tile for each available (registered) activity', () => {
    render(<HomeBoard state={baseState()} actions={spyActions()} />);
    // count is the only registered activity in this build.
    expect(
      screen.getByRole('button', { name: /counting game/i }),
    ).toBeInTheDocument();
    // Activities not yet registered must not appear.
    expect(
      screen.queryByRole('button', { name: /matching game/i }),
    ).not.toBeInTheDocument();
  });

  it('enters the activity when its tile is tapped', async () => {
    const actions = spyActions();
    const user = userEvent.setup();
    render(<HomeBoard state={baseState()} actions={actions} />);
    await user.click(screen.getByRole('button', { name: /counting game/i }));
    expect(actions.enterActivity).toHaveBeenCalledWith('count');
  });
});
