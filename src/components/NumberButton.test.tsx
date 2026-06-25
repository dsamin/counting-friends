import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import NumberButton from './NumberButton';
import type { GameState } from '../game/gameState';
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
    countAlong: false,
    count: 3,
    choices: [2, 3, 4],
    animal: CHARACTERS[0],
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

describe('NumberButton', () => {
  it('renders the numeral and an accessible label', () => {
    render(
      <NumberButton value={4} state={baseState()} onChoose={() => {}} isEasy />,
    );
    const btn = screen.getByRole('button', { name: 'number 4' });
    expect(btn).toHaveTextContent('4');
  });

  it('calls onChoose with the value when clicked', async () => {
    const onChoose = vi.fn();
    const user = userEvent.setup();
    render(
      <NumberButton
        value={7}
        state={baseState()}
        onChoose={onChoose}
        isEasy={false}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'number 7' }));
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith(7);
  });

  it('applies the easy size class when isEasy', () => {
    render(
      <NumberButton value={1} state={baseState()} onChoose={() => {}} isEasy />,
    );
    expect(screen.getByRole('button', { name: 'number 1' })).toHaveClass(
      'cf-number--easy',
    );
  });

  it('applies correct classes when this value is the correct animation', () => {
    const state = baseState({
      animatingValue: 3,
      animType: 'correct',
      status: 'correct',
    });
    render(
      <NumberButton
        value={3}
        state={state}
        onChoose={() => {}}
        isEasy={false}
      />,
    );
    const btn = screen.getByRole('button', { name: 'number 3' });
    expect(btn).toHaveClass('cf-number--correct');
    expect(btn).not.toHaveClass('cf-number--wrong');
  });

  it('applies wrong classes when this value is the wrong animation', () => {
    const state = baseState({ animatingValue: 2, animType: 'wrong' });
    render(
      <NumberButton
        value={2}
        state={state}
        onChoose={() => {}}
        isEasy={false}
      />,
    );
    const btn = screen.getByRole('button', { name: 'number 2' });
    expect(btn).toHaveClass('cf-number--wrong');
    expect(btn).not.toHaveClass('cf-number--correct');
  });

  it('does not animate buttons other than the active one', () => {
    const state = baseState({ animatingValue: 3, animType: 'correct' });
    render(
      <NumberButton
        value={4}
        state={state}
        onChoose={() => {}}
        isEasy={false}
      />,
    );
    const btn = screen.getByRole('button', { name: 'number 4' });
    expect(btn).not.toHaveClass('cf-number--correct');
    expect(btn).not.toHaveClass('cf-number--wrong');
  });

  it('applies the squash/wobble keyframe classes only when motion is allowed', () => {
    const state = baseState({
      animatingValue: 3,
      animType: 'correct',
      status: 'correct',
    });
    render(
      <NumberButton
        value={3}
        state={state}
        onChoose={() => {}}
        isEasy={false}
        reduceMotion={false}
      />,
    );
    const btn = screen.getByRole('button', { name: 'number 3' });
    expect(btn).toHaveClass('cf-number--correct');
    expect(btn).toHaveClass('cf-squashPop');
  });

  it('with reduceMotion + correct keeps the color class but drops the squashPop keyframe', () => {
    const state = baseState({
      animatingValue: 3,
      animType: 'correct',
      status: 'correct',
    });
    render(
      <NumberButton
        value={3}
        state={state}
        onChoose={() => {}}
        isEasy={false}
        reduceMotion
      />,
    );
    const btn = screen.getByRole('button', { name: 'number 3' });
    // Color/state still reads as correct...
    expect(btn).toHaveClass('cf-number--correct');
    // ...but the motion keyframe is suppressed.
    expect(btn).not.toHaveClass('cf-squashPop');
  });

  it('with reduceMotion + wrong keeps the color class but drops the wobble keyframe', () => {
    const state = baseState({ animatingValue: 2, animType: 'wrong' });
    render(
      <NumberButton
        value={2}
        state={state}
        onChoose={() => {}}
        isEasy={false}
        reduceMotion
      />,
    );
    const btn = screen.getByRole('button', { name: 'number 2' });
    expect(btn).toHaveClass('cf-number--wrong');
    expect(btn).not.toHaveClass('cf-wrongWobble');
  });
});
