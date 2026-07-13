import { isExitLocked } from './engine';
import { spriteImage, type SpriteId } from './sprites';
import type { Direction, GameState, GuardState, ParsedFloor, Position } from './types';
import { visionTiles } from './vision';

type BoardLayout = {
  readonly tileSize: number;
  readonly offsetX: number;
  readonly offsetY: number;
};

type CameraPosition = {
  x: number;
  y: number;
};

type RenderOptions = {
  readonly previousState?: GameState;
  readonly progress?: number;
  readonly snapCamera?: boolean;
};

const CAMERA_POSITIONS = new WeakMap<HTMLCanvasElement, CameraPosition>();

const DIRECTION_ANGLE: Readonly<Record<Direction, number>> = {
  up: -Math.PI / 2,
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
};

function prepareCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const targetWidth = Math.round(width * pixelRatio);
  const targetHeight = Math.round(height * pixelRatio);

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  const context = canvas.getContext('2d');
  if (!context) return null;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.imageSmoothingEnabled = true;
  return context;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function boardLayout(canvas: HTMLCanvasElement, floor: ParsedFloor, focus: Position, snapCamera = false, persistCamera = true): BoardLayout {
  const padding = 12;
  const visibleColumns = canvas.clientWidth < 600 ? 11 : 17;
  const visibleRows = canvas.clientWidth < 600 ? 11 : 13;
  const tileSize = Math.max(28, Math.floor(Math.min((canvas.clientWidth - padding * 2) / visibleColumns, (canvas.clientHeight - padding * 2) / visibleRows)));
  const worldWidth = floor.width * tileSize;
  const worldHeight = floor.height * tileSize;
  const targetX = worldWidth <= canvas.clientWidth - padding * 2 ? Math.round((canvas.clientWidth - worldWidth) / 2) : clamp(canvas.clientWidth / 2 - (focus.column + 0.5) * tileSize, canvas.clientWidth - worldWidth - padding, padding);
  const targetY = worldHeight <= canvas.clientHeight - padding * 2 ? Math.round((canvas.clientHeight - worldHeight) / 2) : clamp(canvas.clientHeight / 2 - (focus.row + 0.5) * tileSize, canvas.clientHeight - worldHeight - padding, padding);
  const storedCamera = CAMERA_POSITIONS.get(canvas);
  const camera = storedCamera ? { ...storedCamera } : { x: targetX, y: targetY };

  if (snapCamera) {
    camera.x = targetX;
    camera.y = targetY;
  } else if (persistCamera) {
    camera.x += (targetX - camera.x) * 0.22;
    camera.y += (targetY - camera.y) * 0.22;
  }
  if (persistCamera) CAMERA_POSITIONS.set(canvas, camera);

  return {
    tileSize,
    offsetX: camera.x,
    offsetY: camera.y,
  };
}

function tileOrigin(layout: BoardLayout, position: Position): { readonly x: number; readonly y: number } {
  return {
    x: layout.offsetX + position.column * layout.tileSize,
    y: layout.offsetY + position.row * layout.tileSize,
  };
}

function tileCenter(layout: BoardLayout, position: Position): { readonly x: number; readonly y: number } {
  const origin = tileOrigin(layout, position);
  return {
    x: origin.x + layout.tileSize / 2,
    y: origin.y + layout.tileSize / 2,
  };
}

