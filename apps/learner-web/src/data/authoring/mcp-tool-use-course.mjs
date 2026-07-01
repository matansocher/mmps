export default {
  id: 'mcp-tool-use-course',
  title: 'MCP & Tool Use',
  icon: '🔌',
  color: '#58a6ff',
  lessons: [
    {
      id: 'why-tools',
      group: 'Foundations',
      nav: '0 · Why tools',
      title: 'Why tools? A brain that needs hands',
      lede: 'An LLM is a brilliant improviser locked in a room with no phone, no calendar, and yesterday\u2019s newspaper. Tools are the door.',
      html: `
        <p>Picture the smartest colleague you know \u2014 encyclopedic, fast, eloquent \u2014 but sealed in a windowless room. No internet, no database, no clock that moves. They can <em>reason</em> about anything, but they can\u2019t <strong>do</strong> anything. That\u2019s a raw LLM. <span class='kicker'>Tools</span> are how we hand that brain a set of hands.</p>

        <h3>The three things a bare LLM cannot do</h3>
        <ul>
          <li><strong>Know fresh facts.</strong> Its knowledge froze at training cutoff. It cannot tell you today\u2019s stock price or whether it\u2019s raining.</li>
          <li><strong>Do exact computation.</strong> It <em>predicts</em> tokens; it doesn\u2019t run a calculator. Ask for the 47th Fibonacci number and it may vibe-guess.</li>
          <li><strong>Cause side effects.</strong> It can draft an email but cannot <em>send</em> one, book a flight, or write to your database.</li>
        </ul>

        <div class='callout good'>
          <div class='c-title'>The mental model</div>
          The LLM is a <strong>reasoning engine</strong>, not a knowledge base and not an executor. Tools give it <em>senses</em> (read the world) and <em>actuators</em> (change the world). The model decides <em>when</em> and <em>with what arguments</em>; your code does the actual work and hands back the result.
        </div>

        <h3>What "having a tool" actually means</h3>
        <p>You don\u2019t teach the model new skills. You give it a <span class='kicker'>menu</span>: a list of functions with names, descriptions, and typed parameters. The model reads the menu, and when it thinks a function would help, it emits a structured request \u2014 <em>"call <code>get_weather</code> with <code>{ city: 'Tel Aviv' }</code>"</em>. Your runtime executes it and feeds the answer back so the model can keep reasoning.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 200' width='640'>
            <defs><marker id='arrow' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='20' y='70' width='150' height='60' rx='8'/>
            <text class='node-text' x='95' y='96' text-anchor='middle'>LLM (brain)</text>
            <text class='node-sub' x='95' y='114' text-anchor='middle'>decides &amp; reasons</text>
            <line class='edge' x1='170' y1='100' x2='300' y2='100' marker-end='url(#arrow)'/>
            <text class='edge-label' x='235' y='92' text-anchor='middle'>call request</text>
            <rect class='node-box tool' x='300' y='70' width='150' height='60' rx='8'/>
            <text class='node-text' x='375' y='96' text-anchor='middle'>Tool (hands)</text>
            <text class='node-sub' x='375' y='114' text-anchor='middle'>your code runs it</text>
            <line class='edge' x1='450' y1='120' x2='560' y2='120'/>
            <text class='edge-label' x='505' y='140' text-anchor='middle'>world</text>
            <rect class='node-box worker' x='560' y='90' width='60' height='60' rx='8'/>
            <text class='node-text' x='590' y='124' text-anchor='middle'>API</text>
          </svg>
          <div class='diagram-caption'>The model requests; your runtime executes against the real world and returns the result.</div>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "An LLM is a reasoning engine, not a database or an executor. Tools give it senses and actuators \u2014 the model chooses the call and arguments, my code performs the side effect and returns the observation."
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          Giving a model a tool doesn\u2019t <em>force</em> it to use one. It decides based on the descriptions you write. Bad descriptions \u2192 the model never calls the tool, or calls it with garbage. Tool quality is a <strong>prompt-engineering problem</strong> as much as an API problem.
        </div>
      `,
    },
    {
      id: 'function-calling-basics',
      group: 'Foundations',
      nav: '1 · Function calling',
      title: 'Function calling basics: schemas & the loop',
      lede: 'Under the hood, "function calling" is just the model emitting JSON that matches a schema you advertised. No magic \u2014 just a very disciplined autocomplete.',
      html: `
        <p>The provider APIs (OpenAI, Anthropic, Gemini) all share the same skeleton, even if field names differ. You advertise a list of tools as <span class='kicker'>JSON Schema</span>. The model, instead of replying with prose, may reply with a <strong>tool call</strong>: a name plus an arguments object. You run it, append the result, and ask the model again.</p>

        <h3>Advertising a tool</h3>
        <pre><code>const tools = [{
  type: 'function',
  function: {
    name: 'get_weather',
    description: 'Get the current weather for a city. Use when the user asks about weather, temperature, or rain.',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City name, e.g. "Tel Aviv"' },
        unit: { type: 'string', enum: ['c', 'f'], default: 'c' }
      },
      required: ['city']
    }
  }
}];</code></pre>

        <h3>The request \u2192 call \u2192 observe loop</h3>
        <pre><code>let messages = [{ role: 'user', content: 'Do I need an umbrella in Tel Aviv?' }];

while (true) {
  const res = await llm.chat({ messages, tools });
  const msg = res.choices[0].message;
  messages.push(msg);

  if (!msg.tool_calls) break; // model gave a final answer

  for (const call of msg.tool_calls) {
    const args = JSON.parse(call.function.arguments);
    const result = await runTool(call.function.name, args);
    messages.push({
      role: 'tool',
      tool_call_id: call.id,
      content: JSON.stringify(result)
    });
  }
}
console.log(messages.at(-1).content);</code></pre>

        <div class='callout good'>
          <div class='c-title'>The key insight</div>
          The model never runs your code. It only <em>emits a request</em>. <strong>You</strong> are the executor. This separation is why tool use is safe-by-construction: you can validate, sandbox, or reject any call before it touches the world.
        </div>

        <h3>Anatomy of a tool call</h3>
        <table>
          <tr><th>Field</th><th>Who produces it</th><th>Purpose</th></tr>
          <tr><td><code>id</code></td><td>Model</td><td>Correlates the call with its result message</td></tr>
          <tr><td><code>name</code></td><td>Model</td><td>Which tool to run</td></tr>
          <tr><td><code>arguments</code></td><td>Model</td><td>JSON string \u2014 <em>must be parsed &amp; validated</em></td></tr>
          <tr><td><code>tool_call_id</code></td><td>You</td><td>Ties your result back to the call</td></tr>
        </table>

        <div class='callout warn'>
          <div class='c-title'>War story</div>
          Arguments arrive as a <strong>string of JSON that the model hallucinated character-by-character</strong>. It can be malformed, miss required fields, or invent enum values. Always parse defensively and validate against your schema \u2014 never <code>eval</code>, never trust blindly.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Function calling is structured output plus a loop: I advertise tools as JSON Schema, the model emits a name and arguments, I execute and append the result, and I re-invoke until it stops calling tools and returns prose."
        </div>
      `,
    },
    {
      id: 'designing-great-tools',
      group: 'Foundations',
      nav: '2 · Designing tools',
      title: 'Designing GREAT tools',
      lede: 'A tool is a UI \u2014 and the user is a slightly overconfident model. Name it clearly, scope it tightly, make errors teach.',
      html: `
        <p>The single highest-leverage skill in this whole topic: <strong>designing tools the model can actually use well</strong>. Treat every tool description as documentation written for a very literal junior engineer who never asks clarifying questions.</p>

        <h3>The five properties of a great tool</h3>
        <div class='pattern-card'>
          <h4>1. Descriptive name &amp; description</h4>
          <p>The model routes on words. <code>search_orders_by_customer</code> beats <code>query</code>. Say <em>when</em> to use it and <em>when not to</em>.</p>
          <div class='tag-row'><span class='tag use'>use when the task is ambiguous between tools</span><span class='tag avoid'>avoid vague verbs like do/run/get</span></div>
        </div>
        <div class='pattern-card'>
          <h4>2. Right granularity</h4>
          <p>Not one god-tool with a <code>mode</code> enum of 30 options; not 200 micro-tools either. One clear job per tool.</p>
          <div class='tag-row'><span class='tag use'>use one verb per tool</span><span class='tag avoid'>avoid kitchen-sink "action" params</span></div>
        </div>
        <div class='pattern-card'>
          <h4>3. Idempotency where possible</h4>
          <p>Models retry. If <code>send_email</code> gets called twice, do you send two emails? Prefer idempotency keys so a retry is safe.</p>
          <div class='tag-row'><span class='tag use'>use idempotency keys for writes</span><span class='tag avoid'>avoid silent duplicate side effects</span></div>
        </div>
        <div class='pattern-card'>
          <h4>4. Great error messages</h4>
          <p>Errors are <em>prompts back to the model</em>. "Invalid" is useless. "city must be a known city; got \u2018Gothamm\u2019, did you mean \u2018Gotham\u2019?" lets the model self-correct.</p>
          <div class='tag-row'><span class='tag use'>use actionable, specific errors</span><span class='tag avoid'>avoid stack traces &amp; error codes</span></div>
        </div>
        <div class='pattern-card'>
          <h4>5. Typed, constrained inputs</h4>
          <p>Enums, formats, and ranges shrink the model\u2019s freedom to be wrong. Fewer degrees of freedom \u2192 fewer hallucinated args.</p>
          <div class='tag-row'><span class='tag use'>use enums &amp; explicit formats</span><span class='tag avoid'>avoid free-text where an enum fits</span></div>
        </div>

        <h3>Errors that teach vs errors that stump</h3>
        <div class='two-col'>
          <div>
            <h4>\u274c Stumps the model</h4>
            <pre><code>{ "error": "ERR_422" }</code></pre>
          </div>
          <div>
            <h4>\u2705 Teaches the model</h4>
            <pre><code>{
  "error": "unknown_city",
  "message": "No city named 'Gothamm'.",
  "hint": "Try a valid city; closest match: 'Gotham'."
}</code></pre>
          </div>
        </div>

        <div class='callout danger'>
          <div class='c-title'>Gotcha: the god-tool</div>
          A tool called <code>database</code> that takes a raw SQL string is a trap. The model will happily write <code>DROP TABLE</code>. Prefer narrow, intention-revealing tools with least privilege over one omnipotent escape hatch.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "A tool is a UI for the model. I optimize names and descriptions for routing, keep one job per tool, make writes idempotent, and treat error messages as prompts \u2014 specific and actionable so the model can self-correct."
        </div>
      `,
    },
    {
      id: 'tool-use-loop',
      group: 'The loop',
      nav: '3 · The loop in depth',
      title: 'The tool-use loop, in depth',
      lede: 'Decide \u2192 call \u2192 observe \u2192 repeat. This little cycle is the beating heart of every "agent" you\u2019ve ever heard hyped.',
      html: `
        <p>Strip away the buzzwords and an <em>agent</em> is just this loop running until a stop condition. The model alternates between <strong>thinking</strong> (emitting tool calls or prose) and <strong>observing</strong> (reading tool results you feed back).</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 220' width='640'>
            <defs><marker id='arrow2' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='40' y='30' width='140' height='54' rx='8'/>
            <text class='node-text' x='110' y='62' text-anchor='middle'>1. Decide</text>
            <line class='edge' x1='180' y1='57' x2='330' y2='57' marker-end='url(#arrow2)'/>
            <text class='edge-label' x='255' y='48' text-anchor='middle'>emit call</text>
            <rect class='node-box tool' x='330' y='30' width='150' height='54' rx='8'/>
            <text class='node-text' x='405' y='62' text-anchor='middle'>2. Call tool</text>
            <line class='edge' x1='405' y1='84' x2='405' y2='130' marker-end='url(#arrow2)'/>
            <rect class='node-box worker' x='330' y='130' width='150' height='54' rx='8'/>
            <text class='node-text' x='405' y='162' text-anchor='middle'>3. Observe</text>
            <line class='edge' x1='330' y1='157' x2='110' y2='157' marker-end='url(#arrow2)'/>
            <line class='edge' x1='110' y1='157' x2='110' y2='84' marker-end='url(#arrow2)'/>
            <text class='edge-label' x='220' y='148' text-anchor='middle'>feed result back</text>
          </svg>
          <div class='diagram-caption'>Loop until the model returns a final answer (no tool calls) or a budget is hit.</div>
        </div>

        <h3>Stop conditions matter</h3>
        <p>Never <code>while (true)</code> in production. A confused model can loop forever, burning tokens and money. Guard with:</p>
        <ul>
          <li><strong>Max iterations</strong> \u2014 e.g. cap at 8 tool rounds.</li>
          <li><strong>Token / cost budget</strong> \u2014 bail when spend exceeds a threshold.</li>
          <li><strong>Wall-clock timeout</strong> \u2014 the user won\u2019t wait 90 seconds.</li>
          <li><strong>Repetition detection</strong> \u2014 same call with same args twice? Break the loop.</li>
        </ul>

        <pre><code>for (let step = 0; step &lt; MAX_STEPS; step++) {
  const msg = await think(messages, tools);
  messages.push(msg);
  if (!msg.tool_calls) return msg.content;   // done
  for (const call of msg.tool_calls) {
    const out = await execute(call);          // your executor
    messages.push(toolResult(call.id, out));
  }
}
throw new Error('Tool loop exceeded budget');</code></pre>

        <div class='callout warn'>
          <div class='c-title'>War story</div>
          A support bot got stuck calling <code>lookup_ticket</code> \u2192 got an empty result \u2192 "let me check again" \u2192 same call \u2192 forever. 40,000 tokens later, someone noticed the bill. <strong>Always</strong> add repetition detection and a hard step cap.
        </div>

        <h3>Parallel vs sequential calls</h3>
        <p>Modern models can emit <strong>multiple tool calls in one turn</strong>. If they\u2019re independent (weather in 3 cities), run them concurrently with <code>Promise.all</code>. If step B needs step A\u2019s output, the model will naturally sequence them across turns.</p>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "An agent is the decide-call-observe loop with guardrails. The model emits calls, I execute and feed results back, and I bound it with max steps, a cost budget, a timeout, and repetition detection so it can\u2019t spin forever."
        </div>
      `,
    },
    {
      id: 'what-is-mcp',
      group: 'MCP',
      nav: '4 · What is MCP',
      title: 'What is MCP \u2014 USB-C for AI tools',
      lede: 'Before MCP, every app wired every tool by hand \u2014 an M\u00d7N mess. MCP is the standard plug that turns it into M+N.',
      html: `
        <p>The <span class='kicker'>Model Context Protocol</span> (MCP), open-sourced by Anthropic in late 2024, is an open standard for connecting AI applications to tools, data, and prompts. The tagline that sticks in interviews: <strong>"USB-C for AI."</strong> One universal port instead of a drawer full of proprietary cables.</p>

        <h3>The problem it solves: M\u00d7N</h3>
        <p>Say you have <strong>M</strong> AI apps (Claude Desktop, your IDE, an internal chatbot) and <strong>N</strong> integrations (GitHub, Postgres, Slack, Google Drive). Without a standard, each app hand-rolls each integration: <strong>M\u00d7N</strong> bespoke connectors. Add one tool, and every app must re-implement it.</p>

        <div class='two-col'>
          <div>
            <h4>Before MCP: M\u00d7N</h4>
            <p>Every app writes custom glue for every tool. 4 apps \u00d7 6 tools = 24 integrations to build and maintain. \ud83d\ude35</p>
          </div>
          <div>
            <h4>With MCP: M+N</h4>
            <p>Each app speaks MCP once (M clients). Each tool exposes an MCP server once (N servers). 4 + 6 = 10. Any app talks to any server. \ud83c\udf89</p>
          </div>
        </div>

        <div class='diagram'>
          <svg viewBox='0 0 640 200' width='640'>
            <defs><marker id='arrow3' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='30' y='40' width='140' height='44' rx='8'/>
            <text class='node-text' x='100' y='67' text-anchor='middle'>AI app (host)</text>
            <rect class='node-box' x='30' y='110' width='140' height='44' rx='8'/>
            <text class='node-text' x='100' y='137' text-anchor='middle'>IDE (host)</text>
            <rect class='node-box tool' x='440' y='30' width='160' height='40' rx='8'/>
            <text class='node-text' x='520' y='55' text-anchor='middle'>GitHub server</text>
            <rect class='node-box tool' x='440' y='90' width='160' height='40' rx='8'/>
            <text class='node-text' x='520' y='115' text-anchor='middle'>Postgres server</text>
            <rect class='node-box tool' x='440' y='150' width='160' height='40' rx='8'/>
            <text class='node-text' x='520' y='175' text-anchor='middle'>Slack server</text>
            <line class='edge' x1='170' y1='95' x2='440' y2='50' marker-end='url(#arrow3)'/>
            <line class='edge' x1='170' y1='95' x2='440' y2='110' marker-end='url(#arrow3)'/>
            <line class='edge' x1='170' y1='120' x2='440' y2='170' marker-end='url(#arrow3)'/>
            <text class='edge-label' x='300' y='80' text-anchor='middle'>one protocol: MCP</text>
          </svg>
          <div class='diagram-caption'>Any MCP host can talk to any MCP server \u2014 collapse M\u00d7N into M+N.</div>
        </div>

        <div class='callout good'>
          <div class='c-title'>Why it caught on</div>
          It\u2019s an <strong>open standard</strong> (not a single vendor\u2019s API), it\u2019s <strong>transport-agnostic</strong>, and it borrows the battle-tested shape of the <em>Language Server Protocol</em> (LSP) \u2014 the thing that let one editor plugin serve every language. MCP does the same for AI + tools.</p>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "MCP is an open protocol \u2014 USB-C for AI. It turns the M\u00d7N integration explosion into M+N: apps implement the client once, tools expose a server once, and any host can use any server. It\u2019s LSP\u2019s idea applied to AI tools."
        </div>
      `,
    },
    {
      id: 'mcp-architecture',
      group: 'MCP',
      nav: '5 · Architecture',
      title: 'MCP architecture: hosts, clients, servers, transports',
      lede: 'Four nouns and two wires. Learn these and you can whiteboard MCP in your sleep.',
      html: `
        <p>MCP has a clean, JSON-RPC 2.0 based architecture. Memorize the roles \u2014 interviewers love asking you to draw it.</p>

        <h3>The roles</h3>
        <table>
          <tr><th>Role</th><th>What it is</th><th>Example</th></tr>
          <tr><td><span class='kicker'>Host</span></td><td>The AI app the user interacts with; owns the LLM and orchestrates</td><td>Claude Desktop, Cursor, your chatbot</td></tr>
          <tr><td><span class='kicker'>Client</span></td><td>Lives inside the host; maintains a <strong>1:1</strong> connection to one server</td><td>One client per connected server</td></tr>
          <tr><td><span class='kicker'>Server</span></td><td>Exposes capabilities (tools/resources/prompts) over MCP</td><td>GitHub server, filesystem server</td></tr>
        </table>

        <div class='callout warn'>
          <div class='c-title'>Common mix-up</div>
          A <strong>host</strong> can hold <em>many</em> clients, but each <strong>client</strong> pairs with exactly <em>one</em> server (1:1). Don\u2019t say "the host connects to the server" \u2014 say "the host spins up a client per server."
        </div>

        <h3>The two transports</h3>
        <div class='two-col'>
          <div>
            <h4>stdio</h4>
            <p>Server runs as a <strong>local subprocess</strong>; host talks to it over stdin/stdout. Zero network, lowest latency, dead-simple auth (it\u2019s a child process). Perfect for local tools: filesystem, git, a local database.</p>
          </div>
          <div>
            <h4>Streamable HTTP (+ SSE)</h4>
            <p>Server is a <strong>remote HTTP endpoint</strong>; supports Server-Sent Events for streaming. Use for hosted/multi-user servers. Needs real auth \u2014 typically <strong>OAuth 2.1</strong>.</p>
          </div>
        </div>

        <div class='diagram'>
          <svg viewBox='0 0 640 190' width='640'>
            <defs><marker id='arrow4' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='20' y='60' width='200' height='80' rx='8'/>
            <text class='node-text' x='120' y='90' text-anchor='middle'>Host</text>
            <text class='node-sub' x='120' y='110' text-anchor='middle'>client A  \u00b7  client B</text>
            <line class='edge' x1='220' y1='90' x2='400' y2='60' marker-end='url(#arrow4)'/>
            <text class='edge-label' x='310' y='62' text-anchor='middle'>stdio</text>
            <line class='edge' x1='220' y1='115' x2='400' y2='140' marker-end='url(#arrow4)'/>
            <text class='edge-label' x='310' y='140' text-anchor='middle'>HTTP/SSE</text>
            <rect class='node-box tool' x='400' y='30' width='200' height='50' rx='8'/>
            <text class='node-text' x='500' y='60' text-anchor='middle'>Local server (subprocess)</text>
            <rect class='node-box worker' x='400' y='115' width='200' height='50' rx='8'/>
            <text class='node-text' x='500' y='145' text-anchor='middle'>Remote server (hosted)</text>
          </svg>
          <div class='diagram-caption'>Same protocol (JSON-RPC 2.0), two transports: stdio for local, Streamable HTTP for remote.</div>
        </div>

        <h3>Capability negotiation</h3>
        <p>On connect, client and server perform an <code>initialize</code> handshake and exchange <strong>capabilities</strong> \u2014 who supports tools, resources, prompts, sampling, etc. Neither assumes; both declare. This is why MCP versions can evolve gracefully.</p>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "MCP is JSON-RPC 2.0 with four roles: a host owns the LLM and spins up one client per server, each client is 1:1 with a server. Two transports: stdio for local subprocesses, Streamable HTTP with SSE for remote. They negotiate capabilities on initialize."
        </div>
      `,
    },
    {
      id: 'mcp-primitives',
      group: 'MCP',
      nav: '6 · Primitives',
      title: 'MCP primitives: tools, resources, prompts',
      lede: 'Three server-side primitives, distinguished by one question: who is in control?',
      html: `
        <p>An MCP server exposes up to three kinds of capabilities. The elegant way to remember them is by <strong>who decides to use them</strong>.</p>

        <table>
          <tr><th>Primitive</th><th>Controlled by</th><th>Analogy</th><th>Example</th></tr>
          <tr><td><span class='kicker'>Tools</span></td><td><strong>Model</strong>-controlled</td><td>Actions / verbs</td><td><code>create_issue</code>, <code>run_query</code></td></tr>
          <tr><td><span class='kicker'>Resources</span></td><td><strong>App</strong>-controlled</td><td>Files / nouns (GET)</td><td>A file, a DB row, a doc by URI</td></tr>
          <tr><td><span class='kicker'>Prompts</span></td><td><strong>User</strong>-controlled</td><td>Templates / macros</td><td>A "/summarize" slash command</td></tr>
        </table>

        <h3>Tools \u2014 model decides</h3>
        <p>Executable functions with side effects, chosen autonomously by the LLM during reasoning. This is the tool-use you already know, now standardized. Discovered via <code>tools/list</code>, invoked via <code>tools/call</code>.</p>

        <h3>Resources \u2014 app decides</h3>
        <p>Read-only, <em>addressable</em> context identified by a URI (e.g. <code>file:///readme.md</code> or <code>db://users/42</code>). The <strong>host application</strong> (or user) decides what to load into context \u2014 not the model on a whim. Think GET, not POST: no side effects.</p>

        <h3>Prompts \u2014 user decides</h3>
        <p>Reusable, parameterized templates the user explicitly invokes \u2014 the slash-commands and "quick actions" in a UI. The server ships the expertise ("here\u2019s the perfect code-review prompt"); the user triggers it.</p>

        <div class='callout good'>
          <div class='c-title'>Mnemonic</div>
          <strong>T-R-P = Model, App, User.</strong> <em>Tools</em> the model reaches for, <em>Resources</em> the app supplies, <em>Prompts</em> the user picks. Three controllers, three primitives.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          People say "MCP is just tools." It isn\u2019t. Resources (read-only context) and prompts (user templates) are first-class. Mentioning all three \u2014 and <em>who controls each</em> \u2014 instantly signals depth in an interview.
        </div>

        <p>There\u2019s also a client-side primitive worth a bonus point: <span class='kicker'>sampling</span>, where a <em>server</em> can ask the <em>host\u2019s</em> LLM to generate a completion \u2014 letting servers stay model-agnostic while still using AI. (And <code>roots</code> / <code>elicitation</code> round out the newer spec.)</p>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "MCP has three primitives split by controller: tools are model-controlled actions, resources are app-controlled read-only context addressed by URI, and prompts are user-invoked templates. Bonus: sampling lets a server ask the host\u2019s model to generate."
        </div>
      `,
    },
    {
      id: 'building-mcp-server',
      group: 'MCP',
      nav: '7 · Build a server',
      title: 'Building a tiny MCP server',
      lede: 'Enough theory \u2014 let\u2019s stand up a real (little) server. It\u2019s shockingly few lines.',
      html: `
        <p>We\u2019ll build a minimal server exposing one tool, <code>roll_dice</code>, using the official TypeScript SDK over stdio. This is the shape every server follows.</p>

        <pre><code>import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({ name: 'dice', version: '1.0.0' });

server.registerTool(
  'roll_dice',
  {
    title: 'Roll dice',
    description: 'Roll N dice with S sides and return the total.',
    inputSchema: { count: z.number().int().min(1).max(20), sides: z.number().int().min(2) }
  },
  async ({ count, sides }) => {
    let total = 0;
    for (let i = 0; i &lt; count; i++) total += 1 + Math.floor(Math.random() * sides);
    return { content: [{ type: 'text', text: \`Rolled \${total}\` }] };
  }
);

await server.connect(new StdioServerTransport());</code></pre>

        <p>Notice the escaped <code>\${total}</code> inside the returned text \u2014 that\u2019s a real template literal in the server code. The tool returns <strong>content blocks</strong>, not a bare value; text is the common case, but images and embedded resources are also supported.</p>

        <h3>Wiring it into a host</h3>
        <p>A host like Claude Desktop or Cursor discovers this via a small JSON config that tells it how to launch the subprocess:</p>
        <pre><code>{
  "mcpServers": {
    "dice": {
      "command": "node",
      "args": ["./dice-server.js"]
    }
  }
}</code></pre>
        <p>On startup the host runs <code>node ./dice-server.js</code>, performs the <code>initialize</code> handshake, calls <code>tools/list</code>, and now the model can call <code>roll_dice</code> whenever it decides to.</p>

        <div class='callout good'>
          <div class='c-title'>Test before you trust</div>
          Use the <strong>MCP Inspector</strong> (<code>npx @modelcontextprotocol/inspector</code>) to poke your server\u2019s tools/resources by hand before wiring it to an LLM. Debugging protocol issues without a model in the loop saves hours.
        </div>

        <div class='callout warn'>
          <div class='c-title'>stdio gotcha</div>
          On stdio transport, <strong>stdout is the protocol channel</strong>. A stray <code>console.log</code> in your server corrupts the JSON-RPC stream and the client throws cryptic parse errors. Log to <strong>stderr</strong> instead.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "An MCP server registers tools with a name, description, and a schema, and returns content blocks. Locally you launch it as a stdio subprocess from a host config; test it with the MCP Inspector \u2014 and never log to stdout on stdio."
        </div>
      `,
    },
    {
      id: 'orchestrating-tools',
      group: 'Production',
      nav: '8 · Orchestration',
      title: 'Orchestrating many tools without drowning the model',
      lede: 'Ten tools help. A hundred tools poison the well. Tool selection is a scaling problem.',
      html: `
        <p>Here\u2019s the paradox: more tools make the model <em>more</em> capable and <em>less</em> reliable. Every tool description eats context tokens, and a wall of 80 similar tools makes the model pick wrong. This is <span class='kicker'>tool overload</span>, and taming it is a production skill.</p>

        <h3>Symptoms of tool overload</h3>
        <ul>
          <li>The model picks a plausible-but-wrong tool (two tools sound alike).</li>
          <li>Latency and cost climb as huge tool schemas ride along in every request.</li>
          <li>Accuracy drops sharply past a few dozen tools \u2014 the model can\u2019t keep them straight.</li>
        </ul>

        <h3>Strategies, cheapest first</h3>
        <div class='pattern-card'>
          <h4>Namespacing &amp; clear naming</h4>
          <p>Prefix by domain: <code>gh_create_issue</code>, <code>db_run_query</code>. Removes ambiguity for free.</p>
          <div class='tag-row'><span class='tag use'>use up to ~20\u201330 tools</span><span class='tag avoid'>avoid near-duplicate names</span></div>
        </div>
        <div class='pattern-card'>
          <h4>Dynamic tool filtering</h4>
          <p>Don\u2019t advertise all tools every turn. Load only the toolset relevant to the current task/route.</p>
          <div class='tag-row'><span class='tag use'>use when tools cluster by workflow</span><span class='tag avoid'>avoid loading 100 tools always</span></div>
        </div>
        <div class='pattern-card'>
          <h4>Retrieval / RAG over tools</h4>
          <p>Embed tool descriptions; at query time, semantically retrieve the top-k relevant tools and advertise only those.</p>
          <div class='tag-row'><span class='tag use'>use with hundreds of tools</span><span class='tag avoid'>avoid for a handful of tools (overkill)</span></div>
        </div>
        <div class='pattern-card'>
          <h4>Hierarchical / multi-agent routing</h4>
          <p>A router model or supervisor delegates to sub-agents, each with its own small, focused toolset.</p>
          <div class='tag-row'><span class='tag use'>use for large multi-domain systems</span><span class='tag avoid'>avoid the added latency for simple apps</span></div>
        </div>

        <div class='callout warn'>
          <div class='c-title'>Rule of thumb</div>
          Reliability starts degrading somewhere past <strong>~20\u201330 tools</strong> in a single flat list (varies by model). Cross that line and reach for filtering or retrieval \u2014 don\u2019t just keep appending.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Tools scale badly: past a couple dozen, accuracy and latency suffer. I fix it by namespacing, then dynamically filtering the toolset per task, then retrieving tools by embedding similarity, and for big systems, routing to sub-agents with focused toolsets."
        </div>
      `,
    },
    {
      id: 'failure-handling',
      group: 'Production',
      nav: '9 · Failure handling',
      title: 'Failure handling: retries, timeouts, partial results',
      lede: 'Tools call the real world, and the real world flakes. Design for failure or the failure will design your outage.',
      html: `
        <p>Every tool call is a network of things that can break: the API 500s, the timeout fires, the model sends bad args. Robust tool use means the failure becomes <em>information the model can act on</em>, not a crash.</p>

        <h3>Validate before you execute</h3>
        <p>The model\u2019s arguments are untrusted input. Parse against your schema (Zod, JSON Schema) <strong>before</strong> doing anything. On failure, return a structured error the model can read and retry \u2014 don\u2019t throw into the void.</p>
        <pre><code>const parsed = schema.safeParse(args);
if (!parsed.success) {
  return { error: 'invalid_args', message: parsed.error.message };
}</code></pre>

        <h3>Retries \u2014 but smartly</h3>
        <ul>
          <li><strong>Retry transient errors</strong> (429, 503, timeouts) with <em>exponential backoff + jitter</em>.</li>
          <li><strong>Don\u2019t retry</strong> deterministic failures (400 bad request, 404) \u2014 same input, same failure. Surface it to the model instead.</li>
          <li><strong>Idempotency keys</strong> make retrying writes safe (see lesson 2).</li>
        </ul>

        <h3>Timeouts &amp; partial results</h3>
        <p>Wrap every external call in a timeout \u2014 a hung tool freezes the whole loop. For multi-item work (fetch 10 URLs), return <strong>partial results</strong> with a note about what failed, so the model can proceed with what it has.</p>
        <pre><code>{
  "results": [ /* 8 succeeded */ ],
  "failed": [{ "url": "...", "reason": "timeout" }],
  "note": "2 of 10 failed; you may proceed or ask to retry."
}</code></pre>

        <div class='callout danger'>
          <div class='c-title'>War story</div>
          A tool returned a 30-line stack trace on error. The model dutifully pasted the stack trace to the end user, then <em>tried the exact same call again</em>. Lesson: errors are prompts \u2014 make them short, structured, and actionable, never raw exceptions.
        </div>

        <div class='callout good'>
          <div class='c-title'>Golden pattern</div>
          <strong>Validate \u2192 execute-with-timeout \u2192 retry-transient \u2192 return-structured-result-or-structured-error.</strong> Every layer turns chaos into something the model (and your on-call self) can reason about.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "I treat tool errors as feedback for the model. I validate args first, retry only transient failures with backoff and jitter, timeout every external call, and return partial results with structured errors \u2014 short and actionable, never raw stack traces."
        </div>
      `,
    },
    {
      id: 'security',
      group: 'Production',
      nav: '10 · Security',
      title: 'Security of tool use: least privilege & sandboxing',
      lede: 'You just gave a probabilistic system that can be prompt-injected the power to take actions. Breathe. Then lock it down.',
      html: `
        <p>Tools are where LLM safety stops being abstract. The moment a model can <em>act</em>, an attacker who can influence the model\u2019s input can potentially act too. The killer combo to fear: <span class='kicker'>prompt injection</span> + powerful tools + sensitive data.</p>

        <h3>The lethal trifecta</h3>
        <div class='callout danger'>
          <div class='c-title'>Memorize this</div>
          Danger compounds when an agent has all three at once: <strong>(1)</strong> access to private data, <strong>(2)</strong> exposure to untrusted content (web pages, emails, docs), and <strong>(3)</strong> the ability to exfiltrate / act externally. Remove any one leg and the exfiltration risk collapses.
        </div>

        <h3>Defenses, layered</h3>
        <div class='pattern-card'>
          <h4>Least privilege</h4>
          <p>Give each tool the narrowest scope that works. A read-only DB tool can\u2019t <code>DROP TABLE</code> no matter how the model is tricked.</p>
          <div class='tag-row'><span class='tag use'>use scoped, read-only where possible</span><span class='tag avoid'>avoid god-tools &amp; raw SQL/shell</span></div>
        </div>
        <div class='pattern-card'>
          <h4>Human-in-the-loop confirmation</h4>
          <p>Gate <em>consequential</em> actions (send money, delete, email externally) behind explicit user approval.</p>
          <div class='tag-row'><span class='tag use'>use for irreversible/high-impact actions</span><span class='tag avoid'>avoid confirmation fatigue on trivial reads</span></div>
        </div>
        <div class='pattern-card'>
          <h4>Sandboxing &amp; allow-lists</h4>
          <p>Run tools in isolated environments (containers, restricted FS). Allow-list network egress and file paths.</p>
          <div class='tag-row'><span class='tag use'>use for code-exec &amp; filesystem tools</span><span class='tag avoid'>avoid unrestricted network/FS access</span></div>
        </div>
        <div class='pattern-card'>
          <h4>Input/output validation &amp; auth</h4>
          <p>Validate every tool result; never blindly trust server content (it could carry an injection). Use OAuth 2.1 on remote MCP servers.</p>
          <div class='tag-row'><span class='tag use'>use OAuth for remote servers</span><span class='tag avoid'>avoid trusting tool output as safe</span></div>
        </div>

        <div class='callout warn'>
          <div class='c-title'>MCP-specific gotchas</div>
          Watch for <strong>tool poisoning</strong> (malicious instructions hidden in a tool\u2019s description), <strong>rug pulls</strong> (a server changes a tool\u2019s behavior after you approved it), and <strong>confused-deputy</strong> attacks. Pin/verify servers; don\u2019t auto-trust third-party ones.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "The lethal trifecta is private data + untrusted content + external action \u2014 break any leg to kill exfiltration. I defend with least privilege, human approval on consequential actions, sandboxing with allow-lists, and never trusting tool output blindly."
        </div>
      `,
    },
    {
      id: 'recap-cheatsheet',
      group: 'Wrap-up',
      nav: '11 · Cheat-sheet',
      title: 'Rapid-fire interview Q&A cheat-sheet',
      lede: 'The whole course, distilled into answers you can fire back in ten seconds each. Skim this on the train to the interview. \ud83d\ude80',
      html: `
        <p>You made it. Here\u2019s the entire course as punchy Q&amp;A plus a one-glance reference. If you can answer these cold, you\u2019re ready.</p>

        <h3>Rapid-fire Q&amp;A</h3>
        <ul>
          <li><strong>Why do LLMs need tools?</strong> They\u2019re a reasoning engine \u2014 no fresh facts, no exact compute, no side effects. Tools add senses and actuators.</li>
          <li><strong>What is function calling, really?</strong> Structured output plus a loop: model emits a name + JSON args, you execute and append the result, then re-invoke.</li>
          <li><strong>Who runs the tool?</strong> Your code. The model only <em>requests</em>; that separation is what makes it safe.</li>
          <li><strong>What makes a good tool?</strong> Clear name/description, right granularity, idempotent writes, typed inputs, actionable errors.</li>
          <li><strong>What bounds the tool loop?</strong> Max steps, cost budget, timeout, repetition detection.</li>
          <li><strong>What is MCP in one line?</strong> USB-C for AI \u2014 an open protocol turning M\u00d7N tool integrations into M+N.</li>
          <li><strong>MCP roles?</strong> Host owns the LLM and spins up one client per server; client is 1:1 with a server.</li>
          <li><strong>MCP transports?</strong> stdio (local subprocess) and Streamable HTTP + SSE (remote).</li>
          <li><strong>MCP primitives?</strong> Tools (model-controlled), resources (app-controlled, read-only URIs), prompts (user-invoked templates).</li>
          <li><strong>How do you scale to many tools?</strong> Namespacing \u2192 dynamic filtering \u2192 retrieval over tools \u2192 multi-agent routing.</li>
          <li><strong>How do you handle failures?</strong> Validate args, retry transient errors with backoff+jitter, timeout everything, return structured partial results.</li>
          <li><strong>Biggest security risk?</strong> The lethal trifecta: private data + untrusted content + external action. Break a leg; add least privilege, confirmation, sandboxing.</li>
        </ul>

        <h3>One-glance reference</h3>
        <table>
          <tr><th>Concept</th><th>Remember</th></tr>
          <tr><td>Mental model</td><td>Brain that needs hands</td></tr>
          <tr><td>Tool call</td><td>name + JSON args \u2192 you execute \u2192 feed result back</td></tr>
          <tr><td>Loop guards</td><td>max steps \u00b7 budget \u00b7 timeout \u00b7 repeat-detect</td></tr>
          <tr><td>MCP tagline</td><td>USB-C for AI; M\u00d7N \u2192 M+N</td></tr>
          <tr><td>MCP roles</td><td>host \u2192 client (1:1) \u2192 server</td></tr>
          <tr><td>Transports</td><td>stdio (local) \u00b7 HTTP+SSE (remote)</td></tr>
          <tr><td>Primitives</td><td>Tools/Resources/Prompts = Model/App/User</td></tr>
          <tr><td>Scale trick</td><td>namespace \u2192 filter \u2192 retrieve \u2192 route</td></tr>
          <tr><td>Failure</td><td>validate \u2192 timeout \u2192 retry-transient \u2192 structured error</td></tr>
          <tr><td>Security</td><td>lethal trifecta; least privilege + confirm + sandbox</td></tr>
        </table>

        <div class='callout good'>
          <div class='c-title'>Final soundbite</div>
          "Tool use gives a reasoning engine hands via a decide-call-observe loop; MCP standardizes that plumbing \u2014 USB-C for AI \u2014 so any host talks to any tool server. The hard parts aren\u2019t the schemas; they\u2019re tool design, scaling selection, failure handling, and locking down the lethal trifecta."
        </div>

        <div class='callout'>
          <div class='c-title'>Go get it</div>
          Draw the M\u00d7N\u2192M+N diagram, recite the three primitives with their controllers, and name the lethal trifecta unprompted. Do those three and you\u2019ll sound like you\u2019ve shipped this in production. \ud83d\udd0c
        </div>
      `,
    },
  ],
  quizzes: [
    {
      question: 'In a function-calling setup, who actually executes the tool when the model emits a tool call?',
      options: [
        { text: 'The LLM runs the function internally and returns the result', correct: false },
        { text: 'Your application/runtime executes it and feeds the result back to the model', correct: true },
        { text: 'The model provider\u2019s servers execute it automatically', correct: false },
      ],
      explain: 'The model only emits a structured request (name + arguments). Your code executes it and appends the result. That separation is what makes tool use validatable and safe.',
    },
    {
      question: 'What is the single best one-line description of MCP for an interview?',
      options: [
        { text: 'A replacement for REST APIs', correct: false },
        { text: 'An open standard \u2014 "USB-C for AI" \u2014 that turns M\u00d7N tool integrations into M+N', correct: true },
        { text: 'A proprietary Anthropic model with built-in tools', correct: false },
      ],
      explain: 'MCP is an open protocol that standardizes how AI apps connect to tools/data, collapsing the M\u00d7N custom-connector explosion into M+N reusable clients and servers.',
    },
    {
      question: 'In MCP, what is the relationship between clients and servers?',
      options: [
        { text: 'One client multiplexes connections to many servers', correct: false },
        { text: 'Each client maintains a 1:1 connection with exactly one server; a host can hold many clients', correct: true },
        { text: 'Servers connect out to a central client hub', correct: false },
      ],
      explain: 'A host spins up one client per server, and each client is paired 1:1 with a single server. Getting this relationship right is a classic interview tell.',
    },
    {
      question: 'MCP\u2019s three primitives \u2014 tools, resources, prompts \u2014 are best distinguished by what?',
      options: [
        { text: 'Which transport they use', correct: false },
        { text: 'Who controls them: model (tools), app (resources), user (prompts)', correct: true },
        { text: 'Whether they return text or JSON', correct: false },
      ],
      explain: 'Tools are model-controlled actions, resources are app-controlled read-only context (by URI), and prompts are user-invoked templates. Controller = the clean mental split.',
    },
    {
      question: 'Which strategy best addresses accuracy loss when a system has hundreds of tools?',
      options: [
        { text: 'Advertise all tools every turn so the model always has full choice', correct: false },
        { text: 'Retrieve the top-k relevant tools by embedding similarity and advertise only those', correct: true },
        { text: 'Merge all tools into a single god-tool with a mode enum', correct: false },
      ],
      explain: 'Past a couple dozen tools, flat lists degrade accuracy and bloat context. Retrieval over tool descriptions (or dynamic filtering/routing) advertises only the relevant subset.',
    },
    {
      question: 'When should you retry a failed tool call automatically?',
      options: [
        { text: 'Always retry every failure a few times', correct: false },
        { text: 'Only for transient errors (429, 503, timeouts) with exponential backoff and jitter', correct: true },
        { text: 'Never \u2014 always surface every error straight to the user', correct: false },
      ],
      explain: 'Retry transient/rate-limit/timeout failures with backoff + jitter; deterministic errors (400, 404) will just fail again, so surface those to the model instead.',
    },
    {
      question: 'What is the "lethal trifecta" in LLM tool-use security?',
      options: [
        { text: 'Slow tools, high cost, and large context windows', correct: false },
        { text: 'Access to private data + exposure to untrusted content + ability to act/exfiltrate externally', correct: true },
        { text: 'Prompt injection, jailbreaks, and hallucinations', correct: false },
      ],
      explain: 'When an agent has private data, ingests untrusted content, and can act externally, injection can exfiltrate data. Removing any one leg collapses the exfiltration risk.',
    },
  ],
};
