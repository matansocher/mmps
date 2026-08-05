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
        </ul>

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
          Object <em>literals</em> passed directly get an extra "excess property check". <code>len({ x: 3, y: 4, z: 5 })</code> errors, but assigning to a variable first (like <code>p3d</code>) does not. It's a freshness heuristic, not a real type rule.
        </div>

        <h3>type vs interface</h3>
        <p>The interview classic. They overlap ~90%. Real differences:</p>
        <table>
          <tr><th>Feature</th><th>type</th><th>interface</th></tr>
          <tr><td>Unions / primitives / tuples</td><td>✅</td><td>❌</td></tr>
          <tr><td>Declaration merging</td><td>❌</td><td>✅ (reopens)</td></tr>
          <tr><td>Mapped / conditional / template types</td><td>✅</td><td>❌</td></tr>
          <tr><td>extends / implements</td><td>via <code>&amp;</code></td><td>✅ native</td></tr>
          <tr><td>Better error messages when named</td><td>ok</td><td>often nicer</td></tr>
        </table>

        <p>Rule of thumb: <strong>interface for public object/class contracts you might augment; type for everything else</strong> (unions, tuples, function types, anything computed).</p>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "A type is a set of values; assignability is subset-checking. TypeScript is structural, so shape wins over name. I default to <code>type</code> and reach for <code>interface</code> when I need declaration merging or a clean class contract."
        </div>
      `,
    },
    {
      id: 'generics',
      group: 'Foundations',
      nav: '1 · Generics',
      title: 'Generics & constraints',
      lede: 'Generics are functions that take types as arguments. Constraints are their parameter types. That framing makes advanced generics tractable.',
      html: `
        <p>Think of a generic as a <span class='kicker'>function at the type level</span>. <code>Array&lt;T&gt;</code> is a function: give it <code>string</code>, get <code>string[]</code>. The magic isn't the angle brackets — it's <em>inference</em>. TypeScript watches how you call a function and back-solves the type variable.</p>

        <pre><code>function first&lt;T&gt;(arr: T[]): T | undefined {
  return arr[0];
}

first([1, 2, 3]);       // T inferred as number
first(['a', 'b']);      // T inferred as string</code></pre>

        <h3>Constraints: <code>extends</code></h3>
        <p><code>T extends U</code> at a generic parameter means "T must be assignable to U" — it bounds the set. It's how you say "any type, <em>as long as</em> it has these keys".</p>

        <pre><code>function prop&lt;T, K extends keyof T&gt;(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: 1, name: 'Ada' };
prop(user, 'name'); // string
prop(user, 'age');  // ❌ 'age' is not keyof T</code></pre>

        <h3>Defaults</h3>
        <p>Generic parameters can have defaults, just like function arguments: <code>type Box&lt;T = string&gt; = { value: T }</code>. Great for public APIs where the common case shouldn't require a type argument.</p>

        <div class='callout warn'>
          <div class='c-title'>War story: the useless generic</div>
          A generic that appears only <em>once</em> in the signature is a code smell — it's just <code>any</code> in a trench coat. <code>function f&lt;T&gt;(x: T): void</code> gives you nothing over <code>unknown</code>. A real generic <strong>relates two or more positions</strong> (input to output, or two inputs).
        </div>

        <div class='two-col'>
          <div>
            <h4>Good generic 👍</h4>
            <pre><code>// T links input to output
&lt;T&gt;(x: T) =&gt; T</code></pre>
          </div>
          <div>
            <h4>Fake generic 👎</h4>
            <pre><code>// T used once — just unknown
