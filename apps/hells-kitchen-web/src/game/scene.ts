import Phaser from 'phaser';
import { dayFor, INGREDIENT_COLORS, INGREDIENT_LABELS, INGREDIENTS, RECIPES } from '../../../../src/features/hells-kitchen/game/content';
import { ARCADE_SECONDS, cookingSeconds, PREP_SECONDS, STEP_SECONDS, WAITER_SECONDS } from '../../../../src/features/hells-kitchen/game/engine';
import type { Command, Dish, Ingredient, Order, Run, Table } from '../../../../src/features/hells-kitchen/game/types';
import { type Guide, neededIngredients, nextStep, stationFull, ticketsFor } from './guide';
import { bowlRect, bowlX, BURNERS, GREET_RECT, NAV_RECTS, PAN_Y, TABLES, ticketRect } from './layout';

export type Runtime = {
  readonly command: (command: Command) => void;
  readonly update: (delta: number) => void;
  readonly pause: () => void;
  readonly ready: () => void;
  readonly failed: (message: string) => void;
  readonly getRun: () => Run | null;
  readonly guidance: () => boolean;
};
type Hit = { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly action: () => void; readonly kind?: string; readonly dishId?: number };
const GOLD = '#e4c587';
const SHORT_LABELS: Record<Ingredient, string> = { vegetables: 'VEG', grain: 'GRAIN', chicken: 'POULTRY', fish: 'SEAFOOD', beef: 'MEAT', dairy: 'DAIRY', fruit: 'FRUIT' };

