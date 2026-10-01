import Phaser from 'phaser';
import { dayFor, INGREDIENT_COLORS, INGREDIENT_LABELS, RECIPES } from '../../../../src/features/hells-kitchen/game/content';
import { ARCADE_SECONDS, cookingSeconds, PREP_SECONDS, STEP_SECONDS, WAITER_SECONDS } from '../../../../src/features/hells-kitchen/game/engine';
import type { Command, Dish, Ingredient, Order, Run } from '../../../../src/features/hells-kitchen/game/types';
import { ArtBuilder, COOKWARE, type Cookware, cookwareFor } from './art';
import { cookwareName, diningTasks, type Guide, neededIngredients, nextStep, passOrders, stationFull, ticketsFor } from './guide';
import {
  BOWL_Y,
  bowlRect,
  bowlX,
  bubbleRect,
  BURNERS,
  LAMPS,
  MENU_RECT,
  METER_RECT,
  pantryFor,
  PASS_Y,
  passRect,
  PILE_Y,
  pileRect,
  PLATE_Y,
  plateRect,
  PORTRAIT_RECT,
  POT_Y,
  potRect,
  RECEPTION_RECT,
  type Rect,
  SWITCH_RECTS,
  tableRect,
  TABLES,
  ticketRect,
  timerRect,
  TRASH_RECT,
} from './layout';

export type Runtime = {
  readonly command: (command: Command) => void;
  readonly update: (delta: number) => void;
  readonly pause: () => void;
  readonly ready: () => void;
  readonly failed: (message: string) => void;
  readonly getRun: () => Run | null;
  readonly guidance: () => boolean;
};
type Drag = { readonly kind: 'bowl'; readonly ingredient: Ingredient } | { readonly kind: 'pot'; readonly dishId: number; readonly cookware: Cookware };
type Hit = Rect & { readonly id?: string; readonly action?: () => void; readonly drag?: Drag; readonly drop?: (drag: Drag) => boolean; readonly tip?: string };

const SERIF = 'Georgia, "Times New Roman", serif';
const SEGMENTS: Record<string, string> = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcfgd', '-': 'g' };
const COOKWARE_SCALE: Record<Cookware, number> = { pot: 0.92, pan: 0.84, roaster: 0.84 };
const FORK_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><g transform='rotate(-35 16 16)'><path d='M12.5 2v9M16 2v9M19.5 2v9' stroke='#3b3f44' stroke-width='3.2' stroke-linecap='round'/><path d='M12.5 2v9M16 2v9M19.5 2v9' stroke='#eef1f3' stroke-width='1.8' stroke-linecap='round'/><path d='M11.5 10h9v3a4.5 4.5 0 0 1-3.2 4.3V30h-2.6V17.3A4.5 4.5 0 0 1 11.5 13z' fill='#dfe3e7' stroke='#3b3f44' stroke-width='1'/></g></svg>",
)}") 8 5, default`;
const inside = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const pad = (n: number) => String(Math.max(0, Math.min(99, n))).padStart(2, '0');
const missing = (dish: Dish) => RECIPES[dish.recipeId].ingredients.filter((i) => !dish.loaded.includes(i));
const hitKey = (hit: Hit | undefined) => (hit ? (hit.id ?? `${hit.x},${hit.y},${hit.w}`) : '');

export class ServiceScene extends Phaser.Scene {
  private runtime: Runtime;
  private background!: Phaser.GameObjects.Image;
  private layer!: Phaser.GameObjects.Container;
  private hudLayer!: Phaser.GameObjects.Container;
  private target!: Phaser.GameObjects.Container;
  private previous!: Phaser.GameObjects.Image;
  private slide: { readonly start: number; readonly from: number } | null = null;
  private hits: Hit[] = [];
  private selected: Ingredient | null = null;
  private press: { x: number; y: number; hit: Hit | undefined } | null = null;
  private dragging: Drag | null = null;
  private pointer = { x: -100, y: -100 };
  private hover: Hit | undefined;
  private hoverSince = 0;
  private tooltip!: Phaser.GameObjects.Text;
  private ghost!: Phaser.GameObjects.Image;
  private drawnAt = 0;
  private lastView = '';
  private loadFailed = false;
  private now = 0;
  private feedbackId = -1;
  private feedbackAt = -10000;
  private platedAt = new Map<number, number>();
  private guideTarget: Rect | undefined;
  private tipBox: Rect | undefined;

  constructor(runtime: Runtime) {
    super('service');
    this.runtime = runtime;
  }

  preload(): void {
    const base = `${import.meta.env.BASE_URL}game-assets/`;
    for (const key of ['dining', 'kitchen', 'chef', 'people', 'ingredients']) this.load.image(key, `${base}${key}.webp`);
    this.load.on('loaderror', () => {
      this.loadFailed = true;
      this.runtime.failed('The kitchen artwork could not load. Sign in again or retry.');
    });
  }

