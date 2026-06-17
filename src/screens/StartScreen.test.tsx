import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import StartScreen from './StartScreen';
import type { GameState } from '../game/gameState';
import type { GameActions } from '../game/useGame';
import { CHARACTERS } from '../game/characters';

function baseState(over: Partial<GameState> = {}): GameState {
  return {
    screen: 'start',
    tier: 'easy',
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
    pick: vi.fn(),
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

describe('StartScreen', () => {
  it('renders the title lockup and adult subtitle', () => {
    render(<StartScreen state={baseState()} actions={spyActions()} />);
    expect(
      screen.getByRole('heading', { name: /counting friends/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/pick a friend to start counting/i),
    ).toBeInTheDocument();
  });

  it('renders three tier cards', () => {
    render(<StartScreen state={baseState()} actions={spyActions()} />);
    expect(screen.getByRole('button', { name: /easy/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /medium/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hard/i })).toBeInTheDocument();
  });

  it('calls pick with the right tier for each card', async () => {
    const actions = spyActions();
    const user = userEvent.setup();
    render(<StartScreen state={baseState()} actions={actions} />);

    await user.click(screen.getByRole('button', { name: /easy/i }));
    expect(actions.pick).toHaveBeenCalledWith('easy');

    await user.click(screen.getByRole('button', { name: /medium/i }));
    expect(actions.pick).toHaveBeenCalledWith('medium');

    await user.click(screen.getByRole('button', { name: /hard/i }));
    expect(actions.pick).toHaveBeenCalledWith('hard');
  });
});
