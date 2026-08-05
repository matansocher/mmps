export default {
  id: 'typescript-deep-dive-course',
  title: 'TypeScript Deep Dive',
  icon: '🔷',
  color: '#4aa3ff',
  lessons: [
    {
      id: 'structural-typing',
      group: 'Foundations',
      nav: '0 · Types are sets',
      title: 'Structural typing & the mental model',
      lede: 'Stop thinking classes. Start thinking sets of values with shapes. This one reframe unlocks the whole type system.',
      html: `
        <p>Here's the single mental model that makes TypeScript click: <span class='kicker'>a type is a set of values</span>. <code>number</code> is the set of all numbers. <code>string</code> is the set of all strings. <code>boolean</code> is a set with exactly two members. <code>'hello'</code> (a literal type) is a set of <em>one</em>. And <code>never</code> is the empty set — the set with nothing in it. 🎯</p>

        <p>Once you see types as sets, the operators stop being magic:</p>
        <ul>
          <li><strong>Union</strong> <code>A | B</code> = set <em>union</em>. Bigger set, fewer guarantees.</li>
          <li><strong>Intersection</strong> <code>A &amp; B</code> = set <em>intersection</em>. Smaller set, more guarantees.</li>
          <li><strong>Subtype</strong> = subset. <code>'hello'</code> is a subtype of <code>string</code> because it's a subset.</li>
          <li><strong>Assignable</strong> = "fits inside". <code>x: A</code> is assignable to <code>B</code> when the set A is a subset of B.</li>
        </ul>

        <div class='diagram'>
          <svg viewBox='0 0 640 220' width='640'>
            <ellipse cx='320' cy='110' rx='300' ry='95' fill='none' stroke='#4aa3ff' stroke-width='2'/>
            <text class='node-sub' x='320' y='35' text-anchor='middle'>unknown — the universal set (everything)</text>
            <ellipse cx='250' cy='120' rx='150' ry='60' fill='none' stroke='#38d39f' stroke-width='2'/>
            <text class='node-text' x='250' y='110' text-anchor='middle'>string</text>
            <ellipse cx='250' cy='130' rx='55' ry='26' fill='none' stroke='#f0a338' stroke-width='2'/>
            <text class='node-sub' x='250' y='135' text-anchor='middle'>'hello' (1 value)</text>
            <circle cx='470' cy='120' r='6' fill='#e5484d'/>
            <text class='node-sub' x='470' y='150' text-anchor='middle'>never (∅)</text>
          </svg>
          <div class='diagram-caption'>Everything nests: never ⊂ literals ⊂ primitives ⊂ unknown. Subtype = subset.</div>
        </div>

        <h3>Structural, not nominal</h3>
        <p>Most languages you've used (Java, C#) are <em>nominal</em>: two types match only if they share a name. TypeScript is <span class='kicker'>structural</span> (a.k.a. duck typing): if it has the right shape, it fits — names be damned. If it walks like a duck and quacks like a duck, TS calls it a duck. 🦆</p>

        <pre><code>type Point = { x: number; y: number };

function len(p: Point) { return Math.hypot(p.x, p.y); }

// No 'Point' anywhere — but the SHAPE matches, so it's accepted.
len({ x: 3, y: 4 }); // 5

// Extra properties are fine when the value isn't a fresh literal:
const p3d = { x: 3, y: 4, z: 5 };
len(p3d); // OK — p3d is a superset shape, still a Point</code></pre>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: excess property checks</div>
          Object <em>literals</em> passed directly get an extra "excess property check". <code>len({ x: 3, y: 4, z: 5 })</code> errors, but assigning to a variable first (like <code>p3d</code>) does not. It's a freshness heuristic to catch typos, not a real type rule. Escape hatches: assign to a variable, or add an index signature.
        </div>

        <h3>Nominal typing when you actually need it</h3>
        <p>Sometimes structural is too loose — a <code>UserId</code> and an <code>OrderId</code> are both <code>string</code> but must never mix. Fake nominal typing with a <span class='kicker'>branded type</span>:</p>
        <pre><code>type UserId = string &amp; { readonly __brand: 'UserId' };
const asUserId = (s: string) =&gt; s as UserId;
// Now a plain string is NOT assignable to UserId.</code></pre>

        <h3>type vs interface</h3>
        <p>The interview classic. They overlap ~90%. Real differences:</p>
        <table>
          <tr><th>Feature</th><th>type</th><th>interface</th></tr>
          <tr><td>Unions / primitives / tuples</td><td>✅</td><td>❌</td></tr>
          <tr><td>Declaration merging</td><td>❌</td><td>✅ (reopens)</td></tr>
          <tr><td>Mapped / conditional / template types</td><td>✅</td><td>❌</td></tr>
          <tr><td>extends / implements</td><td>via <code>&amp;</code></td><td>native <code>extends</code></td></tr>
          <tr><td>Perf on big object types</td><td>slightly slower (eager)</td><td>cached, faster errors</td></tr>
        </table>
        <p>Rule of thumb: <strong>interface for public object/class contracts</strong> (mergeable, faster), <strong>type for everything else</strong> (unions, tuples, mapped, computed).</p>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "A type is a set of values, assignability is subset-checking, and TypeScript matches by shape not by name. That's why <code>never</code> is the empty set and <code>unknown</code> is the universal set."
        </div>
      `,
    },
    {
      id: 'literal-types-widening',
      group: 'Foundations',
      nav: '1 · Literals & widening',
      title: 'Literal types, widening & const assertions',
      lede: 'Why const gives you a narrower type than let, why "as const" is magic, and when to reach for an enum vs a const object.',
      html: `
        <p>TypeScript constantly makes a judgment call: when you write a literal value, should the type be the <em>narrow literal</em> (<code>'GET'</code>) or the <em>wide primitive</em> (<code>string</code>)? This is <span class='kicker'>widening</span>, and it's the source of a hundred "why is my type <code>string</code>?!" moments.</p>

        <pre><code>let a = 'GET';        // type: string  (widened — let is mutable)
const b = 'GET';      // type: 'GET'   (literal — const can never change)

const obj = { method: 'GET' };
obj.method;           // type: string  (properties are mutable, so widened)</code></pre>

        <div class='callout warn'>
          <div class='c-title'>The classic bug</div>
          You pass <code>{ method: 'GET' }</code> to a function expecting <code>method: 'GET' | 'POST'</code> and it works. But store it in a variable first and it fails — because the property widened to <code>string</code>. Fix with <code>as const</code> or an explicit annotation.
        </div>

        <h3>const assertions — freeze it, narrow it</h3>
        <p><code>as const</code> does three things at once: makes every property <code>readonly</code>, keeps every literal <em>narrow</em>, and turns arrays into <code>readonly</code> tuples.</p>
        <pre><code>const route = { method: 'GET', path: '/users' } as const;
// { readonly method: 'GET'; readonly path: '/users' }

const roles = ['admin', 'user'] as const;
// readonly ['admin', 'user']
type Role = typeof roles[number]; // 'admin' | 'user'  ← single source of truth</code></pre>

        <p>That last pattern — <code>as const</code> array plus <code>typeof x[number]</code> — is the senior way to derive a union from a runtime list without repeating yourself.</p>

        <h3>enum vs const object vs union</h3>
        <p>Enums are the one TypeScript feature that <em>emits runtime code</em> (a two-way lookup object), which surprises people. For most cases a <code>const</code> object or a plain union is leaner and tree-shakeable.</p>
        <table>
          <tr><th>Approach</th><th>Runtime cost</th><th>Notes</th></tr>
          <tr><td><code>enum Color { Red, Green }</code></td><td>emits an object</td><td>reverse mapping for numeric enums; not tree-shakeable</td></tr>
          <tr><td><code>const enum</code></td><td>inlined, zero cost</td><td>needs care with <code>isolatedModules</code>/Babel; can break</td></tr>
          <tr><td><code>const Color = { Red:'red' } as const</code></td><td>plain object</td><td>tree-shakeable, works everywhere</td></tr>
          <tr><td>union <code>'red' | 'green'</code></td><td>zero (erased)</td><td>simplest; no runtime value to iterate</td></tr>
        </table>
        <div class='callout danger'>
          <div class='c-title'>War story</div>
          A team shipped <code>const enum</code> across package boundaries with <code>isolatedModules</code> on (esbuild/Babel). The consts couldn't be inlined, producing <code>undefined</code> at runtime. Rule: avoid <code>const enum</code> in libraries. TS 5.8's <code>erasableSyntaxOnly</code> flag will even ban enums outright for Node's native type-stripping.
        </div>

        <h3>Widening of null/undefined</h3>
        <p>Under <code>strictNullChecks</code>, <code>let x = null</code> widens to <code>any</code> (in non-strict it's the "evolving <code>any</code>"). Annotate boundaries explicitly.</p>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "<code>const</code> narrows to a literal, <code>let</code> widens to a primitive, and <code>as const</code> deep-freezes to <code>readonly</code> literals — which is how I derive a union from a runtime array with <code>typeof arr[number]</code>."
        </div>
      `,
    },
    {
      id: 'generics',
      group: 'Foundations',
      nav: '2 · Generics',
      title: 'Generics & constraints',
      lede: 'Generics are functions that take types as arguments. Constraints are their parameter types. That framing makes advanced generics tractable.',
      html: `
        <p>Think of a generic as a <span class='kicker'>function at the type level</span>. <code>Array&lt;T&gt;</code> is a function: give it <code>string</code>, get <code>string[]</code>. The magic isn't the angle brackets — it's <em>inference</em>. TypeScript watches how you call a function and back-solves the type variable.</p>

        <pre><code>function first&lt;T&gt;(arr: T[]): T | undefined { return arr[0]; }

first([1, 2, 3]);      // T inferred as number  → number | undefined
first(['a', 'b']);     // T inferred as string  → string | undefined</code></pre>

        <h3>Constraints: <code>extends</code> = "must be at least"</h3>
        <p>A bare <code>T</code> is "any type at all", so you can barely touch it. Constrain it to promise a shape:</p>
        <pre><code>function prop&lt;T, K extends keyof T&gt;(obj: T, key: K): T[K] {
  return obj[key];
}
prop({ name: 'Ada', age: 36 }, 'age'); // number, fully type-safe</code></pre>

        <div class='callout good'>
          <div class='c-title'>The golden rule of generics</div>
          A type parameter should appear at least <strong>twice</strong> — once to capture, once to use. If <code>T</code> shows up only once (e.g. a param you never relate to the return), it's not really generic; it's an <code>any</code> in disguise. This is the "return-type generic" anti-pattern.
        </div>

        <pre><code>// ❌ Fake generic: T appears once, effectively a cast.
function parse&lt;T&gt;(s: string): T { return JSON.parse(s); }
const u = parse&lt;User&gt;('{}'); // lies — no runtime validation

// ✅ Real generic: T is captured from input AND used in output.
function identity&lt;T&gt;(x: T): T { return x; }</code></pre>

        <h3>Defaults &amp; the const modifier</h3>
        <pre><code>type Box&lt;T = string&gt; = { value: T };        // default type arg
function ids&lt;const T&gt;(xs: T[]): T[] { return xs; } // TS 5.0: infers literals</code></pre>
        <p>The <code>const</code> type parameter (TS 5.0+) tells inference to keep literals narrow without callers writing <code>as const</code> — great for library APIs.</p>

        <h3>Where generics bite</h3>
        <ul>
          <li><strong>Over-genericizing:</strong> three type params nobody can read. Prefer concrete types until you have a second caller.</li>
          <li><strong>Inference failure:</strong> when TS can't solve <code>T</code>, it falls back to the constraint (or <code>unknown</code>). Add an explicit type argument.</li>
          <li><strong>Distribution surprises</strong> when a generic flows into a conditional type (covered in the conditional-types lesson).</li>
        </ul>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Generics are type-level functions solved by inference. My rule: a type parameter must be used at least twice, otherwise it's a disguised cast that lies to callers."
        </div>
      `,
    },
    {
      id: 'unions-intersections',
      group: 'Composition',
      nav: '3 · Unions & DUs',
      title: 'Union & intersection types; discriminated unions',
      lede: 'Model your data so illegal states are unrepresentable. Discriminated unions plus exhaustiveness are the senior-level move.',
      html: `
        <p>Reminder from lesson 0: <code>A | B</code> is set union (either), <code>A &amp; B</code> is set intersection (both). Unions widen; intersections combine. But the crown jewel is the <span class='kicker'>discriminated union</span> — a tagged union where one literal field tells you which variant you hold.</p>

        <pre><code>type Loading = { status: 'loading' };
type Success = { status: 'success'; data: string };
type Failure = { status: 'error'; message: string };
type State = Loading | Success | Failure;

function render(s: State) {
  switch (s.status) {
    case 'loading': return 'spinner';
    case 'success': return s.data;      // narrowed — .data exists here
    case 'error':   return s.message;   // narrowed — .message exists here
  }
}</code></pre>

        <h3>Illegal states, unrepresentable</h3>
        <p>The whole point: you <em>cannot</em> construct a <code>State</code> that is both loading and has <code>data</code>. Compare to the amateur version — <code>{ isLoading: boolean; data?: string; error?: string }</code> — which allows nonsense like loading + error + data all at once. The DU makes bad states a <em>compile error</em>, not a runtime bug.</p>

        <h3>Exhaustiveness with never</h3>
        <p>Add a <code>default</code> that assigns to <code>never</code>. When you add a fourth variant and forget a case, the compiler screams. This is the trick interviewers fish for. 🎣</p>
        <pre><code>function assertNever(x: never): never {
  throw new Error('Unhandled: ' + JSON.stringify(x));
}
switch (s.status) {
  case 'loading': /* ... */ break;
  case 'success': /* ... */ break;
  case 'error':   /* ... */ break;
  default: return assertNever(s); // ← compile error if a case is missing
}</code></pre>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: intersecting mismatched primitives</div>
          <code>string &amp; number</code> is <code>never</code> (empty set — no value is both). And intersecting objects with a conflicting field, e.g. <code>{ x: string } &amp; { x: number }</code>, gives a field of type <code>never</code>, quietly making the type uninhabitable.
        </div>

        <div class='pattern-card'>
          <h4>Discriminated union</h4>
          A shared literal tag field (<code>kind</code>/<code>type</code>/<code>status</code>) across variants, enabling switch-narrowing and exhaustiveness.
          <div class='tag-row'><span class='tag use'>use when modeling state machines, API results, events, AST nodes</span><span class='tag avoid'>avoid when variants share no natural tag</span></div>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "I model variants as a discriminated union with a literal tag, then add an <code>assertNever</code> default so adding a variant without handling it is a compile-time error — making illegal states unrepresentable."
        </div>
      `,
    },
    {
      id: 'narrowing',
      group: 'Composition',
      nav: '4 · Narrowing',
      title: 'Type narrowing, guards & assertion functions',
      lede: 'The compiler is a flow analyzer. Narrowing is how you talk to it. Learn every dialect: typeof, in, instanceof, predicates, assertions.',
      html: `
        <p>TypeScript performs <span class='kicker'>control-flow analysis</span>: inside an <code>if</code>, it tracks what must be true and shrinks the type accordingly. Your job is to write checks it understands. Each check is a "guard".</p>

        <h3>The built-in guards</h3>
        <table>
          <tr><th>Guard</th><th>Narrows</th><th>Example</th></tr>
          <tr><td><code>typeof x === 'string'</code></td><td>primitives</td><td>string/number/boolean/symbol/bigint/function/object/undefined</td></tr>
          <tr><td><code>x instanceof C</code></td><td>class instances</td><td>uses the prototype chain</td></tr>
          <tr><td><code>'k' in x</code></td><td>object shape</td><td>presence of a property</td></tr>
          <tr><td><code>x === literal</code></td><td>discriminated unions</td><td>the DU switch</td></tr>
          <tr><td><code>Array.isArray(x)</code></td><td>arrays</td><td>built-in predicate</td></tr>
          <tr><td>truthiness <code>if (x)</code></td><td>removes null/undefined/0/''</td><td>watch the <code>0</code>/empty-string trap</td></tr>
        </table>

        <div class='callout warn'>
          <div class='c-title'>The truthiness trap</div>
          <code>if (x)</code> also rules out <code>0</code> and <code>''</code>. For "not null/undefined" specifically, use <code>if (x != null)</code> — the one place loose <code>!=</code> is idiomatic (it matches both <code>null</code> and <code>undefined</code>).
        </div>

        <h3>Custom type guards: <code>x is T</code></h3>
        <p>When a boolean function should teach the compiler, return a <span class='kicker'>type predicate</span>:</p>
        <pre><code>function isCat(a: Animal): a is Cat {
  return (a as Cat).meow !== undefined;
}
if (isCat(pet)) pet.meow(); // narrowed to Cat</code></pre>

        <h3>Assertion functions: <code>asserts x is T</code></h3>
        <p>These <em>throw</em> if the check fails and narrow for the rest of the scope — like Node's <code>assert</code>:</p>
        <pre><code>function assertString(x: unknown): asserts x is string {
  if (typeof x !== 'string') throw new Error('not a string');
}
assertString(input);
input.toUpperCase(); // input is string from here on</code></pre>

        <h3>Narrowing gotchas seniors get asked</h3>
        <ul>
          <li><strong>Reassignment resets narrowing.</strong> Narrow, then reassign, and the compiler forgets.</li>
          <li><strong>Callbacks lose narrowing.</strong> A narrowed variable captured in a closure widens again, because the compiler can't prove the callback runs synchronously.</li>
          <li><strong>Type predicates can lie.</strong> <code>a is Cat</code> is trusted, not verified — a wrong predicate is an unsafe cast.</li>
          <li><strong>TS 5.5 infers predicates</strong> for simple <code>filter</code> callbacks, so <code>arr.filter(x =&gt; x != null)</code> now narrows automatically.</li>
        </ul>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Narrowing is control-flow analysis. I reach for <code>typeof</code>/<code>in</code>/<code>instanceof</code> first, custom <code>x is T</code> predicates when logic is reusable, and <code>asserts x is T</code> functions to validate-and-narrow at trust boundaries."
        </div>
      `,
    },
    {
      id: 'functions-overloads',
      group: 'Composition',
      nav: '5 · Functions & this',
      title: 'Function types, overloads & this typing',
      lede: 'Call signatures, overloads, parameter bivariance, and the surprisingly tricky "this" parameter — the details interviewers use to separate mid from senior.',
      html: `
        <p>Functions are values, so they have types too. The full toolbox: call signatures, construct signatures, overloads, rest/tuple params, and the phantom <code>this</code> parameter.</p>

        <h3>Overloads: many faces, one body</h3>
        <p>Declare several call signatures, then <em>one</em> implementation. The implementation signature is not visible to callers — it only has to be compatible.</p>
        <pre><code>function make(x: number): number[];
function make(x: string): string[];
function make(x: number | string): unknown[] {
  return [x];
}
make(3);    // number[]
make('a');  // string[]</code></pre>
        <div class='callout warn'>
          <div class='c-title'>Overload order matters</div>
          TypeScript picks the <strong>first</strong> matching overload top-to-bottom. Put the most specific signatures first. Also prefer a single union signature over overloads when you can — overloads don't distribute and are easy to get subtly wrong.
        </div>

        <h3>Parameter bivariance — the famous unsoundness</h3>
        <p>Method parameters are checked <em>bivariantly</em> for historical/ergonomic reasons, which is technically unsound. Turn on <code>strictFunctionTypes</code> and function-typed properties become contravariant (safe) — but <em>method</em> shorthand stays bivariant.</p>
        <pre><code>type Handler = { on(e: Event): void };
// A handler expecting a MouseEvent is accepted where Event is required —
// unsound, but permitted, because array/DOM ergonomics depend on it.</code></pre>

        <h3>The <code>this</code> parameter</h3>
        <p>A fake first parameter named <code>this</code> types the receiver and is <em>erased</em> at runtime:</p>
        <pre><code>function reset(this: Button) { this.label = ''; }
// Callers must invoke with a Button as 'this'; a bare call errors under
// noImplicitThis. Combine with ThisParameterType&lt;T&gt; / OmitThisParameter&lt;T&gt;.</code></pre>

        <h3>Rest, tuples &amp; spreading</h3>
        <pre><code>type Args = [id: number, name: string];    // labeled tuple
function log(...args: Args) {}
log(1, 'a');                                  // spread a tuple as params</code></pre>
        <p>Variadic tuple types let you type <code>Function.prototype.bind</code>, <code>curry</code>, and <code>promisify</code> precisely — a favorite advanced question.</p>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Overloads expose multiple public signatures over one implementation that callers never see; and TS checks method params bivariantly for ergonomics — <code>strictFunctionTypes</code> makes function-property params contravariant, but method shorthand stays bivariant."
        </div>
      `,
    },
    {
      id: 'keyof-typeof-indexed',
      group: 'Type Operators',
      nav: '6 · keyof & indexed',
      title: 'keyof, typeof & indexed access types',
      lede: 'The three little operators that let you compute types FROM values and other types instead of hand-writing them.',
      html: `
        <p>These three are the gateway drug to type-level programming. They let you derive types so a single source of truth drives everything.</p>

        <h3><code>keyof</code> — the keys as a union</h3>
        <pre><code>type User = { id: number; name: string; admin: boolean };
type Keys = keyof User; // 'id' | 'name' | 'admin'</code></pre>

        <h3><code>typeof</code> — value world → type world</h3>
        <p>The <em>type-level</em> <code>typeof</code> (not the runtime one) captures the type of an existing value — perfect for config objects and single-source-of-truth patterns.</p>
        <pre><code>const config = { retries: 3, url: '/api' };
type Config = typeof config; // { retries: number; url: string }</code></pre>

        <h3>Indexed access — reach inside a type</h3>
        <pre><code>type Name = User['name'];          // string
type Vals = User[keyof User];      // number | string | boolean
type Item = Article[]['0'] extends never ? never : never; // (see below)
type Elem = string[][number];      // string  ← element type of an array</code></pre>
        <p>The <code>[number]</code> trick reads "index an array/tuple type with a number" and returns the element/union of elements — pairs beautifully with <code>as const</code>.</p>

        <pre><code>const ROLES = ['admin', 'editor', 'viewer'] as const;
type Role = typeof ROLES[number]; // 'admin' | 'editor' | 'viewer'</code></pre>

        <div class='callout good'>
          <div class='c-title'>The single-source-of-truth combo</div>
          <code>as const</code> (freeze the value) + <code>typeof</code> (lift to type) + <code>[number]</code>/<code>keyof</code> (extract) is the trio that keeps runtime data and types in perfect sync. Change the array, the union updates itself.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          Indexing with a key that might not exist gives an error under <code>noUncheckedIndexedAccess</code> — which adds <code>| undefined</code> to every index access on records/arrays. Great for safety, noisy at first.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "<code>keyof</code> lifts keys to a union, type-level <code>typeof</code> lifts a value to its type, and indexed access <code>T[K]</code> reaches inside — together they let one runtime object drive all my types."
        </div>
      `,
    },
    {
      id: 'conditional-types',
      group: 'Type Operators',
      nav: '7 · Conditional types',
      title: 'Conditional types & distribution',
      lede: 'if/else at the type level — plus a surprising superpower: they distribute over unions, one member at a time.',
      html: `
        <p>A conditional type is a ternary for types: <code>T extends U ? X : Y</code>. Read it as "is T assignable to (a subset of) U? If yes, X; else Y".</p>

        <pre><code>type IsString&lt;T&gt; = T extends string ? 'yes' : 'no';
type A = IsString&lt;string&gt;;  // 'yes'
type B = IsString&lt;number&gt;;  // 'no'</code></pre>

        <h3>The twist: distribution over unions</h3>
        <p>When the checked type is a <em>naked type parameter</em> and you pass a union, the conditional <span class='kicker'>distributes</span> — it runs once per union member and re-unions the results.</p>
        <pre><code>type ToArray&lt;T&gt; = T extends any ? T[] : never;
type R = ToArray&lt;string | number&gt;;
// distributes → ToArray&lt;string&gt; | ToArray&lt;number&gt;
// = string[] | number[]   (NOT (string | number)[])</code></pre>

        <h3>Turning distribution OFF</h3>
        <p>Wrap both sides in a 1-tuple to stop distribution — the parameter is no longer "naked":</p>
        <pre><code>type NoDistribute&lt;T&gt; = [T] extends [any] ? T[] : never;
type R2 = NoDistribute&lt;string | number&gt;; // (string | number)[]</code></pre>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: distributing over <code>never</code></div>
          <code>never</code> is the empty union, so a distributive conditional over <code>never</code> produces <code>never</code> (zero iterations). If a helper "mysteriously" returns <code>never</code>, a distribution ran zero times. Guard with the <code>[T] extends [never]</code> tuple trick.
        </div>

        <h3>Where it earns its keep</h3>
        <ul>
          <li>Filtering unions: <code>Exclude&lt;T, U&gt; = T extends U ? never : T</code>.</li>
          <li>Unwrapping: <code>Awaited</code>, <code>Flatten</code>, <code>ElementType</code> (with <code>infer</code>).</li>
          <li>Overload-free API shaping based on an input flag.</li>
        </ul>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Conditional types are type-level ternaries, and a <em>naked</em> type parameter distributes over unions member-by-member. To block that, wrap both sides in a 1-tuple: <code>[T] extends [U]</code>."
        </div>
      `,
    },
    {
      id: 'mapped-types',
      group: 'Type Operators',
      nav: '8 · Mapped types',
      title: 'Mapped types & key remapping',
      lede: 'Loop over keys to transform a type. Add or strip readonly and optional. Rename keys with "as". This is where utility types come from.',
      html: `
        <p>A mapped type is a <span class='kicker'>for-loop over keys</span>. The syntax <code>{ [K in Keys]: ValueType }</code> visits each key and produces a new property. It's how <code>Partial</code>, <code>Readonly</code>, and friends are built.</p>

        <pre><code>type MyReadonly&lt;T&gt; = { readonly [K in keyof T]: T[K] };
type MyPartial&lt;T&gt;  = { [K in keyof T]?: T[K] };</code></pre>

        <h3>Modifiers: add and remove with + / -</h3>
        <table>
          <tr><th>Modifier</th><th>Effect</th></tr>
          <tr><td><code>readonly</code> / <code>+readonly</code></td><td>make each property readonly</td></tr>
          <tr><td><code>-readonly</code></td><td>strip readonly (make mutable)</td></tr>
          <tr><td><code>?</code> / <code>+?</code></td><td>make each property optional</td></tr>
          <tr><td><code>-?</code></td><td>strip optionality → <code>Required&lt;T&gt;</code></td></tr>
        </table>
        <pre><code>type Mutable&lt;T&gt;  = { -readonly [K in keyof T]: T[K] };
type Required2&lt;T&gt; = { [K in keyof T]-?: T[K] };</code></pre>

        <h3>Key remapping with <code>as</code></h3>
        <p>Rename or filter keys during the loop (TS 4.1+). Returning <code>never</code> for a key <em>drops</em> it.</p>
        <pre><code>type Getters&lt;T&gt; = {
  [K in keyof T as \`get\${Capitalize&lt;string &amp; K&gt;}\`]: () =&gt; T[K]
};
// { name: string } → { getName: () =&gt; string }

type RemoveId&lt;T&gt; = { [K in keyof T as K extends 'id' ? never : K]: T[K] };</code></pre>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: homomorphic mapping</div>
          A mapped type over <code>keyof T</code> is "homomorphic" — it <em>preserves</em> the original modifiers and even maps over arrays/tuples correctly. Map over an unrelated key union instead and you lose that magic (arrays become plain objects). Keep <code>in keyof T</code> when you want structure-preserving behavior.
        </div>

        <div class='pattern-card'>
          <h4>Mapped type + key remap</h4>
          Transform every property (and optionally rename/filter keys) in one declarative sweep.
          <div class='tag-row'><span class='tag use'>use when deriving DTOs, form models, event maps</span><span class='tag avoid'>avoid when a built-in utility already does it</span></div>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Mapped types loop over keys; <code>+/-</code> add or remove <code>readonly</code>/<code>?</code>, and <code>as</code> remaps keys where returning <code>never</code> deletes a key. Homomorphic (<code>in keyof T</code>) mappings preserve modifiers and tuple-ness."
        </div>
      `,
    },
    {
      id: 'utility-types',
      group: 'Toolbox',
      nav: '9 · Utility types',
      title: 'Built-in utility types & rolling your own',
      lede: 'The standard-library types are not magic — reimplement them and you never fear a type puzzle again.',
      html: `
        <p>TypeScript ships a toolbox of utility types. The senior move isn't memorizing them — it's knowing they're all <em>trivially reimplementable</em> from mapped and conditional types. Here's the cheat sheet, with the one-liner behind each.</p>

        <table>
          <tr><th>Utility</th><th>Does</th><th>Definition (essence)</th></tr>
          <tr><td><code>Partial&lt;T&gt;</code></td><td>all optional</td><td><code>{ [K in keyof T]?: T[K] }</code></td></tr>
          <tr><td><code>Required&lt;T&gt;</code></td><td>all required</td><td><code>{ [K in keyof T]-?: T[K] }</code></td></tr>
          <tr><td><code>Readonly&lt;T&gt;</code></td><td>all readonly</td><td><code>{ readonly [K in keyof T]: T[K] }</code></td></tr>
          <tr><td><code>Pick&lt;T,K&gt;</code></td><td>keep keys K</td><td><code>{ [P in K]: T[P] }</code></td></tr>
          <tr><td><code>Omit&lt;T,K&gt;</code></td><td>drop keys K</td><td><code>Pick&lt;T, Exclude&lt;keyof T, K&gt;&gt;</code></td></tr>
          <tr><td><code>Record&lt;K,V&gt;</code></td><td>dict type</td><td><code>{ [P in K]: V }</code></td></tr>
          <tr><td><code>Exclude&lt;T,U&gt;</code></td><td>remove U from union</td><td><code>T extends U ? never : T</code></td></tr>
          <tr><td><code>Extract&lt;T,U&gt;</code></td><td>keep only U</td><td><code>T extends U ? T : never</code></td></tr>
          <tr><td><code>NonNullable&lt;T&gt;</code></td><td>drop null/undefined</td><td><code>T &amp; {}</code> (TS 4.8+)</td></tr>
          <tr><td><code>ReturnType&lt;F&gt;</code></td><td>function result</td><td><code>F extends (...a:any)=&gt;infer R ? R : never</code></td></tr>
          <tr><td><code>Parameters&lt;F&gt;</code></td><td>args tuple</td><td><code>F extends (...a:infer P)=&gt;any ? P : never</code></td></tr>
          <tr><td><code>Awaited&lt;T&gt;</code></td><td>unwrap Promise (recursive)</td><td>conditional + <code>infer</code>, recurses on thenables</td></tr>
        </table>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: Omit is not homomorphic</div>
          <code>Omit</code> is built on <code>Pick&lt;T, Exclude&lt;...&gt;&gt;</code>, so it does <em>not</em> preserve modifiers the way a homomorphic mapped type would, and it happily accepts keys that don't exist on <code>T</code> (loosely typed second parameter). If you need strict key-checking, wrap it: <code>Omit&lt;T, K extends keyof T&gt;</code>.
        </div>

        <h3>Under-used gems</h3>
        <ul>
          <li><code>Uppercase</code>/<code>Lowercase</code>/<code>Capitalize</code>/<code>Uncapitalize</code> — intrinsic string types.</li>
          <li><code>InstanceType&lt;C&gt;</code>, <code>ConstructorParameters&lt;C&gt;</code> — for class constructors.</li>
          <li><code>NoInfer&lt;T&gt;</code> (TS 5.4) — blocks a position from participating in inference.</li>
        </ul>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Every utility type is a two-line mapped or conditional type — <code>Omit = Pick + Exclude</code>, <code>ReturnType = infer R</code>. Knowing the definitions means I can reconstruct or extend any of them on demand."
        </div>
      `,
    },
    {
      id: 'template-literal-types',
      group: 'Toolbox',
      nav: '10 · Template literals',
      title: 'Template literal types',
      lede: 'Strings, but at the type level. Build, split, and validate string shapes so your APIs are typo-proof.',
      html: `
        <p>Template literal <em>types</em> let you compute string types the way template <em>literals</em> compute string values. You write them with backtick syntax and <code>&#36;{...}</code> placeholders, but here they interpolate <em>types</em>, producing unions of string literals.</p>

        <pre><code>type Color = 'red' | 'blue';
type Shade = 'light' | 'dark';

// Cartesian product as a union:
type Swatch = \`\${Shade}-\${Color}\`;
// 'light-red' | 'light-blue' | 'dark-red' | 'dark-blue'</code></pre>

        <div class='callout warn'>
          <div class='c-title'>Combinatorial explosion</div>
          Every interpolated union multiplies. Two 10-member unions become 100 literals; four become 10,000. TypeScript caps this and errors ("union too complex") to protect the type-checker. Keep template-type products small.
        </div>

        <h3>Pattern matching strings with <code>infer</code></h3>
        <p>Combine with conditional types to <em>parse</em> strings at the type level:</p>
        <pre><code>type Split&lt;S extends string&gt; =
  S extends \`\${infer Head}.\${infer Tail}\` ? [Head, ...Split&lt;Tail&gt;] : [S];
type P = Split&lt;'a.b.c'&gt;; // ['a', 'b', 'c']</code></pre>

        <h3>Real-world uses</h3>
        <ul>
          <li>Type-safe event names: <code>on&#36;{Capitalize&lt;Event&gt;}</code> in mapped types.</li>
          <li>CSS-in-JS units, route params (<code>/users/:id</code> → typed params), SQL builders.</li>
          <li>Libraries like <strong>tRPC</strong>, <strong>Zod</strong>, and <strong>Prisma</strong> lean on these for typo-proof keys and paths.</li>
        </ul>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Template literal types build and pattern-match string types — with <code>infer</code> I can parse a path or event name at compile time. But each interpolated union multiplies, so I watch for the 'union too complex' explosion."
        </div>
      `,
    },
    {
      id: 'infer-advanced',
      group: 'Advanced Inference',
      nav: '11 · infer tricks',
      title: 'infer and advanced inference',
      lede: 'infer is a wildcard that captures a piece of a type mid-match. It powers ReturnType, Awaited, and every type-extraction party trick.',
      html: `
        <p><code>infer</code> can only appear inside the <code>extends</code> clause of a conditional type. It means "match this position and <span class='kicker'>bind whatever's here</span> to a fresh type variable I can use in the true branch". It's regex capture groups for types. 🎯</p>

        <pre><code>type ElementType&lt;T&gt; = T extends (infer U)[] ? U : T;
type E = ElementType&lt;string[]&gt;; // string

type Return&lt;F&gt; = F extends (...args: any[]) =&gt; infer R ? R : never;
type Awaited2&lt;T&gt; = T extends Promise&lt;infer U&gt; ? Awaited2&lt;U&gt; : T; // recursive</code></pre>

        <h3>Multiple infers &amp; covariant vs contravariant positions</h3>
        <p>Several <code>infer</code>s of the <em>same name</em> combine: in a covariant (output) position they <span class='kicker'>union</span>; in a contravariant (input/parameter) position they <span class='kicker'>intersect</span>. This asymmetry is a favorite deep-cut question.</p>
        <pre><code>// Covariant → union
type U = { a: string } | { a: number } extends { a: infer T } ? T : never; // string | number
// Contravariant (params) → intersection
type I = ((a: string) =&gt; void) | ((a: number) =&gt; void) extends
  (a: infer T) =&gt; void ? T : never; // string &amp; number → never</code></pre>

        <h3>Constrained infer (TS 4.7+)</h3>
        <pre><code>type FirstNum&lt;T&gt; = T extends [infer H extends number, ...any[]] ? H : never;</code></pre>
        <p>Adding <code>extends number</code> to an <code>infer</code> filters and even lets you narrow numeric string literals to number types.</p>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          <code>infer</code> outside a conditional's <code>extends</code> is a syntax error. And recursive inference has a depth limit (~50 / 1000 instantiations depending on shape) — deep recursive types hit "excessively deep and possibly infinite".
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "<code>infer</code> is a capture group inside a conditional's <code>extends</code>. Same-named infers union in covariant (output) positions and intersect in contravariant (parameter) positions — that asymmetry falls straight out of variance."
        </div>
      `,
    },
    {
      id: 'variance-satisfies-unknown',
      group: 'Advanced Inference',
      nav: '12 · Variance & satisfies',
      title: 'Variance, satisfies, unknown vs any vs never',
      lede: 'The senior vocabulary layer: how subtyping flows through generics, and the keywords that keep you honest.',
      html: `
        <p>This is the "do you actually understand the type system" round. Four topics interviewers love.</p>

        <h3>Variance</h3>
        <p>Variance is how subtyping of parts relates to subtyping of the whole.</p>
        <ul>
          <li><span class='kicker'>Covariant</span>: outputs. <code>Cat[]</code> is a subtype of <code>Animal[]</code>. Arrays are covariant in TS — technically unsound (you can push a Dog into an Animal[] alias of a Cat[]), traded for ergonomics.</li>
          <li><span class='kicker'>Contravariant</span>: inputs. A function taking <code>Animal</code> is a subtype of one taking <code>Cat</code> (it accepts more). Enforced under <code>strictFunctionTypes</code>.</li>
          <li><span class='kicker'>Invariant</span>: both in and out (e.g. a mutable cell) — neither direction is safe.</li>
          <li><span class='kicker'>Bivariant</span>: TS's default for method params — unsound but ergonomic.</li>
        </ul>

        <h3>unknown vs any vs never</h3>
        <table>
          <tr><th>Type</th><th>Set</th><th>Assign TO it</th><th>Assign FROM it</th></tr>
          <tr><td><code>any</code></td><td>escape hatch</td><td>anything</td><td>anything (disables checks)</td></tr>
          <tr><td><code>unknown</code></td><td>universal set</td><td>anything</td><td>nothing until narrowed</td></tr>
          <tr><td><code>never</code></td><td>empty set</td><td>nothing (except never)</td><td>anything (vacuously)</td></tr>
        </table>
        <p><code>unknown</code> is the type-safe <code>any</code>: it accepts every value but forces you to narrow before use. Default untyped boundaries — <code>JSON.parse</code>, <code>catch (e)</code> (with <code>useUnknownInCatchVariables</code>), <code>fetch().json()</code> — to <code>unknown</code>, then validate.</p>

        <h3>satisfies (TS 4.9)</h3>
        <p><code>satisfies</code> checks a value against a type <em>without widening it</em>. You keep the precise inferred type <em>and</em> get validation — the best of annotation and inference.</p>
        <pre><code>const palette = {
  red:  [255, 0, 0],
  blue: '#00f',
} satisfies Record&lt;string, string | number[]&gt;;

palette.red.length;        // OK — still knows red is number[]
palette.blue.toUpperCase(); // OK — still knows blue is string
// With ': Record&lt;...&gt;' annotation instead, both would widen and lose this.</code></pre>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: any silently poisons</div>
          One <code>any</code> flowing through arithmetic or property access spreads and disables checking downstream with no error. Ban it with <code>noImplicitAny</code> + ESLint <code>no-explicit-any</code>, and prefer <code>unknown</code> at boundaries.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Arrays are covariant (unsound but ergonomic), function params contravariant under <code>strictFunctionTypes</code>. I default boundaries to <code>unknown</code> not <code>any</code>, and use <code>satisfies</code> to validate a literal while keeping its narrow inferred type."
        </div>
      `,
    },
    {
      id: 'tsconfig-declaration-files',
      group: 'Tooling',
      nav: '13 · tsconfig & .d.ts',
      title: 'tsconfig, strictness, type erasure & declaration files',
      lede: 'Types vanish at runtime. Know exactly what the compiler does, which strict flags matter, and how .d.ts + module augmentation glue the JS world to types.',
      html: `
        <p>TypeScript is a <span class='kicker'>type-checker plus a transpiler that erases types</span>. At runtime there are no types — no <code>T</code>, no interfaces, no type-only imports. Getting this straight kills a whole class of bugs and interview stumbles.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 130' width='640'>
            <defs><marker id='arrow' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='10' y='40' width='130' height='54' rx='8'/>
            <text class='node-text' x='75' y='64' text-anchor='middle'>.ts source</text>
            <text class='node-sub' x='75' y='82' text-anchor='middle'>types + logic</text>
            <line class='edge' x1='140' y1='67' x2='250' y2='67' marker-end='url(#arrow)'/>
            <text class='edge-label' x='195' y='58' text-anchor='middle'>tsc</text>
            <rect class='node-box worker' x='250' y='40' width='140' height='54' rx='8'/>
            <text class='node-text' x='320' y='64' text-anchor='middle'>.js (erased)</text>
            <text class='node-sub' x='320' y='82' text-anchor='middle'>logic only</text>
            <line class='edge' x1='390' y1='67' x2='500' y2='67' marker-end='url(#arrow)'/>
            <rect class='node-box tool' x='500' y='40' width='130' height='54' rx='8'/>
            <text class='node-text' x='565' y='64' text-anchor='middle'>.d.ts</text>
            <text class='node-sub' x='565' y='82' text-anchor='middle'>types only</text>
          </svg>
          <div class='diagram-caption'>Compilation splits source into runtime .js (types erased) and .d.ts (types only).</div>
        </div>

        <h3>The strict family (the flags that matter)</h3>
        <table>
          <tr><th>Flag</th><th>What it buys you</th></tr>
          <tr><td><code>strict</code></td><td>umbrella — turns on the whole family below</td></tr>
          <tr><td><code>strictNullChecks</code></td><td>null/undefined no longer in every type — the single biggest bug-catcher</td></tr>
          <tr><td><code>noImplicitAny</code></td><td>untyped params error instead of silently becoming <code>any</code></td></tr>
          <tr><td><code>strictFunctionTypes</code></td><td>contravariant function-property params</td></tr>
          <tr><td><code>noUncheckedIndexedAccess</code></td><td>adds <code>| undefined</code> to index access (not in <code>strict</code>, opt-in)</td></tr>
          <tr><td><code>exactOptionalPropertyTypes</code></td><td>distinguishes missing key from <code>undefined</code> value</td></tr>
        </table>

        <h3>What is NOT erased</h3>
        <p>Almost everything is erased, but a few constructs emit runtime code — the gotcha list: <code>enum</code> (emits an object), <code>namespace</code> with values, class <em>parameter properties</em>, and legacy <code>experimentalDecorators</code> metadata. That's why <code>isolatedModules</code> and Node's native type-stripping restrict these; TS 5.8's <code>erasableSyntaxOnly</code> bans the non-erasable ones.</p>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: type-only imports</div>
          <code>import type { User }</code> is guaranteed erased — critical under <code>isolatedModules</code>/bundlers so a type import doesn't accidentally trigger a side-effecting module load. Prefer <code>import type</code> for types, and <code>verbatimModuleSyntax</code> to make erasure explicit.
        </div>

        <h3>Declaration files &amp; augmentation</h3>
        <p><code>.d.ts</code> files describe the types of JS that has no types (or ships compiled). Two power moves interviewers ask about:</p>
        <ul>
          <li><strong>Declaration merging:</strong> reopen an <code>interface</code> (same name) to add members — how libraries let you extend <code>Express.Request</code>.</li>
          <li><strong>Module augmentation:</strong> <code>declare module 'x' { ... }</code> to bolt types onto a third-party module or <code>global</code> scope.</li>
        </ul>
        <pre><code>declare global {
  interface Window { __APP_VERSION__: string; }
}
export {}; // makes this a module so 'declare global' is legal</code></pre>

        <div class='callout danger'>
          <div class='c-title'>War story</div>
          A service typed <code>process.env.PORT</code> as <code>string</code> and did math on it — <code>strictNullChecks</code> was off, so <code>undefined</code> slipped through and the server bound to port <code>NaN</code>. Turning on <code>strict</code> surfaced it at compile time. Turn strict on <em>day one</em>; retrofitting is painful.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Types are fully erased — TS is a type-checker plus transpiler — except enums, namespaces, and parameter properties which emit code. <code>strict</code> (especially <code>strictNullChecks</code>) is non-negotiable, and I use <code>import type</code> + declaration merging / module augmentation to bridge the JS world."
        </div>
      `,
    },
    {
      id: 'classes-runtime',
      group: 'Tooling',
      nav: '14 · Classes & decorators',
      title: 'Classes, access modifiers & decorators',
      lede: 'The one OOP corner of TS that emits real runtime code: private vs #private, parameter properties, abstract, and the two decorator worlds.',
      html: `
        <p>Classes are where TypeScript's type layer meets real emitted JavaScript. Most of it is structural like everything else — but a few pieces are genuinely runtime.</p>

        <h3><code>private</code> vs <code>#private</code></h3>
        <table>
          <tr><th></th><th><code>private</code> (TS)</th><th><code>#field</code> (JS)</th></tr>
          <tr><td>Enforced at</td><td>compile time only</td><td>runtime (true encapsulation)</td></tr>
          <tr><td>Visible via <code>obj['x']</code></td><td>yes (accessible)</td><td>no — genuinely hidden</td></tr>
          <tr><td>Emitted</td><td>erased to a normal property</td><td>real ECMAScript private</td></tr>
        </table>
        <p>TS <code>private</code> is a suggestion the compiler enforces; <code>#private</code> is real, JS-native, and even changes <code>instanceof</code>-style brand checks. Reach for <code>#</code> when you need actual hiding.</p>

        <h3>Parameter properties — sugar that emits</h3>
        <pre><code>class Repo {
  constructor(private readonly db: Db, public name: string) {}
  // compiler emits: this.db = db; this.name = name;
}</code></pre>
        <p>This shorthand <em>generates runtime assignments</em>, so it's one of the non-erasable constructs banned under <code>erasableSyntaxOnly</code>/native type-stripping.</p>

        <h3>abstract, implements, override</h3>
        <ul>
          <li><code>abstract</code> classes/members can't be instantiated directly — a compile-time contract, erased at runtime.</li>
          <li><code>implements Interface</code> checks shape but adds <em>nothing</em> to emit (structural).</li>
          <li><code>override</code> (with <code>noImplicitOverride</code>) catches typos when you think you're overriding a base method.</li>
        </ul>

        <h3>Two decorator worlds</h3>
        <div class='callout warn'>
          <div class='c-title'>Gotcha: legacy vs standard decorators</div>
          <strong>Legacy</strong> decorators need <code>experimentalDecorators</code> + <code>emitDecoratorMetadata</code> (what Angular/NestJS/TypeORM use with <code>reflect-metadata</code>). <strong>Standard</strong> decorators (TS 5.0+, TC39 Stage 3) have a different signature and <em>no</em> parameter decorators or metadata yet. They are not interchangeable — mixing them is a classic migration trap.
        </div>
        <pre><code>function log(target: any, key: string) { /* legacy signature */ }
class S { @log method() {} } // requires experimentalDecorators</code></pre>

        <div class='pattern-card'>
          <h4>DI via decorators (NestJS/Angular)</h4>
          <code>@Injectable()</code> + constructor param types + <code>reflect-metadata</code> lets a container resolve dependencies from emitted metadata.
          <div class='tag-row'><span class='tag use'>use when you already run a metadata-based framework</span><span class='tag avoid'>avoid when targeting native Node type-stripping or bundlers that erase metadata</span></div>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "<code>private</code> is compile-time only; <code>#field</code> is real runtime encapsulation. Parameter properties, enums, and legacy decorator metadata are the constructs that actually emit code — and legacy vs Stage-3 standard decorators have incompatible signatures."
        </div>
      `,
    },
    {
      id: 'recap-cheatsheet',
      group: 'Recap',
      nav: '15 · Cheat-sheet',
      title: 'Pitfalls & rapid-fire interview Q&A',
      lede: 'The whole course compressed into soundbites, gotchas, and one-line answers you can fire back under pressure.',
      html: `
        <p>You've built the whole mental model. Here it is as a rapid-fire deck — the answers a senior gives in one breath. 🚀</p>

        <h3>One-breath answers</h3>
        <table>
          <tr><th>Question</th><th>Answer</th></tr>
          <tr><td>What is a type?</td><td>A set of values; assignability is subset-checking.</td></tr>
          <tr><td>Structural vs nominal?</td><td>TS matches by shape, not name; fake nominal with branded types.</td></tr>
          <tr><td><code>type</code> vs <code>interface</code>?</td><td>interface for public/mergeable object contracts; type for unions, tuples, mapped, computed.</td></tr>
          <tr><td>Widening?</td><td><code>let</code> widens to primitive, <code>const</code> keeps literal, <code>as const</code> freezes to readonly literals.</td></tr>
          <tr><td>Golden rule of generics?</td><td>A type param must appear ≥2 times, else it's a disguised cast.</td></tr>
          <tr><td>Discriminated union?</td><td>Literal tag + <code>assertNever</code> default for exhaustiveness.</td></tr>
          <tr><td>Type predicate vs assertion fn?</td><td><code>x is T</code> returns a boolean that narrows; <code>asserts x is T</code> throws and narrows.</td></tr>
          <tr><td>Conditional distribution?</td><td>Naked type param distributes over unions; block with <code>[T] extends [U]</code>.</td></tr>
          <tr><td>Strip optional in a mapped type?</td><td><code>-?</code> (that's <code>Required&lt;T&gt;</code>).</td></tr>
          <tr><td><code>Omit</code> definition?</td><td><code>Pick&lt;T, Exclude&lt;keyof T, K&gt;&gt;</code>.</td></tr>
          <tr><td><code>ReturnType</code>?</td><td><code>F extends (...a:any)=&gt;infer R ? R : never</code>.</td></tr>
          <tr><td>infer union vs intersection?</td><td>Union in covariant (output) positions, intersection in contravariant (param) positions.</td></tr>
          <tr><td><code>unknown</code> vs <code>any</code>?</td><td>unknown accepts all, permits none until narrowed; any disables checking.</td></tr>
          <tr><td>Why <code>satisfies</code>?</td><td>Validate a value without widening — keep the narrow inferred type.</td></tr>
          <tr><td>Arrays variance?</td><td>Covariant — unsound but ergonomic.</td></tr>
          <tr><td>What emits at runtime?</td><td>enums, namespaces-with-values, parameter properties, legacy decorator metadata; everything else is erased.</td></tr>
          <tr><td>Most important flag?</td><td><code>strictNullChecks</code> (via <code>strict</code>).</td></tr>
          <tr><td><code>private</code> vs <code>#</code>?</td><td><code>private</code> compile-time only; <code>#</code> real runtime encapsulation.</td></tr>
        </table>

        <h3>Top pitfalls (say these before they ask)</h3>
        <ul>
          <li><strong>Excess property checks</strong> only fire on fresh object literals — a freshness heuristic, not a rule.</li>
          <li><strong>Distribution over <code>never</code></strong> yields <code>never</code> (zero iterations) — the "mystery never".</li>
          <li><strong><code>as</code> casts lie;</strong> type predicates lie too — they're trusted, not verified.</li>
          <li><strong><code>any</code> poisons silently</strong> downstream; default boundaries to <code>unknown</code>.</li>
          <li><strong><code>const enum</code></strong> breaks under <code>isolatedModules</code>/Babel — avoid in libraries.</li>
          <li><strong>Narrowing resets</strong> on reassignment and is lost inside callbacks.</li>
        </ul>

        <div class='callout good'>
          <div class='c-title'>Mnemonic</div>
          <strong>"Sets, Shape, Strict."</strong> Types are Sets, TS matches by Shape, and you turn Strict on. If you remember three words walking into the room, remember those.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "TypeScript is set theory with a structural type-checker bolted onto an erasing transpiler. Master assignability-as-subset, discriminated unions with exhaustiveness, and the mapped/conditional/<code>infer</code> trio, and every advanced type puzzle becomes mechanical."
        </div>
      `,
    },
  ],
  quizzes: [
    {
      question: 'Under the "types are sets" model, what does the type never represent, and what is unknown?',
      options: [
        { text: 'never is the universal set (any value); unknown is the empty set', correct: false },
        { text: 'never is the empty set (no values); unknown is the universal set (any value)', correct: true },
        { text: 'Both are aliases for any with different names', correct: false },
      ],
      explain: 'never is the empty set — no value inhabits it, so it is the identity for unions and the bottom type. unknown is the universal set — every value is assignable to it, but you must narrow before using it.',
    },
    {
      question: 'You pass { x: 3, y: 4, z: 5 } directly to a function expecting { x: number; y: number } and get an error, but assigning it to a variable first works. Why?',
      options: [
        { text: 'Structural typing forbids extra properties entirely', correct: false },
        { text: 'Excess property checks fire only on fresh object literals as a typo-catching heuristic; a variable is no longer "fresh"', correct: true },
        { text: 'The variable version secretly casts to any', correct: false },
      ],
      explain: 'Excess property checks are a freshness heuristic applied to object literals passed directly, to catch typos. Once stored in a variable the value loses freshness and normal structural (superset) assignability applies.',
    },
    {
      question: 'Why is function parse<T>(s: string): T { return JSON.parse(s); } considered an anti-pattern?',
      options: [
        { text: 'JSON.parse is too slow for generics', correct: false },
        { text: 'T appears only once (in the return), so it is a caller-chosen cast with no runtime validation — it lies about safety', correct: true },
        { text: 'Generics cannot be used with string parameters', correct: false },
      ],
      explain: 'A type parameter that appears only once is not genuinely generic; the caller picks T and the function asserts it without checking, effectively an unsafe cast. Real generics use the parameter at least twice (capture and use).',
    },
    {
      question: 'What is the result of type ToArray<T> = T extends any ? T[] : never; applied as ToArray<string | number>?',
      options: [
        { text: '(string | number)[]', correct: false },
        { text: 'string[] | number[]', correct: true },
        { text: 'never', correct: false },
      ],
      explain: 'Because T is a naked type parameter, the conditional distributes over the union, evaluating once per member: string[] | number[]. To get (string | number)[] you would wrap in a tuple: [T] extends [any].',
    },
    {
      question: 'Which mapped-type modifier produces Required<T> by stripping optionality?',
      options: [
        { text: '+? on each property', correct: false },
        { text: '-? on each property', correct: true },
        { text: 'readonly on each property', correct: false },
      ],
      explain: 'Required<T> = { [K in keyof T]-?: T[K] }. The minus removes the optional modifier. Symmetrically, -readonly produces Mutable<T>.',
    },
    {
      question: 'How is ReturnType<F> implemented under the hood?',
      options: [
        { text: 'F extends (...args: any) => infer R ? R : never', correct: true },
        { text: 'keyof F["return"]', correct: false },
        { text: 'F["prototype"]["return"]', correct: false },
      ],
      explain: 'ReturnType uses a conditional type with infer to capture the return position of the function signature. Parameters<F> does the same for the parameter tuple: (...args: infer P) => any.',
    },
    {
      question: 'What is the key advantage of satisfies over a plain annotation like const c: Record<string, number[] | string> = {...}?',
      options: [
        { text: 'satisfies is faster to compile', correct: false },
        { text: 'satisfies validates the value against the type WITHOUT widening it, so the precise inferred property types are preserved', correct: true },
        { text: 'satisfies allows extra properties that annotations forbid', correct: false },
      ],
      explain: 'A type annotation widens the value to the annotated type, losing per-property precision. satisfies checks conformance but keeps the narrow inferred type, so you retain both validation and specificity.',
    },
    {
      question: 'Why should untyped boundaries (JSON.parse, catch clauses, fetch().json()) default to unknown rather than any?',
      options: [
        { text: 'unknown is faster at runtime', correct: false },
        { text: 'any disables type-checking and poisons downstream code silently, while unknown forces you to narrow/validate before use', correct: true },
        { text: 'They are identical; the choice is only stylistic', correct: false },
      ],
      explain: 'any is an escape hatch that turns off checking and spreads silently through any expression it touches. unknown accepts every value but permits no operations until you narrow it, keeping the boundary honest.',
    },
    {
      question: 'When same-named infer variables appear in a contravariant (function parameter) position across a union, how do they combine?',
      options: [
        { text: 'They union together', correct: false },
        { text: 'They intersect (which can collapse to never for disjoint primitives)', correct: true },
        { text: 'Only the first one is used', correct: false },
      ],
      explain: 'infer in covariant (output) positions unions the captures; in contravariant (parameter) positions it intersects them. This asymmetry follows directly from variance: parameters must accept the narrower/combined type.',
    },
    {
      question: 'Which TypeScript construct actually EMITS runtime JavaScript rather than being fully erased?',
      options: [
        { text: 'interface declarations', correct: false },
        { text: 'A class parameter property like constructor(private db: Db)', correct: true },
        { text: 'import type { User } from ...', correct: false },
      ],
      explain: 'Parameter properties generate real assignment statements (this.db = db), so they are not erasable — like enums, value-namespaces, and legacy decorator metadata. Interfaces and type-only imports are fully erased.',
    },
  ],
};
