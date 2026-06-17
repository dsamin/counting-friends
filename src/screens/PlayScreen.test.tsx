import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import PlayScreen from './PlayScreen';
import type { GameState } from '../game/gameState';
import type { GameActions } from '../game/useGame';
import { CHARACTERS } from '../game/characters';

function baseState(over: Partial<GameState> = {}): GameState {
  return {
    screen: 'play',
    tier: 'easy',
    count: 3,
    choices: [2, 3, 4],
    animal: CHARACTERS[0], // duck
    status: 'asking',
    animatingValue: null,
    animType: null,
    animKey: 0,
    roundId: 1,
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

describe('PlayScreen', () => {
  it('renders one animal sprite per count', () => {
    const { container } = render(
      <PlayScreen state={baseState({ count: 3 })} actions={spyActions()} />,
    );
    const slots = container.querySelectorAll('.cf-animal');
    expect(slots).toHaveLength(3);
  });

  it('renders one number button per choice', () => {
    render(
      <PlayScreen state={baseState({ choices: [2, 3, 4] })} actions={spyActions()} />,
    );
    expect(screen.getByRole('button', { name: 'number 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'number 3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'number 4' })).toBeInTheDocument();
  });

  it('calls choose with the value when a number is tapped', async () => {
    const actions = spyActions();
    const user = userEvent.setup();
    render(<PlayScreen state={baseState()} actions={actions} />);
    await user.click(screen.getByRole('button', { name: 'number 3' }));
    expect(actions.choose).toHaveBeenCalledWith(3);
  });

  it('calls tapAnimal when an animal is tapped', async () => {
    const actions = spyActions();
    const user = userEvent.setup();
    const { container } = render(
      <PlayScreen state={baseState({ count: 1 })} actions={actions} />,
    );
    const slot = container.querySelector('.cf-animal') as HTMLElement;
    await user.click(slot);
    expect(actions.tapAnimal).toHaveBeenCalledTimes(1);
  });

  it('calls replay when the replay pill is tapped', async () => {
    const actions = spyActions();
    const user = userEvent.setup();
    render(<PlayScreen state={baseState()} actions={actions} />);
    await user.click(
      screen.getByRole('button', { name: /hear the question again/i }),
    );
    expect(actions.replay).toHaveBeenCalledTimes(1);
  });

  it('calls back when the back button is tapped', async () => {
    const actions = spyActions();
    const user = userEvent.setup();
    render(<PlayScreen state={baseState()} actions={actions} />);
    await user.click(screen.getByRole('button', { name: /back to start/i }));
    expect(actions.back).toHaveBeenCalledTimes(1);
  });

  it('renders the parental gate', () => {
    render(<PlayScreen state={baseState()} actions={spyActions()} />);
    expect(
      screen.getByRole('button', { name: /parent settings/i }),
    ).toBeInTheDocument();
  });

  it('renders the settings sheet only when open', () => {
    const { rerender } = render(
      <PlayScreen state={baseState({ settingsOpen: false })} actions={spyActions()} />,
    );
    expect(screen.queryByText(/for grown-ups/i)).not.toBeInTheDocument();

    rerender(
      <PlayScreen state={baseState({ settingsOpen: true })} actions={spyActions()} />,
    );
    expect(screen.getByText(/for grown-ups/i)).toBeInTheDocument();
  });
});