function interpolatePosition(previous: Position, current: Position, progress: number): Position {
  const distance = Math.abs(current.row - previous.row) + Math.abs(current.column - previous.column);
  if (distance > 1) return current;
  const eased = 1 - (1 - clamp(progress, 0, 1)) ** 3;
  return {
    row: previous.row + (current.row - previous.row) * eased,
    column: previous.column + (current.column - previous.column) * eased,
  };
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawSprite(context: CanvasRenderingContext2D, spriteId: SpriteId, center: { readonly x: number; readonly y: number }, size: number): boolean {
  const image = spriteImage(spriteId);
  if (!image) return false;
  context.drawImage(image, center.x - size / 2, center.y - size / 2, size, size);
  return true;
}

function drawWall(context: CanvasRenderingContext2D, origin: { readonly x: number; readonly y: number }, tileSize: number): void {
  const inset = Math.max(1, tileSize * 0.035);
  roundedRect(context, origin.x + inset, origin.y + inset, tileSize - inset * 2, tileSize - inset * 2, Math.max(2, tileSize * 0.09));
  context.fillStyle = '#192638';
  context.fill();
  context.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  context.lineWidth = 1;
  context.stroke();

  context.strokeStyle = 'rgba(56, 189, 248, 0.05)';
  context.beginPath();
  context.moveTo(origin.x + tileSize * 0.18, origin.y + tileSize * 0.25);
  context.lineTo(origin.x + tileSize * 0.82, origin.y + tileSize * 0.25);
  context.stroke();
}

function drawObjective(context: CanvasRenderingContext2D, center: { readonly x: number; readonly y: number }, tileSize: number): void {
  if (drawSprite(context, 'objective', center, tileSize * 1.18)) return;
  const width = tileSize * 0.52;
  const height = tileSize * 0.38;
  context.save();
  context.shadowColor = '#fbbf24';
  context.shadowBlur = 16;
  roundedRect(context, center.x - width / 2, center.y - height / 2, width, height, tileSize * 0.08);
  context.fillStyle = '#d99a10';
  context.fill();
  context.strokeStyle = '#fde68a';
  context.lineWidth = Math.max(1.5, tileSize * 0.035);
  context.stroke();
  context.shadowBlur = 0;
  context.strokeStyle = '#5b410c';
  context.beginPath();
  context.roundRect(center.x - width * 0.2, center.y - height * 0.72, width * 0.4, height * 0.36, tileSize * 0.05);
  context.stroke();
  context.fillStyle = '#fff7c2';
  context.fillRect(center.x - width * 0.18, center.y - 1, width * 0.36, 2);
  context.restore();
}

function drawExit(context: CanvasRenderingContext2D, center: { readonly x: number; readonly y: number }, tileSize: number, locked: boolean): void {
  if (drawSprite(context, locked ? 'exit-locked' : 'exit-open', center, tileSize * 1.08)) return;
  const width = tileSize * 0.66;
  const height = tileSize * 0.76;
  context.save();
  roundedRect(context, center.x - width / 2, center.y - height / 2, width, height, tileSize * 0.06);
  context.fillStyle = locked ? '#253044' : '#153f2b';
  context.fill();
  context.strokeStyle = locked ? '#64748b' : '#4ade80';
  context.lineWidth = Math.max(2, tileSize * 0.055);
  context.stroke();
  context.beginPath();
  context.moveTo(center.x, center.y - height / 2);
  context.lineTo(center.x, center.y + height / 2);
  context.stroke();
  context.fillStyle = locked ? '#94a3b8' : '#86efac';
  context.fillRect(center.x + width * 0.28, center.y - height * 0.1, Math.max(2, tileSize * 0.04), height * 0.2);
  context.restore();
}

function drawHidingSpot(context: CanvasRenderingContext2D, center: { readonly x: number; readonly y: number }, tileSize: number): void {
  if (drawSprite(context, 'hiding', center, tileSize * 1.14)) return;
  const width = tileSize * 0.58;
  const height = tileSize * 0.72;
  context.save();
  roundedRect(context, center.x - width / 2, center.y - height / 2, width, height, tileSize * 0.07);
  context.fillStyle = '#123449';
  context.fill();
  context.strokeStyle = '#38bdf8';
  context.lineWidth = Math.max(1.5, tileSize * 0.04);
  context.stroke();
  context.strokeStyle = 'rgba(125, 211, 252, 0.45)';
  context.beginPath();
  context.moveTo(center.x, center.y - height * 0.42);
  context.lineTo(center.x, center.y + height * 0.42);
  context.stroke();
  context.fillStyle = '#7dd3fc';
  context.beginPath();
  context.arc(center.x + width * 0.12, center.y, Math.max(1.5, tileSize * 0.025), 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawKeycard(context: CanvasRenderingContext2D, center: { readonly x: number; readonly y: number }, tileSize: number): void {
  drawSprite(context, 'keycard', center, tileSize * 1.12);
}

function drawDoor(context: CanvasRenderingContext2D, center: { readonly x: number; readonly y: number }, tileSize: number, open: boolean): void {
  drawSprite(context, open ? 'door-open' : 'door-locked', center, tileSize * 1.08);
}

function drawVent(context: CanvasRenderingContext2D, center: { readonly x: number; readonly y: number }, tileSize: number): void {
  drawSprite(context, 'vent', center, tileSize * 1.08);
}

function drawPlayer(context: CanvasRenderingContext2D, state: GameState, center: { readonly x: number; readonly y: number }, tileSize: number): void {
  const direction = state.player.direction;
  context.save();
  if (state.player.isHidden) {
    context.strokeStyle = 'rgba(125, 211, 252, 0.72)';
    context.lineWidth = Math.max(1.5, tileSize * 0.035);
    context.setLineDash([tileSize * 0.09, tileSize * 0.07]);
    context.beginPath();
    context.arc(center.x, center.y, tileSize * 0.39, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
  }
  if (drawSprite(context, `player-${direction}`, center, tileSize * 1.14)) {
    context.restore();
    return;
  }
  context.restore();
  const radius = tileSize * 0.25;
  context.save();
  context.translate(center.x, center.y);
  context.shadowColor = '#38bdf8';
  context.shadowBlur = state.player.isHidden ? 20 : 10;
  context.fillStyle = '#102b3d';
  context.strokeStyle = '#38bdf8';
  context.lineWidth = Math.max(2, tileSize * 0.045);
  context.beginPath();
  context.arc(0, tileSize * 0.05, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.fillStyle = '#dff7ff';
  context.beginPath();
  context.arc(0, -radius * 0.48, radius * 0.48, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#38bdf8';
  roundedRect(context, -radius * 0.4, -radius * 0.56, radius * 0.8, radius * 0.26, radius * 0.1);
  context.fill();
  context.strokeStyle = '#7dd3fc';
  context.lineWidth = Math.max(1, tileSize * 0.025);
  context.beginPath();
  context.moveTo(-radius * 0.65, radius * 0.25);
  context.lineTo(radius * 0.65, radius * 0.25);
  context.stroke();
  context.restore();
}

function drawGuard(context: CanvasRenderingContext2D, guard: GuardState, center: { readonly x: number; readonly y: number }, tileSize: number): void {
  const radius = tileSize * 0.24;
  const alertColor = guard.mode === 'routine' ? '#fb7185' : guard.mode === 'investigate' ? '#fbbf24' : guard.mode === 'search' ? '#a78bfa' : '#60a5fa';
  const bodyColor = guard.mode === 'routine' ? '#321923' : guard.mode === 'investigate' ? '#3d2d12' : guard.mode === 'search' ? '#2f2145' : '#172d49';
  context.save();
  if (guard.mode !== 'routine' || guard.behavior === 'sentry') {
    context.strokeStyle = alertColor;
    context.lineWidth = Math.max(1.5, tileSize * 0.035);
    context.setLineDash(guard.behavior === 'sentry' ? [tileSize * 0.08, tileSize * 0.07] : []);
    context.beginPath();
    context.arc(center.x, center.y, tileSize * 0.39, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
  }
  if (drawSprite(context, `guard-${guard.direction}`, center, tileSize * 1.14)) {
    context.restore();
    return;
  }
  context.translate(center.x, center.y);
  context.rotate(DIRECTION_ANGLE[guard.direction]);
  context.shadowColor = alertColor;
  context.shadowBlur = 10;
  context.fillStyle = bodyColor;
  context.strokeStyle = alertColor;
  context.lineWidth = Math.max(2, tileSize * 0.04);
  roundedRect(context, -radius, -radius * 0.78, radius * 1.75, radius * 1.56, radius * 0.35);
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.fillStyle = '#f0c7b4';
  context.beginPath();
  context.arc(radius * 0.28, 0, radius * 0.43, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = alertColor;
  context.fillRect(radius * 0.48, -radius * 0.12, radius * 0.48, radius * 0.24);
  context.restore();
}

function drawNoise(context: CanvasRenderingContext2D, state: GameState, layout: BoardLayout): void {
  if (!state.noise) return;
  const center = tileCenter(layout, state.noise.position);
  const remaining = Math.max(0, state.noise.expiresAtTick - state.tick);
  const radius = layout.tileSize * (state.noise.radius + 0.35) * (1 - remaining * 0.08);
  context.save();
  context.strokeStyle = 'rgba(251, 191, 36, 0.42)';
  context.lineWidth = Math.max(1.5, layout.tileSize * 0.035);
  context.setLineDash([layout.tileSize * 0.16, layout.tileSize * 0.11]);
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);
  context.restore();
}

function drawMinimap(context: CanvasRenderingContext2D, state: GameState, canvasWidth: number): void {
  const width = canvasWidth < 600 ? 104 : 142;
  const tileSize = Math.min(width / state.floor.width, 7);
  const mapWidth = state.floor.width * tileSize;
  const mapHeight = state.floor.height * tileSize;
  const x = canvasWidth - mapWidth - 14;
  const y = 14;

  context.save();
  context.fillStyle = 'rgba(4, 8, 14, 0.86)';
  roundedRect(context, x - 7, y - 7, mapWidth + 14, mapHeight + 14, 8);
  context.fill();
  context.strokeStyle = 'rgba(148, 163, 184, 0.28)';
  context.stroke();

  for (let row = 0; row < state.floor.height; row += 1) {
    for (let column = 0; column < state.floor.width; column += 1) {
      const tile = state.floor.tiles[row][column];
      context.fillStyle = tile.type === 'wall' || (tile.type === 'door' && !state.player.hasKeycard) ? '#405068' : '#111d2b';
      context.fillRect(x + column * tileSize, y + row * tileSize, Math.ceil(tileSize), Math.ceil(tileSize));
    }
  }

  const objective = state.floor.tiles.flatMap((row, rowIndex) => row.map((tile, columnIndex) => ({ tile, row: rowIndex, column: columnIndex }))).find(({ tile }) => tile.type === 'objective');
  if (objective && !state.player.hasObjective) {
    context.fillStyle = '#fbbf24';
    context.fillRect(x + objective.column * tileSize, y + objective.row * tileSize, Math.max(2, tileSize), Math.max(2, tileSize));
  }
  context.fillStyle = '#38bdf8';
  context.beginPath();
  context.arc(x + (state.player.position.column + 0.5) * tileSize, y + (state.player.position.row + 0.5) * tileSize, Math.max(2, tileSize * 0.65), 0, Math.PI * 2);
  context.fill();
  context.restore();
}

export function directionForCanvasTap(canvas: HTMLCanvasElement, state: GameState, clientX: number, clientY: number): Direction | null {
  const bounds = canvas.getBoundingClientRect();
  const layout = boardLayout(canvas, state.floor, state.player.position, false, false);
  const player = tileCenter(layout, state.player.position);
  const deltaX = clientX - bounds.left - player.x;
  const deltaY = clientY - bounds.top - player.y;
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < layout.tileSize * 0.45) return null;
  if (Math.abs(deltaX) > Math.abs(deltaY)) return deltaX > 0 ? 'right' : 'left';
  return deltaY > 0 ? 'down' : 'up';
}

export function renderGame(canvas: HTMLCanvasElement, state: GameState, options: RenderOptions = {}): void {
  const context = prepareCanvas(canvas);
  if (!context) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const previousState = options.previousState ?? state;
  const progress = options.progress ?? 1;
  const playerPosition = interpolatePosition(previousState.player.position, state.player.position, progress);
  const layout = boardLayout(canvas, state.floor, playerPosition, options.snapCamera);
  const visible = new Set(state.guards.flatMap((guard) => visionTiles(state, guard)).map((position) => `${position.row}:${position.column}`));
  const startColumn = Math.max(0, Math.floor(-layout.offsetX / layout.tileSize) - 1);
  const endColumn = Math.min(state.floor.width - 1, Math.ceil((width - layout.offsetX) / layout.tileSize) + 1);
  const startRow = Math.max(0, Math.floor(-layout.offsetY / layout.tileSize) - 1);
  const endRow = Math.min(state.floor.height - 1, Math.ceil((height - layout.offsetY) / layout.tileSize) + 1);

  context.clearRect(0, 0, width, height);
  context.fillStyle = '#050910';
  context.fillRect(0, 0, width, height);

  for (let row = startRow; row <= endRow; row += 1) {
    for (let column = startColumn; column <= endColumn; column += 1) {
      const position = { row, column };
      const tile = state.floor.tiles[row][column];
      const origin = tileOrigin(layout, position);
      if (tile.type === 'wall') {
        drawWall(context, origin, layout.tileSize);
        continue;
      }

      const inset = Math.max(1, layout.tileSize * 0.035);
      roundedRect(context, origin.x + inset, origin.y + inset, layout.tileSize - inset * 2, layout.tileSize - inset * 2, Math.max(2, layout.tileSize * 0.09));
      context.fillStyle = visible.has(`${row}:${column}`) ? 'rgba(255, 59, 79, 0.19)' : '#0c1522';
      context.fill();
      context.strokeStyle = 'rgba(148, 163, 184, 0.045)';
      context.stroke();

      const center = tileCenter(layout, position);
      if (tile.type === 'hiding') drawHidingSpot(context, center, layout.tileSize);
      if (tile.type === 'objective' && !state.player.hasObjective) drawObjective(context, center, layout.tileSize);
      if (tile.type === 'keycard' && !state.player.hasKeycard) drawKeycard(context, center, layout.tileSize);
      if (tile.type === 'door') drawDoor(context, center, layout.tileSize, state.player.hasKeycard);
      if (tile.type === 'vent') drawVent(context, center, layout.tileSize);
      if (tile.type === 'exit') drawExit(context, center, layout.tileSize, isExitLocked(state, position));
    }
  }

  for (const guard of state.guards) {
    const previousGuard = previousState.guards.find((candidate) => candidate.id === guard.id);
    const position = previousGuard ? interpolatePosition(previousGuard.position, guard.position, progress) : guard.position;
    drawGuard(context, guard, tileCenter(layout, position), layout.tileSize);
  }
  drawNoise(context, state, layout);
  drawPlayer(context, state, tileCenter(layout, playerPosition), layout.tileSize);
  drawMinimap(context, state, width);
}
