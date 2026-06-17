/**
 * CharacterSprite — renders one friend by referencing a `<symbol>` defined in
 * `CharacterDefs`. Decorative by default (the count is conveyed visually and by
 * voice), so it carries `aria-hidden` unless a label is supplied.
 */
interface CharacterSpriteProps {
  /** Symbol reference, e.g. "#duck". */
  href: string;
  /** Rendered width/height in px. */
  size: number;
}

export default function CharacterSprite({ href, size }: CharacterSpriteProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ overflow: 'visible' }}
      aria-hidden="true"
    >
      <use href={href} />
    </svg>
  );
}
