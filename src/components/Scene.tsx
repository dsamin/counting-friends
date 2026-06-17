/**
 * Scene — the full-bleed storybook background (sky gradient, sun, cloud, soft
 * hills, ground). Reused on every screen so the world feels continuous.
 * Purely decorative.
 *
 * Ported from the prototype's scene SVG (Counting Friends.dc.html). The
 * `.cf-scene` class positions it inset:0 behind everything; the SVG paints the
 * sun/cloud/hills detail on top of the CSS gradient base.
 */
export default function Scene() {
  return (
    <div className="cf-scene" aria-hidden="true">
      <svg
        viewBox="0 0 1024 720"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <defs>
          <linearGradient id="cf-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#BBE5F1" />
            <stop offset="1" stopColor="#DDEFEC" />
          </linearGradient>
        </defs>
        <rect width="1024" height="720" fill="#FBF3DC" />
        <rect width="1024" height="470" fill="url(#cf-sky)" />
        <circle cx="146" cy="116" r="56" fill="#FFC94D" opacity="0.92" />
        <circle cx="146" cy="116" r="74" fill="#FFC94D" opacity="0.18" />
        <g fill="#FFFFFF" opacity="0.9">
          <ellipse cx="780" cy="110" rx="58" ry="29" />
          <ellipse cx="828" cy="126" rx="44" ry="25" />
          <ellipse cx="734" cy="126" rx="40" ry="23" />
        </g>
        <ellipse cx="230" cy="600" rx="380" ry="190" fill="#A6DCA0" />
        <ellipse cx="860" cy="620" rx="400" ry="200" fill="#B7E2AE" />
        <rect y="470" width="1024" height="250" fill="#C7E8B2" />
      </svg>
    </div>
  );
}
