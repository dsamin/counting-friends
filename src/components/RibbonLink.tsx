/**
 * A single connecting ribbon between a left group and its number in Match Up.
 * Drawn as a smooth horizontal S-curve in an SVG overlay. Coordinates are
 * relative to the overlay's top-left. `pairId` is exposed for tests (§14.1).
 */
interface RibbonLinkProps {
  pairId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export default function RibbonLink({ pairId, x1, y1, x2, y2 }: RibbonLinkProps) {
  const midX = (x1 + x2) / 2;
  const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
  return (
    <path
      data-linked-pair={pairId}
      d={d}
      fill="none"
      stroke="var(--cf-frog)"
      strokeWidth={9}
      strokeLinecap="round"
    />
  );
}
