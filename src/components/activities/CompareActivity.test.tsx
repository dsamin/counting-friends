import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import CompareActivity from './CompareActivity';
import { makeState } from '../../test/fixtures';
import type { CompareRound } from '../../game/activities/types';

const round: CompareRound = { kind: 'compare', left: 2, right: 5, ask: 'more' };

describe('CompareActivity', () => {
  it('renders two tappable groups with their sizes', () => {
    const { container } = render(
      <CompareActivity
        state={makeState({ activityId: 'compare', round })}
        reduceMotion={false}
        onAnswer={vi.fn(() => true)}
      />,
    );
    const groups = container.querySelectorAll('[data-compare-group]');
    expect(groups).toHaveLength(2);
    expect(container.querySelector('[data-compare-group][data-value="2"]')).toBeTruthy();
    expect(container.querySelector('[data-compare-group][data-value="5"]')).toBeTruthy();
  });

  it('answers with the tapped group size', async () => {
    const onAnswer = vi.fn(() => true);
    const { container } = render(
      <CompareActivity
        state={makeState({ activityId: 'compare', round })}
        reduceMotion={false}
        onAnswer={onAnswer}
      />,
    );
    await userEvent.click(
      container.querySelector('[data-compare-group][data-value="5"]') as HTMLElement,
    );
    expect(onAnswer).toHaveBeenCalledWith({ kind: 'tile', value: 5 });
  });
});