  create(): void {
    if (this.loadFailed) return;
    const chef = this.textures.get('chef');
    const chefImage = chef.getSourceImage() as HTMLImageElement;
    const cw = Math.floor(chefImage.width / 3);
    for (let i = 0; i < 3; i++) chef.add(i, 0, i * cw, 0, cw, chefImage.height);
    const people = this.textures.get('people');
    const peopleImage = people.getSourceImage() as HTMLImageElement;
    const pw = Math.floor(peopleImage.width / 4);
    const ph = Math.floor(peopleImage.height / 2);
    for (let i = 0; i < 8; i++) people.add(i, 0, (i % 4) * pw, Math.floor(i / 4) * ph, pw, ph);
    new ArtBuilder(this.textures).build();
    this.previous = this.add.image(400, 300, 'dining-room').setVisible(false);
    this.background = this.add.image(400, 300, 'dining-room');
    this.layer = this.add.container(0, 0);
    this.hudLayer = this.add.container(0, 0);
    this.target = this.layer;
    this.tooltip = this.add
      .text(0, 0, '', { fontFamily: SERIF, fontSize: '13px', color: '#ffffff', backgroundColor: '#000000cc', padding: { x: 8, y: 5 }, wordWrap: { width: 250 } })
      .setDepth(40)
      .setVisible(false);
    this.ghost = this.add.image(0, 0, 'plate').setDepth(35).setVisible(false);
    this.game.canvas.style.cursor = FORK_CURSOR;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.runtime.getRun()?.status !== 'running') return;
      this.press = { x: p.x, y: p.y, hit: this.hitAt(p.x, p.y) };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.move(p.x, p.y));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.release(p.x, p.y));
    this.input.on('gameout', () => {
      this.hover = undefined;
      this.tooltip.setVisible(false);
    });
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === 'escape' && (this.selected || this.dragging)) {
        this.selected = null;
        this.dragging = null;
      } else if (key === 'escape' || key === 'p') this.runtime.pause();
      if (key === 'd') this.runtime.command({ type: 'view', view: 'dining' });
      if (key === 'k') this.runtime.command({ type: 'view', view: 'blue' });
    });
    this.runtime.ready();
  }

  update(time: number, delta: number): void {
    this.now = time;
    this.runtime.update(delta);
    const run = this.runtime.getRun();
    if (!run || !this.layer) return;
    if (time - this.drawnAt >= 66 || this.lastView !== run.view) {
      if (this.lastView !== run.view) {
        this.selected = null;
        this.dragging = null;
        // Rooms slide like the original: the kitchen sits to the left of the dining room.
        if (this.lastView) {
          this.previous.setTexture(this.background.texture.key).setVisible(true);
          this.slide = { start: time, from: run.view === 'dining' || this.lastView !== 'dining' ? 800 : -800 };
        }
      }
      this.draw(run);
      this.drawnAt = time;
      this.lastView = run.view;
    }
    this.placeGhost(run);
    this.animateSlide(time);
  }

  private animateSlide(time: number): void {
    if (!this.slide) return;
    const t = Math.min(1, (time - this.slide.start) / 420);
    const offset = this.slide.from * Math.pow(1 - t, 3);
    this.background.x = 400 + offset;
    this.layer.x = offset;
    this.previous.x = 400 + offset - Math.sign(this.slide.from) * 800;
    if (t < 1) return;
    this.slide = null;
    this.previous.setVisible(false);
  }

  private hitAt(x: number, y: number): Hit | undefined {
    for (let i = this.hits.length - 1; i >= 0; i--) if (inside(this.hits[i], x, y)) return this.hits[i];
    return undefined;
  }

  private move(x: number, y: number): void {
    this.pointer = { x, y };
    if (this.press && !this.dragging && this.press.hit?.drag && Math.hypot(x - this.press.x, y - this.press.y) > 8) {
      this.dragging = this.press.hit.drag;
      this.selected = null;
    }
    const hit = this.hitAt(x, y);
    if (hitKey(hit) !== hitKey(this.hover)) {
      this.hover = hit;
      this.hoverSince = this.now;
    }
    this.game.canvas.style.cursor = this.dragging ? 'grabbing' : hit?.action || hit?.drag ? 'pointer' : FORK_CURSOR;
  }

  private release(x: number, y: number): void {
    const run = this.runtime.getRun();
    const press = this.press;
    this.press = null;
    if (!run || run.status !== 'running') return;
    if (this.dragging) {
      const drag = this.dragging;
      this.dragging = null;
      const target = [...this.hits].reverse().find((h) => h.drop && inside(h, x, y));
      if (!target?.drop?.(drag) && drag.kind === 'pot' && y < 230) this.plate(run, drag.dishId);
    } else if (press && Math.hypot(x - press.x, y - press.y) <= 8) {
      const hit = this.hitAt(x, y);
      if (hit?.action) hit.action();
      else this.selected = null;
    }
    this.draw(run);
  }

  private plate(run: Run, dishId: number): boolean {
    const dish = run.orders.flatMap((o) => o.dishes).find((d) => d.id === dishId);
    if (dish?.state !== 'ready') return false;
    this.runtime.command({ type: 'plate', dishId });
    return true;
  }

  private placeGhost(run: Run): void {
    const bowl = this.dragging?.kind === 'bowl' ? this.dragging.ingredient : this.selected;
    if (bowl && run.bowls[bowl] && run.view !== 'dining') {
      this.ghost
        .setTexture(`bowlfull-${bowl}`)
        .setDisplaySize(78, 53)
        .setPosition(this.pointer.x + 6, this.pointer.y + 14)
        .setAlpha(0.96)
        .setVisible(true);
    } else if (this.dragging?.kind === 'pot') {
      const spec = COOKWARE[this.dragging.cookware];
      this.ghost
        .setTexture(this.dragging.cookware)
        .setDisplaySize(spec.w * 0.84, spec.h * 0.84)
        .setPosition(this.pointer.x, this.pointer.y + 10)
        .setAlpha(0.95)
        .setVisible(true);
    } else this.ghost.setVisible(false);
    const target = this.guideTarget;
    const guided = target && this.hover && inside(target, this.pointer.x, this.pointer.y);
    const tip = run.status === 'running' && !this.dragging && !guided && this.hover?.tip && this.now - this.hoverSince > 650 ? this.hover.tip : '';
    if (tip) {
      this.tooltip.setText(tip);
      const x = Math.min(792 - this.tooltip.width, this.pointer.x + 16);
      const y = Math.min(592 - this.tooltip.height, this.pointer.y + 20);
      const box = this.tipBox;
      const clash = box && x < box.x + box.w && x + this.tooltip.width > box.x && y < box.y + box.h && y + this.tooltip.height > box.y;
      this.tooltip.setPosition(x, y).setVisible(!clash);
    } else this.tooltip.setVisible(false);
  }

  private add2<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.target.add(object);
    return object;
  }
  private g(): Phaser.GameObjects.Graphics {
    return this.add2(this.add.graphics());
  }
  private img(x: number, y: number, key: string, w: number, h: number, frame?: number): Phaser.GameObjects.Image {
    return this.add2(this.add.image(x, y, key, frame).setDisplaySize(w, h));
  }
  private text(
    x: number,
    y: number,
    value: string,
    size = 13,
    color = '#ffffff',
    options: { width?: number; align?: 'left' | 'center' | 'right'; bold?: boolean; stroke?: number } = {},
  ): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, value, {
      fontFamily: SERIF,
      fontSize: `${size}px`,
      fontStyle: options.bold === false ? 'normal' : 'bold',
      color,
      stroke: '#000000',
      strokeThickness: options.stroke ?? 0,
      wordWrap: options.width ? { width: options.width } : undefined,
      align: options.align ?? 'left',
      lineSpacing: 2,
    });
    if (options.align === 'center') t.setOrigin(0.5, 0);
    if (options.align === 'right') t.setOrigin(1, 0);
    return this.add2(t);
  }
  private pulse(speed = 180): number {
    return 0.5 + Math.sin(this.now / speed) * 0.5;
  }
  private flash(speed = 280): boolean {
    return Math.floor(this.now / speed) % 2 === 0;
  }
  private star(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, lit: boolean): void {
    const points: Phaser.Math.Vector2[] = [];
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const rr = k % 2 ? r * 0.45 : r;
      points.push(new Phaser.Math.Vector2(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
    }
    g.fillStyle(lit ? 0xfff1b8 : 0x1c1c1c, lit ? 1 : 0.85).fillPoints(points, true);
    g.lineStyle(1.2, lit ? 0xc99a2e : 0x8a8f96, 1).strokePoints(points, true);
  }
  private stars(x: number, y: number, quality: number, r = 6.5, scale = 1): void {
    const g = this.g();
    const lit = Math.round(quality);
    for (let k = 0; k < 5; k++) this.star(g, x + (k - 2) * r * 2.1 * scale, y - (k === 0 || k === 4 ? 0 : k === 2 ? 5 : 3) * scale, r * scale, k < lit);
  }
  private digits(g: Phaser.GameObjects.Graphics, x: number, y: number, value: string, color: number, h = 18): void {
    const w = h * 0.52;
    const t = Math.max(2, h * 0.14);
    [...value].forEach((ch, i) => {
      const ox = x + i * (w + 4);
      const on = SEGMENTS[ch] ?? '';
      const half = h / 2 - t * 0.9;
      const segments: Record<string, readonly [number, number, number, number]> = {
        a: [ox + t * 0.6, y, w - t * 1.2, t],
        b: [ox + w - t, y + t * 0.6, t, half],
        c: [ox + w - t, y + h / 2 + t * 0.3, t, half],
        d: [ox + t * 0.6, y + h - t, w - t * 1.2, t],
        e: [ox, y + h / 2 + t * 0.3, t, half],
        f: [ox, y + t * 0.6, t, half],
        g: [ox + t * 0.6, y + h / 2 - t / 2, w - t * 1.2, t],
      };
      for (const [name, [sx, sy, sw, sh]] of Object.entries(segments)) g.fillStyle(on.includes(name) ? color : 0xffffff, on.includes(name) ? 1 : 0.07).fillRect(sx, sy, sw, sh);
    });
  }
  private person(x: number, y: number, frame: number, height: number, seated = false): Phaser.GameObjects.Image {
    const image = this.add2(this.add.image(x, y, 'people', frame).setOrigin(0.5, 1));
    image.setDisplaySize(height * 0.75, height);
    // Seated guests show only their upper body above the tabletop.
    if (seated) image.setCrop(0, 0, image.frame.width, image.frame.height * 0.5);
    return image;
  }

  private draw(run: Run): void {
    this.layer.removeAll(true);
    this.hudLayer.removeAll(true);
    this.target = this.layer;
    this.hits = [];
    const texture = run.view === 'dining' ? 'dining-room' : run.view === 'red' ? 'kitchen-red' : 'kitchen-blue';
    if (this.background.texture.key !== texture) this.background.setTexture(texture);
    if (this.selected && (!run.bowls[this.selected] || run.view === 'dining')) this.selected = null;
    if (run.feedback.id !== this.feedbackId) {
      this.feedbackId = run.feedback.id;
      this.feedbackAt = this.now;
    }
    for (const dish of run.orders.flatMap((o) => o.dishes)) if (dish.state === 'plated' && !this.platedAt.has(dish.id)) this.platedAt.set(dish.id, this.now);
    const held = this.selected ?? (this.dragging?.kind === 'bowl' ? this.dragging.ingredient : null);
    if (run.view === 'dining') this.dining(run);
    else this.kitchen(run, held);
    this.target = this.hudLayer;
    this.hud(run);
    this.guideTarget = undefined;
    this.tipBox = undefined;
    if (this.slide) {
      // Tips wait until the room has finished sliding in.
    } else if ((this.runtime.guidance() || run.tutorial >= 0) && run.status === 'running') {
      const guide = nextStep(run, held);
      this.guideTarget = guide.target ?? undefined;
      this.tip(run, guide);
    } else this.remark(run);
    const hover = this.hitAt(this.pointer.x, this.pointer.y);
    if (hitKey(hover) !== hitKey(this.hover)) this.hoverSince = this.now;
    this.hover = hover;
  }

  private hud(run: Run): void {
    const def = dayFor(run.day);
    const talking = this.now - this.feedbackAt < 3500;
    const pose = run.anger > 70 || (talking && run.feedback.kind === 'bad') ? 2 : talking && run.feedback.kind === 'good' ? 1 : 0;
    const p = PORTRAIT_RECT;
    this.img(p.x + p.w / 2, p.y + p.h / 2, 'chef', 150, 200, pose);
    this.img(p.x + p.w / 2, p.y + p.h / 2, 'hud-frame', p.w, p.h);
    const menuHover = this.hover?.id === 'menu';
    this.img(MENU_RECT.x + MENU_RECT.w / 2, MENU_RECT.y + MENU_RECT.h / 2, 'hud-menu', MENU_RECT.w, MENU_RECT.h).setTint(menuHover ? 0x9cc8ff : 0xffffff);
    this.text(MENU_RECT.x + MENU_RECT.w / 2, MENU_RECT.y + 6, 'MENU', 14, '#ffffff', { align: 'center' });
    this.hits.push({ ...MENU_RECT, id: 'menu', action: () => this.runtime.pause(), tip: 'Pause, options and hints' });

    // HK logo with the trident whose handle is Ramsay's flame meter.
    const m = METER_RECT;
    const cx = m.x + m.w / 2;
    const logo = this.g();
    logo.lineStyle(2, 0xd9dee2).lineBetween(cx, 6, cx, m.y);
    logo
      .lineBetween(cx - 5, 6, cx - 5, 14)
      .lineBetween(cx + 5, 6, cx + 5, 14)
      .lineBetween(cx - 5, 14, cx + 5, 14);
    this.text(cx - 5, 8, 'H', 27, '#dfe3e7', { align: 'right', stroke: 3 });
    this.text(cx + 5, 8, 'K', 27, '#dfe3e7', { stroke: 3 });
    this.img(cx, m.y + m.h / 2, 'hud-tube', 20, m.h + 8);
    const f = this.g();
    const fill = 6 + (run.anger / 100) * (m.h - 12);
    const bottom = m.y + m.h - 2;
    const top = bottom - fill;
    const ix = m.x + 1;
    f.fillStyle(0xa3160b).fillRect(ix, top, 12, fill);
    f.fillStyle(0xff5a12, 0.95).fillRect(ix + 2, top + 3, 8, fill - 3);
    f.fillStyle(0xffd23a, 0.9).fillRect(ix + 4.5, top + 8, 3, Math.max(0, fill - 10));
    for (let k = 0; k < 3; k++) {
      const h = 7 + Math.sin(this.now / 70 + k * 2.1) * 4;
      f.fillStyle(k === 1 ? 0xffd23a : 0xff7a1a, 0.95).fillTriangle(ix + k * 4, top + 2, ix + 4 + k * 4, top + 2, ix + 2 + k * 4, top - h);
    }
    if (run.anger > 60) {
      const glow = this.g().setBlendMode(Phaser.BlendModes.ADD);
      glow.fillStyle(0xff4a12, 0.12 + this.pulse(120) * 0.12).fillEllipse(cx, top + fill / 2, 34, fill + 20);
    }
    this.hits.push({ x: m.x - 4, y: m.y, w: m.w + 8, h: m.h, tip: 'Chef Ramsay’s temper. Mistakes fan the flames — if they reach the top, you’re out.' });

    // Service progress plaque.
    const progress = run.mode === 'arcade' ? `${Math.max(0, Math.ceil(ARCADE_SECONDS - run.tick * STEP_SECONDS))}s LEFT` : `${run.completed} / ${def.parties} TABLES`;
    const plaque = run.mode === 'arcade' ? 'ARCADE' : def.challenge ? `DAY ${run.day} · ${run.view === 'red' ? 'RED' : 'BLUE'} KITCHEN` : `DAY ${run.day}`;
    const pg = this.g();
    pg.fillStyle(0x000000, 0.55).fillRoundedRect(634, 8, 158, 38, 5);
    pg.lineStyle(1, 0xd9dee2, 0.35).strokeRoundedRect(634, 8, 158, 38, 5);
    this.text(713, 11, plaque, 11, '#e4c587', { align: 'center' });
    this.text(713, 26, progress, 12, '#ffffff', { align: 'center' });

    // Switch Rooms button: red when the other room needs you, blue on hover.
    const challenge = def.challenge || run.mode === 'arcade';
    const inDining = run.view === 'dining';
    const rect = inDining ? SWITCH_RECTS.dining : SWITCH_RECTS.kitchen;
    const otherKitchen = run.view === 'blue' ? 'red' : 'blue';
    const target = inDining ? 'blue' : challenge ? otherKitchen : 'dining';
    if (challenge && !def.challenge) return;
    const alert = inDining
      ? run.orders.some((o) => o.dishes.some((d) => d.state === 'ready' || d.state === 'burnt'))
      : challenge
        ? run.orders.some((o) => o.kitchen === otherKitchen && o.dishes.some((d) => d.state === 'ready' || d.state === 'burnt'))
        : diningTasks(run);
    const hover = this.hover?.id === 'switch';
    const tone = hover ? 'blue' : alert && this.flash(320) ? 'red' : 'steel';
    const icon = inDining ? 'pot' : challenge ? 'kitchen' : 'table';
    this.img(rect.x + rect.w / 2, rect.y + rect.h / 2, `switch-${icon}-${tone}`, rect.w, rect.h).setTint(
      challenge && !inDining && tone === 'steel' ? (otherKitchen === 'red' ? 0xffb0a0 : 0xa8ccff) : 0xffffff,
    );
    if (alert) {
      const glow = this.g().setBlendMode(Phaser.BlendModes.ADD);
      glow.fillStyle(0xff3a1a, 0.1 + this.pulse(160) * 0.14).fillRoundedRect(rect.x - 6, rect.y - 6, rect.w + 12, rect.h + 12, 12);
    }
    const label = inDining ? 'Switch Rooms — go to the kitchen' : challenge ? `Switch to the ${otherKitchen} kitchen` : 'Switch Rooms — go to the dining room';
    this.hits.push({ ...rect, id: 'switch', tip: label, action: () => this.runtime.command({ type: 'view', view: target }) });
  }

  // Original-style tutorial box: dark translucent panel with white serif text and a pointer.
  private tip(run: Run, guide: Guide): void {
    const target = guide.target;
    const width = 236;
    const title = this.text(0, 0, guide.title, 13, '#ffd77a', { width: width - 20 });
    const body = this.text(0, 0, guide.text, 12.5, '#ffffff', { width: width - 20, bold: false });
    const height = title.height + body.height + 22;
    let box: Rect = { x: 214, y: 84, w: width, h: height };
    if (target) {
      const cx = target.x + target.w / 2;
      const cy = target.y + target.h / 2;
      const clampX = (x: number) => Math.max(8, Math.min(792 - width, x));
      const clampY = (y: number) => Math.max(8, Math.min(592 - height, y));
      const options: Record<string, Rect> = {
        below: { x: clampX(cx - width / 2), y: target.y + target.h + 14, w: width, h: height },
        above: { x: clampX(cx - width / 2), y: target.y - 14 - height, w: width, h: height },
        right: { x: target.x + target.w + 16, y: clampY(cy - height / 2), w: width, h: height },
        left: { x: target.x - 16 - width, y: clampY(cy - height / 2), w: width, h: height },
      };
      const stove = run.view !== 'dining' && target.y > 100 && target.y < 330;
      const order = stove
        ? ['below', 'above', 'left', 'right']
        : target.x < 90
          ? ['right', 'below', 'above']
          : target.x + target.w > 720
            ? ['left', 'below', 'above']
            : target.y > 380
              ? ['above', 'right', 'left', 'below']
              : ['below', 'right', 'left', 'above'];
      const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      const fits = (r: Rect) => r.x >= 8 && r.y >= 8 && r.x + r.w <= 792 && r.y + r.h <= 592 && !overlaps(r, target);
      const hud: Rect = { x: 0, y: 0, w: 212, h: 262 };
      box = options[order.find((o) => fits(options[o]) && !overlaps(options[o], hud)) ?? order.find((o) => fits(options[o])) ?? order[0]];
      const ring = this.g();
      const p = this.pulse(170);
      ring.lineStyle(2.5, 0xffe08a, 0.35 + p * 0.5).strokeRoundedRect(target.x - 3 - p * 3, target.y - 3 - p * 3, target.w + 6 + p * 6, target.h + 6 + p * 6, 8);
    }
    const g = this.g();
    g.fillStyle(0x000000, 0.8).fillRoundedRect(box.x, box.y, box.w, box.h, 7);
    g.lineStyle(1, 0xffffff, 0.3).strokeRoundedRect(box.x + 2, box.y + 2, box.w - 4, box.h - 4, 5);
    if (target) {
      const tx = Math.max(target.x, Math.min(target.x + target.w, box.x + box.w / 2));
      const ty = Math.max(target.y, Math.min(target.y + target.h, box.y + box.h / 2));
      const ex = Math.max(box.x + 14, Math.min(box.x + box.w - 14, tx));
      const ey = Math.max(box.y + 14, Math.min(box.y + box.h - 14, ty));
      const edgeX = tx < box.x ? box.x : tx > box.x + box.w ? box.x + box.w : ex;
      const edgeY = ty < box.y ? box.y : ty > box.y + box.h ? box.y + box.h : ey;
      const horizontal = edgeX === box.x || edgeX === box.x + box.w;
      const bob = Math.sin(this.now / 160) * 3;
      const tipX = edgeX + Math.sign(tx - edgeX) * (12 + bob);
      const tipY = edgeY + Math.sign(ty - edgeY) * (12 + bob);
      g.fillStyle(0x000000, 0.8);
      if (horizontal) g.fillTriangle(edgeX, edgeY - 10, edgeX, edgeY + 10, tipX, edgeY);
      else g.fillTriangle(edgeX - 10, edgeY, edgeX + 10, edgeY, edgeX, tipY);
    }
    this.hudLayer.bringToTop(title);
    this.hudLayer.bringToTop(body);
    this.tipBox = box;
    title.setPosition(box.x + 10, box.y + 9);
    body.setPosition(box.x + 10, box.y + 13 + title.height);
  }

  // Without hints, Ramsay's remarks appear briefly beside his portrait.
  private remark(run: Run): void {
    if (this.now - this.feedbackAt > 3200 || run.feedback.kind === 'info') return;
    const bad = run.feedback.kind !== 'good';
    const t = this.text(226, 100, run.feedback.text, 13, bad ? '#ffd0c2' : '#ffffff', { width: 230 });
    const g = this.g();
    g.fillStyle(0x000000, 0.8).fillRoundedRect(216, 91, t.width + 20, t.height + 18, 7);
    g.lineStyle(1, bad ? 0xff7a52 : 0xffffff, 0.45).strokeRoundedRect(218, 93, t.width + 16, t.height + 14, 5);
    g.fillTriangle(216, 104, 216, 120, 206, 112);
    this.hudLayer.bringToTop(t);
  }

  private dining(run: Run): void {
    const def = dayFor(run.day);
    for (let i = 0; i < def.tables; i++) {
      const table = run.tables[i];
      const [x, y] = TABLES[i];
      if (table.guests > 0) {
        this.person(x - 44, y + 13, table.appearance, i < 2 ? 106 : 126, true);
        if (table.guests > 1) this.person(x + 39, y + 12, table.appearance === 3 ? 1 : table.appearance + 1, i < 2 ? 104 : 123, true);
        if (table.guests > 2) this.person(x + 5, y - 2, 2, 116, true);
      }
    }
    // Reception desk: arriving customers wait by the podium.
    const reception = this.g().setBlendMode(Phaser.BlendModes.ADD);
    if (run.waiting) reception.fillStyle(0xffa040, 0.2 + this.pulse(200) * 0.2).fillCircle(766, 152, 20 + this.pulse(200) * 6);
    for (let i = 0; i < Math.min(3, run.waiting); i++) this.person(700 - i * 24, 262, 1 + (i % 3), 88);
    if (run.waiting) {
      const bar = this.g();
      const share = run.waitingPatience / def.patience;
      bar.fillStyle(0x000000, 0.7).fillRoundedRect(650, 160, 80, 7, 3);
      bar.fillStyle(share < 0.35 ? 0xff5a36 : 0x7fd0ff).fillRoundedRect(651, 161, 78 * share, 5, 2);
    }
    this.hits.push({
      ...RECEPTION_RECT,
      id: 'reception',
      action: () => this.runtime.command({ type: 'seat' }),
      tip: run.waiting ? `${run.waiting} customer${run.waiting > 1 ? 's' : ''} waiting — select to seat them` : 'Reception desk — new customers arrive here',
    });

    const task = run.waiterQueue[0];
    const from = run.waiterTable >= 0 ? TABLES[run.waiterTable] : [674, 231];
    const to = task ? TABLES[task.target] : from;
    const progress = Math.min(1, run.waiterElapsed / WAITER_SECONDS);
    const wx = from[0] + (to[0] - from[0]) * progress + 67;
    const wy = from[1] + (to[1] - from[1]) * progress + 45;
    const waiterHeight = 105 + wy * 0.05;
    this.person(wx, wy, task && Math.floor(run.tick / 3) % 2 ? 4 : 0, waiterHeight);
    if (task?.action === 'serve') this.img(wx + 18, wy - waiterHeight * 0.55, 'cloche', 40, 29);

    const dishes: readonly Ingredient[] = ['chicken', 'beef', 'fish', 'grain', 'vegetables', 'fruit'];
    for (let i = 0; i < def.tables; i++) {
      const table = run.tables[i];
      if (table.stage !== 'eating' && table.stage !== 'clear') continue;
      const [lx, ly] = LAMPS[i];
      const size = i < 2 ? 0.85 : 1;
      for (let k = 0; k < Math.min(3, table.guests); k++) {
        const px = lx + [-26, 26, 0][k] * size;
        const py = ly + [12, 10, -6][k] * size;
        this.img(px, py, 'plate', 34 * size, 13 * size);
        if (table.stage === 'eating') this.img(px, py - 1, `food-${dishes[(i + k + table.course) % dishes.length]}`, 18 * size, 8 * size).setTint(0xf0d2b0);
      }
    }
    for (let i = 0; i < def.tables; i++) this.tableStatus(run, i);

    // Finished platters wait on the meal counter until you send them out.
    const platters = def.challenge || run.mode === 'arcade' ? [] : passOrders(run);
    platters.forEach((order, i) => {
      const r = passRect(i);
      const cx = r.x + r.w / 2;
      const glow = this.g().setBlendMode(Phaser.BlendModes.ADD);
      glow.fillStyle(0xfff0c0, 0.15 + this.pulse(170) * 0.2).fillEllipse(cx, PASS_Y - 4, 96, 26);
      this.img(cx, PASS_Y - 24, 'cloche', 78, 56);
      const tag = this.g();
      tag.fillStyle(0xf6f1e3).fillRect(cx + 24, PASS_Y - 20, 22, 16);
      tag.lineStyle(1, 0x8a7a5a).strokeRect(cx + 24, PASS_Y - 20, 22, 16);
      this.text(cx + 35, PASS_Y - 18, String(order.tableId + 1), 11, '#2b1c10', { align: 'center' });
      this.hits.push({ ...r, id: 'pass', action: () => this.runtime.command({ type: 'table', id: order.tableId }), tip: `Table ${order.tableId + 1}’s meal — select to deliver it` });
    });
  }

  private tableStatus(run: Run, i: number): void {
    const def = dayFor(run.day);
    const table = run.tables[i];
    const [lx, ly] = LAMPS[i];
    const order = run.orders.find((o) => o.tableId === i);
    const plated = Boolean(order?.dishes.every((d) => d.state === 'plated'));
    const queued = run.waiterQueue.findIndex((t) => t.target === i);
    const need = table.stage === 'order' ? 'order' : table.stage === 'clear' ? 'clear' : table.stage === 'waiting' && plated ? 'serve' : null;
    const actionable = need !== null && queued < 0;
    const p = this.pulse(200);
    if (actionable) {
      const glow = this.g().setBlendMode(Phaser.BlendModes.ADD);
      glow.fillStyle(0x2f8dff, 0.16 + p * 0.14).fillCircle(lx, ly, 30 + p * 8);
      glow.fillStyle(0x7cc8ff, 0.35 + p * 0.2).fillCircle(lx, ly, 13);
      for (let k = 0; k < 5; k++) glow.fillStyle(0x7cc8ff, 0.1 - k * 0.016).fillRect(lx - 5 + k, ly - 12 - k * 12, 10 - k * 2, 12);
      glow.fillStyle(0xeaf7ff, 0.95).fillRect(lx - 5, ly - 6, 10, 10);
    }
    const bubble = actionable ? need : queued >= 0 ? 'queued' : table.stage === 'reading' ? 'reading' : null;
    if (bubble) {
      const bx = lx;
      const by = ly - 66;
      const g = this.g();
      g.fillStyle(0x000000, bubble === 'reading' || bubble === 'queued' ? 0.5 : 0.78).fillRoundedRect(bx - 18, by - 14, 36, 28, 7);
      g.fillTriangle(bx - 6, by + 14, bx + 6, by + 14, bx, by + 22);
      g.lineStyle(1, 0xffffff, 0.35).strokeRoundedRect(bx - 16, by - 12, 32, 24, 5);
      const icon = bubble === 'queued' ? (task(run, i) ?? 'order') : bubble;
      const alpha = bubble === 'queued' ? 0.45 : 1;
      if (icon === 'order' || icon === 'seat') {
        g.fillStyle(0xffffff, alpha).fillRect(bx - 6, by - 8, 12, 16);
        g.fillStyle(0x6b7178, alpha)
          .fillRect(bx - 4, by - 4, 8, 1.5)
          .fillRect(bx - 4, by, 8, 1.5)
          .fillRect(bx - 4, by + 4, 6, 1.5);
      } else if (icon === 'serve') this.img(bx, by, 'cloche', 26, 19).setAlpha(alpha);
      else if (icon === 'clear') {
        g.fillStyle(0xffffff, alpha)
          .fillEllipse(bx, by + 4, 22, 7)
          .fillEllipse(bx, by, 22, 7)
          .fillEllipse(bx, by - 4, 22, 7);
        g.lineStyle(1, 0x8a8f96, alpha)
          .strokeEllipse(bx, by + 4, 22, 7)
          .strokeEllipse(bx, by, 22, 7)
          .strokeEllipse(bx, by - 4, 22, 7);
      } else if (icon === 'reading') for (let k = -1; k <= 1; k++) g.fillStyle(0xffffff, 0.8).fillCircle(bx + k * 7, by, 2.5);
      if (bubble === 'queued') this.text(bx + 15, by - 20, `#${queued + 1}`, 10, '#ffd77a', { align: 'center', stroke: 2 });
    }
    if (['order', 'waiting', 'clear'].includes(table.stage)) {
      const share = table.patience / def.patience;
      const bar = this.g();
      const y = bubble ? ly - 40 : ly - 30;
      bar.fillStyle(0x000000, 0.65).fillRoundedRect(lx - 17, y, 34, 6, 3);
      bar.fillStyle(share < 0.35 ? (this.flash(250) ? 0xff5a36 : 0xb3301a) : share < 0.6 ? 0xf0b43c : 0x7fd0ff).fillRoundedRect(lx - 16, y + 1, 32 * share, 4, 2);
    }
    const stageText: Record<string, string> = {
      empty: 'Empty table',
      reading: 'Reading the menu',
      order: 'Ready to order — select to take the order',
      waiting: plated ? 'Their meal is ready — select to serve it' : 'Waiting for their meal',
      eating: 'Enjoying their meal',
      clear: 'Finished — select to clear the table',
    };
    this.hits.push({
      ...tableRect(i),
      id: `table-${i}`,
      action: table.stage === 'empty' ? undefined : () => this.runtime.command({ type: 'table', id: i }),
      tip: `Table ${i + 1}: ${queued >= 0 ? 'the waiter is on his way' : stageText[table.stage]}`,
    });
  }

  private kitchen(run: Run, held: Ingredient | null): void {
    const view = run.view as 'blue' | 'red';
    const tickets = ticketsFor(run, view);
    tickets.forEach((order, i) => this.ticket(run, order, i));
    const order = tickets.find((o) => o.id === run.selectedOrder);
    this.hits.push({ x: 272, y: 100, w: 458, h: 100, drop: (d) => d.kind === 'pot' && this.plate(run, d.dishId) });
    if (order) order.dishes.slice(0, BURNERS.length).forEach((dish, i) => this.station(run, order, dish, i, held));
    const pantry = pantryFor(run);
    const needed = neededIngredients(run, view);
    pantry.forEach((ingredient, i) => this.pantryItem(run, ingredient, i, pantry.length, needed[ingredient]));
    const burnt = order?.dishes.some((d) => d.state === 'burnt');
    if (burnt || this.dragging?.kind === 'pot') {
      const glow = this.g().setBlendMode(Phaser.BlendModes.ADD);
      glow.fillStyle(burnt ? 0xff4a2a : 0xffffff, 0.12 + this.pulse(170) * 0.14).fillEllipse(74, 510, 110, 34);
    }
    this.hits.push({
      ...TRASH_RECT,
      id: 'trash',
      tip: 'Trash — drag burnt food here',
      drop: (d) => {
        const dish = d.kind === 'pot' ? run.orders.flatMap((o) => o.dishes).find((x) => x.id === d.dishId) : undefined;
        if (dish?.state !== 'burnt') return false;
        this.runtime.command({ type: 'discard', dishId: dish.id });
        return true;
      },
    });
  }

  private ticket(run: Run, order: Order, i: number): void {
    const def = dayFor(run.day);
    const r = ticketRect(i);
    const active = run.selectedOrder === order.id;
    const warning = order.dishes.some((d) => d.state === 'ready' || d.state === 'burnt');
    const done = order.dishes.every((d) => d.state === 'plated');
    const lift = active ? 0 : 3;
    const g = this.g();
    g.fillStyle(0x000000, 0.4).fillRect(r.x + 3, r.y + lift + 3, r.w, r.h - lift);
    g.fillStyle(active ? 0xfffcf1 : 0xe7e0cd).fillRect(r.x, r.y + lift, r.w, r.h - lift);
    g.fillStyle(0x000000, 0.06);
    for (let y = r.y + lift + 20; y < r.y + r.h - 4; y += 7) g.fillRect(r.x + 4, y, r.w - 8, 1);
    if (active) g.lineStyle(2, 0xf0c46a).strokeRect(r.x - 1, r.y + lift - 1, r.w + 2, r.h - lift + 2);
    if (warning && this.flash()) g.lineStyle(3, 0xff4a2a).strokeRect(r.x - 2, r.y + lift - 2, r.w + 4, r.h - lift + 4);
    g.fillStyle(0x9aa0a6).fillRect(r.x + r.w / 2 - 8, r.y - 4, 16, 8);
    g.fillStyle(0x3a3f45).fillRect(r.x + r.w / 2 - 8, r.y + 3, 16, 1.5);
    this.text(r.x + r.w / 2, r.y + lift + 5, `TABLE ${order.tableId + 1}`, 8.5, '#3a2412', { align: 'center' });
    const n = order.dishes.length;
    order.dishes.forEach((dish, j) => {
      const dx = r.x + r.w / 2 + (j - (n - 1) / 2) * 16;
      const dy = r.y + lift + 32;
      const ring =
        dish.state === 'ready' ? (this.flash() ? 0x3fdc5a : 0x1f7a2f) : dish.state === 'burnt' ? 0xe0341e : dish.state === 'plated' ? 0xd6a93c : dish.state === 'cooking' ? 0x2f78b7 : 0x8a7a5a;
      g.fillStyle(ring).fillCircle(dx, dy, 7.5);
      this.img(dx, dy, `food-${RECIPES[dish.recipeId].ingredients[0]}`, 12, 12).setAlpha(dish.state === 'plated' ? 0.55 : 1);
      if (dish.state === 'cooking') {
        const share = Math.min(1, dish.elapsed / cookingSeconds(dish.recipeId, run.day));
        const arc = this.g();
        arc
          .lineStyle(2.5, 0x9fd8ff)
          .beginPath()
          .arc(dx, dy, 7.5, -Math.PI / 2, -Math.PI / 2 + share * Math.PI * 2)
          .strokePath();
      }
    });
    this.text(r.x + r.w / 2, r.y + lift + 42, done ? 'PLATED' : warning ? 'HURRY!' : `${n} DISH${n > 1 ? 'ES' : ''}`, 7.5, done ? '#2d6b39' : warning ? '#b3301a' : '#6b5a40', { align: 'center' });
    const share = run.tables[order.tableId].patience / def.patience;
    g.fillStyle(0x000000, 0.2).fillRect(r.x + 5, r.y + r.h - 8, r.w - 10, 4);
    g.fillStyle(share < 0.35 ? 0xd9542f : 0x3f86a6).fillRect(r.x + 5, r.y + r.h - 8, (r.w - 10) * share, 4);
    const names = order.dishes.map((d) => RECIPES[d.recipeId].name).join(', ');
    this.hits.push({ ...r, id: `ticket-${i}`, action: () => this.runtime.command({ type: 'select', id: order.id }), tip: `Table ${order.tableId + 1}: ${names}` });
  }

  private station(run: Run, order: Order, dish: Dish, i: number, held: Ingredient | null): void {
    const x = BURNERS[i];
    const recipe = RECIPES[dish.recipeId];
    const cookware = cookwareFor(recipe);
    const spec = COOKWARE[cookware];
    const scale = COOKWARE_SCALE[cookware];
    const cookTime = cookingSeconds(dish.recipeId, run.day);
    const heat = dish.state === 'cooking' || dish.state === 'ready';
    const needs = missing(dish);
    const fits = held !== null && run.bowls[held] && dish.state === 'raw' && needs.includes(held);
    const p = this.pulse(150);

    // Plate on the pass shelf.
    this.img(x, PLATE_Y, 'plate', 96, 36);
    if (dish.state === 'plated') {
      recipe.ingredients.forEach((ingredient, k) => {
        this.img(x + (k - (recipe.ingredients.length - 1) / 2) * 17, PLATE_Y - 3 + (k % 2), `food-${ingredient}`, 40, 15).setTint(0xf0d2b0);
      });
      const age = this.now - (this.platedAt.get(dish.id) ?? 0);
      const pop = age < 400 ? 0.6 + (age / 400) * 0.55 : age < 600 ? 1.15 - ((age - 400) / 200) * 0.15 : 1;
      this.stars(x, PLATE_Y - 30, dish.quality, 6.5, pop);
    }
    const g = this.g();
    if (heat && cookware !== 'roaster') {
      for (let f = 0; f < 12; f++) {
        const a = (f / 12) * Math.PI * 2 + run.tick * 0.05;
        const fx = x + Math.cos(a) * 34;
        const fy = POT_Y + 4 + Math.sin(a) * 8;
        const h = 8 + Math.sin(run.tick * 0.9 + f * 1.7) * 3;
        g.fillStyle(0x2f6bff, 0.85).fillTriangle(fx - 3, fy, fx, fy - h, fx + 3, fy);
        g.fillStyle(0xa8d8ff, 0.8).fillTriangle(fx - 1.5, fy, fx, fy - h * 0.55, fx + 1.5, fy);
      }
    }
    if (heat && cookware === 'roaster') g.fillStyle(0xff7a1a, 0.25 + Math.sin(this.now / 200) * 0.08).fillEllipse(x, POT_Y + 2, 120, 34);

    const lifted = this.dragging?.kind === 'pot' && this.dragging.dishId === dish.id;
    if (dish.state !== 'plated') {
      const shake = dish.state === 'ready' ? Math.sin(this.now / 35) * 1.3 : 0;
      const bottom = POT_Y + 8;
      const pot = this.img(x + shake, bottom, cookware, spec.w * scale, spec.h * scale).setOrigin(spec.ox / spec.w, 1);
      pot.setDisplaySize(spec.w * scale, spec.h * scale);
      if (lifted) pot.setAlpha(0.3);
      const oy = bottom - (spec.h - spec.oy) * scale;
      const count = dish.loaded.length;
      dish.loaded.forEach((ingredient, k) => {
        const wide = spec.rx * 2 * scale * (count > 1 ? 0.62 : 0.9);
        const offset = count > 1 ? (k - (count - 1) / 2) * spec.rx * scale * 0.55 : 0;
        const food = this.img(x + shake + offset, oy + 1, `food-${ingredient}`, wide, spec.ry * 2 * scale * 0.85);
        const share = dish.state === 'cooking' ? dish.elapsed / cookTime : 0;
        if (dish.state === 'burnt') food.setTint(0x2a1d14);
        else if (dish.state === 'ready') food.setTint(0xe6b684);
        else if (share > 0) food.setTint(Phaser.Display.Color.GetColor(255 - share * 30, 255 - share * 60, 255 - share * 100));
        if (lifted) food.setAlpha(0.3);
      });
      const ring = this.g();
      if (fits) {
        ring.fillStyle(0x7dff8a, 0.12 + p * 0.18).fillEllipse(x, oy + 4, spec.rx * 2 * scale + 34, spec.ry * 2 * scale + 26);
        ring.lineStyle(3, 0x7dff8a, 0.6 + p * 0.4).strokeEllipse(x, oy, spec.rx * 2 * scale + 14 + p * 6, spec.ry * 2 * scale + 10 + p * 4);
      }
      if (dish.state === 'ready') ring.lineStyle(3, 0xfff3b0, 0.5 + p * 0.5).strokeEllipse(x, oy, spec.rx * 2 * scale + 16 + p * 6, spec.ry * 2 * scale + 12 + p * 4);
      if (heat || dish.state === 'burnt') {
        const color = dish.state === 'burnt' ? 0x2c2622 : 0xf8f3df;
        for (let j = 0; j < 4; j++) {
          const t = ((run.tick + j * 7) % 28) / 28;
          ring.fillStyle(color, (1 - t) * (dish.state === 'burnt' ? 0.6 : 0.22)).fillCircle(x - 24 + j * 16 + Math.sin(t * 6 + j) * 5, oy - 8 - t * 40, 5 + t * 10);
        }
      }
    }

    // Speech bubble above the cookware with the bowls it still needs.
    if (dish.state === 'raw' && needs.length) {
      const bw = 16 + needs.length * 32;
      const b = bubbleRect(i);
      const bx = x - bw / 2;
      const by = b.y + 4;
      const bh = 34;
      const full = needs.length === 1 && stationFull(run, order.kitchen, recipe.oven);
      const bubble = this.g();
      bubble.fillStyle(fits ? 0xe9ffe9 : 0xf4f6f8, 0.94).fillRoundedRect(bx, by, bw, bh, 8);
      bubble.fillTriangle(x - 7, by + bh, x + 7, by + bh, x, by + bh + 9);
      bubble.lineStyle(fits ? 2.5 : 1.5, fits ? 0x3fcf52 : 0x4a4f55, 1).strokeRoundedRect(bx, by, bw, bh, 8);
      needs.forEach((ingredient, k) => {
        const ix = bx + 24 + k * 32;
        const ready = run.bowls[ingredient];
        const queued = run.prepQueue.includes(ingredient);
        this.img(ix, by + bh / 2 + 1, `bowlfull-${ingredient}`, 32, 22).setAlpha(ready ? 1 : queued ? 0.75 : 0.5);
        if (ready && !full) {
          const dot = this.g();
          dot.fillStyle(0x2f9a45).fillCircle(ix + 12, by + 7, 4.5);
          dot.lineStyle(1, 0xffffff).strokeCircle(ix + 12, by + 7, 4.5);
        }
        this.hits.push({
          x: ix - 16,
          y: by,
          w: 32,
          h: bh,
          action: () => this.runtime.command(ready ? { type: 'add', dishId: dish.id, ingredient } : { type: 'prep', ingredient }),
          drop: (d) => this.addFromDrag(run, dish, d),
          tip: `${INGREDIENT_LABELS[ingredient]} — ${ready ? 'select to drop it in' : queued ? 'being prepared' : 'select to prep a portion'}`,
        });
      });
      if (full) {
        this.text(x, by - 16, `${recipe.oven ? 'OVEN' : 'STOVE'} FULL`, 9, '#ffb08a', { align: 'center', stroke: 3 });
        this.hits.push({ x: bx, y: by - 18, w: bw, h: 16, tip: `Every ${recipe.oven ? 'oven rack' : 'burner'} is busy with another table’s order. Plate those dishes first.` });
      }
    }
    if (dish.state === 'ready') this.stars(x, bubbleRect(i).y + 22, dish.quality, 7.5);
    // Like the original, the star arc appears while cooking and lights up as the dish nears done.
    else if (dish.state === 'cooking' && dish.elapsed > cookTime * 0.3) this.stars(x, bubbleRect(i).y + 22, Math.floor((dish.elapsed / cookTime) * 5), 7.5);

    // Digital timer next to the burner.
    const t = timerRect(i);
    if (dish.state === 'plated') return this.stationHits(run, dish, i, needs, cookware, cookTime);
    const tg = this.g();
    tg.fillStyle(0x3b3f44).fillRoundedRect(t.x - 2, t.y - 2, t.w + 4, t.h + 4, 5);
    tg.fillStyle(0x050505).fillRoundedRect(t.x, t.y, t.w, t.h, 4);
    const value = dish.state === 'cooking' ? pad(Math.ceil(cookTime - dish.elapsed)) : dish.state === 'raw' ? pad(cookTime) : dish.state === 'ready' ? '00' : '--';
    const color = dish.state === 'ready' ? (this.flash(240) ? 0x9dff8a : 0x3a8a3a) : dish.state === 'burnt' ? 0xff4a2a : dish.state === 'raw' ? 0xc9d2d8 : 0xffffff;
    this.digits(tg, t.x + 8, t.y + 6, value, color);

    this.stationHits(run, dish, i, needs, cookware, cookTime);
  }

  private stationHits(run: Run, dish: Dish, i: number, needs: readonly Ingredient[], cookware: Cookware, cookTime: number): void {
    const recipe = RECIPES[dish.recipeId];
    const name = cookwareName(dish);
    const draggable = dish.state === 'ready' || dish.state === 'burnt';
    const needList = needs.map((n) => INGREDIENT_LABELS[n]).join(' + ');
    const tip =
      dish.state === 'raw'
        ? `${recipe.name} — ${cookTime}s in the ${name}. Needs ${needList}.`
        : dish.state === 'cooking'
          ? `${recipe.name} — cooking`
          : dish.state === 'ready'
            ? `${recipe.name} is ready — drag the ${name} to the plate`
            : dish.state === 'burnt'
              ? `Burnt! Drag the ${name} to the trash`
              : `${recipe.name} is plated`;
    this.hits.push({
      ...potRect(i),
      id: `pot-${i}`,
      tip,
      drag: draggable ? { kind: 'pot', dishId: dish.id, cookware } : undefined,
      drop: dish.state === 'raw' ? (d) => this.addFromDrag(run, dish, d) : undefined,
      action: () => {
        if (dish.state === 'ready') this.runtime.command({ type: 'plate', dishId: dish.id });
        else if (dish.state === 'burnt') this.runtime.command({ type: 'discard', dishId: dish.id });
        else if (dish.state === 'raw' && this.selected) {
          this.runtime.command({ type: 'add', dishId: dish.id, ingredient: this.selected });
          this.selected = null;
        } else if (dish.state === 'raw') {
          const ready = needs.find((n) => run.bowls[n]);
          if (ready) this.runtime.command({ type: 'add', dishId: dish.id, ingredient: ready });
        }
      },
    });
    this.hits.push({
      ...plateRect(i),
      id: `plate-${i}`,
      tip: dish.state === 'plated' ? `${recipe.name} — plated` : 'Plate — drag the finished dish here',
      action: dish.state === 'ready' ? () => this.runtime.command({ type: 'plate', dishId: dish.id }) : undefined,
      drop: (d) => d.kind === 'pot' && this.plate(run, d.dishId),
    });
  }

  private addFromDrag(run: Run, dish: Dish, drag: Drag): boolean {
    if (drag.kind !== 'bowl' || !run.bowls[drag.ingredient]) return false;
    this.runtime.command({ type: 'add', dishId: dish.id, ingredient: drag.ingredient });
    return true;
  }

  private pantryItem(run: Run, ingredient: Ingredient, i: number, count: number, needed: number): void {
    const x = bowlX(i, count);
    const ready = run.bowls[ingredient];
    const queue = run.prepQueue.indexOf(ingredient);
    const inHand = this.selected === ingredient || (this.dragging?.kind === 'bowl' && this.dragging.ingredient === ingredient);
    const jiggle = queue === 0 ? Math.sin(this.now / 30) * 1.5 : 0;
    this.img(x + jiggle, PILE_Y, `pile-${ingredient}`, 86, 46);
    if (queue > 0) {
      const badge = this.g();
      badge.fillStyle(0x000000, 0.75).fillCircle(x + 32, PILE_Y - 16, 9);
      badge.lineStyle(1.5, INGREDIENT_COLORS[ingredient]).strokeCircle(x + 32, PILE_Y - 16, 9);
      this.text(x + 32, PILE_Y - 24, String(queue + 1), 11, '#ffffff', { align: 'center' });
    }
    this.img(x, BOWL_Y, ready && !inHand ? `bowlfull-${ingredient}` : `bowl-${ingredient}`, 84, 57).setAlpha(inHand ? 0.6 : 1);
    if (queue === 0) {
      const share = Math.min(1, run.prepElapsed / PREP_SECONDS);
      this.img(x - 6 + share * 6, PILE_Y - 4 + (BOWL_Y - PILE_Y - 8) * share - Math.sin(share * Math.PI) * 30, `food-${ingredient}`, 26, 22);
      this.img(x + 10 - share * 8, PILE_Y - 8 + (BOWL_Y - PILE_Y - 6) * share - Math.sin(share * Math.PI) * 22, `food-${ingredient}`, 18, 15);
    }
    if (ready && !inHand && needed > 0) {
      const glow = this.g().setBlendMode(Phaser.BlendModes.ADD);
      glow.fillStyle(0xfff0b0, 0.08 + this.pulse(220) * 0.1).fillEllipse(x, BOWL_Y - 6, 92, 40);
    }
    if (needed > 0 && !ready && queue < 0) {
      const badge = this.g();
      badge.fillStyle(0xc2412a).fillCircle(x + 34, BOWL_Y - 20, 9);
      badge.lineStyle(1.5, 0xffffff).strokeCircle(x + 34, BOWL_Y - 20, 9);
      this.text(x + 34, BOWL_Y - 27, `${needed}`, 11, '#ffffff', { align: 'center' });
    }
    this.text(x, 521, INGREDIENT_LABELS[ingredient].toUpperCase(), 9, '#f6dfb8', { align: 'center' });
    const label = INGREDIENT_LABELS[ingredient];
    const prep = () => this.runtime.command({ type: 'prep', ingredient });
    this.hits.push({ ...pileRect(i, count), id: `pile-${ingredient}`, action: prep, tip: `Raw ${label.toLowerCase()} — select to prepare a portion` });
    this.hits.push({
      ...bowlRect(i, count),
      id: `bowl-${ingredient}`,
      drag: ready ? { kind: 'bowl', ingredient } : undefined,
      tip: ready
        ? `${label} — drag into a pot or pan${needed ? '' : ' (nothing on this ticket needs it)'}`
        : queue >= 0
          ? `${label} — being prepared`
          : `${label} bowl — select the raw food to prep it`,
      action: () => {
        if (ready) this.selected = this.selected === ingredient ? null : ingredient;
        else prep();
      },
    });
  }
}

function task(run: Run, table: number): string | undefined {
  return run.waiterQueue.find((t) => t.target === table)?.action;
}

export function createGame(runtime: Runtime): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 800,
    height: 600,
    backgroundColor: '#110d0a',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, roundPixels: false },
    audio: { noAudio: true },
    scene: [new ServiceScene(runtime)],
  });
}
