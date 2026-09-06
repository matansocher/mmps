import { useId } from 'react';
import type { Delivery, Switches, Train } from './engine';
import { edgePath, edgePosition } from './geometry';
import { COLORS, type Level, type RailNode } from './model';

type BoardProps = {
  readonly level: Level;
  readonly switches: Switches;
  readonly trains?: readonly Train[];
  readonly deliveries?: readonly Delivery[];
  readonly onSwitch?: (id: string) => void;
  readonly disabled?: boolean;
  readonly preview?: boolean;
};

export function TrainArt({ color, angle = 0 }: { readonly color: number; readonly angle?: number }) {
  const paint = COLORS[color];
  return (
    <g>
      <g transform={`scale(1 ${Math.cos((angle * Math.PI) / 180) < 0 ? -1 : 1})`} stroke="#f6f8dc" strokeWidth="1.8" strokeLinejoin="round">
        <path d="M-24 -8 H-13 V8 H-24 Z M-12 0 H-8" fill={paint.hex} />
        <path d="M-8 -10 H6 V-5 H18 L24 5 V9 H-8 Z" fill={paint.hex} />
        <path d="M-5 -7 H3 V-1 H-5 Z" fill="#dcf2e9" stroke="none" />
        <path d="M13 -5 V-11 H18 V-5" fill={paint.hex} />
        <path d="M21 6 H26 L24 10 H18" fill={paint.hex} />
        <g fill="#183e2c" strokeWidth="1.2">
          <circle cx="-20" cy="10" r="3" />
          <circle cx="-2" cy="10" r="3" />
          <circle cx="14" cy="10" r="3" />
        </g>
      </g>
      <text transform={`translate(-18.5 0) rotate(${-angle})`} y="4" textAnchor="middle" fill={paint.ink} stroke="none" fontSize="11" fontWeight="900">
        {color + 1}
      </text>
    </g>
  );
}

function StationArt({ node }: { readonly node: RailNode }) {
  const color = node.color!;
  const paint = COLORS[color];
  return (
    <g transform={`translate(${node.x} ${node.y})`} stroke="#f1f5dc" strokeWidth="2.5" strokeLinejoin="round">
      <ellipse cx="3" cy="20" rx="28" ry="7" fill="#0c332d" opacity=".25" stroke="none" />
      <path d="M-23 18 V-15 L-10 -23 H17 L25 -15 V18 Z" fill={paint.hex} />
      <path d="M-23 -8 H25 M-23 -15 H25" fill="none" strokeOpacity=".5" />
      <path d="M-17 -18 V-31 M-17 -30 L-5 -27 L-17 -24" fill={paint.hex} />
      <path d="M-16 18 V3 H-6 V18 M10 0 H18 V8 H10 Z" fill="#153f31" strokeOpacity=".65" />
      <path d="M20 -17 V-31 M20 -30 L31 -26 L20 -23" fill={paint.hex} />
      <circle cx="0" cy="-11" r="10" fill={paint.hex} stroke="none" />
      <text x="0" y="-7" textAnchor="middle" fill={paint.ink} stroke="none" fontSize="14" fontWeight="900">
        {color + 1}
      </text>
      <path d="M-21 20 H23" stroke="#163f2c" strokeWidth="3" />
    </g>
  );
}

function Pine({ x, y, scale = 1 }: { readonly x: number; readonly y: number; readonly scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M0 0 V22" stroke="#17412e" strokeWidth="3" />
      <path d="M0 -23 L-13 11 H13 Z" fill="#204e35" />
      <path d="M0 -23 V11 H13 Z" fill="#2f6040" />
    </g>
  );
}

