import type Phaser from 'phaser';
import { INGREDIENT_COLORS, INGREDIENTS } from '../../../../src/features/hells-kitchen/game/content';
import type { Ingredient, Recipe } from '../../../../src/features/hells-kitchen/game/types';

type Ctx = CanvasRenderingContext2D;
export type Cookware = 'pot' | 'pan' | 'roaster';
// Canvas size and the food opening of each cookware texture, in texture pixels.
export const COOKWARE: Record<Cookware, { readonly w: number; readonly h: number; readonly ox: number; readonly oy: number; readonly rx: number; readonly ry: number }> = {
  pot: { w: 112, h: 84, ox: 56, oy: 26, rx: 40, ry: 11 },
  pan: { w: 132, h: 58, ox: 74, oy: 24, rx: 44, ry: 13 },
  roaster: { w: 124, h: 62, ox: 62, oy: 24, rx: 46, ry: 13 },
};

export function cookwareFor(recipe: Recipe): Cookware {
  if (recipe.oven) return 'roaster';
  return recipe.ingredients.some((i) => i === 'grain' || i === 'dairy' || i === 'fruit') ? 'pot' : 'pan';
}

const hex = (color: number, alpha = 1) => `rgba(${(color >> 16) & 255},${(color >> 8) & 255},${color & 255},${alpha})`;

