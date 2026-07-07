export default {
  id: 'databases-course',
  title: 'Databases Deep Dive',
  icon: '🗄️',
  color: '#f2a65a',
  lessons: [
    {
      id: 'sql-joins',
      group: 'Foundations',
      nav: '0 · Joins',
      title: 'SQL joins without the hand-waving',
      lede: 'Joins are where senior candidates either shine or crumble. Know the semantics, know the physical algorithms underneath, and never confuse the two.',
      html: `
        <p>A join answers one question: <strong>for each row here, which rows over there belong with it?</strong> The join <em>type</em> defines what happens to rows with no partner. The join <em>algorithm</em> defines how the engine physically finds partners. Interviewers probe both.</p>

        <h3>Join types: the party guest analogy 🎉</h3>
        <p>Table <code>users</code> is the guest list; <code>orders</code> is the coat check.</p>
        <table>
          <tr><th>Join</th><th>Semantics</th><th>Party version</th></tr>
          <tr><td><code>INNER JOIN</code></td><td>Only rows with a match on both sides</td><td>Only guests who checked a coat</td></tr>
          <tr><td><code>LEFT JOIN</code></td><td>All left rows; NULLs where right side missing</td><td>Every guest, coat or no coat</td></tr>
          <tr><td><code>RIGHT JOIN</code></td><td>All right rows; NULLs on left</td><td>Every coat, even orphaned ones 👻</td></tr>
          <tr><td><code>FULL OUTER</code></td><td>Everything from both, NULL-padded</td><td>All guests and all coats, matched where possible</td></tr>
          <tr><td><code>CROSS JOIN</code></td><td>Cartesian product — every pair</td><td>Every guest tries on every coat (chaos)</td></tr>
        </table>

        <div class='callout danger'><div class='c-title'>The classic LEFT JOIN bug</div>Putting a filter on the right table in <code>WHERE</code> silently turns your LEFT JOIN into an INNER JOIN, because <code>NULL = 'x'</code> is never true:
        <pre><code>-- WRONG: drops users with no orders
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.status = 'paid';

-- RIGHT: keep the filter in the ON clause
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
             AND o.status = 'paid';</code></pre>
        This one line-move is a top-tier interview question. Nail it.</div>

        <h3>The three physical join algorithms</h3>
        <div class='pattern-card'><h4>Nested Loop Join</h4>
          <p>For each row in the outer table, scan/probe the inner table. O(N×M) unscanned, but O(N log M) with an index on the inner side — which makes it the king of <strong>small-outer, indexed-inner</strong> lookups.</p>
          <div class='tag-row'><span class='tag use'>use when outer side is tiny and inner is indexed</span><span class='tag avoid'>avoid when both sides are large and unindexed</span></div>
        </div>
        <div class='pattern-card'><h4>Hash Join</h4>
          <p>Build a hash table from the smaller table, then stream the bigger one probing it. O(N+M). The workhorse for large, unsorted, equality joins in analytics.</p>
          <div class='tag-row'><span class='tag use'>use for big equality joins with enough memory</span><span class='tag avoid'>avoid for inequality joins (hash can only do =)</span></div>
        </div>
        <div class='pattern-card'><h4>Merge Join</h4>
          <p>Sort both sides on the join key (or use existing index order), then zip them together like merging two sorted decks of cards. Shines when inputs are already sorted.</p>
          <div class='tag-row'><span class='tag use'>use when both inputs arrive pre-sorted via indexes</span><span class='tag avoid'>avoid when sorting cost dominates</span></div>
        </div>

        <div class='callout good'><div class='c-title'>Rule of thumb</div>You almost never choose the algorithm — the planner does. Your job is to give it options: indexes on join keys, fresh statistics, and sane query shapes.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'Join type is semantics — what to do with unmatched rows. Join algorithm is physics — nested loop for small indexed lookups, hash join for big equality joins, merge join for pre-sorted inputs. And filters on the right table of a LEFT JOIN belong in ON, not WHERE.'</div>
      `,
    },
    {
      id: 'acid-transactions',
      group: 'Foundations',
      nav: '1 · ACID',
      title: 'Transactions & ACID, for real',
      lede: 'ACID is four letters everyone can recite and few can defend under follow-up questions. Let us make you dangerous.',
      html: `
        <p>A <span class='kicker'>transaction</span> bundles several operations into one all-or-nothing unit. The bank transfer is the cliché for a reason: debit account A, credit account B — if the process dies in between, you either want both or neither. Never a universe where money evaporated.</p>

        <h3>The four letters, with teeth</h3>
        <table>
          <tr><th>Letter</th><th>Promise</th><th>How it is actually delivered</th></tr>
          <tr><td><strong>A</strong>tomicity</td><td>All ops commit or none do</td><td>WAL + rollback: uncommitted changes are undone on crash recovery</td></tr>
          <tr><td><strong>C</strong>onsistency</td><td>Constraints hold before and after</td><td>Mostly YOUR job — the DB enforces declared constraints (FK, UNIQUE, CHECK)</td></tr>
          <tr><td><strong>I</strong>solation</td><td>Concurrent txns behave as if serial</td><td>MVCC snapshots and/or locks (next lesson)</td></tr>
          <tr><td><strong>D</strong>urability</td><td>Committed = survives power loss</td><td>fsync the WAL before acknowledging COMMIT</td></tr>
        </table>

        <div class='callout warn'><div class='c-title'>Gotcha: the C is the weakest letter</div>Consistency in ACID means 'application invariants hold' — it is <em>not</em> the same C as in CAP (replica convergence). Saying 'the database guarantees consistency' without qualification is a red flag. The DB enforces the constraints you declare; the rest of your invariants live in your transaction logic.</div>

        <h3>MVCC: how readers and writers stop fighting</h3>
        <p>Old-school databases used locks for everything: readers blocked writers, writers blocked readers, everyone waited. Modern engines (Postgres, MySQL InnoDB, Oracle) use <span class='kicker'>MVCC</span> — Multi-Version Concurrency Control. Every write creates a <em>new version</em> of the row; every transaction reads from a consistent <em>snapshot</em> as of its start time. Readers never block writers. It is git branches for rows: you read your checkout while others commit ahead of you.</p>
        <pre><code>BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 'A';
UPDATE accounts SET balance = balance + 100 WHERE id = 'B';
COMMIT;  -- WAL fsync happens here; only now is it durable</code></pre>

        <div class='callout danger'><div class='c-title'>War story: the long transaction</div>An analyst opened a transaction in a SQL console at 10am and went to lunch. MVCC must keep every row version that any open snapshot might still need — so vacuum/purge stalled, dead tuples piled up, the table bloated to 4x its size, and every query got slower all afternoon. Moral: <strong>long-running transactions are a tax on the entire database.</strong> Keep transactions short and never hold one across user think-time or network calls.</div>

        <div class='callout good'><div class='c-title'>Rule of thumb</div>Transaction scope = the smallest set of statements that must be atomic together. Not 'the whole request handler'.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'Atomicity and durability come from the write-ahead log; isolation comes from MVCC snapshots; consistency is mostly a contract the application must uphold. And the C in ACID has nothing to do with the C in CAP.'</div>
      `,
    },
    {
      id: 'isolation-levels',
      group: 'Foundations',
      nav: '2 · Isolation',
      title: 'Isolation levels & their anomalies',
      lede: 'Between "total chaos" and "perfectly serial" lies a ladder of isolation levels. Each rung trades correctness for speed — know exactly which bugs each rung permits.',
      html: `
        <p>Perfect isolation (<em>serializability</em>) is expensive, so SQL defines weaker levels that permit specific, named <span class='kicker'>anomalies</span>. Interviews test whether you can map anomaly → level → real bug.</p>

        <h3>The anomaly zoo 🦁</h3>
        <ul>
          <li><strong>Dirty read</strong> — you read data another transaction wrote but hasn't committed. It might roll back; you saw a ghost.</li>
          <li><strong>Non-repeatable read</strong> — you read a row twice in one transaction and get different values, because someone committed in between.</li>
          <li><strong>Phantom read</strong> — you run the same <em>range query</em> twice and new rows appear, because someone inserted matching rows.</li>
          <li><strong>Write skew</strong> — two transactions each read a condition, both see it holds, both write — and together they violate it. The sneakiest one.</li>
        </ul>

        <h3>The ladder</h3>
        <table>
          <tr><th>Level</th><th>Dirty read</th><th>Non-repeatable</th><th>Phantom</th><th>Write skew</th></tr>
          <tr><td>READ UNCOMMITTED</td><td>😱 possible</td><td>possible</td><td>possible</td><td>possible</td></tr>
          <tr><td>READ COMMITTED</td><td>blocked</td><td>possible</td><td>possible</td><td>possible</td></tr>
          <tr><td>REPEATABLE READ</td><td>blocked</td><td>blocked</td><td>possible*</td><td>possible</td></tr>
          <tr><td>SERIALIZABLE</td><td>blocked</td><td>blocked</td><td>blocked</td><td>blocked</td></tr>
        </table>
        <p><em>*Postgres's REPEATABLE READ (snapshot isolation) actually blocks phantoms too — but still permits write skew. Knowing this distinction is a senior-level flex.</em></p>

        <h3>Write skew: the on-call doctors 🩺</h3>
        <p>Hospital rule: at least one doctor must be on call. Alice and Bob are both on call and both feel sick. Each opens a transaction: <code>SELECT count(*) FROM oncall WHERE on_duty</code> → sees 2 → 'fine, I can leave' → sets their own row to off-duty → commits. Both transactions read a valid snapshot, neither touched the other's row, both commit cleanly… and now <strong>zero doctors are on call.</strong> Snapshot isolation cannot catch this; only SERIALIZABLE (or an explicit lock / materialized constraint) can.</p>

        <div class='callout warn'><div class='c-title'>Gotcha: defaults differ</div>Postgres and Oracle default to READ COMMITTED; MySQL InnoDB defaults to REPEATABLE READ. Same SQL, different anomalies in production. Always know your engine's default before debugging a heisenbug.</div>

        <div class='callout good'><div class='c-title'>Rule of thumb</div>Run READ COMMITTED by default. Escalate to SERIALIZABLE (or use <code>SELECT ... FOR UPDATE</code>) only for the specific transactions guarding invariants like balances, inventory, and uniqueness-across-rows. Retry on serialization failures — they are the price of safety.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'Isolation levels are named by which anomalies they forbid. The one everyone forgets is write skew: two snapshot-isolated transactions each check a constraint, both commit, and jointly break it — that is why SERIALIZABLE still exists.'</div>
      `,
    },
    {
      id: 'normalization',
      group: 'Foundations',
      nav: '3 · Normalize?',
      title: 'Normalization vs denormalization',
      lede: 'Normalization is not academic purity — it is a strategy for making updates safe. Denormalization is a strategy for making reads fast. Pick per workload, not per ideology.',
      html: `
        <p><span class='kicker'>Normalization</span> means each fact lives in exactly one place. Customer's address changes? One UPDATE, one row. In a denormalized schema where the address is copied onto 500 order rows, you now have 500 updates — or worse, 499 stale copies and one fresh one. That inconsistency is called an <strong>update anomaly</strong>, and avoiding it is the entire point.</p>

        <h3>The normal forms you actually need</h3>
        <table>
          <tr><th>Form</th><th>Rule (informally)</th><th>Smell it fixes</th></tr>
          <tr><td>1NF</td><td>Atomic values, no repeating groups</td><td><code>phone1, phone2, phone3</code> columns</td></tr>
          <tr><td>2NF</td><td>No partial dependence on a composite key</td><td>Product name repeated on every order line</td></tr>
          <tr><td>3NF</td><td>No transitive dependence — non-key columns depend only on the key</td><td>City AND zip both stored, but zip determines city</td></tr>
        </table>
        <p>The classic mnemonic: every non-key column must depend on <em>'the key, the whole key, and nothing but the key — so help me Codd.'</em> ⚖️ Beyond 3NF (BCNF, 4NF…) exists, but in interviews and practice, 3NF is the default target for transactional schemas.</p>

        <h3>When to denormalize — deliberately</h3>
        <p>Reads often outnumber writes 100:1. If a hot page needs data from six tables, six joins per view might cost more than occasional double-updates. Denormalization is <strong>a cache you maintain by hand</strong> — and like all caches, it trades freshness and write complexity for read speed.</p>
        <div class='two-col'>
          <div>
            <h4>Good denormalization</h4>
            <ul>
              <li>Storing <code>order_total</code> on the order instead of summing line items every read</li>
              <li>A <code>comment_count</code> counter column, updated in the same transaction</li>
              <li>Materialized views refreshed on a schedule</li>
              <li>A read-optimized copy fed by CDC/events</li>
            </ul>
          </div>
          <div>
            <h4>Bad denormalization</h4>
            <ul>
              <li>Copying mutable data (usernames, prices) with no update path</li>
              <li>Denormalizing 'for performance' before measuring anything</li>
              <li>Copies updated in separate transactions — hello, drift</li>
              <li>No source of truth: two copies, both authoritative, both different</li>
            </ul>
          </div>
        </div>

        <div class='callout warn'><div class='c-title'>War story</div>An e-commerce team copied <code>product.price</code> onto cart items 'for speed' with no reconciliation job. A price update later, customers checked out at stale prices for six hours. Fix was easy; the incident review was not. If you denormalize, <strong>write down which copy is the source of truth and how the others heal.</strong></div>

        <div class='callout good'><div class='c-title'>Rule of thumb</div>Normalize for writes, denormalize for reads. Start in 3NF; introduce redundancy only when a measured read path hurts, and always with a repair mechanism.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'Normalization means every fact lives in one place, so updates cannot create contradictions. Denormalization is hand-maintained caching: I accept possible staleness and extra write logic to buy read speed — and I only do it with a measured bottleneck and a healing path.'</div>
      `,
    },
    {
      id: 'btrees-indexes',
      group: 'Indexing & Performance',
      nav: '4 · B-trees',
      title: 'B-trees: the index workhorse',
      lede: 'One data structure powers nearly every relational index on Earth. Understand why it is shaped the way it is, and index tuning stops being folklore.',
      html: `
        <p>Why not a binary tree? A balanced binary tree over 100 million rows is ~27 levels deep — potentially 27 disk reads per lookup. Disks hand you data in <strong>pages</strong> (typically 8–16&nbsp;KB), so reading one byte costs the same as reading the whole page. The <span class='kicker'>B-tree</span> exploits this: make each node a full page holding <em>hundreds</em> of keys, so the tree gets extremely wide and extremely shallow.</p>

        <h3>Shallow is the superpower</h3>
        <p>With ~500 keys per page, the math is delightful: 500³ = 125 million rows in just <strong>3 levels</strong>. The root and most inner pages live in the buffer pool (RAM), so a lookup in a 100M-row table often costs <strong>one or two actual disk reads</strong>. That is the whole magic trick.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 210' width='640'>
            <defs><marker id='arrow2' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='250' y='10' width='140' height='44' rx='8'/>
            <text class='node-text' x='320' y='30' text-anchor='middle'>root page</text>
            <text class='node-sub' x='320' y='46' text-anchor='middle'>[ 100 | 500 | 900 ]</text>
            <line class='edge' x1='280' y1='54' x2='120' y2='100' marker-end='url(#arrow2)'/>
            <line class='edge' x1='320' y1='54' x2='320' y2='100' marker-end='url(#arrow2)'/>
            <line class='edge' x1='360' y1='54' x2='520' y2='100' marker-end='url(#arrow2)'/>
            <rect class='node-box worker' x='50' y='100' width='140' height='44' rx='8'/>
            <text class='node-text' x='120' y='120' text-anchor='middle'>inner page</text>
            <text class='node-sub' x='120' y='136' text-anchor='middle'>keys &lt; 100</text>
            <rect class='node-box worker' x='250' y='100' width='140' height='44' rx='8'/>
            <text class='node-text' x='320' y='120' text-anchor='middle'>inner page</text>
            <text class='node-sub' x='320' y='136' text-anchor='middle'>100 – 500</text>
            <rect class='node-box worker' x='450' y='100' width='140' height='44' rx='8'/>
            <text class='node-text' x='520' y='120' text-anchor='middle'>inner page</text>
            <text class='node-sub' x='520' y='136' text-anchor='middle'>keys ≥ 500</text>
            <rect class='node-box tool' x='170' y='164' width='300' height='36' rx='8'/>
            <text class='node-text' x='320' y='187' text-anchor='middle'>leaf pages → sorted keys + row pointers, linked left-to-right</text>
          </svg>
          <div class='diagram-caption'>B+tree: fat nodes = shallow tree. Leaves are a sorted linked list — which is why range scans are cheap.</div>
        </div>

        <h3>Why sorted leaves matter</h3>
        <p>Leaves hold keys in sorted order and are chained together. So a B-tree serves not just <code>WHERE id = 42</code> but also <code>BETWEEN</code>, <code>&gt;</code>, <code>ORDER BY</code> on the key, and prefix matches like <code>LIKE 'abc%'</code> — walk to the first match, then scan siblings. A hash index can only do exact equality; that is why B-trees won.</p>

        <h3>Clustered vs secondary indexes</h3>
        <ul>
          <li><strong>Clustered index</strong> — the table <em>is</em> the B-tree; leaf pages hold the full rows (MySQL InnoDB's primary key works this way). One clustered index per table, since rows can only be physically sorted one way.</li>
          <li><strong>Secondary index</strong> — leaves hold the key plus a pointer (in InnoDB: the primary key value) and lookups may need an extra hop to fetch the row. Postgres stores all indexes this way, pointing into the heap.</li>
        </ul>

        <div class='callout warn'><div class='c-title'>Gotcha: random UUIDs vs clustered B-trees</div>Inserting random UUIDv4 primary keys into a clustered index sprays writes across the whole tree — every insert touches a random page, causing splits and cache misses. Sequential ids (or time-ordered UUIDv7/ULID) append neatly to the rightmost leaf. This one choice can be a 5–10x insert-throughput difference at scale.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'A B-tree makes each node a full disk page with hundreds of keys, so 100 million rows fit in three levels — a lookup is one or two disk reads. Sorted, linked leaves are the bonus: ranges, ORDER BY, and prefix searches ride the same structure.'</div>
      `,
    },
    {
      id: 'composite-covering',
      group: 'Indexing & Performance',
      nav: '5 · Index design',
      title: 'Composite & covering indexes — and when indexes hurt',
      lede: 'Adding an index is easy. Adding the RIGHT index — column order, coverage, and knowing when NOT to — is the actual skill.',
      html: `
        <h3>Composite indexes: the phone book rule 📖</h3>
        <p>An index on <code>(last_name, first_name)</code> is a phone book: sorted by last name, then first name within it. You can find all 'Cohen's instantly, or 'Cohen, Maya' instantly — but finding everyone named 'Maya' means reading the entire book. Hence the <span class='kicker'>leftmost prefix rule</span>: a composite index serves queries that constrain a <em>prefix</em> of its columns.</p>
        <pre><code>CREATE INDEX idx ON orders (customer_id, status, created_at);

WHERE customer_id = 7                                  -- ✅ uses index
WHERE customer_id = 7 AND status = 'paid'              -- ✅ uses index
WHERE customer_id = 7 AND created_at &gt; '2026-01-01'    -- ⚠️ partial: only customer_id narrows
WHERE status = 'paid'                                  -- ❌ not a leftmost prefix</code></pre>

        <div class='callout good'><div class='c-title'>Column-order rule of thumb</div>Equality columns first, then the range/sort column: <strong>ERS — Equality, Range/Sort</strong>. Once the index hits a range condition, columns after it can no longer be used to seek — only to filter. <code>(customer_id, status, created_at)</code> beats <code>(created_at, customer_id, status)</code> for 'this customer's paid orders, newest first'.</div>

        <h3>Covering indexes: skip the table entirely</h3>
        <p>If the index contains <em>every</em> column the query needs, the engine answers from the index alone — an <span class='kicker'>index-only scan</span> — never touching the table heap. That removes the per-row 'fetch the actual row' hop, which is often the dominant cost.</p>
        <pre><code>-- Postgres: INCLUDE adds payload columns to leaves without widening the sort key
CREATE INDEX idx_orders_cover
  ON orders (customer_id, created_at) INCLUDE (total, status);

SELECT total, status FROM orders
WHERE customer_id = 7 ORDER BY created_at DESC LIMIT 20;
-- Index Only Scan 🎉 — zero heap fetches</code></pre>

        <h3>When indexes hurt 🔪</h3>
        <p>Indexes are not free. Every index is a whole extra B-tree that must be updated on <strong>every INSERT, UPDATE (of indexed columns), and DELETE</strong>.</p>
        <ul>
          <li><strong>Write amplification</strong> — a table with 8 indexes does ~9 B-tree writes per insert. Write-heavy tables want few, carefully chosen indexes.</li>
          <li><strong>Low selectivity</strong> — an index on <code>is_active</code> where 95% of rows are active is useless: the planner will (correctly) prefer a full scan over 95% random hops. Index columns that <em>narrow</em>.</li>
          <li><strong>Optimizer confusion</strong> — redundant, overlapping indexes enlarge the plan search space and can steer the planner into worse choices.</li>
          <li><strong>Storage &amp; cache pressure</strong> — indexes compete with data for buffer-pool RAM. Dead-weight indexes evict pages you actually need.</li>
        </ul>

        <div class='callout warn'><div class='c-title'>War story</div>A 'just in case' index existed on every column of a 200M-row events table — 14 indexes. Inserts crawled at 800/s. Dropping the 9 indexes with zero scans (found via <code>pg_stat_user_indexes</code>) took inserts to 6,000/s. <strong>Audit index usage stats quarterly; unused indexes are pure tax.</strong></div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'Composite index = phone book: leftmost prefix only, equality columns before range columns. Covering index = the query is answered entirely from index leaves. And every index is a write tax — I would rather have three indexes that match real query shapes than ten "just in case".'</div>
      `,
    },
    {
      id: 'query-plans',
      group: 'Indexing & Performance',
      nav: '6 · EXPLAIN',
      title: 'Query planning & reading EXPLAIN',
      lede: 'The planner is a cost-estimating gambler. EXPLAIN shows you its bet; EXPLAIN ANALYZE shows you whether it won. Learn to read both.',
      html: `
        <p>SQL is declarative: you say <em>what</em>, the <span class='kicker'>query planner</span> decides <em>how</em>. It enumerates plans (which index? which join algorithm? which order?), estimates each plan's cost using <strong>statistics</strong> about your data (row counts, value histograms, correlation), and picks the cheapest. When it guesses row counts wrong, it picks wrong — and that is the root of most 'the database is slow' tickets.</p>

        <h3>Reading a plan</h3>
        <pre><code>EXPLAIN ANALYZE
SELECT u.name, count(*)
FROM users u JOIN orders o ON o.user_id = u.id
WHERE u.city = 'Haifa'
GROUP BY u.name;

HashAggregate  (rows=180) (actual rows=176) ...
  -&gt; Hash Join  (rows=4200) (actual rows=3980)
       -&gt; Seq Scan on orders o  (rows=1000000)
       -&gt; Hash
            -&gt; Index Scan using idx_users_city on users u
                 (rows=210) (actual rows=205)</code></pre>
        <p>Read it <strong>inside-out, bottom-up</strong>: innermost nodes execute first. The two numbers that matter: <code>rows=</code> (the estimate) vs <code>actual rows=</code> (the truth). When they diverge by 10–100x, the planner was flying blind — usually stale statistics or correlated columns it cannot model. Fix with <code>ANALYZE</code> (refresh stats) or extended statistics.</p>

        <h3>Scan types, best to worst welcome</h3>
        <table>
          <tr><th>Node</th><th>What it means</th><th>Reaction</th></tr>
          <tr><td>Index Only Scan</td><td>Answered from the index; zero heap visits</td><td>😍 chef's kiss</td></tr>
          <tr><td>Index Scan</td><td>Index seek + fetch each matching row</td><td>🙂 great for selective predicates</td></tr>
          <tr><td>Bitmap Heap Scan</td><td>Collect matching pages from index, then read pages in order</td><td>👍 good middle ground for medium selectivity</td></tr>
          <tr><td>Seq Scan</td><td>Read the whole table</td><td>🤔 fine for small tables or &gt;5–10% of rows; alarming on a 100M-row point lookup</td></tr>
        </table>

        <h3>Ways queries silently refuse an index</h3>
        <ul>
          <li><strong>Function on the column:</strong> <code>WHERE lower(email) = '...'</code> cannot use an index on <code>email</code>. Fix: an expression index on <code>lower(email)</code>, or store normalized.</li>
          <li><strong>Type mismatch:</strong> comparing a varchar column to a number forces a cast per row.</li>
          <li><strong>Leading wildcard:</strong> <code>LIKE '%gmail.com'</code> — the phone book cannot help you find names <em>ending</em> in 'son'.</li>
          <li><strong>OR across columns:</strong> often plans as a full scan; rewrite as <code>UNION</code> of two indexable queries.</li>
        </ul>

        <div class='callout warn'><div class='c-title'>Gotcha</div><code>EXPLAIN</code> alone shows estimates only — it does not run the query. <code>EXPLAIN ANALYZE</code> actually executes it (yes, including the DML! wrap in a transaction and roll back). Always compare estimated vs actual rows first; it is the single highest-signal thing in the output.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'The planner is a cost model driven by statistics. My debugging loop: EXPLAIN ANALYZE, read inside-out, find where estimated rows diverge from actual by 10x+, then fix the cause — stale stats, a non-sargable predicate, or a missing index.'</div>
      `,
    },
    {
      id: 'perf-gotchas',
      group: 'Indexing & Performance',
      nav: '7 · Gotchas',
      title: 'Performance gotchas: N+1, locks, and other footguns',
      lede: 'Most database performance disasters are not exotic. They are the same five mistakes, wearing different costumes, made by every team eventually.',
      html: `
        <h3>1. The N+1 query problem 🐑</h3>
        <p>The most common ORM-inflicted wound. You fetch N blog posts (1 query), then the template lazily loads each post's author (N more queries). 100 posts = 101 round-trips. Each query is fast; the <em>sum</em> — and the per-query network latency — kills you.</p>
        <pre><code>// The crime (looks innocent!)
const posts = await Post.findAll();              // 1 query
for (const post of posts) {
  console.log(post.author.name);                 // +1 query EACH 😱
}

// The fix: eager load / batch
const posts = await Post.findAll({ include: Author });   // 1 query with JOIN
// or: SELECT * FROM authors WHERE id IN (...)           // 2 queries total</code></pre>
        <div class='callout good'><div class='c-title'>Detection</div>Log query counts per request. A page that issues more than ~10 queries deserves a look; one that issues 200 has an N+1. APM tools (Datadog, New Relic) flag repeated identical query shapes automatically.</div>

        <h3>2. Lock contention 🔒</h3>
        <p>Writes take row locks until COMMIT. When many transactions want the <em>same</em> rows, they queue — and throughput collapses on that hot spot. Classic culprits:</p>
        <ul>
          <li><strong>The hot counter row:</strong> every purchase does <code>UPDATE stats SET total = total + 1 WHERE id = 1</code>. One row, thousand writers, single-file line. Fix: shard the counter into N rows and sum on read, or batch increments.</li>
          <li><strong>Lock ordering deadlocks:</strong> Txn 1 locks A then wants B; Txn 2 locks B then wants A. The DB detects and kills one. Fix: <strong>always lock rows in a consistent order</strong> (e.g., by primary key ascending).</li>
          <li><strong>Holding locks across I/O:</strong> a transaction that calls a payment API mid-transaction holds its locks for the full 800ms round-trip. Do external calls <em>outside</em> the transaction.</li>
        </ul>

        <h3>3. Hot partitions 🔥</h3>
        <p>In sharded/partitioned systems, a bad partition key funnels traffic to one shard while others idle. Textbook cases: partitioning by <code>date</code> (all today's writes hit one partition), or by <code>celebrity_user_id</code> (Bieber logs in, one shard melts). Fix: choose high-cardinality, evenly-accessed keys; add a random suffix to spread hot entities; cache the hottest reads in front.</p>

        <h3>4. Missing pagination discipline</h3>
        <p><code>OFFSET 100000 LIMIT 20</code> reads and discards 100,000 rows to return 20 — page 5000 costs 5000x page 1. Use <span class='kicker'>keyset pagination</span>: <code>WHERE (created_at, id) &lt; (:last_seen_at, :last_seen_id) ORDER BY created_at DESC, id DESC LIMIT 20</code>. Constant cost per page, at the price of no 'jump to page 47'.</p>

        <h3>5. Connection pool exhaustion</h3>
        <p>Postgres spends real memory per connection; a stampede of app instances each opening 50 connections will flatline the server. Use a pooler (PgBouncer, RDS Proxy) and remember the counterintuitive truth: <strong>throughput usually peaks at a few dozen active connections</strong>, not thousands.</p>

        <div class='callout danger'><div class='c-title'>War story</div>Black Friday: checkout latency spiked to 30s. Root cause was not traffic volume — it was a single <code>UPDATE daily_revenue SET ...</code> hot row that every order touched inside its transaction. One row's lock queue serialized the entire checkout flow. Moving revenue aggregation to an async job fixed it in one deploy.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'My top database killers: N+1 from lazy ORMs, hot rows serializing writers, hot partitions from low-cardinality shard keys, OFFSET pagination, and unpooled connections. All five are workload-shape problems — no amount of hardware fixes them.'</div>
      `,
    },
    {
      id: 'nosql-families',
      group: 'NoSQL & Choosing',
      nav: '8 · NoSQL zoo',
      title: 'The four NoSQL families',
      lede: '"NoSQL" is not one thing — it is four different data models, each optimized for a different question. Confusing them is how projects end up on the wrong database.',
      html: `
        <p>NoSQL databases emerged when web-scale companies hit walls with relational databases: rigid schemas under fast iteration, and single-node scaling ceilings. Each family reshapes the data model around a specific access pattern — and gives up something relational databases had.</p>

        <div class='pattern-card'><h4>📄 Document stores — MongoDB, CouchDB, Firestore</h4>
          <p>Store JSON-ish documents; nest related data <em>inside</em> the document instead of joining. A blog post with its comments and tags is one read. Flexible schema per document; secondary indexes; rich queries. The tradeoff: cross-document joins and multi-document transactions are weak spots (Mongo has transactions since 4.0, but they cost you), and nested data duplicated across documents must be healed by hand.</p>
          <div class='tag-row'><span class='tag use'>use when data is self-contained aggregates read as a unit</span><span class='tag avoid'>avoid when entities are highly interconnected and queried from many angles</span></div>
        </div>

        <div class='pattern-card'><h4>🔑 Key-value stores — Redis, DynamoDB (core), Memcached</h4>
          <p>The simplest contract in databases: <code>GET(key)</code> / <code>PUT(key, value)</code>, O(1)-ish, brutally fast, trivially partitionable (hash the key, pick a shard). The value is opaque — the database cannot query <em>inside</em> it. Perfect for sessions, caches, feature flags, rate limiters, shopping carts.</p>
          <div class='tag-row'><span class='tag use'>use when you always fetch by exact key at high throughput</span><span class='tag avoid'>avoid when you need queries by value, ranges over non-key fields, or ad-hoc analytics</span></div>
        </div>

        <div class='pattern-card'><h4>📊 Wide-column stores — Cassandra, ScyllaDB, HBase, Bigtable</h4>
          <p>Think 'two-level map': a partition key locates the node, a clustering key sorts rows <em>within</em> the partition. Writes are absurdly fast (LSM-trees: append to memtable + commit log, flush sorted files later). Masterless replication gives linear write scaling and no single point of failure. The catch: <strong>you must model tables around queries in advance</strong> — no ad-hoc joins, no ad-hoc WHERE on unindexed columns. Query-first design or bust.</p>
          <div class='tag-row'><span class='tag use'>use for huge write volumes with known access patterns: time-series, events, IoT, feeds</span><span class='tag avoid'>avoid for ad-hoc queries, small datasets, or evolving unknown access patterns</span></div>
        </div>

        <div class='pattern-card'><h4>🕸️ Graph databases — Neo4j, Neptune, Memgraph</h4>
          <p>Nodes + edges + properties, with traversal as the native operation. 'Friends of friends who like jazz and live within 10km' is a three-hop traversal — in SQL that is a stack of self-joins whose cost explodes with depth; in a graph DB each hop is a pointer dereference (index-free adjacency). The tradeoff: partitioning a graph across machines is genuinely hard (edges cross shard boundaries), so horizontal scaling is the weak story.</p>
          <div class='tag-row'><span class='tag use'>use when relationships ARE the data: social graphs, fraud rings, recommendations, dependency analysis</span><span class='tag avoid'>avoid for tabular aggregate reporting or when relationships are shallow (1–2 hops — SQL joins are fine)</span></div>
        </div>

        <div class='callout warn'><div class='c-title'>Gotcha</div>'Schemaless' does not mean 'no schema' — it means the schema lives in your application code, unenforced, and every document version you ever wrote is still in the database. Teams call this <em>schema-on-read</em>; production calls it 'why does this document from 2023 not have that field'.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'Four families, four questions: document = "give me this aggregate"; key-value = "give me this exact thing, fast"; wide-column = "absorb this write firehose along known query paths"; graph = "walk these relationships N hops". The data model IS the choice.'</div>
      `,
    },
    {
      id: 'sql-vs-nosql',
      group: 'NoSQL & Choosing',
      nav: '9 · SQL vs NoSQL',
      title: 'SQL vs NoSQL: the honest decision framework',
      lede: 'The interview question is never really "which is better". It is "do you understand what each one gives up". Here is the grown-up answer.',
      html: `
        <p>The real axis is not SQL syntax vs JSON. It is a bundle of tradeoffs: <strong>schema rigidity vs flexibility, strong transactions vs partition-friendly simplicity, query power vs predictable scaling.</strong></p>

        <h3>Side by side</h3>
        <table>
          <tr><th>Dimension</th><th>Relational (Postgres, MySQL)</th><th>NoSQL (varies by family)</th></tr>
          <tr><td>Schema</td><td>Enforced up front; migrations required</td><td>Flexible; enforced (or not) in app code</td></tr>
          <tr><td>Transactions</td><td>Full ACID, multi-row, multi-table</td><td>Usually per-document / per-partition; cross-entity is limited or costly</td></tr>
          <tr><td>Query flexibility</td><td>Ad-hoc: any join, any filter, any aggregate</td><td>Access patterns largely designed in advance</td></tr>
          <tr><td>Scaling</td><td>Vertical first; read replicas easy; sharding is manual pain</td><td>Horizontal by design (esp. KV / wide-column)</td></tr>
          <tr><td>Consistency</td><td>Strong by default</td><td>Often tunable, eventual by default</td></tr>
          <tr><td>Data integrity</td><td>FKs, constraints, triggers in the DB</td><td>Your application's problem</td></tr>
        </table>

        <h3>Questions that actually decide it</h3>
        <ol>
          <li><strong>Do you need multi-entity transactions?</strong> Money, inventory, bookings → relational, full stop. Retrofitting atomicity onto a NoSQL store means building a wobbly transaction layer in app code.</li>
          <li><strong>Do you know your queries in advance?</strong> Unknown/evolving query patterns favor SQL's ad-hoc power. Fixed, known patterns at huge scale favor NoSQL's pre-designed access paths.</li>
          <li><strong>What is the actual scale?</strong> Be honest. A single modern Postgres box handles tens of thousands of TPS and multiple TB. Most startups choosing Cassandra 'for scale' are cosplaying Netflix with 200 users.</li>
          <li><strong>What shape is the data?</strong> Self-contained aggregates → documents. Exact-key lookups → KV. Firehose of timestamped events → wide-column. Deep relationships → graph. Interrelated entities queried every which way → relational.</li>
        </ol>

        <div class='callout good'><div class='c-title'>The pragmatic default</div><strong>Start with Postgres.</strong> It gives you ACID, ad-hoc SQL, JSONB for document-style flexibility, full-text search, and even pgvector — while you learn your real access patterns. Introduce a specialized store when a <em>measured</em> workload outgrows it: Redis for caching, a wide-column store for the event firehose, a graph DB when traversals dominate. Polyglot persistence is the norm at scale — but each extra store is an ops bill, a consistency boundary, and a new way to be paged at 3am.</div>

        <div class='callout warn'><div class='c-title'>Gotcha: the false dichotomy</div>Modern databases blur the line hard: Postgres JSONB is a credible document store; DynamoDB has transactions; MongoDB has multi-document ACID; distributed SQL (Spanner, CockroachDB) offers relational semantics with horizontal scale. If your interviewer wants a religious war, disappoint them with nuance.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'I choose based on three things: transaction needs, query predictability, and honest scale. Multi-entity invariants or unknown queries → relational. Known access patterns at genuine horizontal scale → the matching NoSQL family. And my default is Postgres until measurement says otherwise.'</div>
      `,
    },
    {
      id: 'replication-sharding',
      group: 'Scaling & Recap',
      nav: '10 · Scale out',
      title: 'Replication & sharding basics',
      lede: 'Two verbs cover almost all database scaling: copy the data (replication) and split the data (sharding). Each solves a different problem and brings its own grief.',
      html: `
        <h3>Replication: same data, more places</h3>
        <p><span class='kicker'>Replication</span> keeps full copies on multiple nodes. It buys you <strong>read scaling</strong> (spread reads across replicas), <strong>availability</strong> (leader dies → promote a replica), and <strong>geo-latency</strong> (replica near the user).</p>
        <ul>
          <li><strong>Single-leader</strong> (default in Postgres/MySQL): all writes hit the leader, which streams changes to followers. Simple, no write conflicts. Writes limited to one node.</li>
          <li><strong>Multi-leader:</strong> multiple nodes accept writes (multi-region, offline clients). Now two leaders can change the same row concurrently → <strong>write conflicts</strong> you must resolve (last-write-wins, CRDTs, app logic).</li>
          <li><strong>Leaderless</strong> (Dynamo-style: Cassandra, Riak): write to any N replicas, read from R, and if <code>R + W &gt; N</code> read and write sets overlap → quorum consistency.</li>
        </ul>

        <div class='callout warn'><div class='c-title'>The classic trap: replication lag</div>Async replicas trail the leader by milliseconds — or, under load, seconds. User writes a comment (leader), refreshes (replica), comment is gone. They post it again. Now it is there twice. Fixes: read-your-writes routing (send that user's reads to the leader briefly), monotonic reads (pin a session to one replica), or sync replication where it matters (at latency cost).</div>

        <h3>Sharding: different data, different places</h3>
        <p>When <em>writes</em> or raw data size outgrow one machine, <span class='kicker'>sharding</span> (horizontal partitioning) splits rows across nodes by a <strong>shard key</strong>.</p>
        <div class='two-col'>
          <div>
            <h4>Hash sharding</h4>
            <p><code>shard = hash(user_id) % N</code>. Spreads load evenly. But range queries ('users created this week') must hit <em>every</em> shard, and naive modulo makes resharding a full reshuffle — use consistent hashing to move only ~1/N of keys.</p>
          </div>
          <div>
            <h4>Range sharding</h4>
            <p>Shard 1: ids A–F, shard 2: G–M… Range scans stay on few shards, splitting is easy. But sequential keys (timestamps!) create a <strong>hot tail shard</strong> absorbing all new writes.</p>
          </div>
        </div>

        <h3>What sharding costs you 💸</h3>
        <ul>
          <li><strong>Cross-shard queries:</strong> anything not filtered by shard key becomes scatter-gather across all shards.</li>
          <li><strong>Cross-shard transactions:</strong> ACID within one shard is easy; across shards you need two-phase commit or sagas — slow and complex.</li>
          <li><strong>Cross-shard joins:</strong> mostly 'don't'. Denormalize, or co-locate rows that join together on the same shard.</li>
          <li><strong>Resharding:</strong> migrating live data while serving traffic is a months-long project. Choose the shard key like you will live with it for a decade — you will.</li>
        </ul>

        <div class='callout good'><div class='c-title'>Rule of thumb — the scaling ladder</div>Exhaust the cheap rungs first: 1) indexes &amp; query tuning, 2) caching, 3) a bigger box, 4) read replicas, 5) functional split (move a subsystem to its own DB), and only then 6) sharding. Most companies never legitimately reach rung 6.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'Replication scales reads and buys availability; sharding scales writes and data size. Replication's tax is lag and stale reads; sharding's tax is losing cross-shard joins and transactions. And the shard key is a ten-year decision — pick high-cardinality, evenly-accessed, and present in your hottest queries.'</div>
      `,
    },
    {
      id: 'cap-in-practice',
      group: 'Scaling & Recap',
      nav: '11 · CAP',
      title: 'CAP in practice',
      lede: 'CAP is the most misquoted theorem in databases. The honest version fits in one sentence — and the useful version is called PACELC.',
      html: `
        <p>The CAP theorem: a distributed data store cannot simultaneously guarantee <span class='kicker'>Consistency</span> (every read sees the latest write), <span class='kicker'>Availability</span> (every request gets a non-error response), and <span class='kicker'>Partition tolerance</span> (keeps working when the network splits). The pop-culture reading — 'pick any two' — is wrong.</p>

        <h3>The honest reading</h3>
        <p>Network partitions are not optional; switches fail and cables get backhoed. So P is mandatory. CAP really says: <strong>when a partition happens, choose C or A.</strong></p>
        <div class='two-col'>
          <div>
            <h4>Choose C (CP)</h4>
            <p>During a partition, the minority side refuses writes (maybe reads too) rather than risk divergence. Users see errors; data stays correct. Examples: etcd, ZooKeeper, Spanner, single-leader Postgres with sync replication.</p>
          </div>
          <div>
            <h4>Choose A (AP)</h4>
            <p>Both sides keep serving; replicas diverge; reconcile after healing (LWW, vector clocks, CRDTs, app-level merge). Users see stale data; nobody sees errors. Examples: Cassandra, DynamoDB (default mode), CouchDB.</p>
          </div>
        </div>

        <h3>PACELC: the upgrade interviewers respect</h3>
        <p>CAP is silent about the 99.99% of time the network is <em>fine</em>. <span class='kicker'>PACELC</span> completes it: 'if <strong>P</strong>artition, choose <strong>A</strong> or <strong>C</strong>; <strong>E</strong>lse, choose <strong>L</strong>atency or <strong>C</strong>onsistency.' Even on a healthy network, strong consistency requires coordination (quorums, sync replication) which costs latency on every single request. That everyday L-vs-C trade shapes your p99 far more than rare partitions do.</p>
        <table>
          <tr><th>System</th><th>During partition</th><th>Normally</th><th>PACELC</th></tr>
          <tr><td>DynamoDB / Cassandra</td><td>Available</td><td>Latency-first</td><td>PA/EL</td></tr>
          <tr><td>Spanner / CockroachDB</td><td>Consistent</td><td>Consistency-first</td><td>PC/EC</td></tr>
          <tr><td>MongoDB (default)</td><td>Consistent-ish (majority)</td><td>Latency-leaning</td><td>PC/EL-ish</td></tr>
        </table>

        <h3>Applying it like an adult</h3>
        <p>The choice is <strong>per data flow, not per company</strong>. In one e-commerce system: the shopping cart is AP (never block adding to cart; merge duplicates later — Amazon's famous choice), inventory decrement at checkout is CP (overselling is worse than a 2s wait), and the product catalog is happily eventual (a 30-second-stale description harms no one).</p>

        <div class='callout warn'><div class='c-title'>Gotcha</div>'Availability' in CAP is a formal property (every non-failed node responds), not your SLA's 99.9%. A CP system can still have superb uptime; an AP system can still have outages. Do not conflate CAP-availability with operational availability in an interview.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'Partitions are mandatory, so CAP really asks: when the network splits, do you return errors or stale data? And PACELC adds the everyday version: even with no partition, you pay latency for consistency. I answer per data flow — carts AP, payments CP.'</div>
      `,
    },
    {
      id: 'cheat-sheet',
      group: 'Scaling & Recap',
      nav: '12 · Cheat sheet',
      title: 'Cheat sheet & rapid-fire interview Q&A',
      lede: 'Everything in the course, compressed for the night before. Read the soundbites out loud — twice.',
      html: `
        <h3>One-liners to own 🎯</h3>
        <ul>
          <li><strong>Databases:</strong> trees and logs hiding the fact that disk is a million times slower than RAM.</li>
          <li><strong>WAL:</strong> append + fsync a sequential log first; update structures lazily; replay on crash.</li>
          <li><strong>B-tree:</strong> page-sized nodes → hundreds of keys each → 100M rows in 3 levels → 1–2 disk reads per lookup. Sorted linked leaves give ranges and ORDER BY for free.</li>
          <li><strong>Composite index:</strong> phone book — leftmost prefix only; equality columns before the range column.</li>
          <li><strong>Covering index:</strong> query answered entirely from index leaves; zero heap fetches.</li>
          <li><strong>Indexes hurt when:</strong> write-heavy tables (each index = extra B-tree write), low-selectivity columns, unused 'just in case' indexes eating buffer-pool RAM.</li>
          <li><strong>ACID:</strong> A+D from the WAL, I from MVCC, C mostly from you. ACID-C ≠ CAP-C.</li>
          <li><strong>Isolation:</strong> levels are named by which anomalies they forbid; snapshot isolation still allows write skew; only SERIALIZABLE kills it.</li>
          <li><strong>Normalize for writes, denormalize for reads</strong> — and denormalization is hand-maintained caching that needs a healing path.</li>
          <li><strong>Replication scales reads; sharding scales writes.</strong> Lag is replication's tax; lost cross-shard joins/transactions are sharding's.</li>
          <li><strong>CAP:</strong> P is mandatory; during a partition pick errors (CP) or staleness (AP). PACELC: even without a partition, consistency costs latency.</li>
          <li><strong>NoSQL families:</strong> document = aggregates; key-value = exact key, fast; wide-column = write firehose on known paths; graph = multi-hop relationships.</li>
        </ul>

        <h3>Rapid-fire Q&amp;A ⚡</h3>
        <table>
          <tr><th>Question</th><th>Your answer</th></tr>
          <tr><td>Why B-trees over binary trees?</td><td>Nodes match disk pages: hundreds of keys per node → 3–4 levels for 100M rows → 1–2 actual disk reads.</td></tr>
          <tr><td>Why is <code>WHERE right_col = x</code> after a LEFT JOIN a bug?</td><td>NULLs from unmatched rows fail the predicate — it silently becomes an INNER JOIN. Move the filter into ON.</td></tr>
          <tr><td>Difference between REPEATABLE READ and SERIALIZABLE?</td><td>Snapshot isolation still permits write skew — two transactions each validate a constraint on their snapshot and jointly break it. SERIALIZABLE detects and aborts one.</td></tr>
          <tr><td>Your index exists but the planner ignores it. Why?</td><td>Non-sargable predicate (function on the column, leading wildcard, type cast), low selectivity making a scan cheaper, or stale statistics. Check EXPLAIN ANALYZE's estimated vs actual rows.</td></tr>
          <tr><td>What is N+1 and how do you kill it?</td><td>1 query for a list, then a lazy query per item. Fix with eager loading / JOIN / batched IN-list; detect by logging queries per request.</td></tr>
          <tr><td>Hash vs range sharding?</td><td>Hash spreads load evenly but breaks range queries; range keeps ranges local but sequential keys create a hot tail shard.</td></tr>
          <tr><td>Why did DynamoDB's designers make carts AP?</td><td>A blocked add-to-cart loses revenue; a duplicated cart item is mergeable. Availability wins where conflicts are cheap to resolve.</td></tr>
          <tr><td>When is MongoDB the wrong choice?</td><td>Highly interconnected entities queried from many angles, or multi-entity transactional invariants — that is relational territory.</td></tr>
          <tr><td>OFFSET pagination is slow at page 5000. Fix?</td><td>Keyset pagination: WHERE (sort_key, id) &lt; last-seen values, LIMIT n. Constant cost per page.</td></tr>
          <tr><td>First move when 'the database is slow'?</td><td>Find the top queries (pg_stat_statements / slow query log), EXPLAIN ANALYZE the worst, compare estimated vs actual rows, fix the biggest divergence.</td></tr>
        </table>

        <h3>Decision cheat table</h3>
        <table>
          <tr><th>Workload</th><th>Reach for</th></tr>
          <tr><td>Transactional core with invariants (money, inventory, bookings)</td><td>Postgres / MySQL — full ACID</td></tr>
          <tr><td>Session store, cache, rate limiting</td><td>Redis / key-value</td></tr>
          <tr><td>Event/time-series write firehose, known queries</td><td>Cassandra / ScyllaDB / Bigtable</td></tr>
          <tr><td>Self-contained aggregates, flexible schema</td><td>MongoDB / Firestore — or Postgres JSONB</td></tr>
          <tr><td>Fraud rings, social graphs, recommendations</td><td>Neo4j / Neptune</td></tr>
          <tr><td>Relational semantics at horizontal scale</td><td>Spanner / CockroachDB</td></tr>
          <tr><td>Not sure yet</td><td>Postgres. Seriously.</td></tr>
        </table>

        <div class='callout good'><div class='c-title'>The night-before ritual</div>Say out loud: the leftmost prefix rule, the write-skew doctors story, the LEFT JOIN filter bug, PACELC, and 'replication scales reads, sharding scales writes'. If you can explain those five without notes, you are ready. 💪</div>

        <div class='callout'><div class='c-title'>Final interview soundbite</div>'I default to Postgres, index for my real query shapes, keep transactions short and at the weakest isolation that preserves correctness, scale up the cheap ladder before sharding, and choose CP or AP per data flow — not per company religion.'</div>
      `,
    },
  ],
  quizzes: [
    {
      question: 'A query filters with WHERE status = "paid" but the table\'s only index is on (customer_id, status, created_at). Why won\'t the index be used for a seek?',
      options: [
        { text: 'Composite indexes can only be used by queries that filter on ALL of their columns', correct: false },
        { text: 'The leftmost prefix rule: the index is sorted by customer_id first, so without a customer_id predicate the status values are scattered across the whole index', correct: true },
        { text: 'String columns like status cannot participate in B-tree indexes', correct: false },
        { text: 'Indexes with more than two columns are ignored by most planners', correct: false },
      ],
      explain: 'A composite index is like a phone book sorted by (last, first) name: you can seek on a prefix of the columns, but a filter that skips the leading column(s) finds its values scattered everywhere — the index cannot be used for an efficient seek.',
    },
    {
      question: 'Two transactions under snapshot isolation (REPEATABLE READ) each check that at least one doctor remains on call, then each removes themselves. Both commit, leaving zero doctors on call. What anomaly is this, and what prevents it?',
      options: [
        { text: 'A dirty read — prevented by READ COMMITTED', correct: false },
        { text: 'A phantom read — prevented by REPEATABLE READ', correct: false },
        { text: 'Write skew — prevented only by SERIALIZABLE isolation (or explicit locking)', correct: true },
        { text: 'A lost update — prevented by MVCC automatically', correct: false },
      ],
      explain: 'Each transaction read a consistent snapshot and wrote to a different row, so snapshot isolation sees no conflict — yet together they violated the invariant. That is write skew, and only SERIALIZABLE (or SELECT ... FOR UPDATE / a materialized constraint) prevents it.',
    },
    {
      question: 'You LEFT JOIN users to orders and add WHERE orders.status = \'paid\'. Users with no orders vanish from the results. Why?',
      options: [
        { text: 'LEFT JOIN only returns matched rows when a WHERE clause is present anywhere in the query', correct: false },
        { text: 'Unmatched users get NULL for orders.status, and NULL = \'paid\' is not true — so the WHERE filter discards them, effectively turning the LEFT JOIN into an INNER JOIN', correct: true },
        { text: 'The planner rewrote it as a CROSS JOIN for performance', correct: false },
        { text: 'This is a bug specific to MySQL; Postgres handles it correctly', correct: false },
      ],
      explain: 'WHERE runs after the join, and NULL comparisons are never true, so the NULL-padded rows from unmatched users are filtered out. Move the condition into the ON clause to keep LEFT JOIN semantics.',
    },
    {
      question: 'An ORM-backed page renders 100 blog posts and issues 101 database queries. What is happening and what is the standard fix?',
      options: [
        { text: 'Connection pool thrashing — increase the pool size to 101', correct: false },
        { text: 'The N+1 problem: one query for the list, then a lazy query per item for its association — fix with eager loading (JOIN) or a single batched IN-list query', correct: true },
        { text: 'Missing index on the posts table — add one and the query count drops', correct: false },
        { text: 'Replication lag forcing each read to retry against the leader', correct: false },
      ],
      explain: 'Lazy-loading associations inside a loop issues one extra query per row. Eager loading (include/JOIN) or batching with WHERE id IN (...) collapses 101 round-trips into 1–2.',
    },
    {
      question: 'You need a database for a firehose of timestamped IoT events (millions of writes/sec) with a small set of known query patterns. Which NoSQL family fits best, and why?',
      options: [
        { text: 'A graph database — sensor readings form natural relationship edges', correct: false },
        { text: 'A document store — each event is a self-contained JSON aggregate', correct: false },
        { text: 'A wide-column store like Cassandra — LSM-tree writes are extremely fast and masterless replication scales writes linearly, at the cost of designing tables around your queries up front', correct: true },
        { text: 'A key-value store — events are just values under timestamp keys', correct: false },
      ],
      explain: 'Wide-column stores are built for exactly this: append-heavy LSM storage, partition keys spreading writes across a masterless cluster, and clustering keys ordering events within partitions. The tradeoff — query-first table design — is acceptable when access patterns are known.',
    },
    {
      question: 'During a network partition, a Dynamo-style AP system keeps accepting writes on both sides. What is the unavoidable consequence?',
      options: [
        { text: 'Both sides return errors until a new leader is elected', correct: false },
        { text: 'Replicas diverge, and conflicting versions must be reconciled after the partition heals (last-write-wins, vector clocks, CRDTs, or app-level merge)', correct: true },
        { text: 'Writes are silently dropped on the minority side', correct: false },
        { text: 'Nothing — the CAP theorem only applies to relational databases', correct: false },
      ],
      explain: 'Choosing availability during a partition means both sides accept writes without coordinating, so replicas can hold conflicting versions of the same key. Conflict resolution after healing is the price of AP.',
    },
    {
      question: 'A table has 12 indexes "just in case" and insert throughput has collapsed. What is the primary mechanism causing the slowdown?',
      options: [
        { text: 'The planner spends too long choosing between indexes at insert time', correct: false },
        { text: 'Write amplification: every insert must also update each index\'s B-tree, so 12 indexes mean ~13 tree writes per row — plus buffer-pool pressure from index pages evicting data pages', correct: true },
        { text: 'Indexes lock the whole table during inserts', correct: false },
        { text: 'Each index forces a full table scan to check uniqueness', correct: false },
      ],
      explain: 'Every index is a separate B-tree that must be maintained on every write. Unused indexes are pure write tax and cache pressure — audit usage stats and drop indexes with zero scans.',
    },
  ],
};