export class ServiceScene extends Phaser.Scene {
  private runtime: Runtime;
  private background!: Phaser.GameObjects.Image;
  private layer!: Phaser.GameObjects.Container;
  private hits: Hit[] = [];
  private selected: Ingredient | null = null;
  private drawnAt = 0;
  private dragIngredient: Ingredient | null = null;
  private dragStart: { x: number; y: number } | null = null;
  private tooltip!: Phaser.GameObjects.Text;
  private held!: Phaser.GameObjects.Image;
  private lastView = '';
  private loadFailed = false;
  private now = 0;
  private feedbackId = -1;
  private feedbackAt = -10000;

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
    const ingredients = this.textures.get('ingredients');
    const ii = ingredients.getSourceImage() as HTMLImageElement;
    const fw = ii.width / 4;
    const fh = ii.height / 2;
    for (let i = 0; i < 8; i++) ingredients.add(i, 0, (i % 4) * fw, Math.floor(i / 4) * fh, fw, fh);
    // Round food textures cut from the inside of each prep bowl, used for pans and plates.
    INGREDIENTS.forEach((ingredient, i) => {
      const food = this.textures.createCanvas(`food-${ingredient}`, 128, 128);
      if (!food) return;
      const ctx = food.getContext();
      ctx.beginPath();
      ctx.arc(64, 64, 62, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(ii, (i % 4) * fw + fw * 0.2, Math.floor(i / 4) * fh + fh * 0.2, fw * 0.6, fh * 0.6, 0, 0, 128, 128);
      food.refresh();
    });
    // The red kitchen is the blue kitchen with its blue tiles recoloured to deep red.
    const blue = this.textures.get('kitchen').getSourceImage() as HTMLImageElement;
    const red = this.textures.createCanvas('kitchen-red', blue.width, blue.height);
    if (red) {
      const ctx = red.getContext();
      ctx.drawImage(blue, 0, 0);
      const pixels = ctx.getImageData(0, 0, blue.width, blue.height);
      const d = pixels.data;
      for (let p = 0; p < d.length; p += 4) {
        const [r, g, b] = [d[p], d[p + 1], d[p + 2]];
        const blueness = b < 18 ? 0 : Math.min(1, Math.max(0, ((b - Math.max(r, g)) / b - 0.12) / 0.25));
        if (blueness <= 0) continue;
        d[p] = r + (b * 1.05 - r) * blueness;
        d[p + 1] = g * (1 - blueness * 0.45);
        d[p + 2] = b + (r * 0.8 - b) * blueness;
      }
      ctx.putImageData(pixels, 0, 0);
      red.refresh();
    }
    this.background = this.add.image(400, 300, 'dining').setDisplaySize(800, 600);
    this.layer = this.add.container(0, 0);
    this.tooltip = this.add
      .text(0, 0, '', { fontFamily: 'Georgia', fontSize: '15px', color: '#fff1cb', backgroundColor: '#18130eef', padding: { x: 9, y: 6 } })
      .setDepth(20)
      .setVisible(false);
    this.held = this.add.image(0, 0, 'food-vegetables').setDisplaySize(30, 30).setDepth(19).setVisible(false);
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const run = this.runtime.getRun();
      if (run?.status !== 'running') return;
      const hit = this.hit(pointer.x, pointer.y);
      this.dragStart = { x: pointer.x, y: pointer.y };
      this.dragIngredient = hit?.kind?.startsWith('bowl:') ? (hit.kind.slice(5) as Ingredient) : null;
      hit?.action();
      this.draw(run);
    });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const distance = this.dragStart ? Math.hypot(pointer.x - this.dragStart.x, pointer.y - this.dragStart.y) : 0;
      const hit = this.hit(pointer.x, pointer.y);
      if (this.dragIngredient && distance > 12 && hit?.dishId !== undefined) {
        this.runtime.command({ type: 'add', ingredient: this.dragIngredient, dishId: hit.dishId });
        this.selected = null;
      }
      this.dragIngredient = null;
      this.dragStart = null;
      this.tooltip.setVisible(false);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.held.setPosition(pointer.x + 18, pointer.y + 18);
      const hit = this.hit(pointer.x, pointer.y);
      this.game.canvas.style.cursor = hit ? 'pointer' : 'default';
      if (this.dragIngredient && this.runtime.getRun()?.bowls[this.dragIngredient]) {
        this.tooltip
          .setText(INGREDIENT_LABELS[this.dragIngredient])
          .setPosition(Math.min(660, pointer.x + 12), Math.min(570, pointer.y + 12))
          .setVisible(true);
      }
    });
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key.toLowerCase() === 'p') this.runtime.pause();
      if (event.key.toLowerCase() === 'd') this.runtime.command({ type: 'view', view: 'dining' });
      if (event.key.toLowerCase() === 'k') this.runtime.command({ type: 'view', view: 'blue' });
    });
    this.runtime.ready();
  }

  update(time: number, delta: number): void {
    this.now = time;
    this.runtime.update(delta);
    const run = this.runtime.getRun();
    if (!run || !this.layer) return;
    if (time - this.drawnAt >= 80 || this.lastView !== run.view) {
      this.draw(run);
      this.drawnAt = time;
      this.lastView = run.view;
    }
  }

  private hit(x: number, y: number): Hit | undefined {
    return [...this.hits].reverse().find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
  }
  private text(x: number, y: number, text: string, size = 14, color = '#f5e9d7', width?: number, center = false): Phaser.GameObjects.Text {
    const result = this.add.text(x, y, text, {
      fontFamily: 'Georgia, serif',
      fontSize: `${size}px`,
      color,
      stroke: '#130e09',
      strokeThickness: 2,
      wordWrap: width ? { width } : undefined,
      align: center ? 'center' : 'left',
      lineSpacing: 3,
    });
    if (center) result.setOrigin(0.5, 0);
    this.layer.add(result);
    return result;
  }
  private panel(x: number, y: number, w: number, h: number, color = 0x171411, alpha = 0.92, border = 0xa99165): void {
    const g = this.add.graphics();
    g.fillStyle(color, alpha).fillRoundedRect(x, y, w, h, 3);
    g.lineStyle(1, border, 0.8).strokeRoundedRect(x, y, w, h, 3);
    g.lineStyle(1, 0xeee0bd, 0.13).strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, 2);
    this.layer.add(g);
  }
  private button(x: number, y: number, w: number, label: string, action: () => void, active = false, h = 30, alert = false): void {
    const flash = alert && Math.floor(this.now / 300) % 2 === 0;
    this.panel(x, y, w, h, flash ? 0x8a2a16 : active ? 0x725026 : 0x24201b, 0.97, flash ? 0xff8a5c : active ? 0xf0d396 : 0x9b8664);
    this.text(x + w / 2, y + 7, label, 12, active || flash ? '#fff0c7' : '#ded1b6', undefined, true);
    this.hits.push({ x, y, w, h, action });
  }
  private bar(x: number, y: number, w: number, progress: number, color: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x080808, 0.85).fillRoundedRect(x, y, w, 5, 2);
    g.fillStyle(color).fillRoundedRect(x, y, w * Math.max(0, Math.min(1, progress)), 5, 2);
    this.layer.add(g);
  }

  private person(x: number, y: number, frame: number, height: number, seated = false): Phaser.GameObjects.Image {
    const image = this.add
      .image(x, y, 'people', frame)
      .setOrigin(0.5, 1)
      .setDisplaySize(height * 0.75, height);
    // Seated guests show only their upper body above the tabletop.
    if (seated) image.setCrop(0, 0, image.frame.width, image.frame.height * 0.5);
    this.layer.add(image);
    return image;
  }

  private draw(run: Run): void {
    this.layer.removeAll(true);
    this.hits = [];
    const texture = run.view === 'dining' ? 'dining' : run.view === 'red' && this.textures.exists('kitchen-red') ? 'kitchen-red' : 'kitchen';
    if (this.background.texture.key !== texture) this.background.setTexture(texture).setDisplaySize(800, 600);
    if (this.selected && (!run.bowls[this.selected] || run.view === 'dining')) this.selected = null;
    if (run.feedback.id !== this.feedbackId) {
      this.feedbackId = run.feedback.id;
      this.feedbackAt = this.now;
    }
    const guide = nextStep(run, this.selected);
    const hints = this.runtime.guidance() || run.tutorial >= 0;
    if (run.view === 'dining') this.dining(run);
    else this.kitchen(run);
    this.hud(run, guide, hints);
    if (hints && run.status === 'running') this.pointer(run, guide);
    const held = this.selected ?? this.dragIngredient;
    this.held.setVisible(Boolean(held && run.bowls[held]));
    if (held) this.held.setTexture(`food-${held}`);
  }

  private hud(run: Run, guide: Guide, hints: boolean): void {
    const def = dayFor(run.day);
    this.panel(0, 0, 800, 48, 0x100e0b, 0.97);
    this.text(20, 8, 'H K', 27, GOLD);
    this.text(85, 8, run.mode === 'arcade' ? 'ARCADE SERVICE' : `DAY ${run.day}  ·  ${def.challenge ? 'KITCHEN TEST' : 'DINNER SERVICE'}`, 13, GOLD);
    this.text(85, 28, def.name, 10, '#ac9e85');
    const progress = run.mode === 'arcade' ? `${Math.max(0, Math.ceil(ARCADE_SECONDS - run.tick * STEP_SECONDS))}s left` : `${run.completed} / ${def.parties} tables`;
    this.text(600, 17, progress, 13, '#eadbb7', undefined, true);
    this.button(706, 9, 79, 'MENU  Ⅱ', () => this.runtime.pause());

    this.panel(4, 53, 164, 502, 0x0c0a08, 0.9, 0x5e4f36);
    this.panel(12, 61, 147, 231, 0x211a14, 0.94);
    const talking = this.now - this.feedbackAt < 3500;
    const pose = run.anger > 60 || (talking && run.feedback.kind === 'bad') ? 2 : talking && run.feedback.kind === 'good' ? 1 : 0;
    const portrait = this.add.image(85.5, 154, 'chef', pose).setDisplaySize(139, 186);
    this.layer.add(portrait);
    if (talking) {
      const bad = run.feedback.kind === 'bad' || run.feedback.kind === 'warning';
      this.panel(15, 190, 141, 60, bad ? 0x3a130c : 0xf1e7cf, 0.96, bad ? 0xff7a52 : 0xc9a45c);
      const tail = this.add.graphics();
      tail.fillStyle(bad ? 0x3a130c : 0xf1e7cf, 0.96).fillTriangle(70, 190, 86, 190, 80, 180);
      this.layer.add(tail);
      this.text(85.5, 196, run.feedback.text, 9.5, bad ? '#ffd2c2' : '#2b1c10', 130, true).setStroke('#000000', bad ? 2 : 0);
    }
    this.text(85, 254, 'CHEF RAMSAY', 12, GOLD, undefined, true);
    this.text(85, 273, run.anger > 65 ? 'LOSING PATIENCE' : run.anger > 25 ? 'STAY FOCUSED' : 'EXPECTING PERFECTION', 8, '#cabca5', undefined, true);
    this.panel(16, 300, 139, 50, 0x17110e, 0.96);
    this.text(26, 305, 'RAMSAY’S TEMPER', 10, run.anger > 60 ? '#ff9a7a' : '#d5bd96');
    this.bar(26, 323, 117, run.anger / 100, run.anger > 60 ? 0xe54829 : 0xeab053);
    this.text(26, 332, 'Mistakes raise it. Full = fired.', 7.5, '#9d8e75');
    this.text(85, 358, run.served ? '★'.repeat(Math.max(1, Math.round(run.qualityTotal / run.served))).padEnd(5, '☆') : '☆☆☆☆☆', 20, GOLD, undefined, true);
    this.text(85, 384, `${run.served} orders served`, 11, '#d9c6a5', undefined, true);

    this.panel(14, 405, 146, 147, hints ? 0x1d1a10 : 0x181613, 0.97, hints ? 0xe4c587 : 0xa99165);
    if (hints) {
      this.text(25, 413, 'NEXT STEP', 9, '#9d8e75');
      const title = this.text(25, 427, guide.title, 12, GOLD, 126);
      this.text(25, 433 + title.height, guide.text, 9.5, '#f1e6d1', 126);
    } else {
      this.text(25, 416, 'CHEF’S NOTES', 10, GOLD);
      this.text(25, 438, run.feedback.text, 12, run.feedback.kind === 'bad' ? '#ffb395' : '#e8dfcd', 122);
    }
    this.panel(0, 559, 800, 41, 0x14120f, 0.98);
    const pendingIn = (kitchen: 'blue' | 'red') => run.orders.filter((o) => o.kitchen === kitchen && o.dishes.some((d) => d.state !== 'plated')).length;
    const alert = (kitchen: 'blue' | 'red') => run.view !== kitchen && run.orders.some((o) => o.kitchen === kitchen && o.dishes.some((d) => d.state === 'ready' || d.state === 'burnt'));
    const kitchenLabel = (kitchen: 'blue' | 'red', key: string) => `${alert(kitchen) ? '! ' : ''}${kitchen.toUpperCase()} KITCHEN${pendingIn(kitchen) ? `  (${pendingIn(kitchen)})` : key}`;
    this.button(NAV_RECTS.dining.x, NAV_RECTS.dining.y, NAV_RECTS.dining.w, 'DINING ROOM  [D]', () => this.runtime.command({ type: 'view', view: 'dining' }), run.view === 'dining');
    this.button(
      NAV_RECTS.blue.x,
      NAV_RECTS.blue.y,
      NAV_RECTS.blue.w,
      kitchenLabel('blue', '  [K]'),
      () => this.runtime.command({ type: 'view', view: 'blue' }),
      run.view === 'blue',
      30,
      alert('blue'),
    );
    if (def.challenge)
      this.button(NAV_RECTS.red.x, NAV_RECTS.red.y, NAV_RECTS.red.w, kitchenLabel('red', ''), () => this.runtime.command({ type: 'view', view: 'red' }), run.view === 'red', 30, alert('red'));
    this.text(785, 577, run.orders.length ? `${run.orders.length} open orders` : 'Ready for service', 11, '#a99575', undefined).setOrigin(1, 0);
  }

  private pointer(run: Run, guide: Guide): void {
    const target = guide.target;
    if (!target) return;
    const pulse = 0.5 + Math.sin(this.now / 160) * 0.5;
    const bob = Math.sin(this.now / 170) * 5;
    const g = this.add.graphics();
    g.lineStyle(3, 0xffd66b, 0.45 + pulse * 0.5).strokeRoundedRect(target.x - 4 - pulse * 3, target.y - 4 - pulse * 3, target.w + 8 + pulse * 6, target.h + 8 + pulse * 6, 8);
    const cx = target.x + target.w / 2;
    const above = target.y > 110;
    const tip = above ? target.y - 6 + bob : target.y + target.h + 6 - bob;
    const dir = above ? -1 : 1;
    g.fillStyle(0x1a1208, 0.9).fillTriangle(cx - 16, tip + dir * 26, cx + 16, tip + dir * 26, cx, tip + dir * -2);
    g.fillStyle(0xffd66b).fillTriangle(cx - 12, tip + dir * 23, cx + 12, tip + dir * 23, cx, tip);
    g.fillStyle(0xffd66b).fillRect(cx - 4, above ? tip - 36 : tip + 22, 8, 14);
    this.layer.add(g);
    const pan = run.view !== 'dining' && target.y > 200 && target.y < 300;
    if (pan) return;
    const caption = this.add
      .text(0, 0, guide.title.toUpperCase(), { fontFamily: 'Georgia, serif', fontSize: '12px', color: '#1c1206', backgroundColor: '#ffd66bf2', padding: { x: 8, y: 4 } })
      .setOrigin(0.5, above ? 1 : 0);
    const half = caption.width / 2;
    if (target.y > 550)
      caption
        .setText(`◀  ${guide.title.toUpperCase()}`)
        .setOrigin(0, 0.5)
        .setPosition(NAV_RECTS.red.x + NAV_RECTS.red.w + 12, 581);
    else caption.setPosition(Math.max(174 + half, Math.min(796 - half, cx)), above ? tip - 38 : tip + 38);
    this.layer.add(caption);
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
    if (run.waiting) {
      for (let i = 0; i < Math.min(3, run.waiting); i++) this.person(690 - i * 22, 252, 1 + (i % 3), 85);
    }
    const task = run.waiterQueue[0];
    const from = run.waiterTable >= 0 ? TABLES[run.waiterTable] : [674, 231];
    const target = task ? TABLES[task.target] : from;
    const p = Math.min(1, run.waiterElapsed / WAITER_SECONDS);
    const wx = from[0] + (target[0] - from[0]) * p;
    const wy = from[1] + (target[1] - from[1]) * p;
    this.person(wx + 67, wy + 45, task && Math.floor(run.tick / 3) % 2 ? 4 : 0, 105 + wy * 0.05);

    const pulse = 0.5 + Math.sin(this.now / 200) * 0.5;
    for (let i = 0; i < def.tables; i++) {
      const table = run.tables[i];
      const [x, y] = TABLES[i];
      const order = run.orders.find((o) => o.tableId === i);
      const ready = Boolean(order?.dishes.every((d) => d.state === 'plated'));
      const queued = run.waiterQueue.findIndex((t) => t.target === i);
      const labels: Record<Table['stage'], string> = {
        empty: 'EMPTY',
        reading: 'READING THE MENU',
        order: 'READY TO ORDER',
        waiting: ready ? 'FOOD READY — SERVE' : 'WAITING FOR FOOD',
        eating: 'EATING',
        clear: 'FINISHED — CLEAR',
      };
      const actionable = queued < 0 && (['order', 'clear'].includes(table.stage) || (table.stage === 'waiting' && ready));
      if (actionable) {
        const bx = x - 70;
        const by = y + 7;
        const r = 11 + pulse * 2;
        const bell = this.add.graphics();
        bell.fillStyle(0x4fc3ff, 0.25).fillCircle(bx, by, r + 7);
        bell.fillStyle(0x1f8fd6).fillCircle(bx, by, r);
        bell.lineStyle(2, 0xe6f7ff).strokeCircle(bx, by, r);
        this.layer.add(bell);
        this.text(bx, by - 9, '!', 14, '#ffffff', undefined, true);
      }
      this.panel(x - 55, y - 11, 110, 37, actionable ? 0x1f4f63 : 0x16140f, table.stage === 'empty' ? 0.6 : 0.94, actionable ? 0x8fdcf0 : 0xa9956f);
      this.text(x, y - 6, `TABLE ${i + 1}`, 9, GOLD, undefined, true);
      this.text(x, y + 7, queued >= 0 ? `WAITER COMING  #${queued + 1}` : labels[table.stage], 8, actionable ? '#d5f8ff' : queued >= 0 ? '#f3dd9f' : '#d6c7aa', undefined, true);
      if (table.stage !== 'empty' && table.stage !== 'eating' && table.stage !== 'reading') this.bar(x - 45, y + 20, 90, table.patience / def.patience, table.patience < 20 ? 0xe45d39 : 0x76b8c4);
      if (table.stage === 'reading' || table.stage === 'eating') this.bar(x - 45, y + 20, 90, table.elapsed / (table.stage === 'reading' ? 3 : 6), 0x6f6552);
      this.hits.push({ x: x - 65, y: y - 35, w: 130, h: 75, action: () => this.runtime.command({ type: 'table', id: i }) });
    }
    this.button(GREET_RECT.x, GREET_RECT.y, GREET_RECT.w, run.waiting ? `GREET GUESTS  (${run.waiting})` : 'RECEPTION', () => this.runtime.command({ type: 'seat' }), run.waiting > 0, GREET_RECT.h);
    if (run.waiting) this.bar(663, 169, 110, run.waitingPatience / def.patience, 0xd8b775);
    this.panel(196, 62, 420, 28, 0x18130e, 0.8);
    this.text(406, 68, 'Blue ! = table needs you · Bars = guest patience · Click a table to act', 10, '#cbbd9f', undefined, true);
  }

  private kitchen(run: Run): void {
    const def = dayFor(run.day);
    const view = run.view as 'blue' | 'red';
    const orders = ticketsFor(run, view);
    const flash = Math.floor(this.now / 300) % 2 === 0;
    orders.forEach((o, i) => {
      const { x, y, w, h } = ticketRect(i);
      const allReady = o.dishes.every((d) => d.state === 'plated');
      const warning = o.dishes.some((d) => d.state === 'ready' || d.state === 'burnt');
      const active = run.selectedOrder === o.id;
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.35).fillRect(x + 3, y + 3, w, h);
      g.fillStyle(active ? 0xfff6dc : 0xe9dfc4, active ? 1 : 0.92).fillRect(x, y, w, h);
      g.fillStyle(allReady ? 0x3f8a4e : warning ? 0xc0492c : 0x2a5f7c).fillRect(x, y, w, 5);
      if (active) g.lineStyle(2, 0xf0c46a).strokeRect(x - 1, y - 1, w + 2, h + 2);
      if (warning && flash) g.lineStyle(3, 0xff5a36).strokeRect(x - 2, y - 2, w + 4, h + 4);
      o.dishes.forEach((dish, j) => {
        const dx = x + 13 + j * 17;
        const dy = y + 30;
        const cooking = dish.state === 'cooking' ? Math.min(1, dish.elapsed / cookingSeconds(dish.recipeId, run.day)) : 0;
        if (dish.state === 'raw') g.fillStyle(0xffffff).fillCircle(dx, dy, 6).lineStyle(1.5, 0x7a6448).strokeCircle(dx, dy, 6);
        else if (dish.state === 'cooking') {
          g.fillStyle(0xcfe3ef).fillCircle(dx, dy, 6);
          g.fillStyle(0x2f78b7)
            .slice(dx, dy, 6, -Math.PI / 2, -Math.PI / 2 + cooking * Math.PI * 2)
            .fillPath();
        } else if (dish.state === 'ready') g.fillStyle(flash ? 0x5bd36b : 0x2f9a45).fillCircle(dx, dy, 6.5);
        else if (dish.state === 'burnt') g.fillStyle(0x1b1411).fillCircle(dx, dy, 6).lineStyle(2, 0xe04b2a).strokeCircle(dx, dy, 6);
        else g.fillStyle(0xd6a93c).fillCircle(dx, dy, 6);
      });
      this.layer.add(g);
      this.text(x + 8, y + 8, `TABLE ${o.tableId + 1}`, 11, '#2a1d12').setStroke('#000000', 0);
      this.text(x + 104, y + 9, allReady ? '✓ DONE' : warning ? 'HURRY!' : active ? 'OPEN' : '', 9, allReady ? '#2d6b39' : warning ? '#b3301a' : '#7a5a2a')
        .setStroke('#000000', 0)
        .setOrigin(1, 0);
      this.bar(x + 8, y + 39, 96, run.tables[o.tableId].patience / def.patience, run.tables[o.tableId].patience < 20 ? 0xd9542f : 0x3f86a6);
      this.hits.push({ x, y, w, h, action: () => this.runtime.command({ type: 'select', id: o.id }) });
    });
    const order = orders.find((o) => o.id === run.selectedOrder);
    if (!order) {
      this.panel(230, 140, 500, 86, 0x101418, 0.9);
      this.text(480, 154, 'YOUR STATION IS READY', 19, GOLD, undefined, true);
      const hint = orders.length
        ? 'Click an order ticket above to see its recipes.'
        : def.challenge || run.mode === 'arcade'
          ? 'Orders arrive on their own today. Click the bowls below to prep ingredients while you wait.'
          : 'Take an order in the dining room. You can prep ingredients now by clicking the bowls below.';
      this.text(480, 186, hint, 12, '#d9d9d0', 460, true);
    } else {
      order.dishes.forEach((dish, i) => this.station(run, order, dish, BURNERS[i]));
      if (order.dishes.every((d) => d.state === 'plated'))
        this.button(
          290,
          414,
          380,
          def.challenge || run.mode === 'arcade' ? 'ORDER SENT' : 'ORDER READY — SERVE IN THE DINING ROOM',
          () => this.runtime.command({ type: 'view', view: 'dining' }),
          true,
          28,
        );
    }
    const needed = neededIngredients(run, view);
    INGREDIENTS.forEach((ingredient, index) => this.bowl(run, ingredient, index, needed[ingredient]));
  }

  private station(run: Run, order: Order, dish: Dish, x: number): void {
    const recipe = RECIPES[dish.recipeId];
    const cookingTime = cookingSeconds(dish.recipeId, run.day);
    const heat = dish.state === 'cooking' || dish.state === 'ready';
    const held = this.selected ?? this.dragIngredient;
    const heldReady = held !== null && run.bowls[held];
    const fits = heldReady && dish.state === 'raw' && recipe.ingredients.includes(held) && !dish.loaded.includes(held);
    const pulse = 0.5 + Math.sin(this.now / 150) * 0.5;
    // Paper recipe ticket above the burner, with one icon slot per ingredient.
    const card = this.add.graphics();
    card.fillStyle(0x000000, 0.35).fillRect(x - 60, 122, 124, 96);
    card.fillStyle(0xf1e7cf, 0.97).fillRect(x - 63, 119, 124, 96);
    card.fillStyle(recipe.oven ? 0xb5532a : 0x2a5f7c).fillRect(x - 63, 119, 124, 16);
    this.layer.add(card);
    this.text(x - 1, 120, `${recipe.oven ? 'OVEN' : 'STOVE'}  ·  ${cookingTime}s`, 9, '#fff4dc', undefined, true).setStroke('#000000', 0);
    this.text(x - 1, 138, recipe.name, 10.5, '#2b1c10', 116, true).setStroke('#000000', 0);
    const n = recipe.ingredients.length;
    recipe.ingredients.forEach((ingredient, k) => {
      const sx = x - 1 + (k - (n - 1) / 2) * 38;
      const sy = 184;
      const loaded = dish.loaded.includes(ingredient);
      const ready = run.bowls[ingredient];
      const prepping = run.prepQueue.includes(ingredient);
      const slot = this.add.graphics();
      slot.fillStyle(0x2a2118, loaded || ready ? 0.9 : 0.35).fillCircle(sx, sy, 15);
      slot.lineStyle(3, INGREDIENT_COLORS[ingredient], loaded || ready ? 1 : 0.55).strokeCircle(sx, sy, 15);
      if (!loaded && dish.state === 'raw' && ready) slot.lineStyle(2, 0xffc43d, 0.4 + pulse * 0.6).strokeCircle(sx, sy, 18);
      this.layer.add(slot);
      const icon = this.add.image(sx, sy, `food-${ingredient}`).setDisplaySize(25, 25);
      if (!loaded && !ready) icon.setAlpha(prepping ? 0.65 : 0.35).setTint(0xa09a90);
      this.layer.add(icon);
      if (loaded) {
        const tick = this.add.graphics();
        tick.fillStyle(0x2f9a45).fillCircle(sx + 11, sy - 11, 7);
        this.layer.add(tick);
        this.text(sx + 11, sy - 19, '✓', 10, '#ffffff', undefined, true).setStroke('#000000', 0);
      }
      this.text(sx, 201, SHORT_LABELS[ingredient], 7.5, loaded ? '#2d6b39' : '#5a4630', undefined, true).setStroke('#000000', 0);
    });
    if (heldReady && !fits && dish.state === 'raw') {
      const dim = this.add.graphics();
      dim.fillStyle(0x000000, 0.4).fillRect(x - 63, 119, 124, 96);
      this.layer.add(dim);
    }
    const g = this.add.graphics();
    const y = PAN_Y;
    if (heat && !recipe.oven) {
      for (let f = 0; f < 10; f++) {
        const a = (f / 10) * Math.PI * 2 + run.tick * 0.05;
        const fx = x + Math.cos(a) * 36;
        const fy = y + 12 + Math.sin(a) * 9;
        const h = 8 + Math.sin(run.tick * 0.9 + f * 1.7) * 3;
        g.fillStyle(0x2f6bff, 0.8).fillTriangle(fx - 3, fy, fx, fy - h, fx + 3, fy);
        g.fillStyle(0x9fd0ff, 0.7).fillTriangle(fx - 1.5, fy, fx, fy - h * 0.55, fx + 1.5, fy);
      }
    }
    if (fits) g.fillStyle(0x7dff8a, 0.18 + pulse * 0.22).fillEllipse(x, y + 2, 132, 50);
    if (recipe.oven) {
      if (heat) g.fillStyle(0xff8a2a, 0.22 + Math.sin(run.tick * 0.2) * 0.05).fillEllipse(x, y + 4, 128, 44);
      g.fillStyle(0x000000, 0.45).fillEllipse(x + 3, y + 16, 108, 22);
      g.fillStyle(0x3b3f43).fillRoundedRect(x - 50, y - 12, 100, 30, 6);
      g.fillStyle(0x6b7176).fillRoundedRect(x - 46, y - 14, 92, 24, 5);
      g.fillStyle(0x24282b).fillRoundedRect(x - 40, y - 11, 80, 18, 4);
      g.fillStyle(0x6b7176)
        .fillRect(x - 58, y - 6, 10, 5)
        .fillRect(x + 48, y - 6, 10, 5);
    } else {
      g.fillStyle(0x000000, 0.45).fillEllipse(x + 3, y + 14, 100, 22);
      g.fillStyle(0x1d1f22).fillRoundedRect(x + 40, y - 6, 42, 8, 4);
      g.fillStyle(0x3a3d41).fillEllipse(x, y + 4, 92, 30);
      g.fillStyle(0x8c9399).fillEllipse(x, y, 92, 30);
      g.fillStyle(0x1e2123).fillEllipse(x, y + 1, 80, 23);
    }
    if (fits) g.lineStyle(3, 0x7dff8a, 0.6 + pulse * 0.4).strokeEllipse(x, y + 2, 112 + pulse * 6, 40 + pulse * 3);
    this.layer.add(g);
    dish.loaded.forEach((ingredient, index) => {
      const count = dish.loaded.length;
      const offset = count === 1 ? 0 : (index - (count - 1) / 2) * 20;
      const food = this.add.image(x + offset, y + 1 + (index % 2) * 2, `food-${ingredient}`).setDisplaySize(count === 1 ? 68 : 46, count === 1 ? 19 : 15);
      const progress = dish.state === 'cooking' ? dish.elapsed / cookingTime : 0;
      if (dish.state === 'burnt') food.setTint(0x2a1d14);
      else if (dish.state === 'ready' || dish.state === 'plated') food.setTint(0xd8a878);
      else if (progress > 0) food.setTint(Phaser.Display.Color.GetColor(255 - progress * 40, 255 - progress * 70, 255 - progress * 110));
      this.layer.add(food);
    });
    const smoke = this.add.graphics();
    if (heat || dish.state === 'burnt') {
      const color = dish.state === 'burnt' ? 0x2c2622 : 0xf8f3df;
      for (let j = 0; j < 4; j++) {
        const t = ((run.tick + j * 7) % 28) / 28;
        smoke.fillStyle(color, (1 - t) * (dish.state === 'burnt' ? 0.55 : 0.22)).fillCircle(x - 24 + j * 16 + Math.sin(t * 6 + j) * 5, y - 10 - t * 34, 5 + t * 9);
      }
    }
    if (dish.state === 'cooking') {
      const p = Math.min(1, dish.elapsed / cookingTime);
      smoke.fillStyle(0x0d1114, 0.9).fillCircle(x + 52, y - 12, 15);
      smoke
        .lineStyle(4, 0x78c0dd)
        .beginPath()
        .arc(x + 52, y - 12, 12, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2)
        .strokePath();
    }
    if (dish.state === 'ready') {
      smoke.lineStyle(3, 0x9dff8a, 0.5 + pulse * 0.5).strokeEllipse(x, y, 104 + pulse * 6, 38 + pulse * 3);
      const burn = Math.min(1, dish.elapsed / 8);
      smoke.fillStyle(0x0d1114, 0.85).fillRoundedRect(x - 40, y + 22, 80, 6, 3);
      smoke.fillStyle(burn > 0.6 ? 0xe5482a : 0xf0b43c).fillRoundedRect(x - 40, y + 22, 80 * (1 - burn), 6, 3);
    }
    this.layer.add(smoke);
    if (dish.state === 'cooking') this.text(x + 52, y - 19, String(Math.max(1, Math.ceil(cookingTime - dish.elapsed))), 11, '#e6f6ff', undefined, true);
    const remaining = recipe.ingredients.length - dish.loaded.length;
    const full = dish.state === 'raw' && remaining === 1 && stationFull(run, order.kitchen, recipe.oven);
    const stateText =
      dish.state === 'cooking'
        ? `COOKING  ${Math.max(1, Math.ceil(cookingTime - dish.elapsed))}s`
        : dish.state === 'ready'
          ? 'READY — CLICK TO PLATE!'
          : dish.state === 'burnt'
            ? 'BURNT — CLICK TO BIN IT'
            : dish.state === 'plated'
              ? 'ON THE PASS ✓'
              : fits
                ? '▼  CLICK TO ADD HERE'
                : full
                  ? `${recipe.oven ? 'OVEN' : 'BURNERS'} FULL — WAIT`
                  : `ADD ${remaining} INGREDIENT${remaining === 1 ? '' : 'S'}`;
    const tone = dish.state === 'ready' || fits ? 0x1f5a36 : dish.state === 'burnt' ? 0x74261a : 0x111519;
    this.panel(x - 68, 306, 136, 22, tone, 0.95, dish.state === 'ready' || fits ? 0x9dff8a : 0x8a98a0);
    this.text(x, 310, stateText, 9, dish.state === 'ready' || fits ? '#e2ffd8' : '#ecdcbd', undefined, true);
    if (dish.state === 'ready' || dish.state === 'plated') {
      this.panel(x - 42, 334, 84, 17, 0x0e0c0a, 0.8, 0x6a5a3e);
      this.text(x, 334, '★'.repeat(Math.round(dish.quality)) + '☆'.repeat(5 - Math.round(dish.quality)), 11, GOLD, undefined, true);
    }
    if (dish.state === 'plated') {
      const plate = this.add.image(x, 386, 'ingredients', 7).setDisplaySize(96, 40);
      this.layer.add(plate);
      recipe.ingredients.forEach((ingredient, index) => {
        const food = this.add
          .image(x - 14 + index * 14, 384 + (index % 2) * 2, `food-${ingredient}`)
          .setDisplaySize(34, 12)
          .setTint(0xe8c9a8);
        this.layer.add(food);
      });
    }
    this.hits.push({
      x: x - 66,
      y: 119,
      w: 132,
      h: 209,
      dishId: dish.id,
      action: () => {
        if (dish.state === 'ready') this.runtime.command({ type: 'plate', dishId: dish.id });
        else if (dish.state === 'burnt') this.runtime.command({ type: 'discard', dishId: dish.id });
        else if (this.selected) {
          this.runtime.command({ type: 'add', dishId: dish.id, ingredient: this.selected });
          this.selected = null;
        }
      },
    });
    // Shortcut: clicking a missing ingredient icon preps it, or adds it once its bowl is ready.
    if (dish.state === 'raw' && !this.selected)
      recipe.ingredients.forEach((ingredient, k) => {
        if (dish.loaded.includes(ingredient)) return;
        const sx = x - 1 + (k - (n - 1) / 2) * 38;
        this.hits.push({
          x: sx - 17,
          y: 167,
          w: 34,
          h: 44,
          action: () => this.runtime.command(run.bowls[ingredient] ? { type: 'add', dishId: dish.id, ingredient } : { type: 'prep', ingredient }),
        });
      });
  }

  private bowl(run: Run, ingredient: Ingredient, index: number, needed: number): void {
    const x = bowlX(index);
    const ready = run.bowls[ingredient];
    const queue = run.prepQueue.indexOf(ingredient);
    const selected = this.selected === ingredient;
    const color = INGREDIENT_COLORS[ingredient];
    const g = this.add.graphics();
    g.fillStyle(0x0a0806, 0.5).fillEllipse(x + 3, 503, 70, 16);
    if (ready) g.fillStyle(0xffe6a0, selected ? 0.55 : 0.25 + Math.sin(run.tick * 0.3 + index) * 0.08).fillEllipse(x, 484, 86, 58);
    g.lineStyle(4, color, ready ? 0.95 : 0.5).strokeEllipse(x, 492, 72, 26);
    if (selected) g.lineStyle(3, 0xffd77a).strokeEllipse(x, 480, 88, 60);
    this.layer.add(g);
    const bowl = this.add
      .image(x, 484 + (selected ? -8 : 0), 'ingredients', index)
      .setDisplaySize(70, 48)
      .setAlpha(ready ? 1 : queue >= 0 ? 0.7 : 0.42);
    if (!ready) bowl.setTint(0x8f877c);
    this.layer.add(bowl);
    if (queue > 0) {
      const bob = Math.sin(this.now / 220 + index) * 4;
      const icon = this.add.image(x, 438 + bob, `food-${ingredient}`).setDisplaySize(26, 26);
      const ring = this.add.graphics();
      ring.fillStyle(0x16110c, 0.9).fillCircle(x, 438 + bob, 16);
      ring.lineStyle(2, color).strokeCircle(x, 438 + bob, 16);
      this.layer.add([ring, icon]);
      this.text(x + 15, 424 + bob, String(queue + 1), 10, '#fff0c7', undefined, true);
    }
    if (needed > 0 && !ready) {
      const badge = this.add.graphics();
      badge.fillStyle(0xc2412a).fillCircle(x + 29, 462, 10);
      badge.lineStyle(1.5, 0xffe2c8).strokeCircle(x + 29, 462, 10);
      this.layer.add(badge);
      this.text(x + 29, 455, `×${needed}`, 9, '#ffffff', undefined, true).setStroke('#000000', 0);
    }
    const g2 = this.add.graphics();
    g2.fillStyle(0x120e0b, 0.88).fillRoundedRect(x - 37, 513, 74, 38, 3);
    g2.fillStyle(color, ready ? 1 : 0.6).fillRect(x - 37, 513, 74, 4);
    g2.lineStyle(1, ready ? 0xc7b27c : 0x6d5c43, 0.8).strokeRoundedRect(x - 37, 513, 74, 38, 3);
    this.layer.add(g2);
    this.text(x, 519, INGREDIENT_LABELS[ingredient], 10, '#fff0d0', undefined, true);
    const state = ready ? (selected ? 'IN YOUR HAND' : '✓ READY') : queue === 0 ? 'PREPPING…' : queue > 0 ? `QUEUED #${queue + 1}` : needed > 0 ? 'NEEDED — PREP' : 'CLICK TO PREP';
    this.text(x, 535, state, 8, ready ? '#c7f6b7' : needed > 0 && queue < 0 ? '#ffb89c' : '#cdb994', undefined, true);
    if (queue === 0) this.bar(x - 28, 507, 56, run.prepElapsed / PREP_SECONDS, 0xe8cc83);
    this.hits.push({
      ...bowlRect(index),
      kind: `bowl:${ingredient}`,
      action: () => {
        if (ready) this.selected = selected ? null : ingredient;
        else this.runtime.command({ type: 'prep', ingredient });
      },
    });
  }
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
