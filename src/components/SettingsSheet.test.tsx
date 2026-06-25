import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import SettingsSheet from './SettingsSheet';
import type { GameState } from '../game/gameState';
import type { GameActions } from '../game/useGame';
import { CHARACTERS } from '../game/characters';
import { defaultUnlocks } from '../game/content';

function baseState(over: Partial<GameState> = {}): GameState {
  return {
    screen: 'play',
    activityId: 'count',
    round: null,
    mastery: { count: { level: 1, window: [] } },
    streak: 0,
    stars: 0,
    unlocks: defaultUnlocks(),
    settings: {},
    overlay: null,
    matchProgress: null,
    revealPhase: 'revealed',
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
    enterActivity: vi.fn(),
    answer: vi.fn(),
    choose: vi.fn(),
    tapAnimal: vi.fn(),
    replay: vi.fn(),
    back: vi.fn(),
    openStickers: vi.fn(),
    closeOverlay: vi.fn(),
    gateDown: vi.fn(),
    gateUp: vi.fn(),
    closeSettings: vi.fn(),
    setName: vi.fn(),
    toggleReduceMotion: vi.fn(),
    toggleVoice: vi.fn(),
    toggleArithmetic: vi.fn(),
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

  it('exposes the overlay as a labelled modal dialog', () => {
    render(<SettingsSheet state={baseState()} actions={spyActions()} />);
    const dialog = screen.getByRole('dialog', { name: /for grown-ups/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('moves focus to the name input when opened', () => {
    render(<SettingsSheet state={baseState()} actions={spyActions()} />);
    expect(screen.getByPlaceholderText(/child's name/i)).toHaveFocus();
  });

  it('closes on Escape', async () => {
    const actions = spyActions();
    const user = userEvent.setup();
    render(<SettingsSheet state={baseState()} actions={actions} />);
    await user.keyboard('{Escape}');
    expect(actions.closeSettings).toHaveBeenCalledTimes(1);
  });

  it('restores focus to the restore target when it closes', () => {
    const actions = spyActions();
    const restore = document.createElement('button');
    document.body.appendChild(restore);
    const restoreFocusRef = { current: restore };
    const { rerender } = render(
      <SettingsSheet
        state={baseState({ settingsOpen: true })}
        actions={actions}
        restoreFocusRef={restoreFocusRef}
      />,
    );
    rerender(
      <SettingsSheet
        state={baseState({ settingsOpen: false })}
        actions={actions}
        restoreFocusRef={restoreFocusRef}
      />,
    );
    expect(restore).toHaveFocus();
    document.body.removeChild(restore);
  });
});
