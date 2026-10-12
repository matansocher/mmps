import { CHAPTER_IDS } from '../../../../src/shared/rewind';

export function JourneyArt({ restored }: { readonly restored: readonly number[] }) {
  const garden = restored.includes(1) || restored.includes(4);
  const water = restored.includes(6);
  const light = restored.includes(10);
  return (
    <svg
      className={`journey-art ${light ? 'awakened' : ''}`}
      viewBox="0 0 600 210"
      role="img"
      aria-label={light ? 'The observatory shines over the restored valley' : `A path winds toward the dark observatory. ${restored.length} places restored.`}
    >
      <path d="M0 154Q85 71 177 118T359 101T600 96V210H0Z" fill="#c9d4c4" />
      <path d="M0 181Q139 108 252 165T464 143T600 150V210H0Z" fill="#b3c4af" />
      <path d="M299 210C183 176 196 157 317 146S488 127 476 98" fill="none" stroke="#eee9ce" strokeWidth="16" />
      <path d="M299 210C183 176 196 157 317 146S488 127 476 98" fill="none" stroke="#9da583" strokeWidth="2" strokeDasharray="2 11" />
      {water && <path className="valley-water" d="M0 187Q87 155 193 192T380 194" stroke="#719e9b" fill="none" strokeWidth="9" />}
      <g className="observatory">
        <path d="M436 105V53H510V105Z" fill="#9b9e80" stroke="#6d7f68" strokeWidth="2" />
        <path d="M429 53a44 44 0 0188 0Z" fill={light ? '#af9552' : '#829b86'} stroke="#647b68" strokeWidth="2" />
        <path d="M473 9V53M448 17Q433 40 442 53M498 17Q513 40 504 53" stroke="#647b68" strokeWidth="2" fill="none" />
        <path d="M460 105V79a13 13 0 0126 0v26" fill={light ? '#f5dc8c' : '#526e5d'} />
        <path d="M450 60h8m30 0h8M438 100h13m44 0h13" stroke="#c5c8a5" strokeWidth="3" />
        {light && <path className="observatory-light" d="M459 83L107 154L95 129Z" fill="#f3df9c" opacity=".5" />}
      </g>
      {[
        { x: 108, y: 153 },
        { x: 361, y: 157 },
        { x: 543, y: 124 },
      ].map(({ x, y }) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <path d="M0 0v-27" stroke="#7b7853" strokeWidth="4" />
          <path d="M0-51l-19 25h38Z" fill={garden ? '#6d8d64' : '#96a88d'} />
          <path d="M0-35l-23 27h46Z" fill={garden ? '#789870' : '#a1b098'} />
          {garden && <path d="M-22 4v-9m-4 3h8M19 6v-9m-4 3h8" stroke="#b9934b" strokeWidth="3" />}
        </g>
      ))}
      {CHAPTER_IDS.map((id, index) => (
        <circle key={id} cx={195 + index * 21} cy={185 - Math.sin(index / 2) * 8} r="4" fill={restored.includes(id) ? '#886e36' : '#cdd4b8'} />
      ))}
    </svg>
  );
}
