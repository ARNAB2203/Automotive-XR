export function Car({
  paint = "#52635a",
  sport = false,
}: {
  paint?: string;
  sport?: boolean;
}) {
  return (
    <svg
      className="car-svg"
      viewBox="0 0 760 360"
      role="img"
      aria-label="Schematic concept vehicle placeholder, not Unreal rendering"
    >
      <defs>
        <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor={paint} />
          <stop offset="1" stopColor="#202b26" />
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#90a59a" />
          <stop offset="1" stopColor="#24332c" />
        </linearGradient>
      </defs>
      <ellipse
        cx="389"
        cy="290"
        rx="290"
        ry="20"
        fill="#26352b"
        opacity=".12"
      />
      <path
        d="M101 215L143 188L247 174L321 112Q338 99 366 100L463 106L546 170L637 193L673 220L663 261L106 263Z"
        fill="url(#body)"
        stroke="#26362b"
        strokeWidth="2"
      />
      <path d="M267 172L330 119L374 115L370 173Z" fill="url(#glass)" />
      <path d="M384 116L456 120L520 172L386 173Z" fill="url(#glass)" />
      <path
        d="M110 223L252 199L551 196L657 220"
        fill="none"
        stroke="#d1dfcd"
        opacity=".45"
      />
      <path
        d="M268 190L269 246M382 183L384 245M534 184L544 242"
        stroke="#23312a"
        fill="none"
      />
      <path
        d="M395 191L426 191"
        stroke="#b7c8b8"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M115 216L171 207L159 219L111 230" fill="#eef4d3" />
      <path d="M627 203L655 216L657 228L627 220" fill="#bb634c" />
      <path d="M294 247L505 247" stroke="#19251e" strokeWidth="9" />
      <g>
        {[227, 568].map((x) => (
          <g key={x}>
            <circle cx={x} cy="253" r="47" fill="#17201b" />
            <circle
              cx={x}
              cy="253"
              r="32"
              fill={sport ? "#b8bdb0" : "#929e92"}
              stroke="#354139"
              strokeWidth="4"
            />
            {[0, 60, 120].map((angle) => (
              <path
                key={angle}
                d={`M${x - 23} 253H${x + 23}`}
                stroke="#344238"
                strokeWidth={sport ? 5 : 12}
                transform={`rotate(${angle} ${x} 253)`}
              />
            ))}
            <circle cx={x} cy="253" r="8" fill="#2e3b31" />
          </g>
        ))}
      </g>
    </svg>
  );
}
