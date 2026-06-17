import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import SettingsSheet from './SettingsSheet';
import type { GameState } from '../game/gameState';
import type { GameActions } from '../game/useGame';
import { CHARACTERS } from '../game/characters';

function baseState(over: Partial<GameState> = {}): GameState {
  return {
    screen: 'play',
    tier: 'easy',
    count: 2,
    choices: [1, 2, 3],
    animal: CHARACTERS[0],
    status: 'asking',
    animatingValue: null,
    animType: null,
    animKey: 0,
    roundId: 1,
    gateProgress: 0,
    settingsOpen: true,
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

describe('SettingsSheet', () => {
  it('renders nothing when settings are closed', () => {
    const actions = spyActions();
    const { container } = render(
      <SettingsSheet state={baseState({ settingsOpen: false })} actions={actions} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the grown-ups heading and reassurance copy when open', () => {
    render(<SettingsSheet state={baseState()} actions={spyActions()} />);
    expect(screen.getByText(/for grown-ups/i)).toBeInTheDocument();
    expect(screen.getByText(/no way to fail/i)).toBeInTheDocument();
  });

  it('calls setName when the name input changes', async () => {
    const actions = spyActions();
    const user = userEvent.setup();
    render(<SettingsSheet state={baseState()} actions={actions} />);
    await user.type(screen.getByPlaceholderText(/child's name/i), 'J');
    expect(actions.setName).toHaveBeenCalledWith('J');
  });

  it('reflects the current child name', () => {
    render(
      <SettingsSheet state={baseState({ childName: 'Jayden' })} actions={spyActions()} />,
    );
    expect(screen.getByPlaceholderText(/child's name/i)).toHaveValue('Jayden');
  });

  it('toggles reduce motion and voice', async () => {
    const actions = spyActions();
    const user = userEvent.setup();
    render(<SettingsSheet state={baseState()} actions={actions} />);
    await user.click(screen.getByRole('switch', { name: /reduce motion/i }));
    expect(actions.toggleReduceMotion).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('switch', { name: /mascot voice/i }));
    expect(actions.toggleVoice).toHaveBeenCalledTimes(1);
  });

  it('exposes the toggles with correct aria-checked state', () => {
    render(
      <SettingsSheet
        state={baseState({ reduceMotion: true, voiceOn: false })}
        actions={spyActions()}
      />,
    );
    expect(
      screen.getByRole('switch', { name: /reduce motion/i }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.getByRole('switch', { name: /mascot voice/i }),
    ).toHaveAttribute('aria-checked', 'false');
  });

  it('calls closeSettings when the close button is clicked', async () => {
    const actions = spyActions();
    const user = userEvent.setup();
    render(<SettingsSheet state={baseState()} actions={actions} />);
    await user.click(screen.getByRole('button', { name: /close settings/i }));
    expect(actions.closeSettings).toHaveBeenCalledTimes(1);
  });
});
