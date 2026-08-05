# Course authoring spec

You are writing ONE interactive learning course as an ES module. It plugs into a
React mini-app that renders each lesson's `html` with `dangerouslySetInnerHTML`
inside a `.course-content` wrapper, and renders `quizzes` as interactive cards.

## Output

Write a single file: `apps/learner-web/src/data/authoring/<id>.mjs`

It must `export default` ONE object with this EXACT shape:

```js
export default {
  id: '<id>',                 // exact kebab-case id given to you
  title: '<Title>',           // exact title given to you
  icon: '<emoji>',            // exact emoji given to you
  color: '<hex>',             // exact hex given to you
  lessons: [
    {
      id: 'intro',            // kebab-case, unique within the course
      group: 'Foundations',   // section name — reuse the same string to group lessons
      nav: '0 · Overview',    // short label for the chapter list ("<n> · <short title>")
      title: 'Course overview & mental model',
      lede: 'One or two sentence hook that frames the lesson.',
      html: `
        <p>Rich HTML body of the lesson. Do NOT include the title, lede, or a badge —
        the app renders those from the fields above. Start directly with content.</p>
      `,
    },
    // ... 10 to 13 lessons total
  ],
  quizzes: [
    {
      question: 'A precise, interview-style question?',
      options: [
        { text: 'A plausible-but-wrong option', correct: false },
        { text: 'The correct option', correct: true },
        { text: 'Another distractor', correct: false },
      ],
      explain: 'One or two sentences explaining WHY the correct answer is correct.',
    },
    // ... 5 to 7 quizzes total, spread across the course's topics
  ],
};
```

## Hard rules

- `html` values are TEMPLATE LITERALS (backticks). Inside them:
  - Use **single quotes** for every HTML attribute: `<div class='callout good'>`. Never use double quotes for attributes.
  - **Never** use a raw backtick character inside the html. For inline code use `<code>...</code>`, not backticks.
  - If you must show a `${...}` in a code sample, escape it as `\${...}` so the template literal does not try to interpolate.
- Do NOT put quiz widgets inside lesson html — quizzes live ONLY in the top-level `quizzes` array.
- Keep everything self-contained: no imports, no external images, no scripts.
- After writing, VALIDATE by running:
  `node --input-type=module -e "import('./apps/learner-web/src/data/authoring/<id>.mjs').then(m=>{const c=m.default;JSON.stringify(c);console.log('OK',c.id,c.lessons.length,'lessons',c.quizzes.length,'quizzes')}).catch(e=>{console.error('FAIL',e);process.exit(1)})"`
  from the repo root. It must print `OK`. Fix any error and re-run until it passes.

## Available CSS classes (use them — they are already styled)

Structure & emphasis:
- `<h3>` section heading, `<h4>` sub-heading (renders purple).
- `<strong>` (white), `<em>`, `<span class='kicker'>key term</span>` (green highlight).
- `<code>inline</code>`, and `<pre><code>multi-line code</code></pre>` for code blocks.
- `<ul>/<ol>/<li>`, `<table><tr><th>..</th></tr><tr><td>..</td></tr></table>`.

Callouts (colored left border):
- `<div class='callout'><div class='c-title'>Title</div> body</div>` (blue/default)
- `.callout.good` (green), `.callout.warn` (orange), `.callout.danger` (red).
- Use a `.callout` titled "Interview soundbite" with a crisp one-liner in most lessons.

Pattern cards & tags:
- `<div class='pattern-card'><h4>Name</h4> ... <div class='tag-row'><span class='tag use'>use when X</span><span class='tag avoid'>avoid when Y</span></div></div>`

Layout:
- `<div class='two-col'> <div>col A</div> <div>col B</div> </div>` (2-up grid).

Diagrams (inline SVG — optional but great when they clarify):
```
<div class='diagram'>
  <svg viewBox='0 0 640 200' width='640'>
    <defs><marker id='arrow' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
    <rect class='node-box' x='20' y='60' width='140' height='60' rx='8'/>
    <text class='node-text' x='90' y='90' text-anchor='middle'>Client</text>
    <text class='node-sub' x='90' y='106' text-anchor='middle'>sends request</text>
    <line class='edge' x1='160' y1='90' x2='300' y2='90'/>
    <text class='edge-label' x='230' y='82' text-anchor='middle'>HTTP</text>
    <rect class='node-box worker' x='300' y='60' width='140' height='60' rx='8'/>
    <text class='node-text' x='370' y='94' text-anchor='middle'>Server</text>
  </svg>
  <div class='diagram-caption'>Caption explaining the diagram.</div>
</div>
```
SVG helper classes: `.node-box` (blue), `.node-box.worker` (green), `.node-box.tool` (orange), `.node-text` (white label), `.node-sub` (muted sub-label), `.edge` (arrow line), `.edge-label` (muted).

## Tone — make it FUN and memorable (this is the point)

- Audience: a senior engineer prepping for interviews. Assume they know programming and general LLM basics.
- Be vivid: use analogies, metaphors, and the occasional emoji in prose. Tell tiny stories.
- Every lesson should teach something concrete and give an **"interview soundbite"** they can repeat.
- Use mnemonics, "rules of thumb", "gotchas", and "war stories" (`.callout.warn`/`.callout.danger`).
- Prefer concrete numbers, real tool names, and small runnable-looking code sketches.
- Include a healthy mix of: a diagram or two, several callouts, at least one table, pattern-cards where relevant.
- End the course with a final lesson that's a **cheat-sheet / rapid-fire interview Q&A recap**.
- 10–13 lessons, 5–7 quizzes. Depth over fluff, but keep energy high.