function steel(ctx: Ctx, x0: number, x1: number, stops: readonly string[] = ['#50565d', '#d9dde1', '#9aa0a6', '#454a50']): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}
function vertical(ctx: Ctx, y0: number, y1: number, stops: readonly string[]): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}
function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}
function rounded(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export class ArtBuilder {
  private readonly foodSource: HTMLImageElement;
  private readonly fw: number;
  private readonly fh: number;

  constructor(private readonly textures: Phaser.Textures.TextureManager) {
    this.foodSource = textures.get('ingredients').getSourceImage() as HTMLImageElement;
    this.fw = this.foodSource.width / 4;
    this.fh = this.foodSource.height / 2;
  }

  build(): void {
    INGREDIENTS.forEach((ingredient, i) => {
      this.canvas(`food-${ingredient}`, 128, 128, (ctx) => {
        ellipse(ctx, 64, 64, 62, 62);
        ctx.clip();
        this.food(ctx, i, 0, 0, 128, 128);
      });
      this.bowl(ingredient, i, false);
      this.bowl(ingredient, i, true);
      this.pile(ingredient, i);
    });
    this.pot();
    this.pan();
    this.roaster();
    this.plate();
    this.cloche();
    this.frame();
    this.menuPlate();
    this.tube();
    for (const tone of ['steel', 'red', 'blue'] as const) {
      this.switchButton(`switch-pot-${tone}`, tone, 'pot', 'left');
      this.switchButton(`switch-table-${tone}`, tone, 'table', 'right');
      this.switchButton(`switch-kitchen-${tone}`, tone, 'pot', 'right');
    }
    this.kitchen('kitchen-blue', false);
    this.kitchen('kitchen-red', true);
    this.dining();
  }

  private canvas(key: string, w: number, h: number, draw: (ctx: Ctx) => void): void {
    if (this.textures.exists(key)) this.textures.remove(key);
    const texture = this.textures.createCanvas(key, w, h);
    if (!texture) return;
    const ctx = texture.getContext();
    ctx.save();
    draw(ctx);
    ctx.restore();
    texture.refresh();
  }

  // Draws the centre of an ingredient bowl photo so only the food shows.
  private food(ctx: Ctx, index: number, x: number, y: number, w: number, h: number): void {
    ctx.drawImage(this.foodSource, (index % 4) * this.fw + this.fw * 0.2, Math.floor(index / 4) * this.fh + this.fh * 0.2, this.fw * 0.6, this.fh * 0.6, x, y, w, h);
  }

  private bowl(ingredient: Ingredient, index: number, full: boolean): void {
    const color = INGREDIENT_COLORS[ingredient];
    this.canvas(`bowl${full ? 'full' : ''}-${ingredient}`, 112, 76, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ellipse(ctx, 57, 68, 46, 7);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(7, 28);
      ctx.bezierCurveTo(9, 58, 32, 70, 56, 70);
      ctx.bezierCurveTo(80, 70, 103, 58, 105, 28);
      ctx.closePath();
      ctx.fillStyle = steel(ctx, 7, 105);
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = hex(color);
      ctx.fillRect(0, 39, 112, 12);
      ctx.fillStyle = steel(ctx, 7, 105, ['rgba(0,0,0,0.35)', 'rgba(255,255,255,0.35)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.4)']);
      ctx.fillRect(0, 39, 112, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(0, 39, 112, 1.5);
      ctx.restore();
      ellipse(ctx, 56, 28, 49, 15);
      ctx.fillStyle = vertical(ctx, 13, 43, ['#2e3237', '#6f767d', '#a9afb5']);
      ctx.fill();
      if (full) {
        ctx.save();
        ellipse(ctx, 56, 24, 45, 17);
        ctx.clip();
        this.food(ctx, index, 8, 2, 96, 46);
        const shade = ctx.createRadialGradient(46, 16, 4, 56, 24, 48);
        shade.addColorStop(0, 'rgba(255,255,255,0.18)');
        shade.addColorStop(1, 'rgba(0,0,0,0.35)');
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, 112, 50);
        ctx.restore();
      }
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#f3f5f6';
      ctx.beginPath();
      ctx.ellipse(56, 28, 49, 15, 0, 0, Math.PI);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(230,235,238,0.8)';
      ctx.beginPath();
      ctx.ellipse(56, 28, 49, 15, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
    });
  }

  private pile(ingredient: Ingredient, index: number): void {
    this.canvas(`pile-${ingredient}`, 120, 64, (ctx) => {
      ctx.fillStyle = 'rgba(40,20,5,0.4)';
      ellipse(ctx, 62, 55, 52, 8);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(8, 52);
      ctx.bezierCurveTo(10, 20, 38, 6, 62, 6);
      ctx.bezierCurveTo(88, 6, 112, 22, 114, 52);
      ctx.bezierCurveTo(90, 60, 32, 60, 8, 52);
      ctx.clip();
      this.food(ctx, index, -4, -6, 72, 72);
      this.food(ctx, index, 50, -10, 76, 76);
      this.food(ctx, index, 26, 4, 70, 64);
      const shade = ctx.createRadialGradient(52, 14, 4, 60, 34, 64);
      shade.addColorStop(0, 'rgba(255,255,255,0.22)');
      shade.addColorStop(0.55, 'rgba(0,0,0,0)');
      shade.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, 120, 64);
      ctx.restore();
    });
  }

  private pot(): void {
    const { w, h, ox, oy, rx, ry } = COOKWARE.pot;
    this.canvas('pot', w, h, (ctx) => {
      ctx.fillStyle = '#2b2e32';
      rounded(ctx, 2, oy + 4, 14, 8, 4);
      ctx.fill();
      rounded(ctx, w - 16, oy + 4, 14, 8, 4);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(ox - rx - 4, oy);
      ctx.lineTo(ox - rx, h - 10);
      ctx.ellipse(ox, h - 10, rx, 8, 0, Math.PI, 0, true);
      ctx.lineTo(ox + rx + 4, oy);
      ctx.closePath();
      ctx.fillStyle = steel(ctx, ox - rx - 4, ox + rx + 4, ['#454a50', '#8f959b', '#e7eaec', '#a4aaaf', '#50555b', '#3a3e43']);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(ox - rx, oy + 16, rx * 2, 2);
      ellipse(ctx, ox, oy, rx + 4, ry + 2);
      ctx.fillStyle = vertical(ctx, oy - ry, oy + ry, ['#16181a', '#3b4045']);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#eef1f3';
      ctx.stroke();
    });
  }

  private pan(): void {
    const { w, h, ox, oy, rx, ry } = COOKWARE.pan;
    this.canvas('pan', w, h, (ctx) => {
      ctx.lineCap = 'round';
      ctx.lineWidth = 9;
      ctx.strokeStyle = '#1f2124';
      ctx.beginPath();
      ctx.moveTo(ox - rx + 4, oy + 12);
      ctx.lineTo(6, oy + 28);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.moveTo(ox - rx + 2, oy + 9);
      ctx.lineTo(8, oy + 24);
      ctx.stroke();
      ellipse(ctx, ox, oy + 8, rx + 6, ry + 7);
      ctx.fillStyle = steel(ctx, ox - rx - 6, ox + rx + 6, ['#2a2d31', '#5c6269', '#9aa0a6', '#4b5056', '#26292c']);
      ctx.fill();
      ellipse(ctx, ox, oy, rx + 6, ry + 4);
      ctx.fillStyle = vertical(ctx, oy - ry, oy + ry, ['#151617', '#2f3236']);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#c9cdd1';
      ctx.stroke();
      ellipse(ctx, ox - 10, oy - 2, rx * 0.5, ry * 0.4);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fill();
    });
  }

  private roaster(): void {
    const { w, h, ox, oy, rx, ry } = COOKWARE.roaster;
    this.canvas('roaster', w, h, (ctx) => {
      ctx.fillStyle = '#9aa0a6';
      rounded(ctx, 1, oy - 2, 12, 9, 3);
      ctx.fill();
      rounded(ctx, w - 13, oy - 2, 12, 9, 3);
      ctx.fill();
      rounded(ctx, 9, oy - ry, w - 18, h - oy + ry - 4, 10);
      ctx.fillStyle = steel(ctx, 9, w - 9, ['#3a2f2a', '#8a5a3c', '#c78b5d', '#7b4f35', '#3a2a22']);
      ctx.fill();
      rounded(ctx, ox - rx - 2, oy - ry - 1, (rx + 2) * 2, (ry + 1) * 2, 8);
      ctx.fillStyle = vertical(ctx, oy - ry, oy + ry, ['#1a1411', '#3a2a20']);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#e6c2a0';
      ctx.stroke();
    });
  }

  private plate(): void {
    this.canvas('plate', 112, 42, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ellipse(ctx, 57, 25, 52, 15);
      ctx.fill();
      ellipse(ctx, 56, 20, 53, 17);
      ctx.fillStyle = vertical(ctx, 3, 37, ['#ffffff', '#e6e7e6', '#b9bcbe']);
      ctx.fill();
      ellipse(ctx, 56, 20, 34, 10);
      ctx.fillStyle = vertical(ctx, 10, 30, ['#d8dada', '#f7f7f5']);
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(120,120,120,0.35)';
      ctx.stroke();
    });
  }

  private cloche(): void {
    this.canvas('cloche', 100, 72, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ellipse(ctx, 51, 64, 48, 7);
      ctx.fill();
      ellipse(ctx, 50, 60, 48, 9);
      ctx.fillStyle = vertical(ctx, 51, 69, ['#f1f3f4', '#8d9399']);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(50, 58, 40, 40, 0, Math.PI, 0);
      ctx.closePath();
      const dome = ctx.createRadialGradient(36, 30, 3, 50, 45, 46);
      dome.addColorStop(0, '#ffffff');
      dome.addColorStop(0.35, '#cfd4d8');
      dome.addColorStop(1, '#5d636a');
      ctx.fillStyle = dome;
      ctx.fill();
      ellipse(ctx, 50, 16, 6, 4);
      ctx.fillStyle = '#b8bec3';
      ctx.fill();
    });
  }

  private frame(): void {
    this.canvas('hud-frame', 164, 214, (ctx) => {
      rounded(ctx, 0, 0, 164, 214, 8);
      ctx.fillStyle = vertical(ctx, 0, 214, ['#6d7278', '#2b2e32', '#151618', '#43474c']);
      ctx.fill();
      rounded(ctx, 2, 2, 160, 210, 7);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.stroke();
      ctx.globalCompositeOperation = 'destination-out';
      rounded(ctx, 7, 7, 150, 200, 3);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      rounded(ctx, 7, 7, 150, 200, 3);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.stroke();
    });
  }

  private menuPlate(): void {
    this.canvas('hud-menu', 144, 28, (ctx) => {
      rounded(ctx, 0, 0, 144, 28, 4);
      ctx.fillStyle = vertical(ctx, 0, 28, ['#4a4e53', '#1b1c1f', '#0d0e10']);
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(210,215,220,0.55)';
      ctx.stroke();
    });
  }

  private tube(): void {
    this.canvas('hud-tube', 20, 216, (ctx) => {
      rounded(ctx, 0, 0, 20, 216, 10);
      ctx.fillStyle = steel(ctx, 0, 20, ['#2a2d31', '#8d9399', '#2a2d31']);
      ctx.fill();
      rounded(ctx, 4, 4, 12, 208, 6);
      ctx.fillStyle = steel(ctx, 4, 16, ['#050506', '#1f1a17', '#050506']);
      ctx.fill();
    });
  }

  private switchButton(key: string, tone: 'steel' | 'red' | 'blue', icon: 'pot' | 'table', arrow: 'left' | 'right'): void {
    const panel = { steel: ['#4f545a', '#2b2e33', '#1b1d20'], red: ['#ff6a4d', '#c4211a', '#6d0d0a'], blue: ['#7cc5ff', '#1f6fd6', '#0c2f6e'] }[tone];
    this.canvas(key, 48, 100, (ctx) => {
      rounded(ctx, 0, 0, 48, 100, 9);
      ctx.fillStyle = vertical(ctx, 0, 100, ['#7a8087', '#2a2d31', '#5a5f65']);
      ctx.fill();
      rounded(ctx, 4, 4, 40, 92, 7);
      ctx.fillStyle = vertical(ctx, 4, 96, panel);
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.stroke();
      if (icon === 'pot') {
        ctx.fillStyle = steel(ctx, 12, 36, ['#6b7178', '#f1f3f4', '#7b8187']);
        ctx.fillRect(13, 22, 22, 18);
        ellipse(ctx, 24, 40, 11, 3);
        ctx.fill();
        ellipse(ctx, 24, 22, 12, 4);
        ctx.fillStyle = '#222';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#f5f6f7';
        ctx.stroke();
        ctx.fillStyle = '#1b1c1e';
        ctx.fillRect(8, 25, 5, 3);
        ctx.fillRect(35, 25, 5, 3);
      } else {
        ctx.fillStyle = '#f2ead6';
        ellipse(ctx, 24, 26, 15, 5);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(9, 26);
        ctx.lineTo(11, 38);
        ctx.quadraticCurveTo(24, 43, 37, 38);
        ctx.lineTo(39, 26);
        ctx.closePath();
        ctx.fillStyle = vertical(ctx, 26, 42, ['#e7dcc2', '#b8a888']);
        ctx.fill();
        ctx.fillStyle = '#3f8dff';
        ctx.fillRect(22, 18, 5, 6);
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      if (arrow === 'left') {
        ctx.moveTo(15, 68);
        ctx.lineTo(31, 58);
        ctx.lineTo(31, 78);
      } else {
        ctx.moveTo(33, 68);
        ctx.lineTo(17, 58);
        ctx.lineTo(17, 78);
      }
      ctx.closePath();
      ctx.fill();
    });
  }

  private kitchen(key: string, red: boolean): void {
    const source = this.textures.get('kitchen').getSourceImage() as HTMLImageElement;
    this.canvas(key, 800, 600, (ctx) => {
      ctx.drawImage(source, 0, 0, 800, 600);
      if (red) {
        // The red kitchen is the blue kitchen with its blue tiles recoloured to deep red.
        const pixels = ctx.getImageData(0, 0, 800, 600);
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
      }
      // Heat-lamp pass shelf above the burners, where finished dishes are plated.
      for (const x of [355, 500, 646]) {
        const glow = ctx.createRadialGradient(x, 150, 4, x, 160, 80);
        glow.addColorStop(0, 'rgba(255,196,120,0.28)');
        glow.addColorStop(1, 'rgba(255,196,120,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(x - 90, 80, 180, 130);
        ctx.fillStyle = vertical(ctx, 92, 106, ['#6c7278', '#1d1f22']);
        rounded(ctx, x - 22, 92, 44, 12, 4);
        ctx.fill();
      }
      ctx.fillStyle = '#2a2d31';
      ctx.fillRect(292, 86, 4, 110);
      ctx.fillRect(706, 86, 4, 110);
      ctx.fillStyle = vertical(ctx, 180, 189, ['#f1f3f5', '#a9afb5']);
      ctx.fillRect(272, 180, 458, 9);
      ctx.fillStyle = vertical(ctx, 189, 198, ['#8b9197', '#43484d']);
      ctx.fillRect(272, 189, 458, 9);
      ctx.fillStyle = vertical(ctx, 198, 210, ['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']);
      ctx.fillRect(272, 198, 458, 12);
      // Front of the prep counter with lower cabinets, an oven door and the bin, as in the original kitchen.
      ctx.fillStyle = vertical(ctx, 520, 532, ['#9a5b28', '#5a3215']);
      ctx.fillRect(0, 520, 800, 12);
      ctx.fillStyle = vertical(ctx, 532, 600, ['#c3c8cd', '#8a9096', '#60666c']);
      ctx.fillRect(0, 532, 800, 68);
      for (let y = 534; y < 600; y += 3) {
        ctx.fillStyle = `rgba(255,255,255,${0.03 + ((y * 7) % 5) * 0.012})`;
        ctx.fillRect(0, y, 800, 1);
      }
      ctx.fillStyle = vertical(ctx, 532, 542, ['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']);
      ctx.fillRect(0, 532, 800, 10);
      for (const x of [140, 300, 470, 624]) {
        ctx.fillStyle = 'rgba(20,22,25,0.7)';
        ctx.fillRect(x, 534, 2, 66);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(x + 2, 534, 1, 66);
      }
      for (const [x0, x1] of [
        [160, 282],
        [490, 604],
        [642, 780],
      ]) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        rounded(ctx, x0, 551, x1 - x0, 6, 3);
        ctx.fill();
        ctx.fillStyle = vertical(ctx, 548, 554, ['#f4f6f7', '#8d9399']);
        rounded(ctx, x0, 548, x1 - x0, 6, 3);
        ctx.fill();
      }
      ctx.fillStyle = vertical(ctx, 538, 600, ['#3b3f44', '#1d1f22']);
      rounded(ctx, 310, 538, 150, 70, 4);
      ctx.fill();
      const window = ctx.createRadialGradient(385, 578, 4, 385, 578, 70);
      window.addColorStop(0, 'rgba(255,138,42,0.45)');
      window.addColorStop(1, 'rgba(30,18,10,1)');
      ctx.fillStyle = window;
      rounded(ctx, 324, 560, 122, 40, 3);
      ctx.fill();
      ctx.fillStyle = vertical(ctx, 543, 551, ['#f4f6f7', '#8d9399']);
      rounded(ctx, 322, 543, 126, 7, 3);
      ctx.fill();
      // Bin with a blue liner.
      ctx.beginPath();
      ctx.moveTo(34, 514);
      ctx.lineTo(114, 514);
      ctx.lineTo(106, 600);
      ctx.lineTo(42, 600);
      ctx.closePath();
      ctx.fillStyle = steel(ctx, 34, 114, ['#7d848b', '#dfe3e6', '#a7adb3', '#6b7178']);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      for (let x = 46; x < 104; x += 10) ctx.fillRect(x, 522, 2, 76);
      ctx.fillStyle = vertical(ctx, 498, 516, ['#6fa0ff', '#2457c6', '#173c8f']);
      ctx.beginPath();
      ctx.moveTo(30, 516);
      ctx.bezierCurveTo(34, 498, 50, 506, 58, 500);
      ctx.bezierCurveTo(70, 496, 78, 506, 90, 500);
      ctx.bezierCurveTo(104, 496, 116, 504, 118, 516);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = vertical(ctx, 510, 520, ['#e6e9ec', '#8b9197']);
      rounded(ctx, 28, 510, 92, 9, 4);
      ctx.fill();
    });
  }

  private dining(): void {
    const source = this.textures.get('dining').getSourceImage() as HTMLImageElement;
    this.canvas('dining-room', 800, 600, (ctx) => {
      ctx.drawImage(source, 0, 0, 800, 600);
      // The steel pass with its blue mosaic, where finished platters wait for the waiter.
      ctx.fillStyle = vertical(ctx, 548, 562, ['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)']);
      ctx.fillRect(0, 548, 800, 14);
      ctx.fillStyle = vertical(ctx, 562, 576, ['#f2f4f6', '#9aa0a6']);
      ctx.fillRect(0, 562, 800, 14);
      ctx.fillStyle = vertical(ctx, 576, 600, ['#80868c', '#3d4247']);
      ctx.fillRect(0, 576, 800, 24);
      const blues = ['#16307a', '#1d3f9e', '#2a5bd0', '#3f74e6', '#5a8cf0'];
      for (let x = 0; x < 800; x += 7)
        for (let y = 581; y < 595; y += 7) {
          ctx.fillStyle = blues[(x * 13 + y * 7) % blues.length];
          ctx.fillRect(x, y, 6, 6);
        }
      ctx.fillStyle = vertical(ctx, 579, 597, ['#e9edf0', '#80878d']);
      rounded(ctx, 376, 579, 48, 18, 3);
      ctx.fill();
      ctx.fillStyle = '#2b2e32';
      ctx.font = 'bold 13px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('HK', 400, 593);
    });
  }
}