&lt;T&gt;(x: T) =&gt; void</code></pre>
          </div>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "A generic parameter earns its keep only if it connects two positions in the signature. Constraints (<code>extends</code>) shrink the allowed set so I can safely index or call into T."
        </div>
      `,
    },
    {
      id: 'unions-intersections',
      group: 'Composition',
      nav: '2 · Unions & unions',
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
    case 'success': return s.data;      // narrowed to Success
    case 'error':   return s.message;   // narrowed to Failure
  }
}</code></pre>

        <p>The <code>status</code> literal is the <span class='kicker'>discriminant</span>. TypeScript uses it to narrow inside each branch — <code>s.data</code> is only reachable once <code>status === 'success'</code>. This is "make illegal states unrepresentable" in action: you can't have a <code>Success</code> without <code>data</code>.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 180' width='640'>
            <rect class='node-box' x='20' y='60' width='150' height='60' rx='8'/>
            <text class='node-text' x='95' y='88' text-anchor='middle'>State</text>
            <text class='node-sub' x='95' y='106' text-anchor='middle'>union of 3</text>
            <line class='edge' x1='170' y1='90' x2='250' y2='40'/>
            <line class='edge' x1='170' y1='90' x2='250' y2='90'/>
            <line class='edge' x1='170' y1='90' x2='250' y2='140'/>
            <rect class='node-box tool' x='250' y='16' width='150' height='44' rx='8'/>
            <text class='node-text' x='325' y='42' text-anchor='middle'>loading</text>
            <rect class='node-box worker' x='250' y='68' width='150' height='44' rx='8'/>
            <text class='node-text' x='325' y='94' text-anchor='middle'>success + data</text>
            <rect class='node-box' x='250' y='120' width='150' height='44' rx='8'/>
            <text class='node-text' x='325' y='146' text-anchor='middle'>error + message</text>
          </svg>
          <div class='diagram-caption'>The discriminant field splits one type into mutually exclusive branches.</div>
        </div>

        <h3>Exhaustiveness with <code>never</code></h3>
        <p>Add a <code>default</code> that assigns to <code>never</code>. If someone adds a fourth variant and forgets a case, the compiler screams. This is the empty-set trick doing real work.</p>

        <pre><code>function assertNever(x: never): never {
  throw new Error('Unhandled: ' + JSON.stringify(x));
}

function render(s: State) {
  switch (s.status) {
    case 'loading': return 'spinner';
    case 'success': return s.data;
    case 'error':   return s.message;
    default:        return assertNever(s); // ❌ compiles-error if a case is missing
  }
}</code></pre>

        <div class='callout danger'>
          <div class='c-title'>Gotcha: intersection to never</div>
          Intersecting incompatible primitives collapses to <code>never</code>: <code>string &amp; number</code> is <code>never</code> because no value is both. If a type mysteriously becomes <code>never</code>, look for an accidental intersection.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "I model state as a discriminated union keyed on a literal tag, then use an <code>assertNever</code> default to get compile-time exhaustiveness. Adding a variant becomes a guided refactor instead of a runtime surprise."
        </div>
      `,
    },
    {
      id: 'narrowing',
      group: 'Composition',
      nav: '3 · Narrowing',
      title: 'Type narrowing & type guards',
      lede: 'The compiler is a flow analyzer. Narrowing is how you talk to it. Learn every dialect: typeof, in, instanceof, predicates, assertions.',
      html: `
        <p>TypeScript performs <span class='kicker'>control-flow analysis</span>: inside an <code>if</code>, it tracks what must be true and shrinks the type accordingly. Your job is to write checks it understands. Each check is a "guard".</p>

        <h3>The built-in guards</h3>
        <table>
          <tr><th>Guard</th><th>Narrows</th><th>Example</th></tr>
          <tr><td><code>typeof x === 'string'</code></td><td>primitives</td><td>string / number / boolean / symbol / bigint / function / object / undefined</td></tr>
          <tr><td><code>'key' in obj</code></td><td>object variants</td><td>presence of a property</td></tr>
          <tr><td><code>x instanceof Cls</code></td><td>class instances</td><td>prototype chain check</td></tr>
          <tr><td><code>x === literal</code></td><td>discriminants</td><td>equality narrowing</td></tr>
          <tr><td>truthiness <code>if (x)</code></td><td>null / undefined / ''</td><td>removes falsy members</td></tr>
        </table>

        <h3>User-defined type guards (predicates)</h3>
        <p>When built-ins can't express your check, return a <span class='kicker'>type predicate</span>: <code>x is Cat</code>. It tells the compiler "if this returns true, treat x as Cat downstream".</p>

        <pre><code>type Cat = { meow: () =&gt; void };
type Dog = { bark: () =&gt; void };

function isCat(pet: Cat | Dog): pet is Cat {
  return 'meow' in pet;
}

function speak(pet: Cat | Dog) {
  if (isCat(pet)) pet.meow(); // narrowed to Cat
  else pet.bark();            // narrowed to Dog
}</code></pre>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: predicates are unchecked promises</div>
          A type predicate is a <em>trust</em> contract. TypeScript does not verify your logic — if <code>isCat</code> returns true wrongly, you've lied to the compiler and get a runtime crash. Keep the body dead simple and truthful.
        </div>

        <h3>Assertion functions</h3>
        <p><code>asserts</code> guards narrow by <em>throwing</em> instead of returning a boolean. After the call, the fact holds for the rest of the scope.</p>

        <pre><code>function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function assertIsString(v: unknown): asserts v is string {
  if (typeof v !== 'string') throw new Error('not a string');
}

function greet(name: unknown) {
  assertIsString(name);
  return name.toUpperCase(); // name is string from here on
}</code></pre>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Narrowing is control-flow analysis. I lean on <code>typeof</code>/<code>in</code>/<code>instanceof</code> and discriminants first, then reach for <code>x is T</code> predicates or <code>asserts</code> functions when a check can't be expressed inline — knowing both are unverified trust boundaries."
        </div>
      `,
    },
    {
      id: 'keyof-typeof-indexed',
      group: 'Type Operators',
      nav: '4 · keyof & indexed',
      title: 'keyof, typeof, indexed access types',
      lede: 'The three little operators that let you compute types FROM values and other types instead of hand-writing them.',
      html: `
        <p>These three are the gateway drug to type-level programming. They let you derive types so a single source of truth drives everything.</p>

        <h3><code>keyof</code> — the keys as a union</h3>
        <pre><code>type User = { id: number; name: string; admin: boolean };
type Keys = keyof User; // 'id' | 'name' | 'admin'</code></pre>

        <h3><code>typeof</code> — value world → type world</h3>
        <p>The <em>type-level</em> <code>typeof</code> (not the runtime one!) grabs the static type of a value. Perfect for capturing config objects and <code>as const</code> literals.</p>
        <pre><code>const config = { host: 'localhost', port: 5432 };
type Config = typeof config; // { host: string; port: number }

const ROLES = ['admin', 'user', 'guest'] as const;
type Role = typeof ROLES[number]; // 'admin' | 'user' | 'guest'</code></pre>

        <h3>Indexed access — <code>T[K]</code></h3>
        <p>Index into a type like an object. <code>User['name']</code> is <code>string</code>. Combine with <code>keyof</code> to grab all value types at once.</p>
        <pre><code>type Name = User['name'];          // string
type Values = User[keyof User];    // number | string | boolean</code></pre>

        <div class='callout good'>
          <div class='c-title'>Power combo</div>
          <code>typeof ARR[number]</code> is the idiom to turn a <code>const</code> array into a union of its elements. Memorize it — it appears constantly for enums-without-enums, route tables, and config validation.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: number vs numeric-string keys</div>
          For arrays, <code>keyof T</code> includes array methods and <code>number</code>-ish index signatures — usually not what you want. Use <code>T[number]</code> to get element types, not <code>keyof</code>.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "<code>keyof</code> gives me the key union, type-level <code>typeof</code> lifts a value into the type domain, and <code>T[K]</code> indexes in. Together they let me derive types from a single <code>as const</code> source instead of duplicating them."
        </div>
      `,
    },
    {
      id: 'conditional-types',
      group: 'Type Operators',
      nav: '5 · Conditional types',
      title: 'Conditional types & distribution',
      lede: 'if/else at the type level — plus a surprising superpower: they distribute over unions, one member at a time.',
      html: `
        <p>A conditional type is a ternary for types: <code>T extends U ? X : Y</code>. Read it as "is T assignable to (a subset of) U? If yes, X; else Y".</p>

        <pre><code>type IsString&lt;T&gt; = T extends string ? 'yes' : 'no';
type A = IsString&lt;string&gt;;  // 'yes'
type B = IsString&lt;number&gt;;  // 'no'</code></pre>

        <h3>The twist: distribution over unions</h3>
        <p>When the checked type is a <span class='kicker'>naked type parameter</span> and you pass a union, the conditional <em>distributes</em>: it runs once per union member and unions the results. This surprises everyone the first time.</p>

        <pre><code>type ToArray&lt;T&gt; = T extends any ? T[] : never;

// NOT (string | number)[]  —  it distributes:
type R = ToArray&lt;string | number&gt;; // string[] | number[]</code></pre>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: turning distribution OFF</div>
          Wrap both sides in a 1-tuple to stop distribution: <code>[T] extends [any] ? ...</code>. This is exactly how <code>IsNever</code> is written — because a naked <code>T extends</code> with <code>never</code> distributes over the empty union and yields <code>never</code>.
        </div>

        <pre><code>// Wrong: distributes, always 'no'
type IsNeverBad&lt;T&gt; = T extends never ? 'yes' : 'no';

// Right: tuple trick disables distribution
type IsNever&lt;T&gt; = [T] extends [never] ? 'yes' : 'no';
type X = IsNever&lt;never&gt;; // 'yes'</code></pre>

        <h3>Real-world flavor</h3>
        <pre><code>// Strip null/undefined
type NonNull&lt;T&gt; = T extends null | undefined ? never : T;
type Clean = NonNull&lt;string | null&gt;; // string</code></pre>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Conditional types are type-level ternaries. The gotcha is distribution: a naked type parameter over a union runs the conditional per-member. I disable it with the <code>[T] extends [U]</code> tuple wrap when I want to test the union as a whole — that's the trick behind <code>IsNever</code>."
        </div>
      `,
    },
    {
      id: 'mapped-types',
      group: 'Type Operators',
      nav: '6 · Mapped types',
      title: 'Mapped types & modifiers',
      lede: 'Loop over keys to transform a type. Add or strip readonly and optional. Rename keys with as. This is where utility types come from.',
      html: `
        <p>A mapped type is a <span class='kicker'>for-loop over keys</span>. The syntax <code>{ [K in Keys]: ValueType }</code> visits each key and produces a new property. It's how <code>Partial</code>, <code>Readonly</code>, and friends are built.</p>

        <pre><code>type MyReadonly&lt;T&gt; = { readonly [K in keyof T]: T[K] };
type MyPartial&lt;T&gt;  = { [K in keyof T]?: T[K] };</code></pre>

        <h3>Modifiers: add or remove</h3>
        <p>Prefix with <code>+</code> or <code>-</code> to add/strip <code>readonly</code> and <code>?</code>. <code>-readonly</code> and <code>-?</code> are how <code>Mutable</code> and <code>Required</code> work.</p>

        <pre><code>type Mutable&lt;T&gt;  = { -readonly [K in keyof T]: T[K] };
type Required2&lt;T&gt; = { [K in keyof T]-?: T[K] };</code></pre>

        <h3>Key remapping with <code>as</code></h3>
        <p>TS 4.1+ lets you rename keys during the map via <code>as</code>. Combine with template literal types (next lesson) to build getters, or filter keys by mapping them to <code>never</code>.</p>

        <pre><code>type Getters&lt;T&gt; = {
  [K in keyof T as \`get\${Capitalize&lt;string &amp; K&gt;}\`]: () =&gt; T[K]
};

type P = { name: string; age: number };
type G = Getters&lt;P&gt;;
// { getName: () =&gt; string; getAge: () =&gt; number }</code></pre>

        <div class='callout good'>
          <div class='c-title'>Filtering keys</div>
          Remap a key to <code>never</code> to drop it. <code>[K in keyof T as T[K] extends Function ? K : never]</code> keeps only method keys. Mapping a key name to <code>never</code> deletes the property.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: homomorphic magic</div>
          A mapped type over <code>keyof T</code> is "homomorphic" and secretly preserves modifiers and even maps over arrays/tuples correctly. Rewriting the keys (via <code>as</code> or an explicit union) can silently break that preservation. Prefer <code>[K in keyof T]</code> when you want structure-preserving behavior.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Mapped types iterate keys; the <code>+/-</code> modifiers add or strip <code>readonly</code>/<code>?</code>, and <code>as</code> remaps or filters keys by mapping them to <code>never</code>. Every built-in utility type is just a mapped or conditional type in disguise."
        </div>
      `,
    },
    {
      id: 'utility-types',
      group: 'Toolbox',
      nav: '7 · Utility types',
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
          <tr><td><code>Record&lt;K,V&gt;</code></td><td>key→value map</td><td><code>{ [P in K]: V }</code></td></tr>
          <tr><td><code>Omit&lt;T,K&gt;</code></td><td>drop keys K</td><td><code>Pick&lt;T, Exclude&lt;keyof T, K&gt;&gt;</code></td></tr>
          <tr><td><code>Exclude&lt;T,U&gt;</code></td><td>remove U from union</td><td><code>T extends U ? never : T</code></td></tr>
          <tr><td><code>Extract&lt;T,U&gt;</code></td><td>keep only U</td><td><code>T extends U ? T : never</code></td></tr>
          <tr><td><code>ReturnType&lt;F&gt;</code></td><td>fn return type</td><td><code>F extends (...a: any) =&gt; infer R ? R : never</code></td></tr>
          <tr><td><code>Parameters&lt;F&gt;</code></td><td>fn arg tuple</td><td><code>F extends (...a: infer P) =&gt; any ? P : never</code></td></tr>
        </table>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: Omit is loose</div>
          <code>Omit</code> does <em>not</em> constrain K to <code>keyof T</code> — you can omit keys that don't exist without an error. <code>Pick</code> is strict. If you want a strict omit, roll your own with <code>K extends keyof T</code>.
        </div>

        <h3>Build your own: DeepReadonly</h3>
        <p>Recursion at the type level is just a mapped type that references itself.</p>
        <pre><code>type DeepReadonly&lt;T&gt; = {
  readonly [K in keyof T]: T[K] extends object
    ? DeepReadonly&lt;T[K]&gt;
    : T[K];
};</code></pre>

        <div class='pattern-card'>
          <h4>Pattern: derive, don't duplicate</h4>
          <p>Define one canonical type, then generate variants (form state, patch payload, DB row) with utilities instead of maintaining parallel copies.</p>
          <div class='tag-row'>
            <span class='tag use'>use when one entity has many shapes</span>
            <span class='tag avoid'>avoid when shapes truly diverge</span>
          </div>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Every utility type is a one-line mapped or conditional type. <code>Exclude</code>/<code>Extract</code> are distributive conditionals; <code>ReturnType</code>/<code>Parameters</code> use <code>infer</code>. Knowing the definitions means I can build <code>DeepPartial</code> or a strict <code>Omit</code> on the spot."
        </div>
      `,
    },
    {
      id: 'template-literal-types',
      group: 'Toolbox',
      nav: '8 · Template literals',
      title: 'Template literal types',
      lede: 'Strings, but at the type level. Build, split, and validate string shapes so your APIs are typo-proof.',
      html: `
        <p>Template literal <em>types</em> let you compute string types the way template <em>literals</em> compute string values. You write them with backtick syntax and <code>\${...}</code> placeholders, but here they interpolate <em>types</em>, producing unions of string literals.</p>

        <pre><code>type Color = 'red' | 'blue';
type Shade = 'light' | 'dark';

// Cartesian product as a union:
type Swatch = \`\${Shade}-\${Color}\`;
// 'light-red' | 'light-blue' | 'dark-red' | 'dark-blue'</code></pre>

        <h3>Intrinsic string manipulators</h3>
        <p>Four built-ins transform string literal types: <code>Uppercase</code>, <code>Lowercase</code>, <code>Capitalize</code>, <code>Uncapitalize</code>. They pair beautifully with key remapping.</p>

        <pre><code>type EventName&lt;T extends string&gt; = \`on\${Capitalize&lt;T&gt;}\`;
type Click = EventName&lt;'click'&gt;; // 'onClick'</code></pre>

        <h3>Parsing with <code>infer</code></h3>
        <p>You can even <em>destructure</em> strings at the type level by pattern-matching with <code>infer</code> inside a template.</p>

        <pre><code>type Split&lt;S extends string&gt; =
  S extends \`\${infer Head}.\${infer Tail}\`
    ? [Head, ...Split&lt;Tail&gt;]
    : [S];

type Path = Split&lt;'a.b.c'&gt;; // ['a', 'b', 'c']</code></pre>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: combinatorial explosion</div>
          A template joining several unions multiplies them: three 10-member unions is a 1000-member union type. Push far enough and the compiler bails with "expression produces a union type that is too complex to represent". Keep the cross-products modest.
        </div>

        <div class='callout good'>
          <div class='c-title'>Killer use case</div>
          Typed route params, i18n keys, CSS-in-JS units (<code>\`\${number}px\`</code>), and event handler names all become typo-proof at compile time.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Template literal types do string algebra in the type system — concatenation via placeholders, casing via the four intrinsics, and even parsing via <code>infer</code>. I use them for typo-proof route/event/i18n keys, watching out for union-size explosions."
        </div>
      `,
    },
    {
      id: 'infer-advanced',
      group: 'Advanced Inference',
      nav: '9 · infer tricks',
      title: 'infer and advanced inference',
      lede: 'infer is a wildcard that captures a piece of a type mid-match. It powers ReturnType, Awaited, and every type-extraction party trick.',
      html: `
        <p><code>infer</code> can only appear inside the <code>extends</code> clause of a conditional type. It means "match this position and <span class='kicker'>bind whatever's here</span> to a fresh type variable I can use in the true branch". It's regex capture groups for types. 🎯</p>

        <pre><code>type ElementType&lt;T&gt; = T extends (infer U)[] ? U : T;
type E = ElementType&lt;string[]&gt;; // string

type Awaited2&lt;T&gt; = T extends Promise&lt;infer U&gt; ? U : T;
type W = Awaited2&lt;Promise&lt;number&gt;&gt;; // number</code></pre>

        <h3>Multiple and nested infers</h3>
        <pre><code>type FirstArg&lt;F&gt; =
  F extends (first: infer A, ...rest: any[]) =&gt; any ? A : never;

// Unwrap a deeply nested promise:
type DeepAwait&lt;T&gt; =
  T extends Promise&lt;infer U&gt; ? DeepAwait&lt;U&gt; : T;</code></pre>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: co- vs contra-variant infer positions</div>
          Infer in a <em>covariant</em> position (return type) yields a <strong>union</strong> of matches; in a <em>contravariant</em> position (a parameter) it yields an <strong>intersection</strong>. This is the trick behind <code>UnionToIntersection</code> — infer function params to flip a union into an intersection.
        </div>

        <pre><code>type UnionToIntersection&lt;U&gt; =
  (U extends any ? (k: U) =&gt; void : never) extends
  (k: infer I) =&gt; void ? I : never;

type II = UnionToIntersection&lt;{ a: 1 } | { b: 2 }&gt;;
// { a: 1 } &amp; { b: 2 }</code></pre>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          Whenever you think "I need to pull a type out of another type", the answer is a conditional with <code>infer</code>. Return types, promise payloads, array elements, tuple heads/tails — all infer.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "<code>infer</code> is a capture group inside a conditional's <code>extends</code>. Covariant positions collect a union, contravariant positions collect an intersection — which is exactly how the classic <code>UnionToIntersection</code> works."
        </div>
      `,
    },
    {
      id: 'variance-satisfies-unknown',
      group: 'Advanced Inference',
      nav: '10 · Variance & satisfies',
      title: 'Variance, const, satisfies, unknown vs any vs never',
      lede: 'The senior vocabulary layer: how subtyping flows through generics, and the three keywords that keep you honest.',
      html: `
        <p>This lesson is the "do you actually understand the type system" round. Four topics interviewers love.</p>

        <h3>Variance</h3>
        <p>Variance is how subtyping of parts relates to subtyping of the whole.</p>
        <ul>
          <li><span class='kicker'>Covariant</span>: outputs. <code>Cat[]</code> is a subtype of <code>Animal[]</code> (arrays are covariant in TS — and technically unsound because of writes).</li>
          <li><span class='kicker'>Contravariant</span>: function <em>parameters</em>. A handler taking <code>Animal</code> is a subtype of one taking <code>Cat</code> (with <code>strictFunctionTypes</code>).</li>
          <li><span class='kicker'>Bivariant</span>: method parameters are checked bivariantly for backwards-compat — a known unsoundness.</li>
          <li><span class='kicker'>Invariant</span>: read-write positions must match exactly.</li>
        </ul>

        <div class='callout warn'>
          <div class='c-title'>War story: the array covariance hole</div>
          <code>const cats: Cat[] = []; const animals: Animal[] = cats; animals.push(new Dog());</code> type-checks but corrupts <code>cats</code> at runtime. Covariant arrays are convenient but unsound — a real interview "why is this legal?" trap.
        </div>

        <h3><code>as const</code></h3>
        <p>Freezes a value to its narrowest literal type and marks it deeply <code>readonly</code>. Turns <code>{ x: 1 }</code> (type <code>{ x: number }</code>) into <code>{ readonly x: 1 }</code>. Essential for literal unions and tuple inference.</p>

        <h3><code>satisfies</code></h3>
        <p>The TS 4.9 crown jewel. It checks a value against a type <em>without widening it</em> — you keep the precise inferred type <em>and</em> get validation.</p>

        <pre><code>const palette = {
  primary: '#4aa3ff',
  danger: '#ff5555',
} satisfies Record&lt;string, string&gt;;

palette.primary.toUpperCase(); // still known as string literal, keys preserved</code></pre>

        <p>Contrast: <code>const p: Record&lt;string, string&gt; = {...}</code> validates but <em>widens</em> — you lose the specific keys. <code>satisfies</code> = "validate, but don't dumb down my type".</p>

        <h3>unknown vs any vs never</h3>
        <table>
          <tr><th>Type</th><th>Set meaning</th><th>Vibe</th></tr>
          <tr><td><code>any</code></td><td>opt-out of checking</td><td>🚫 disables the type system; assignable both ways</td></tr>
          <tr><td><code>unknown</code></td><td>top type (all values)</td><td>✅ safe any — must narrow before use</td></tr>
          <tr><td><code>never</code></td><td>bottom type (no values)</td><td>empty set; assignable TO everything, FROM nothing</td></tr>
        </table>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          Default untyped boundaries (JSON, <code>catch</code>) to <code>unknown</code>, never <code>any</code>. <code>unknown</code> forces a guard; <code>any</code> silently poisons everything downstream.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "<code>unknown</code> is the type-safe top; <code>any</code> is an escape hatch that disables checking; <code>never</code> is the empty bottom set. I use <code>satisfies</code> to validate config without widening, <code>as const</code> to lock in literals, and I can explain why covariant arrays are convenient but unsound."
        </div>
      `,
    },
    {
      id: 'recap-cheatsheet',
      group: 'Recap',
      nav: '11 · Cheat-sheet',
      title: 'Pitfalls & rapid-fire interview Q&A',
      lede: 'The whole course compressed into soundbites, gotchas, and one-line answers you can fire back under pressure.',
      html: `
        <p>You've built the whole mental model. Here it is as a rapid-fire deck — the answers a senior gives in one breath. 🚀</p>

        <h3>One-breath answers</h3>
        <table>
          <tr><th>Question</th><th>Answer</th></tr>
          <tr><td>What is a type?</td><td>A set of values; assignability is subset-checking.</td></tr>
          <tr><td>Structural vs nominal?</td><td>TS matches on shape, not name — duck typing.</td></tr>
          <tr><td>type vs interface?</td><td>Interface merges &amp; is class-friendly; type does unions/tuples/computed.</td></tr>
          <tr><td>When is a generic real?</td><td>When it relates 2+ positions; used once = fake.</td></tr>
          <tr><td>Discriminated union?</td><td>Tagged union + <code>assertNever</code> default for exhaustiveness.</td></tr>
          <tr><td>Type predicate vs assertion?</td><td><code>x is T</code> returns bool; <code>asserts</code> throws. Both are unverified trust.</td></tr>
          <tr><td>Distributive conditional?</td><td>Naked <code>T extends U</code> runs per union member; <code>[T]</code> stops it.</td></tr>
          <tr><td>How is ReturnType built?</td><td>Conditional with <code>infer R</code> in the return position.</td></tr>
          <tr><td>unknown vs any?</td><td><code>unknown</code> forces narrowing; <code>any</code> disables checks.</td></tr>
          <tr><td>satisfies vs annotation?</td><td><code>satisfies</code> validates without widening the inferred type.</td></tr>
        </table>

        <h3>Top gotchas to name-drop</h3>
        <ul>
          <li><strong>Excess property checks</strong> only fire on fresh object literals.</li>
          <li><strong><code>string &amp; number</code> is <code>never</code></strong> — accidental intersections vanish.</li>
          <li><strong>Distribution</strong> is why <code>IsNever&lt;never&gt;</code> needs the <code>[T]</code> tuple wrap.</li>
          <li><strong><code>Omit</code> is loose</strong> — it won't error on non-existent keys.</li>
          <li><strong>Array covariance is unsound</strong> — the classic <code>push(new Dog())</code> hole.</li>
          <li><strong>Template literal explosions</strong> — cross-products blow up union size.</li>
          <li><strong>Enums</strong> — prefer <code>as const</code> objects + <code>typeof T[keyof T]</code> over <code>enum</code> for tree-shaking and no runtime surprises.</li>
        </ul>

        <div class='pattern-card'>
          <h4>The type-level toolkit, in order of reach</h4>
          <p><code>keyof</code>/<code>typeof</code>/<code>T[K]</code> → mapped types → conditional types → <code>infer</code> → template literals. Escalate only as far as the problem demands; each step costs readability.</p>
          <div class='tag-row'>
            <span class='tag use'>use for a single source of truth</span>
            <span class='tag avoid'>avoid galaxy-brain types nobody can debug</span>
          </div>
        </div>

        <div class='callout danger'>
          <div class='c-title'>Final gotcha: readability tax</div>
          Every clever conditional you write, a teammate must read at 2am. The senior signal isn't "I can write <code>UnionToIntersection</code>" — it's "I know when NOT to". Reach for the simplest type that makes illegal states unrepresentable.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Types are sets; the system is structural. I model with discriminated unions and exhaustiveness, derive variants with mapped/utility types, extract with <code>infer</code>, and keep boundaries at <code>unknown</code>. And I optimize for the reader — the best type is the simplest one that bans the bug."
        </div>
      `,
    },
  ],
  quizzes: [
    {
      question: 'In TypeScript, what does the type "never" represent in the "types are sets" model?',
      options: [
        { text: 'The set of all possible values (the top type)', correct: false },
        { text: 'The empty set — a type with no values', correct: true },
        { text: 'The same thing as unknown', correct: false },
      ],
      explain: '"never" is the bottom type, the empty set. It is assignable TO every type but nothing (except never) is assignable to it, which is why it powers exhaustiveness checks.',
    },
    {
      question: 'Why does a generic parameter that appears only once in a function signature earn the "fake generic" label?',
      options: [
        { text: 'It runs slower at runtime than a monomorphic function', correct: false },
        { text: 'It relates no two positions, so it provides nothing beyond unknown', correct: true },
        { text: 'TypeScript forbids single-use type parameters entirely', correct: false },
      ],
      explain: 'A generic earns its keep only by linking two or more positions (e.g. input to output). Used once, T carries no relationship and is effectively unknown in disguise.',
    },
    {
      question: 'What is the result of the distributive conditional type ToArray<T> = T extends any ? T[] : never applied to string | number?',
      options: [
        { text: '(string | number)[]', correct: false },
        { text: 'string[] | number[]', correct: true },
        { text: 'never', correct: false },
      ],
      explain: 'A naked type parameter distributes over unions: the conditional runs once per member and the results are unioned, giving string[] | number[] rather than a single array of the union.',
    },
    {
      question: 'Which mapped-type modifier makes every property required by stripping optionality?',
      options: [
        { text: '{ [K in keyof T]+?: T[K] }', correct: false },
        { text: '{ [K in keyof T]-?: T[K] }', correct: true },
        { text: '{ readonly [K in keyof T]: T[K] }', correct: false },
      ],
      explain: 'The -? modifier removes the optional flag from each key, which is exactly how the built-in Required<T> is defined. +? would add optionality; readonly is unrelated.',
    },
    {
      question: 'How is the utility type ReturnType<F> implemented under the hood?',
      options: [
        { text: 'A mapped type over keyof F', correct: false },
        { text: 'A conditional type using infer in the function return position: F extends (...a: any) => infer R ? R : never', correct: true },
        { text: 'A template literal type that parses the function signature', correct: false },
      ],
      explain: 'ReturnType uses a conditional type with infer R placed in the return-type slot to capture and yield the return type of the function. Parameters<F> is the same trick applied to the argument tuple.',
    },
    {
      question: 'What is the key advantage of "satisfies" over a plain type annotation like const x: Record<string, string> = {...}?',
      options: [
        { text: 'satisfies validates the value AND preserves the precise inferred type instead of widening it', correct: true },
        { text: 'satisfies runs a runtime validation check on the object', correct: false },
        { text: 'satisfies is required for readonly objects', correct: false },
      ],
      explain: 'A type annotation validates but widens the value to the declared type (losing specific keys/literals). satisfies checks assignability while keeping the narrow inferred type, giving you both safety and precision.',
    },
    {
      question: 'Why should an untyped boundary (like a JSON parse or a catch clause) default to unknown rather than any?',
      options: [
        { text: 'unknown is faster to compile than any', correct: false },
        { text: 'unknown forces you to narrow before use, while any silently disables type-checking downstream', correct: true },
        { text: 'any is not allowed in strict mode', correct: false },
      ],
      explain: 'unknown is the type-safe top type: you cannot use it until you narrow it with a guard. any opts out of checking entirely and its poison spreads to everything it touches.',
    },
  ],
};
