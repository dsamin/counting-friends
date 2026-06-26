import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import MatchActivity from './MatchActivity';
import { makeState } from '../../test/fixtures';
import type { MatchRound } from '../../game/activities/types';

const round: MatchRound = {
  kind: 'match',
  variant: 'groupNum',
  left: [
    { id: 'L0', kind: 'group', value: 2 },
    { id: 'L1', kind: 'group', value: 5 },
  ],
  right: [
    { id: 'R0', kind: 'numeral', value: 2 },
    { id: 'R1', kind: 'numeral', value: 5 },
  ],
  solution: { L0: 'R0', L1: 'R1' },
};

function setup(over = {}, onAnswer = vi.fn(() => true)) {
  const state = makeState({ activityId: 'match', round, ...over });
  const { container } = render(
    <MatchActivity state={state} reduceMotion={false} onAnswer={onAnswer} />,
  );
  return { container, onAnswer };
}

describe('MatchActivity', () => {
  it('renders a left group and a right numeral per pair', () => {
    const { container } = setup();
    expect(container.querySelectorAll('[data-match-left]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-match-right]')).toHaveLength(2);
  });

  it('selecting a left group marks it, then a right tap submits the pair', async () => {
    const { container, onAnswer } = setup();
    const left = container.querySelector('[data-match-left][data-value="2"]') as HTMLElement;
    await userEvent.click(left);
    expect(left).toHaveAttribute('data-selected');

    const right = container.querySelector('[data-match-right][data-value="2"]') as HTMLElement;
    await userEvent.click(right);
    expect(onAnswer).toHaveBeenCalledWith({
      kind: 'pair',
      leftId: 'L0',
      rightId: 'R0',
    });
  });

  it('a right tap with no selection does nothing', async () => {
    const { container, onAnswer } = setup();
    const right = container.querySelector('[data-match-right][data-value="2"]') as HTMLElement;
    await userEvent.click(right);
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('draws a ribbon for each already-linked pair', () => {
    const { container } = setup({
      matchProgress: { linked: [{ leftId: 'L0', rightId: 'R0' }] },
    });
    expect(container.querySelectorAll('[data-linked-pair]')).toHaveLength(1);
  });
});
