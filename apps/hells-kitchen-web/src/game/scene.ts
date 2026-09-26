import Phaser from 'phaser';
import { dayFor, INGREDIENT_LABELS, INGREDIENTS, RECIPES, TUTORIAL } from '../../../../src/features/hells-kitchen/game/content';
import { ARCADE_SECONDS, cookingSeconds, PREP_SECONDS, STEP_SECONDS } from '../../../../src/features/hells-kitchen/game/engine';
import type { Command, Ingredient, Run } from '../../../../src/features/hells-kitchen/game/types';

export type Runtime = {
  readonly command: (command: Command) => void;
  readonly update: (delta: number) => void;
  readonly pause: () => void;
  readonly ready: () => void;
  readonly failed: (message: string) => void;
  readonly getRun: () => Run | null;
};
type Hit = { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly action: () => void; readonly kind?: string; readonly dishId?: number };
const GOLD = '#e4c587';
const TABLES = [
  [342, 258],
  [582, 270],
  [337, 392],
  [614, 400],
  [484, 525],
] as const;
const BURNERS = [354, 500, 646] as const;

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
  private lastView = '';
  private loadFailed = false;

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
  private button(x: number, y: number, w: number, label: string, action: () => void, active = false, h = 30): void {
    this.panel(x, y, w, h, active ? 0x725026 : 0x24201b, 0.97, active ? 0xf0d396 : 0x9b8664);
    this.text(x + w / 2, y + 7, label, 12, active ? '#fff0c7' : '#ded1b6', undefined, true);
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
    if (this.selected && !run.bowls[this.selected]) this.selected = null;
    if (run.view === 'dining') this.dining(run);
    else this.kitchen(run);
    this.hud(run);
  }

  private hud(run: Run): void {
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
    const pose = run.anger > 60 ? 2 : run.feedback.kind === 'good' ? 1 : 0;
    const portrait = this.add.image(85.5, 154, 'chef', pose).setDisplaySize(139, 186);
    this.layer.add(portrait);
    this.text(85, 254, 'CHEF RAMSAY', 12, GOLD, undefined, true);
    this.text(85, 273, run.anger > 65 ? 'LOSING PATIENCE' : run.anger > 25 ? 'STAY FOCUSED' : 'EXPECTING PERFECTION', 8, '#cabca5', undefined, true);
    this.panel(16, 303, 139, 45, 0x17110e, 0.96);
    this.text(26, 310, 'KITCHEN HEAT', 10, '#d5bd96');
    this.bar(26, 332, 117, run.anger / 100, run.anger > 60 ? 0xe54829 : 0xeab053);
    this.text(85, 360, run.served ? '★'.repeat(Math.max(1, Math.round(run.qualityTotal / run.served))).padEnd(5, '☆') : '☆☆☆☆☆', 20, GOLD, undefined, true);
    this.text(85, 386, `${run.served} orders served`, 11, '#d9c6a5', undefined, true);

    if (run.tutorial >= 0) {
      this.panel(14, 409, 146, 143, 0x181613, 0.97);
      this.text(25, 419, `CHEF’S NOTES  ${run.tutorial + 1}/6`, 9, GOLD);
      this.text(25, 438, TUTORIAL[run.tutorial], 10, '#f1e6d1', 122);
      this.button(25, 521, 63, 'NEXT', () => this.runtime.command({ type: 'tutorial-next' }), false, 23);
      this.button(94, 521, 54, 'SKIP', () => this.runtime.command({ type: 'tutorial-skip' }), false, 23);
    } else {
      this.panel(14, 417, 146, 128, 0x181613, 0.94);
      this.text(25, 428, 'CHEF’S NOTES', 10, GOLD);
      this.text(25, 450, run.feedback.text, 12, run.feedback.kind === 'bad' ? '#ffb395' : '#e8dfcd', 122);
    }
    this.panel(0, 559, 800, 41, 0x14120f, 0.98);
    const pendingIn = (kitchen: 'blue' | 'red') => run.orders.filter((o) => o.kitchen === kitchen && o.dishes.some((d) => d.state !== 'plated')).length;
    const count = (kitchen: 'blue' | 'red') => (def.challenge && pendingIn(kitchen) ? `  (${pendingIn(kitchen)})` : '');
    this.button(15, 566, 146, 'DINING ROOM  [D]', () => this.runtime.command({ type: 'view', view: 'dining' }), run.view === 'dining');
    this.button(172, 566, 146, def.challenge ? `BLUE KITCHEN${count('blue')}` : 'BLUE KITCHEN  [K]', () => this.runtime.command({ type: 'view', view: 'blue' }), run.view === 'blue');
    if (def.challenge) this.button(329, 566, 146, `RED KITCHEN${count('red')}`, () => this.runtime.command({ type: 'view', view: 'red' }), run.view === 'red');
    this.text(785, 577, run.orders.length ? `${run.orders.length} open orders` : 'Ready for service', 11, '#a99575', undefined).setOrigin(1, 0);
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
      const order = run.orders.find((o) => o.tableId === i);
      const ready = order?.dishes.every((d) => d.state === 'plated');
      const queued = run.waiterQueue.findIndex((t) => t.target === i);
      const labels: Record<string, string> = {
        empty: 'AVAILABLE',
        reading: 'CHOOSING',
        order: 'TAKE ORDER',
        waiting: ready ? 'SERVE NOW' : 'IN THE KITCHEN',
        eating: 'ENJOYING',
        clear: 'CLEAR TABLE',
      };
      const actionable = ['order', 'clear'].includes(table.stage) || ready;
      this.panel(x - 53, y - 9, 106, 33, actionable ? 0x264654 : 0x16140f, table.stage === 'empty' ? 0.6 : 0.94, actionable ? 0x82c5d5 : 0xa9956f);
      this.text(x, y - 3, `TABLE ${i + 1}${queued >= 0 ? `  • ${queued + 1}` : ''}`, 9, GOLD, undefined, true);
      this.text(x, y + 10, labels[table.stage], 8, actionable ? '#d5f8ff' : '#d6c7aa', undefined, true);
      if (table.stage !== 'empty' && table.stage !== 'eating') this.bar(x - 45, y + 27, 90, table.patience / def.patience, table.patience < 20 ? 0xe45d39 : 0x76b8c4);
      this.hits.push({ x: x - 65, y: y - 35, w: 130, h: 75, action: () => this.runtime.command({ type: 'table', id: i }) });
    }
    if (run.waiting) {
      for (let i = 0; i < Math.min(3, run.waiting); i++) this.person(690 - i * 22, 252, 1 + (i % 3), 85);
    }
    this.button(653, 129, 130, run.waiting ? `GREET GUESTS  (${run.waiting})` : 'RECEPTION', () => this.runtime.command({ type: 'seat' }), run.waiting > 0, 34);
    if (run.waiting) this.bar(663, 169, 110, run.waitingPatience / def.patience, 0xd8b775);
    const task = run.waiterQueue[0];
    const from = run.waiterTable >= 0 ? TABLES[run.waiterTable] : [674, 231];
    const target = task ? TABLES[task.target] : from;
    const p = Math.min(1, run.waiterElapsed / 1.2);
    const wx = from[0] + (target[0] - from[0]) * p;
    const wy = from[1] + (target[1] - from[1]) * p;
    this.person(wx + 67, wy + 45, task && Math.floor(run.tick / 3) % 2 ? 4 : 0, 105 + wy * 0.05);
    this.panel(190, 66, 400, 42, 0x18130e, 0.86);
    this.text(
      390,
      77,
      run.waiting ? 'Guests are waiting at the reception desk.' : run.orders.length ? 'The kitchen is working. Keep an eye on your tables.' : 'A good service begins with a warm welcome.',
      12,
      '#efdec0',
      undefined,
      true,
    );
  }

  private kitchen(run: Run): void {
    const def = dayFor(run.day);
    const orders = run.orders.filter((o) => o.kitchen === run.view);
    orders.slice(0, 5).forEach((o, i) => {
      const x = 184 + i * 122;
      const allReady = o.dishes.every((d) => d.state === 'plated');
      const warning = o.dishes.some((d) => d.state === 'ready' || d.state === 'burnt');
      const active = run.selectedOrder === o.id;
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.35).fillRect(x + 3, 60, 112, 46);
      g.fillStyle(active ? 0xfff6dc : 0xe9dfc4, active ? 1 : 0.92).fillRect(x, 57, 112, 46);
      g.fillStyle(allReady ? 0x3f8a4e : warning ? 0xc0492c : 0x2a5f7c).fillRect(x, 57, 112, 5);
      if (active) g.lineStyle(2, 0xf0c46a).strokeRect(x - 1, 56, 114, 48);
      this.layer.add(g);
      this.text(x + 8, 66, `TABLE ${o.tableId + 1}`, 11, '#2a1d12').setStroke('#000000', 0);
      this.text(x + 104, 66, allReady ? '✓' : warning ? '!' : `${o.dishes.length}×`, 11, allReady ? '#2d6b39' : warning ? '#a3301a' : '#4f3b27')
        .setStroke('#000000', 0)
        .setOrigin(1, 0);
      this.bar(x + 8, 90, 96, run.tables[o.tableId].patience / def.patience, run.tables[o.tableId].patience < 20 ? 0xd9542f : 0x3f86a6);
      this.hits.push({ x, y: 57, w: 112, h: 46, action: () => this.runtime.command({ type: 'select', id: o.id }) });
    });
    const order = orders.find((o) => o.id === run.selectedOrder);
    if (!order) {
      this.panel(250, 150, 460, 78, 0x101418, 0.9);
      this.text(480, 164, 'YOUR STATION IS READY', 19, GOLD, undefined, true);
      const hint = orders.length
        ? 'Select an order ticket above.'
        : def.challenge
          ? 'Orders arrive on their own today. Prep ingredients while you wait.'
          : 'Prepare ingredients now, then take an order in the dining room.';
      this.text(480, 195, hint, 12, '#d9d9d0', undefined, true);
    } else {
      order.dishes.forEach((dish, i) => this.station(run, dish, BURNERS[i]));
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
    INGREDIENTS.forEach((ingredient, index) => this.bowl(run, ingredient, index));
  }

  private station(run: Run, dish: Run['orders'][number]['dishes'][number], x: number): void {
    const recipe = RECIPES[dish.recipeId];
    const cookingTime = cookingSeconds(dish.recipeId, run.day);
    const heat = dish.state === 'cooking' || dish.state === 'ready';
    // Paper recipe ticket above the burner.
    const card = this.add.graphics();
    card.fillStyle(0x000000, 0.35).fillRect(x - 60, 124, 124, 86);
    card.fillStyle(0xf1e7cf, 0.96).fillRect(x - 63, 121, 124, 86);
    card.fillStyle(recipe.oven ? 0xb5532a : 0x2a5f7c).fillRect(x - 63, 121, 124, 16);
    this.layer.add(card);
    this.text(x - 1, 122, recipe.oven ? 'OVEN' : 'STOVE', 9, '#fff4dc', undefined, true).setStroke('#000000', 0);
    this.text(x - 1, 140, recipe.name, 11, '#2b1c10', 116, true).setStroke('#000000', 0);
    this.text(x - 1, 170, recipe.ingredients.map((a) => `${dish.loaded.includes(a) ? '✓' : '○'} ${INGREDIENT_LABELS[a]}`).join('\n'), 9, '#4d3a27', 116, true).setStroke('#000000', 0);
    const g = this.add.graphics();
    const y = 272;
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
    if (recipe.oven) {
      // Roasting tray with oven glow.
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
    this.layer.add(g);
    dish.loaded.forEach((ingredient, index) => {
      const n = dish.loaded.length;
      const offset = n === 1 ? 0 : (index - (n - 1) / 2) * 20;
      const food = this.add.image(x + offset, y + 1 + (index % 2) * 2, `food-${ingredient}`).setDisplaySize(n === 1 ? 68 : 46, n === 1 ? 19 : 15);
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
      smoke.fillStyle(0x0d1114, 0.85).fillCircle(x + 50, y - 20, 13);
      smoke
        .lineStyle(4, 0x78c0dd)
        .beginPath()
        .arc(x + 50, y - 20, 10, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2)
        .strokePath();
    }
    if (dish.state === 'ready') {
      const pulse = 0.5 + Math.sin(run.tick * 0.8) * 0.5;
      smoke.lineStyle(3, 0x9dff8a, 0.5 + pulse * 0.5).strokeEllipse(x, y, 104 + pulse * 6, 38 + pulse * 3);
    }
    this.layer.add(smoke);
    const stateText =
      dish.state === 'cooking'
        ? `COOKING  ${Math.max(1, Math.ceil(cookingTime - dish.elapsed))}s`
        : dish.state === 'ready'
          ? 'READY — CLICK TO PLATE'
          : dish.state === 'burnt'
            ? 'BURNT — CLICK TO CLEAR'
            : dish.state === 'plated'
              ? 'ON THE PASS'
              : `ADD ${recipe.ingredients.length - dish.loaded.length} MORE · ${cookingTime}s`;
    this.panel(x - 66, 306, 132, 22, dish.state === 'ready' ? 0x1f5a36 : dish.state === 'burnt' ? 0x74261a : 0x111519, 0.95, dish.state === 'ready' ? 0x9dff8a : 0x8a98a0);
    this.text(x, 310, stateText, 9, dish.state === 'ready' ? '#e2ffd8' : '#ecdcbd', undefined, true);
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
      y: 124,
      w: 132,
      h: 204,
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
  }

  private bowl(run: Run, ingredient: Ingredient, index: number): void {
    const x = 216 + index * 81;
    const ready = run.bowls[ingredient];
    const queue = run.prepQueue.indexOf(ingredient);
    const selected = this.selected === ingredient;
    const g = this.add.graphics();
    g.fillStyle(0x0a0806, 0.5).fillEllipse(x + 3, 503, 70, 16);
    if (ready) g.fillStyle(0xffe6a0, selected ? 0.55 : 0.2 + Math.sin(run.tick * 0.3 + index) * 0.06).fillEllipse(x, 484, 84, 56);
    if (selected) g.lineStyle(3, 0xffd77a).strokeEllipse(x, 484, 84, 56);
    this.layer.add(g);
    const bowl = this.add
      .image(x, 484 + (selected ? -4 : 0), 'ingredients', index)
      .setDisplaySize(70, 48)
      .setAlpha(ready ? 1 : 0.55);
    if (!ready) bowl.setTint(0x9a8f80);
    this.layer.add(bowl);
    this.panel(x - 36, 513, 72, 36, 0x120e0b, 0.82, ready ? 0xc7b27c : 0x6d5c43);
    this.text(x, 516, INGREDIENT_LABELS[ingredient], 10, '#fff0d0', undefined, true);
    this.text(
      x,
      532,
      ready ? (selected ? 'SELECTED' : '✓ READY') : queue === 0 ? 'PREPARING…' : queue > 0 ? `QUEUED ${queue + 1}` : 'CLICK TO PREP',
      8,
      ready ? '#c7f6b7' : '#eed7b0',
      undefined,
      true,
    );
    if (queue === 0) this.bar(x - 28, 507, 56, run.prepElapsed / PREP_SECONDS, 0xe8cc83);
    this.hits.push({
      x: x - 38,
      y: 456,
      w: 76,
      h: 95,
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
