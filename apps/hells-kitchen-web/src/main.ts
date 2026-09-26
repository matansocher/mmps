import { dayFor, DAYS, INGREDIENT_LABELS, INGREDIENTS, rankFor, RECIPES } from '../../../src/features/hells-kitchen/game/content';
import { advanceRun, applyCommand, cookingSeconds, createRun, menuFor, recordResult, starsFor, STEP_SECONDS } from '../../../src/features/hells-kitchen/game/engine';
import { parseSave } from '../../../src/features/hells-kitchen/game/schema';
import type { Command, Ingredient, Run, Save } from '../../../src/features/hells-kitchen/game/types';
import { nextStep } from './game/guide';
import { ApiError, getSave, putSave, request } from './lib/api';
import { GameAudio } from './lib/audio';
import { exportLocal, initialSave, readLocal, readSettings, writeLocal, writeSettings } from './lib/storage';
import './style.css';

const overlay = document.querySelector<HTMLDivElement>('#overlay')!;
const status = document.createElement('div');
status.className = 'status';
document.querySelector('#app')!.append(status);
const accessibleStatus = document.createElement('div');
accessibleStatus.className = 'sr-only';
accessibleStatus.setAttribute('aria-live', 'polite');
document.body.append(accessibleStatus);
const audio = new GameAudio();
let save: Save = initialSave();
let run: Run | null = null;
let game: import('phaser').Game | null = null;
let accumulator = 0;
let savedAt = 0;
let lastFeedback = -1;
let pending = false;
let saving = false;
let localWritable = true;
let conflict: Save | null = null;
let generation = 0;
let screen = 'login';
let resultRecorded = '';
let previousScreen = 'home';
let guidanceOn = readSettings().guidance;

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  return el;
}
function button(label: string, action: () => void, primary = false): HTMLButtonElement {
  const el = element('button', `metal${primary ? ' primary' : ''}`, label);
  el.type = 'button';
  el.addEventListener('click', action);
  return el;
}
function layout(id: string, title?: string, eyebrow?: string): HTMLDivElement {
  screen = id;
  overlay.replaceChildren();
  const root = element('div', `screen ${id}`);
  overlay.append(root);
  if (eyebrow) root.append(element('div', 'eyebrow', eyebrow));
  if (title) root.append(element('h2', '', title));
  return root;
}
function message(text: string): void {
  status.textContent = text;
}
function stats(root: HTMLElement, values: readonly (readonly [string, string])[]): void {
  const row = element('div', 'stats');
  for (const [value, label] of values) {
    const cell = element('div');
    cell.append(element('strong', '', value), element('span', '', label));
    row.append(cell);
  }
  root.append(row);
}
function checkpoint(sync = false): void {
  if (run && ['running', 'paused'].includes(run.status)) save = { ...save, profile: { ...save.profile, activeRun: { ...run, status: 'paused' } } };
  generation++;
  pending = true;
  if (localWritable) {
    try {
      writeLocal(save, true);
      message('Saved on this device');
    } catch {
      localWritable = false;
      message('Device storage unavailable — use Export save before leaving.');
    }
  }
  if (sync) void syncSave();
}
async function syncSave(): Promise<void> {
  if (saving || conflict || !pending) return;
  saving = true;
  const sentGeneration = generation;
  try {
    const result = await putSave(save);
    save = { ...result, profile: save.profile };
    pending = generation !== sentGeneration;
    if (localWritable) writeLocal(save, pending);
    message(pending ? 'Saving latest progress…' : 'Progress saved');
  } catch (error) {
    if (error instanceof ApiError && error.status === 409 && error.body && typeof error.body === 'object' && 'save' in error.body) {
      conflict = parseSave(error.body.save);
      if (conflict) {
        pause(false);
        showConflict();
      }
    } else message(error instanceof ApiError && error.status === 401 ? 'Session expired — progress kept on this device. Sign in from the menu.' : 'Cloud offline — progress kept on this device');
  } finally {
    saving = false;
  }
}
function showConflict(): void {
  if (!conflict) return;
  const root = layout('conflict', 'Two versions of your progress', 'SAVE RECOVERY');
  root.append(element('p', '', 'Another window or device saved a different version. Choose which progress to keep. Your current local copy is preserved until you choose.'));
  stats(root, [
    [String(save.profile.unlockedDay), 'This device · day'],
    [String(conflict.profile.unlockedDay), 'Server · day'],
  ]);
  const row = element('div', 'row');
  row.append(
    button(
      'KEEP THIS DEVICE',
      () => {
        save = { ...save, revision: conflict!.revision };
        conflict = null;
        checkpoint(true);
        home();
      },
      true,
    ),
  );
  row.append(
    button('USE SERVER SAVE', () => {
      save = conflict!;
      conflict = null;
      pending = false;
      run = null;
      generation++;
      try {
        writeLocal(save, false);
      } catch {
        message('Device storage unavailable.');
      }
      home();
    }),
  );
  root.append(row, button('EXPORT THIS DEVICE FIRST', exportSave));
}
function exportSave(): void {
  const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hells-kitchen-save.json';
  a.click();
  URL.revokeObjectURL(url);
}
function command(c: Command): void {
  if (!run || screen !== 'play') return;
  run = applyCommand(run, c);
}
function update(delta: number): void {
  if (!run || run.status !== 'running' || screen !== 'play') return;
  accumulator += Math.min(delta, 250) / 1000;
  const ticks = Math.floor(accumulator / STEP_SECONDS);
  if (ticks) {
    run = advanceRun(run, ticks);
    accumulator -= ticks * STEP_SECONDS;
  }
  audio.update(run.anger, run.view !== 'dining' && run.orders.some((o) => o.dishes.some((d) => d.state === 'cooking')));
  if (lastFeedback !== run.feedback.id) {
    audio.cue(run.feedback);
    accessibleStatus.textContent = run.feedback.text;
    lastFeedback = run.feedback.id;
  }
  if (run.status === 'won' || run.status === 'lost') {
    results();
    return;
  }
  if (run.tick - savedAt >= 100) {
    savedAt = run.tick;
    checkpoint();
  }
}
function play(): void {
  if (!run) return;
  screen = 'play';
  overlay.replaceChildren();
  accumulator = 0;
  if (run.status === 'paused') run = applyCommand(run, { type: 'resume' });
  void audio.start();
}
function start(day: number, mode: Run['mode']): void {
  run = createRun(day, mode, crypto.getRandomValues(new Uint32Array(1))[0], crypto.randomUUID(), !save.profile.tutorialDone && day === 1);
  resultRecorded = '';
  savedAt = 0;
  lastFeedback = -1;
  checkpoint(true);
  play();
}
function pause(show = true): void {
  if (run?.status === 'running') {
    run = applyCommand(run, { type: 'pause' });
    checkpoint(true);
  }
  accumulator = 0;
  audio.pause();
  if (!show || !run || !['running', 'paused'].includes(run.status)) return;
  const root = layout('pause', 'Service paused', 'TAKE A BREATH');
  root.append(element('p', '', 'Your kitchen will wait. Return when you’re ready.'));
  const row = element('div', 'row');
  row.append(
    button('RESUME SERVICE', play, true),
    button('SOUND & OPTIONS', () => settings('pause')),
    button('SAVE & MAIN MENU', () => {
      checkpoint(true);
      home();
    }),
  );
  root.append(row, element('p', 'note', 'D — Dining room · K — Kitchen · P / Esc — Pause\nClick to prepare, select a ready ingredient, then click a pan. You can also drag ready ingredients.'));
}
function home(): void {
  if (conflict) {
    showConflict();
    return;
  }
  audio.pause();
  const root = layout('home');
  root.append(element('div', 'hero-chef'));
  const title = element('h1', 'brand', 'HELL’S\nKITCHEN');
  title.style.whiteSpace = 'pre-line';
  title.append(element('span', '', 'THE GAME'));
  root.append(title);
  const list = element('div', 'menu-list');
  if (save.profile.activeRun)
    list.append(
      button(
        'CONTINUE SERVICE',
        () => {
          run = { ...save.profile.activeRun!, status: 'paused' };
          lastFeedback = -1;
          play();
        },
        true,
      ),
    );
  list.append(
    button('CAREER', calendar, true),
    button('ARCADE', () => briefing(1, 'arcade')),
    button('RECIPE BOOK', recipeBook),
    button('OPTIONS', () => settings('home')),
  );
  root.append(list);
  const footer = element('div', 'footer');
  footer.append(element('span', '', 'A PERSONAL RECREATION'), element('span', '', `${rankFor(Object.values(save.profile.stars).reduce((a, b) => a + b, 0))} · Day ${save.profile.unlockedDay}`));
  root.append(footer);
}
function calendar(): void {
  const root = layout('calendar-screen', undefined, 'YOUR JOURNEY THROUGH HELL’S KITCHEN');
  const head = element('div', 'calendar-head');
  head.append(element('h2', '', 'Career'));
  const total = Object.values(save.profile.stars).reduce((a, b) => a + b, 0);
  const rank = element('div', 'rank', rankFor(total));
  rank.append(element('small', '', `${total} stars earned`));
  head.append(rank);
  root.append(head);
  const grid = element('div', 'calendar');
  for (const day of DAYS) {
    const stars = save.profile.stars[String(day.id)] ?? 0;
    const b = element('button', `day${day.challenge ? ' test' : ''}${day.id === save.profile.unlockedDay ? ' current' : ''}`, String(day.id));
    b.disabled = day.id > save.profile.unlockedDay;
    b.title = day.name;
    b.setAttribute('aria-label', `Day ${day.id}: ${day.name}${stars ? `, ${stars} stars` : ''}`);
    b.append(element('span', '', b.disabled ? 'LOCKED' : stars ? '★'.repeat(stars) : day.challenge ? 'KITCHEN TEST' : 'SERVICE'));
    b.addEventListener('click', () => briefing(day.id, 'career'));
    grid.append(b);
  }
  root.append(grid, element('div', 'note', 'Apprentice 20 ★  ·  Junior Cook 36 ★  ·  Cook 71 ★  ·  Senior Chef 106 ★'), button('BACK', home));
}
function briefing(day: number, mode: Run['mode']): void {
  const d = dayFor(day);
  const root = layout('briefing-screen', mode === 'arcade' ? 'Arcade' : `Day ${day}`, mode === 'arcade' ? 'KEEP THE ORDERS MOVING' : 'TODAY’S SERVICE');
  const card = element('div', 'briefing');
  card.append(element('h3', '', mode === 'arcade' ? 'Four minutes. One kitchen.' : d.name));
  card.append(
    element(
      'p',
      '',
      mode === 'arcade'
        ? 'Orders arrive directly at your station. Plate the complete order to send it. Survive four minutes and serve as many orders as you can.'
        : d.challenge
          ? 'Orders arrive in the red and blue kitchens. Switch between them and plate every dish in an order to send it automatically.'
          : 'Greet guests, take their orders, and coordinate the kitchen. Serve each table together. Quality is everything.',
    ),
  );
  stats(
    card,
    mode === 'arcade'
      ? [
          ['4:00', 'Time limit'],
          [String(save.profile.arcadeBest), 'Best orders'],
        ]
      : [
          [String(d.parties), 'Tables to serve'],
          [String(d.challenge ? 1 : d.courses), 'Courses'],
          [String(d.groupSize), 'Dishes per order'],
        ],
  );
  if (mode === 'career') card.append(menu(day));
  if (mode === 'career' && day <= 3) card.append(howTo());
  card.append(element('p', 'note', 'Start the slowest dishes first so an order finishes together. Plate a dish the moment it is READY — it burns if you wait.'));
  const row = element('div', 'row');
  row.append(
    button(
      'OPEN HELL’S KITCHEN',
      () => {
        if (save.profile.activeRun) confirmReplace(day, mode);
        else start(day, mode);
      },
      true,
    ),
    button('BACK', mode === 'career' ? calendar : home),
  );
  card.append(row);
  root.append(card);
}
function chip(ingredient: Ingredient): HTMLSpanElement {
  const el = element('span', 'chip');
  const icon = element('i');
  const index = INGREDIENTS.indexOf(ingredient);
  icon.style.backgroundPosition = `${(index % 4) * 33.333}% ${Math.floor(index / 4) * 100}%`;
  el.append(icon, INGREDIENT_LABELS[ingredient]);
  return el;
}
function menu(day: number): HTMLElement {
  const section = element('section', 'menu');
  const recipes = menuFor(day, 'career');
  const known = day > 1 ? new Set(menuFor(day - 1, 'career').map((r) => r.id)) : new Set<number>();
  const fresh = recipes.filter((r) => !known.has(r.id));
  const shown = recipes.length <= 6 ? recipes : fresh;
  section.append(element('div', 'eyebrow', recipes.length <= 6 ? 'TONIGHT’S MENU' : 'NEW ON TONIGHT’S MENU'));
  const grid = element('div', 'menu-grid');
  for (const recipe of shown) {
    const item = element('div', `menu-item${fresh.includes(recipe) && day > 1 ? ' new' : ''}`);
    const chips = element('div', 'chips');
    for (const ingredient of recipe.ingredients) chips.append(chip(ingredient));
    const dessert = recipe.ingredients.includes('fruit') || recipe.id === 3;
    item.append(element('strong', '', recipe.name), chips, element('small', '', `${recipe.oven ? 'Oven' : 'Stove'} · ${cookingSeconds(recipe.id, day)}s${dessert ? ' · dessert' : ''}`));
    grid.append(item);
  }
  section.append(grid);
  if (shown.length < recipes.length) section.append(element('p', 'note', `Plus ${recipes.length - shown.length} dishes you already know. See them all in the recipe collection.`));
  return section;
}
function howTo(): HTMLElement {
  const strip = element('ol', 'how-to');
  for (const [title, text] of [
    ['Prep', 'Click an ingredient bowl. It is ready when it glows.'],
    ['Cook', 'Click the ready bowl, then the glowing pan. Add every ingredient.'],
    ['Plate', 'Click the pan when it says READY, before it burns.'],
    ['Serve', 'Back in the dining room, click the table showing a blue !.'],
  ] as const) {
    const step = element('li');
    step.append(element('strong', '', title), element('span', '', text));
    strip.append(step);
  }
  return strip;
}
function confirmReplace(day: number, mode: Run['mode']): void {
  const root = layout('replace', 'Start a new service?');
  root.append(element('p', '', 'You have an unfinished service. Starting this one replaces that checkpoint. Your completed days and stars stay saved.'));
  const row = element('div', 'row');
  row.append(
    button('START NEW SERVICE', () => start(day, mode), true),
    button('KEEP CURRENT SERVICE', home),
  );
  root.append(row);
}
function results(): void {
  if (!run) return;
  if (resultRecorded !== run.id) {
    save = { ...save, profile: recordResult(save.profile, run) };
    resultRecorded = run.id;
    checkpoint(true);
  }
  const r = run;
  const won = r.status === 'won';
  const finale = won && r.mode === 'career' && r.day === 36;
  const root = layout('results', finale ? 'You made it, Chef.' : won ? 'Service complete' : 'Kitchen closed', finale ? 'HELL’S KITCHEN FINALE' : `DAY ${r.day} · ${r.mode.toUpperCase()}`);
  root.append(element('div', 'stars', won ? '★'.repeat(starsFor(r)) + '☆'.repeat(5 - starsFor(r)) : '☆ ☆ ☆ ☆ ☆'));
  root.append(
    element(
      'p',
      '',
      finale
        ? 'Thirty-six days of heat, pressure and precision. You have earned your place in this kitchen.'
        : won
          ? 'A good service. Take what you learned into the next one.'
          : 'Take a breath. Prepare ahead, synchronize your dishes, and keep an eye on the dining room.',
    ),
  );
  stats(root, [
    [String(r.served), 'Orders served'],
    [r.served ? (r.qualityTotal / r.served).toFixed(1) : '0', 'Average quality'],
    [`${Math.floor(r.tick / 600)}:${String(Math.floor(r.tick / 10) % 60).padStart(2, '0')}`, 'Service time'],
  ]);
  const row = element('div', 'row');
  if (won && r.mode === 'career' && r.day < 36) row.append(button('NEXT DAY', () => briefing(r.day + 1, 'career'), true));
  row.append(
    button('PLAY AGAIN', () => start(r.day, r.mode)),
    button('MAIN MENU', home),
  );
  root.append(row);
  if (won && r.mode === 'career' && r.day <= 35) root.append(element('p', 'note', `New recipe unlocked: ${RECIPES[r.day - 1].name}`));
  if (finale) root.append(element('p', 'note', 'Personal browser recreation · Original game by Ludia / Ubisoft · Recreated artwork, audio and campaign tuning.'));
}
function recipeBook(): void {
  const root = layout('recipes', 'The recipe collection', 'EARNED IN THE HEAT OF SERVICE');
  const grid = element('div', 'recipe-grid');
  for (const recipe of RECIPES) {
    const unlocked = Boolean(save.profile.stars[String(recipe.id + 1)]);
    const b = element('button', 'recipe-card');
    b.disabled = !unlocked;
    b.append(element('small', '', unlocked ? `RECIPE ${String(recipe.id + 1).padStart(2, '0')}` : `COMPLETE DAY ${recipe.id + 1}`), element('span', '', unlocked ? recipe.name : 'Recipe locked'));
    b.addEventListener('click', () => recipeDetail(recipe.id));
    grid.append(b);
  }
  root.append(grid, button('BACK', home));
}
function recipeDetail(id: number): void {
  const recipe = RECIPES[id];
  const root = layout('recipe');
  const card = element('article', 'recipe-detail');
  card.append(element('div', 'eyebrow', `THE CHEF’S COLLECTION · ${id + 1}`), element('h2', '', recipe.name), element('p', '', recipe.description));
  const list = element('div', 'chips');
  for (const i of recipe.ingredients) list.append(chip(i));
  card.append(list);
  card.append(
    element(
      'p',
      '',
      `In the game: prepare each ingredient, add it to the ${recipe.oven ? 'oven dish' : 'pan'}, and cook for ${recipe.seconds} seconds. Plate immediately and serve the complete order together.`,
    ),
  );
  card.append(element('p', 'note', 'A recreated game recipe card. Game timers are not real-world cooking instructions.'));
  const row = element('div', 'row');
  row.append(
    button('PRINT CARD', () => window.print()),
    button('BACK', recipeBook),
  );
  card.append(row);
  root.append(card);
}
function settings(from: string): void {
  previousScreen = from;
  const root = layout('settings', 'Options', 'MAKE YOURSELF AT HOME');
  let settings = readSettings();
  for (const key of ['music', 'effects', 'voice'] as const) {
    const row = element('label', 'setting');
    row.append(element('span', '', key[0].toUpperCase() + key.slice(1)));
    const input = element('input');
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.value = String(settings[key] * 100);
    const number = element('span', '', `${input.value}%`);
    input.addEventListener('input', () => {
      settings = { ...settings, [key]: Number(input.value) / 100 };
      number.textContent = `${input.value}%`;
      audio.setSettings(settings);
      try {
        writeSettings(settings);
      } catch {
        message('Sound settings could not be saved on this device.');
      }
    });
    row.append(input, number);
    root.append(row);
  }
  const guidance = element('label', 'setting toggle');
  const toggle = element('input');
  toggle.type = 'checkbox';
  toggle.checked = settings.guidance;
  toggle.addEventListener('change', () => {
    settings = { ...settings, guidance: toggle.checked };
    guidanceOn = toggle.checked;
    try {
      writeSettings(settings);
    } catch {
      message('Settings could not be saved on this device.');
    }
  });
  guidance.append(element('span', '', 'Chef’s hints'), toggle, element('span', '', 'Arrows show your next step'));
  root.append(guidance);
  const row = element('div', 'row');
  row.append(
    button('FULLSCREEN', () => {
      if (document.fullscreenElement) void document.exitFullscreen();
      else
        void document
          .querySelector('#app')!
          .requestFullscreen()
          .catch(() => message('Fullscreen is unavailable in this browser.'));
    }),
    button('EXPORT SAVE', exportSave),
  );
  root.append(row, element('p', 'note', 'D — Dining room · K — Kitchen · P / Esc — Pause\nThe game pauses when you leave this tab.'));
  root.append(
    button('BACK', () => (previousScreen === 'pause' ? pause() : home())),
    button('SIGN OUT', async () => {
      pause(false);
      try {
        await request('auth/logout', 'POST');
        login();
      } catch {
        message('Sign out failed. Please retry.');
      }
    }),
  );
}
function login(error = ''): void {
  const root = layout('login-screen');
  const title = element('h1', 'brand', 'HELL’S KITCHEN');
  title.append(element('span', '', 'PRIVATE DINNER SERVICE'));
  root.append(title);
  const form = element('form', 'login');
  const label = element('label', '', 'Your kitchen password');
  label.htmlFor = 'password';
  const input = element('input');
  input.id = 'password';
  input.type = 'password';
  input.autocomplete = 'current-password';
  input.required = true;
  const submit = button('ENTER THE KITCHEN', () => undefined, true);
  submit.type = 'submit';
  form.append(label, input, submit);
  if (error) form.append(element('div', 'error', error));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    try {
      await request('auth/login', 'POST', { password: input.value });
      await boot();
    } catch (e) {
      login(e instanceof Error ? e.message : 'Could not sign in.');
    }
  });
  root.append(form);
  input.focus();
}
async function boot(): Promise<void> {
  layout('loading', 'Preparing the kitchen…');
  let local = null;
  try {
    local = readLocal();
  } catch (e) {
    localWritable = false;
    const root = layout('recovery', 'Your local save needs attention');
    root.append(element('p', '', e instanceof Error ? e.message : 'Could not read the local save.'));
    root.append(
      button('DOWNLOAD ORIGINAL SAVE', () => {
        const raw = exportLocal();
        const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'hells-kitchen-recovery.json';
        a.click();
        URL.revokeObjectURL(url);
      }),
      button('CONTINUE WITH SERVER SAVE', () => {
        void loadServer(null);
      }),
    );
    return;
  }
  await loadServer(local);
}
async function loadServer(local: ReturnType<typeof readLocal>): Promise<void> {
  try {
    const remote = await getSave();
    if (local?.pending) {
      save = local.save;
      pending = true;
      if (remote.revision !== local.save.revision) conflict = remote;
    } else save = remote;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      login();
      return;
    }
    if (!local) {
      const root = layout('offline', 'The kitchen is unavailable');
      root.append(
        element('p', '', 'There is no local save yet. Retry when the server is available.'),
        button('RETRY', () => {
          void boot();
        }),
      );
      return;
    }
    save = local.save;
    pending = local.pending;
    message('Using this device’s save — cloud unavailable');
  }
  if (!game) {
    const module = await import('./game/scene');
    game = module.createGame({
      command,
      update,
      pause: () => {
        if (screen === 'play') pause();
      },
      getRun: () => run,
      guidance: () => guidanceOn,
      ready: () => {
        if (conflict) showConflict();
        else home();
      },
      failed: (text) => {
        const root = layout('load-error', 'Could not open the kitchen');
        root.append(
          element('p', '', text),
          button('RETRY', () => {
            game?.destroy(true);
            game = null;
            void boot();
          }),
        );
      },
    });
  } else if (conflict) showConflict();
  else home();
  if (pending && !conflict) void syncSave();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'play') pause();
});
window.addEventListener('blur', () => {
  if (screen === 'play') pause();
});
window.addEventListener('pagehide', () => {
  if (run?.status === 'running') {
    run = { ...run, status: 'paused' };
    checkpoint();
  }
  audio.pause();
});
setInterval(() => {
  if (pending && screen !== 'login') void syncSave();
}, 15000);
if (import.meta.env.DEV) {
  Object.defineProperty(window, '__hellsKitchen', {
    get: () => structuredClone({ run, profile: save.profile, screen, pending, revision: save.revision, recipes: RECIPES.map((r) => r.ingredients) }),
    configurable: true,
  });
  Object.defineProperty(window, '__hellsKitchenGuide', { value: (selected: Ingredient | null) => (run ? nextStep(run, selected) : null), configurable: true });
}
async function initialize(): Promise<void> {
  try {
    await request('auth/session');
    await boot();
  } catch {
    login();
  }
}
void initialize();
