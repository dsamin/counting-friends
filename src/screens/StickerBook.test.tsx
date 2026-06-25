import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import StickerBook from './StickerBook';
import {
  allCollectibleKeys,
  defaultUnlocks,
  isCharacterUnlocked,
} from '../game/content';
import { getCharacter } from '../game/characters';

// Base friends (duck/cat/frog/bunny) unlocked; dog/owl/pig + shapes pack locked.
const unlocks = defaultUnlocks();

describe('StickerBook', () => {
  it('renders a tile for every collectible key', () => {
    render(
      <StickerBook
        unlocks={unlocks}
        stars={9}
        streakBest={5}
        onBack={() => {}}
      />,
    );
    const tiles = screen.getAllByTestId(/^sticker-tile-/);
    expect(tiles).toHaveLength(allCollectibleKeys().length);
  });

  it('shows unlocked stickers with the friend name and locked ones labelled locked', () => {
    render(
      <StickerBook
        unlocks={unlocks}
        stars={9}
        streakBest={5}
        onBack={() => {}}
      />,
    );
    // Unlocked: duck → labelled with the friend name, not "locked".
    const duckTile = screen.getByTestId('sticker-tile-duck');
    expect(within(duckTile).getByText(getCharacter('duck').name)).toBeInTheDocument();
    expect(isCharacterUnlocked(unlocks, 'duck')).toBe(true);

    // Locked: dog → has a "locked" accessible label.
    expect(isCharacterUnlocked(unlocks, 'dog')).toBe(false);
    const dogTile = screen.getByTestId('sticker-tile-dog');
    expect(dogTile).toHaveAttribute('aria-label', expect.stringMatching(/locked/i));
  });

  it('shows the star total and best-streak badge', () => {
    render(
      <StickerBook
        unlocks={unlocks}
        stars={42}
        streakBest={8}
        onBack={() => {}}
      />,
    );
    expect(screen.getByTestId('star-jar')).toHaveTextContent('42');
    expect(screen.getByText(/best streak/i)).toHaveTextContent('8');
  });

  it('calls onBack when the back button is pressed', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(
      <StickerBook
        unlocks={unlocks}
        stars={0}
        streakBest={0}
        onBack={onBack}
      />,
    );
    await user.click(screen.getByRole('button', { name: /back home/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onTapSticker with the key when an unlocked sticker is tapped', async () => {
    const onTapSticker = vi.fn();
    const user = userEvent.setup();
    render(
      <StickerBook
        unlocks={unlocks}
        stars={0}
        streakBest={0}
        onBack={() => {}}
        onTapSticker={onTapSticker}
      />,
    );
    await user.click(screen.getByTestId('sticker-tile-cat'));
    expect(onTapSticker).toHaveBeenCalledTimes(1);
    expect(onTapSticker).toHaveBeenCalledWith('cat');
  });

  it('does not call onTapSticker for a locked sticker', async () => {
    const onTapSticker = vi.fn();
    const user = userEvent.setup();
    render(
      <StickerBook
        unlocks={unlocks}
        stars={0}
        streakBest={0}
        onBack={() => {}}
        onTapSticker={onTapSticker}
      />,
    );
    await user.click(screen.getByTestId('sticker-tile-dog'));
    expect(onTapSticker).not.toHaveBeenCalled();
  });
});
