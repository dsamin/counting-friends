/**
 * CharacterDefs — the four friend SVG `<symbol>` definitions, mounted once at
 * the app root so `<use href="#duck|#cat|#frog|#bunny">` resolves anywhere.
 *
 * Paths are ported verbatim from the prototype (Counting Friends.dc.html). The
 * character art is fully inlined per symbol — never nest `<use href="#other">`
 * inside a `<symbol>`, which fails to render reliably.
 */
export default function CharacterDefs() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: 'absolute', overflow: 'hidden' }}
      aria-hidden="true"
    >
      <defs>
        <symbol id="cat" viewBox="0 0 100 100">
          <g
            fill="none"
            stroke="#5A4633"
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <path d="M27 40 L20 12 L47 31 Z" fill="#FF8A7A" />
            <path d="M73 40 L80 12 L53 31 Z" fill="#FF8A7A" />
            <path d="M31 36 L27 20 L41 31 Z" fill="#FFD2C7" stroke="none" />
            <path d="M69 36 L73 20 L59 31 Z" fill="#FFD2C7" stroke="none" />
            <circle cx="50" cy="58" r="32" fill="#FF8A7A" />
            <circle cx="39" cy="55" r="4.6" fill="#5A4633" stroke="none" />
            <circle cx="61" cy="55" r="4.6" fill="#5A4633" stroke="none" />
            <path d="M47 62 L53 62 L50 66 Z" fill="#5A4633" stroke="none" />
            <path d="M44 68 Q50 73 56 68" />
            <circle
              cx="33"
              cy="64"
              r="5.5"
              fill="#FF6F5C"
              stroke="none"
              opacity="0.6"
            />
            <circle
              cx="67"
              cy="64"
              r="5.5"
              fill="#FF6F5C"
              stroke="none"
              opacity="0.6"
            />
            <path d="M13 57 L27 60 M13 65 L27 64" strokeWidth="3" />
            <path d="M87 57 L73 60 M87 65 L73 64" strokeWidth="3" />
          </g>
        </symbol>
        <symbol id="duck" viewBox="0 0 100 100">
          <g
            stroke="#5A4633"
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <ellipse cx="45" cy="65" rx="31" ry="24" fill="#FFC94D" />
            <path d="M33 58 Q51 55 58 71 Q44 78 30 71 Z" fill="#F4B73A" />
            <circle cx="65" cy="38" r="17" fill="#FFC94D" />
            <path d="M79 33 Q93 35 93 40 Q93 46 79 45 Z" fill="#F0883C" />
            <circle cx="67" cy="35" r="3.6" fill="#5A4633" stroke="none" />
            <circle
              cx="58"
              cy="46"
              r="4.5"
              fill="#FF9E7E"
              stroke="none"
              opacity="0.65"
            />
          </g>
        </symbol>
        <symbol id="frog" viewBox="0 0 100 100">
          <g
            stroke="#5A4633"
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <ellipse cx="50" cy="63" rx="33" ry="25" fill="#9FD9A3" />
            <circle cx="34" cy="31" r="13" fill="#9FD9A3" />
            <circle cx="66" cy="31" r="13" fill="#9FD9A3" />
            <circle cx="34" cy="32" r="5.6" fill="#5A4633" stroke="none" />
            <circle cx="66" cy="32" r="5.6" fill="#5A4633" stroke="none" />
            <circle cx="36" cy="30" r="1.9" fill="#fff" stroke="none" />
            <circle cx="68" cy="30" r="1.9" fill="#fff" stroke="none" />
            <path d="M31 61 Q50 80 69 61" fill="none" strokeWidth="4" />
            <circle cx="45" cy="57" r="1.8" fill="#5A4633" stroke="none" />
            <circle cx="55" cy="57" r="1.8" fill="#5A4633" stroke="none" />
            <circle
              cx="27"
              cy="66"
              r="5"
              fill="#FF8A7A"
              stroke="none"
              opacity="0.55"
            />
            <circle
              cx="73"
              cy="66"
              r="5"
              fill="#FF8A7A"
              stroke="none"
              opacity="0.55"
            />
          </g>
        </symbol>
        <symbol id="bunny" viewBox="0 0 100 100">
          <g
            stroke="#5A4633"
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <ellipse
              cx="39"
              cy="27"
              rx="8.5"
              ry="23"
              fill="#A8D8E8"
              transform="rotate(-13 39 27)"
            />
            <ellipse
              cx="61"
              cy="27"
              rx="8.5"
              ry="23"
              fill="#A8D8E8"
              transform="rotate(13 61 27)"
            />
            <ellipse
              cx="39"
              cy="29"
              rx="3.6"
              ry="14"
              fill="#FFD2C7"
              stroke="none"
              transform="rotate(-13 39 29)"
            />
            <ellipse
              cx="61"
              cy="29"
              rx="3.6"
              ry="14"
              fill="#FFD2C7"
              stroke="none"
              transform="rotate(13 61 29)"
            />
            <circle cx="50" cy="61" r="29" fill="#A8D8E8" />
            <circle cx="40" cy="58" r="4.3" fill="#5A4633" stroke="none" />
            <circle cx="60" cy="58" r="4.3" fill="#5A4633" stroke="none" />
            <path d="M46 65 L54 65 L50 69 Z" fill="#FF8A7A" stroke="none" />
            <path
              d="M50 69 Q46 73 42 71 M50 69 Q54 73 58 71"
              strokeWidth="3"
              fill="none"
            />
            <circle
              cx="32"
              cy="66"
              r="5"
              fill="#FF8A7A"
              stroke="none"
              opacity="0.5"
            />
            <circle
              cx="68"
              cy="66"
              r="5"
              fill="#FF8A7A"
              stroke="none"
              opacity="0.5"
            />
          </g>
        </symbol>
      </defs>
    </svg>
  );
}