export function RailBoard({ level, switches, trains = [], deliveries = [], onSwitch, disabled = false, preview = false }: BoardProps) {
  const id = useId().replaceAll(':', '');
  const { width, height } = level;
  const junctions = level.nodes.filter((node) => node.kind === 'switch');
  return (
    <div className="rail-board" style={{ aspectRatio: `${width} / ${height}` }} data-level={level.id}>
      <svg viewBox={`0 0 ${width} ${height}`} className="rail-map" role="img" aria-label={preview ? `${level.name} track layout` : 'Railway with colored stations and moving trains'}>
        <defs>
          <filter id={`${id}-paper`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency=".15" numOctaves="3" seed="8" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope=".12" />
            </feComponentTransfer>
            <feBlend in="SourceGraphic" mode="multiply" />
          </filter>
          <radialGradient id={`${id}-grass`}>
            <stop offset="0" stopColor="#3c8550" />
            <stop offset="1" stopColor="#28633e" />
          </radialGradient>
        </defs>
        <rect width={width} height={height} fill={`url(#${id}-grass)`} filter={`url(#${id}-paper)`} />
        <g aria-hidden="true">
          <path d={`M0 28 Q150 -5 ${width} 30 M0 ${height - 16} Q200 ${height - 52} ${width} ${height - 20}`} fill="none" stroke="#245939" strokeWidth="34" opacity=".25" />
          <Pine x={17} y={24} scale={0.7} />
          <Pine x={40} y={13} scale={0.9} />
          <Pine x={64} y={22} scale={0.6} />
          <Pine x={width - 18} y={height - 26} scale={0.85} />
          <Pine x={width - 43} y={height - 18} scale={0.7} />
          <Pine x={20} y={height - 40} scale={0.65} />
          <Pine x={40} y={height - 15} scale={0.9} />
          <Pine x={width - 17} y={32} scale={0.75} />
          <Pine x={width - 43} y={17} scale={0.65} />
        </g>
        <g fill="none" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
          {level.edges.map((edge) => (
            <g key={edge.id}>
              <path d={edgePath(edge)} stroke="#173e2b" strokeWidth="22" opacity=".3" />
              <path d={edgePath(edge)} stroke="#1a4631" strokeWidth="19" strokeDasharray="3 9" strokeLinecap="butt" />
              <path d={edgePath(edge)} stroke="#103b2a" strokeWidth="12" />
              <path d={edgePath(edge)} stroke="#478055" strokeWidth="6" />
              <path d={edgePath(edge)} stroke="#70936a" strokeWidth="1" opacity=".5" />
            </g>
          ))}
        </g>
        {junctions.map((node, index) => {
          const outgoing = level.edges.find((edge) => edge.id === node.outputs[switches[node.id] ?? 0])!;
          const incoming = level.edges.find((edge) => edge.to === node.id)!;
          const direction = edgePosition(outgoing, 26);
          return (
            <g key={node.id} aria-hidden="true">
              <defs>
                <clipPath id={`${id}-${node.id}`}>
                  <circle cx={node.x} cy={node.y} r="26" />
                </clipPath>
              </defs>
              <circle cx={node.x} cy={node.y + 2} r="28" fill="#16492f" />
              <circle cx={node.x} cy={node.y} r="24" fill="#6bc76b" stroke="#265e39" strokeWidth="3" />
              <g clipPath={`url(#${id}-${node.id})`} fill="none" strokeLinecap="round">
                <path d={edgePath(incoming)} stroke="#194b31" strokeWidth="11" />
                <path d={edgePath(outgoing)} stroke="#194b31" strokeWidth="11" />
                <path d={edgePath(incoming)} stroke="#91de81" strokeWidth="5" />
                <path d={edgePath(outgoing)} stroke="#91de81" strokeWidth="5" />
              </g>
              <path
                d="M-4 -5 L3 0 L-4 5"
                transform={`translate(${direction.x} ${direction.y}) rotate(${direction.angle})`}
                fill="none"
                stroke="#e5f8ad"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {!preview && (
                <text x={node.x + 20} y={node.y - 21} fill="#e0f0be" fontSize="10" fontWeight="800">
                  {index + 1}
                </text>
              )}
            </g>
          );
        })}
        {level.nodes
          .filter((node) => node.kind === 'station')
          .map((node) => (
            <g key={node.id} data-station={node.id} aria-label={`${COLORS[node.color!].id} station ${node.color! + 1}`}>
              <title>
                {COLORS[node.color!].id} station {node.color! + 1}
              </title>
              <StationArt node={node} />
            </g>
          ))}
        {trains.map((train) => {
          const edge = level.edges.find((item) => item.id === train.edgeId)!;
          const position = edgePosition(edge, train.distance);
          return (
            <g
              key={train.id}
              transform={`translate(${position.x} ${position.y}) rotate(${position.angle})`}
              data-train={train.id}
              data-color={train.color}
              data-edge={train.edgeId}
              data-distance={train.distance}
            >
              <title>
                {COLORS[train.color].id} train {train.color + 1}
              </title>
              <TrainArt color={train.color} angle={position.angle} />
            </g>
          );
        })}
        {level.nodes
          .filter((node) => node.kind === 'depot')
          .map((node) => (
            <g key={node.id} transform={`translate(${node.x} ${node.y})`} aria-label="Train depot">
              <title>Train depot</title>
              <path d="M-25 22 V-24 L0 -42 L27 -24 V22 Z" fill="#204b32" stroke="#3b774a" strokeWidth="3" />
              <path d="M-25 -24 L0 -42 L27 -24 L0 -29 Z" fill="#75bc74" />
              <path d="M-19 21 V-6 Q-19 -21 -4 -21 H5 V21" fill="#102d24" />
              <path d="M6 -20 H15 V21 H6 Z" fill="#32663e" />
              <text x="0" y="36" fill="#deebbf" textAnchor="middle" fontSize="10" fontWeight="800" letterSpacing="1.2">
                DEPOT
              </text>
            </g>
          ))}
        {deliveries.map((delivery) => {
          const station = level.nodes.find((node) => node.id === delivery.stationId)!;
          return (
            <g key={delivery.id} className="rail-arrival" transform={`translate(${station.x} ${station.y - 40})`}>
              <rect x="-25" y="-14" width="50" height="26" rx="13" fill={delivery.correct ? '#e0f5ad' : '#ffe4c5'} stroke="#244933" strokeWidth="2" />
              <text textAnchor="middle" y="4" fill="#23462e" fontSize="16" fontWeight="900">
                {delivery.correct ? '+1' : '×'}
              </text>
            </g>
          );
        })}
      </svg>
      {!preview &&
        junctions.map((node, index) => (
          <button
            key={node.id}
            className="rail-switch"
            style={{ left: `${(node.x / width) * 100}%`, top: `${(node.y / height) * 100}%` }}
            onClick={() => onSwitch?.(node.id)}
            disabled={disabled}
            aria-label={`Switch ${index + 1}, route ${(switches[node.id] ?? 0) + 1} of ${node.outputs.length}`}
            data-switch={node.id}
            data-route={switches[node.id] ?? 0}
            title={`Switch ${index + 1}: tap to change route`}
          />
        ))}
    </div>
  );
}
