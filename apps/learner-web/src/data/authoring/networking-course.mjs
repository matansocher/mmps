export default {
  id: 'networking-course',
  title: 'Networking Fundamentals',
  icon: '🌐',
  color: '#4fc3f7',
  lessons: [
    {
      id: 'layers',
      group: 'Foundations',
      nav: '1 · Layers',
      title: 'The layered mental model: OSI vs TCP/IP',
      lede: 'Networking is a stack of lies, each layer pretending the one below it is simple. Learn the four layers that actually matter.',
      html: `
        <p>Every networking conversation starts with layers, so let's get this out of the way: the famous <span class='kicker'>OSI 7-layer model</span> is a beautiful academic artifact that nobody actually implements. The real internet runs on the <span class='kicker'>TCP/IP model</span> — roughly 4 layers — and that's the mental model you should carry.</p>

        <h3>Why layers at all?</h3>
        <p>Layers are just <strong>abstraction boundaries</strong>, exactly like your codebase. HTTP doesn't want to know about packet loss; TCP doesn't want to know about Wi-Fi radio frequencies. Each layer wraps the data from the layer above with its own header — like nesting envelopes 📨 inside envelopes.</p>

        <table>
          <tr><th>TCP/IP layer</th><th>OSI equivalent</th><th>Job</th><th>Names you know</th></tr>
          <tr><td><strong>Application</strong></td><td>L5–L7</td><td>Speak the app's language</td><td>HTTP, DNS, TLS*, WebSocket</td></tr>
          <tr><td><strong>Transport</strong></td><td>L4</td><td>Process-to-process delivery, ports</td><td>TCP, UDP, QUIC</td></tr>
          <tr><td><strong>Internet</strong></td><td>L3</td><td>Host-to-host routing across networks</td><td>IP, ICMP</td></tr>
          <tr><td><strong>Link</strong></td><td>L1–L2</td><td>Get bits to the next hop</td><td>Ethernet, Wi-Fi, MAC addresses</td></tr>
        </table>
        <p><em>*TLS sits awkwardly between transport and application — people call it "L5-ish" and move on.</em></p>

        <div class='diagram'>
          <svg viewBox='0 0 640 220' width='640'>
            <defs><marker id='arrowL1' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='40' y='20' width='250' height='40' rx='8'/>
            <text class='node-text' x='165' y='45' text-anchor='middle'>HTTP request</text>
            <rect class='node-box worker' x='40' y='70' width='250' height='40' rx='8'/>
            <text class='node-text' x='165' y='95' text-anchor='middle'>+ TCP header (ports)</text>
            <rect class='node-box tool' x='40' y='120' width='250' height='40' rx='8'/>
            <text class='node-text' x='165' y='145' text-anchor='middle'>+ IP header (addresses)</text>
            <rect class='node-box' x='40' y='170' width='250' height='40' rx='8'/>
            <text class='node-text' x='165' y='195' text-anchor='middle'>+ Ethernet frame (MACs)</text>
            <line class='edge' x1='310' y1='115' x2='420' y2='115' marker-end='url(#arrowL1)'/>
            <text class='edge-label' x='365' y='105' text-anchor='middle'>the wire</text>
            <rect class='node-box worker' x='430' y='90' width='170' height='50' rx='8'/>
            <text class='node-text' x='515' y='112' text-anchor='middle'>Receiver</text>
            <text class='node-sub' x='515' y='128' text-anchor='middle'>unwraps in reverse</text>
          </svg>
          <div class='diagram-caption'>Encapsulation: each layer wraps the payload with its own header. The receiver peels them off in reverse order.</div>
        </div>

        <h4>What actually matters day-to-day</h4>
        <ul>
          <li>When someone says "L4 load balancer," they mean it routes on <strong>IP + port</strong> (TCP level), blind to HTTP.</li>
          <li>When someone says "L7," they mean it understands <strong>HTTP</strong> — paths, headers, cookies.</li>
          <li>MAC addresses only matter on the <em>local</em> network segment. IPs get you across the world; MACs get you to the next hop.</li>
        </ul>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          Don't memorize OSI's session/presentation layers for interviews — nobody uses them. Knowing "L4 = TCP/ports, L7 = HTTP" earns more credibility than reciting all seven.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "I think in the TCP/IP model: link gets bits to the next hop, IP routes between networks, TCP/UDP delivers to a process via ports, and the app layer speaks HTTP or DNS. OSI is a reference vocabulary — L4 vs L7 is the distinction that matters in practice."
        </div>
      `,
    },
    {
      id: 'ip-routing-nat',
      group: 'Foundations',
      nav: '2 · IP & NAT',
      title: 'IP, routing & NAT: how packets find their way',
      lede: 'The internet is a game of hot potato. Every router just asks: "who is closer to this address than me?" — and NAT is the trick that let 4 billion addresses serve 30 billion devices.',
      html: `
        <p>An <span class='kicker'>IP address</span> identifies a network interface. IPv4 gives you 32 bits (~4.3 billion addresses, long exhausted); IPv6 gives you 128 bits (enough to address every atom you'll ever care about). An address splits into a <strong>network prefix</strong> and a <strong>host part</strong> — written in CIDR notation like <code>10.0.0.0/16</code> (first 16 bits = the network).</p>

        <h3>Routing: hot potato, hop by hop 🥔</h3>
        <p>No router knows the full path to a destination. Each one keeps a <strong>routing table</strong> of prefixes and just forwards the packet to the next hop that's "closer." Your laptop's table is tiny: "my subnet → send direct; everything else → the default gateway." Core internet routers hold ~1M prefixes, exchanged between networks via <span class='kicker'>BGP</span>.</p>

        <pre><code># See your own routing table
ip route          # Linux
netstat -rn       # macOS
# default via 192.168.1.1 dev wlan0   &lt;- the default gateway</code></pre>

        <div class='callout danger'>
          <div class='c-title'>War story</div>
          In 2021 Facebook vanished from the internet for 6 hours because a maintenance script withdrew their BGP routes. Their servers were fine — the internet just forgot how to reach them. Routing IS availability.
        </div>

        <h3>Private addresses & NAT</h3>
        <p>Three ranges are reserved for private networks and never routed on the public internet: <code>10.0.0.0/8</code>, <code>172.16.0.0/12</code>, <code>192.168.0.0/16</code>. Your home and your VPC both live here. To reach the outside world, a <span class='kicker'>NAT</span> (Network Address Translation) box rewrites your private source IP to its own public IP, and keeps a mapping table of <code>(private IP:port) ↔ (public port)</code> so replies find their way back.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 150' width='640'>
            <defs><marker id='arrowN1' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='20' y='50' width='150' height='55' rx='8'/>
            <text class='node-text' x='95' y='74' text-anchor='middle'>Laptop</text>
            <text class='node-sub' x='95' y='92' text-anchor='middle'>192.168.1.7:52001</text>
            <line class='edge' x1='170' y1='77' x2='250' y2='77' marker-end='url(#arrowN1)'/>
            <rect class='node-box tool' x='255' y='50' width='140' height='55' rx='8'/>
            <text class='node-text' x='325' y='74' text-anchor='middle'>NAT router</text>
            <text class='node-sub' x='325' y='92' text-anchor='middle'>rewrites src addr</text>
            <line class='edge' x1='395' y1='77' x2='475' y2='77' marker-end='url(#arrowN1)'/>
            <text class='edge-label' x='435' y='67' text-anchor='middle'>203.0.113.9:6112</text>
            <rect class='node-box worker' x='480' y='50' width='140' height='55' rx='8'/>
            <text class='node-text' x='550' y='74' text-anchor='middle'>Server</text>
            <text class='node-sub' x='550' y='92' text-anchor='middle'>sees only the NAT IP</text>
          </svg>
          <div class='diagram-caption'>NAT: the server never sees your private IP — it replies to the router, which maps the port back to you.</div>
        </div>

        <h4>Why engineers should care about NAT</h4>
        <ul>
          <li><strong>Inbound is blocked by default.</strong> A server can't call your laptop — there's no mapping until <em>you</em> initiate. This is why P2P apps (WebRTC, games) need STUN/TURN servers for "NAT traversal."</li>
          <li><strong>NAT mappings expire.</strong> Idle TCP connections through NAT/firewalls get silently dropped — that's why long-lived connections send keepalives.</li>
          <li><strong>Cloud twist:</strong> your VPC's "NAT Gateway" is the same idea, billed per GB. 💸</li>
        </ul>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Routing is hop-by-hop: every router forwards toward the longest matching prefix, and BGP is how networks share those prefixes. NAT maps many private IPs onto one public IP via a port table — which is why inbound connections don't work without traversal tricks."
        </div>
      `,
    },
    {
      id: 'dns',
      group: 'Foundations',
      nav: '3 · DNS',
      title: 'DNS: the internet\u2019s phone book (and its cache)',
      lede: 'Before a single byte of your request goes anywhere, a name has to become a number. DNS is a globally distributed, aggressively cached, eventually consistent database — and a classic outage source.',
      html: `
        <p><span class='kicker'>DNS</span> translates <code>api.example.com</code> into an IP address. It's a distributed hierarchy read right-to-left: root (<code>.</code>) → TLD (<code>com</code>) → authoritative servers for <code>example.com</code>.</p>

        <h3>The resolution flow</h3>
        <div class='diagram'>
          <svg viewBox='0 0 640 240' width='640'>
            <defs><marker id='arrowD1' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='20' y='90' width='130' height='55' rx='8'/>
            <text class='node-text' x='85' y='114' text-anchor='middle'>Your app</text>
            <text class='node-sub' x='85' y='132' text-anchor='middle'>stub resolver</text>
            <line class='edge' x1='150' y1='117' x2='240' y2='117' marker-end='url(#arrowD1)'/>
            <rect class='node-box worker' x='245' y='90' width='160' height='55' rx='8'/>
            <text class='node-text' x='325' y='114' text-anchor='middle'>Recursive resolver</text>
            <text class='node-sub' x='325' y='132' text-anchor='middle'>ISP / 8.8.8.8 / 1.1.1.1</text>
            <line class='edge' x1='405' y1='100' x2='490' y2='45' marker-end='url(#arrowD1)'/>
            <line class='edge' x1='405' y1='117' x2='490' y2='117' marker-end='url(#arrowD1)'/>
            <line class='edge' x1='405' y1='135' x2='490' y2='190' marker-end='url(#arrowD1)'/>
            <rect class='node-box tool' x='495' y='20' width='130' height='45' rx='8'/>
            <text class='node-text' x='560' y='47' text-anchor='middle'>Root servers</text>
            <rect class='node-box tool' x='495' y='95' width='130' height='45' rx='8'/>
            <text class='node-text' x='560' y='122' text-anchor='middle'>.com TLD</text>
            <rect class='node-box tool' x='495' y='168' width='130' height='45' rx='8'/>
            <text class='node-text' x='560' y='188' text-anchor='middle'>Authoritative</text>
            <text class='node-sub' x='560' y='204' text-anchor='middle'>example.com NS</text>
          </svg>
          <div class='diagram-caption'>Your app asks a recursive resolver, which walks root → TLD → authoritative — then caches the answer.</div>
        </div>

        <ol>
          <li>Your app checks its own cache, then the OS cache, then asks a <strong>recursive resolver</strong>.</li>
          <li>The resolver (cache miss) asks a <strong>root server</strong>: "where's <code>.com</code>?"</li>
          <li>Then the <strong>TLD server</strong>: "where's <code>example.com</code>?"</li>
          <li>Then the <strong>authoritative server</strong>, which finally answers with an IP.</li>
          <li>Everyone caches the answer for the record's <span class='kicker'>TTL</span>.</li>
        </ol>

        <h3>Records you'll actually meet</h3>
        <table>
          <tr><th>Record</th><th>Maps to</th><th>Note</th></tr>
          <tr><td><code>A</code> / <code>AAAA</code></td><td>IPv4 / IPv6 address</td><td>The workhorses</td></tr>
          <tr><td><code>CNAME</code></td><td>Another name</td><td>Alias; can't live at a zone apex</td></tr>
          <tr><td><code>MX</code></td><td>Mail server</td><td>With priority numbers</td></tr>
          <tr><td><code>TXT</code></td><td>Arbitrary text</td><td>SPF, domain verification</td></tr>
          <tr><td><code>NS</code></td><td>Authoritative servers</td><td>Delegation glue</td></tr>
        </table>

        <h4>TTL & caching — the double-edged sword</h4>
        <p>Low TTL (30–60s) means fast failover but more lookup traffic; high TTL (hours) means cheap and fast but slow to change. Standard move before a migration: <strong>lower the TTL a day in advance</strong>, flip the record, raise it back.</p>

        <div class='callout danger'>
          <div class='c-title'>War story</div>
          "It's always DNS." 🔥 Half of the classic mega-outages trace back to DNS — a resolver overload, an expired domain, a bad record push. When a service is "down" but the servers look healthy, check name resolution <em>first</em>: <code>dig api.example.com</code>.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          Some runtimes cache DNS <em>forever by default</em> (old JVMs famously did). If your service holds a resolved IP while the target fails over to a new one, you'll keep hammering a dead address. Respect TTLs in long-lived processes.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "DNS is a cached, hierarchical lookup: stub resolver → recursive resolver → root → TLD → authoritative, with every hop caching for the TTL. It's eventually consistent by design — which is why record changes 'propagate' and why TTL strategy matters for failover."
        </div>
      `,
    },
    {
      id: 'tcp',
      group: 'Core Protocols',
      nav: '4 · TCP',
      title: 'TCP: handshakes, windows & why connections are expensive',
      lede: 'TCP turns an unreliable packet network into a reliable byte stream — at the cost of round trips, state, and some famous performance quirks.',
      html: `
        <p>IP makes zero promises: packets can be lost, duplicated, or reordered. <span class='kicker'>TCP</span> builds a reliable, ordered <strong>byte stream</strong> on top by numbering every byte, acknowledging receipt, and retransmitting what's missing. But reliability isn't free.</p>

        <h3>The three-way handshake 🤝</h3>
        <div class='diagram'>
          <svg viewBox='0 0 640 210' width='640'>
            <defs><marker id='arrowT1' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='40' y='20' width='120' height='40' rx='8'/>
            <text class='node-text' x='100' y='45' text-anchor='middle'>Client</text>
            <rect class='node-box worker' x='480' y='20' width='120' height='40' rx='8'/>
            <text class='node-text' x='540' y='45' text-anchor='middle'>Server</text>
            <line class='edge' x1='100' y1='60' x2='100' y2='200'/>
            <line class='edge' x1='540' y1='60' x2='540' y2='200'/>
            <line class='edge' x1='100' y1='85' x2='535' y2='105' marker-end='url(#arrowT1)'/>
            <text class='edge-label' x='320' y='85' text-anchor='middle'>SYN (seq=x)</text>
            <line class='edge' x1='540' y1='125' x2='105' y2='145' marker-end='url(#arrowT1)'/>
            <text class='edge-label' x='320' y='127' text-anchor='middle'>SYN-ACK (seq=y, ack=x+1)</text>
            <line class='edge' x1='100' y1='165' x2='535' y2='185' marker-end='url(#arrowT1)'/>
            <text class='edge-label' x='320' y='167' text-anchor='middle'>ACK (+ first data)</text>
          </svg>
          <div class='diagram-caption'>SYN → SYN-ACK → ACK. One full round trip before any application data flows.</div>
        </div>
        <p>That's <strong>1 RTT of pure ceremony</strong> before your HTTP request even leaves. On a 100ms link, every new connection donates 100ms to physics. Add TLS and it gets worse (next lessons).</p>

        <h3>Flow control vs congestion control</h3>
        <div class='two-col'>
          <div>
            <h4>Flow control</h4>
            <p>Protects the <strong>receiver</strong>. It advertises a <span class='kicker'>receive window</span> — "I have this much buffer left." Sender never exceeds it.</p>
          </div>
          <div>
            <h4>Congestion control</h4>
            <p>Protects the <strong>network</strong>. Sender probes capacity with a <span class='kicker'>congestion window</span>: start small (<em>slow start</em>, doubling each RTT), back off on packet loss. Algorithms: CUBIC (default), BBR (models bandwidth instead of reacting to loss).</p>
          </div>
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: slow start means new connections are cold</div>
          A fresh TCP connection can't use your full bandwidth — the congestion window starts around 10 packets (~14KB) and grows per RTT. That first page load crawls compared to a warm connection. This is a big reason connection reuse (keep-alive, pools) matters so much.
        </div>

        <h4>Why "connections are expensive" — the checklist</h4>
        <ul>
          <li>1 RTT handshake (plus 1–2 more for TLS).</li>
          <li>Slow start: cold congestion window.</li>
          <li>Kernel state per connection (buffers, timers) on both ends.</li>
          <li>Teardown leaves sockets in <code>TIME_WAIT</code> for ~60s — churn thousands of short connections and you can exhaust ephemeral ports.</li>
        </ul>
        <p>Hence the golden rule: <strong>reuse connections</strong>. HTTP keep-alive, database pools, gRPC channels — all the same instinct.</p>

        <div class='callout danger'>
          <div class='c-title'>War story</div>
          A service kept opening a new HTTP connection per request to an internal API. Under load: latency spikes, then errors — <code>EADDRNOTAVAIL</code>. Tens of thousands of <code>TIME_WAIT</code> sockets had eaten every ephemeral port. Fix: one keep-alive agent with a connection pool. Five-line change, outage over.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "TCP gives me an ordered, reliable byte stream via sequence numbers, ACKs, and retransmission. It costs a 1-RTT handshake, cold-start congestion windows, and per-connection state — which is exactly why connection pooling and keep-alive are performance table stakes."
        </div>
      `,
    },
    {
      id: 'udp',
      group: 'Core Protocols',
      nav: '5 · UDP',
      title: 'UDP: the fire-and-forget datagram',
      lede: 'UDP is what you get when you delete every guarantee from TCP and keep only ports. That turns out to be exactly what some workloads want.',
      html: `
        <p><span class='kicker'>UDP</span> adds precisely one thing to IP: <strong>ports</strong> (plus an optional checksum). No handshake, no ordering, no retransmission, no congestion control. You send a <strong>datagram</strong>; it arrives once, late, twice, or never. 🤷</p>

        <h3>Why would anyone want that?</h3>
        <ul>
          <li><strong>No connection setup.</strong> First packet carries data — perfect for tiny request/response like DNS.</li>
          <li><strong>No head-of-line blocking.</strong> A lost packet doesn't stall the ones behind it. For a video call, a stale frame is <em>worthless</em> — better to skip it than wait for a retransmit. TCP would insist on delivering it anyway.</li>
          <li><strong>You control the policy.</strong> Latency-sensitive apps implement their own recovery tuned to the domain (forward error correction, "just show the newest state").</li>
        </ul>

        <table>
          <tr><th></th><th>TCP</th><th>UDP</th></tr>
          <tr><td>Abstraction</td><td>Byte stream</td><td>Discrete datagrams</td></tr>
          <tr><td>Delivery</td><td>Reliable, ordered</td><td>Best effort</td></tr>
          <tr><td>Setup cost</td><td>1 RTT handshake</td><td>None</td></tr>
          <tr><td>Congestion control</td><td>Built in</td><td>Bring your own</td></tr>
          <tr><td>Typical users</td><td>HTTP/1–2, databases, SSH</td><td>DNS, video calls, games, QUIC</td></tr>
        </table>

        <div class='pattern-card'>
          <h4>Pattern: build reliability on top of UDP</h4>
          <p>The modern power move: take UDP's freedom and re-add exactly the guarantees you need in userspace. That's what <span class='kicker'>QUIC</span> does — reliability, ordering <em>per stream</em>, and congestion control, all over UDP, iterable without waiting a decade for kernels and middleboxes to update.</p>
          <div class='tag-row'><span class='tag use'>use when latency beats completeness</span><span class='tag use'>use when you need custom delivery semantics</span><span class='tag avoid'>avoid for bulk transfer where TCP is already ideal</span></div>
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          "UDP is faster than TCP" is sloppy. Per-packet they ride the same IP network at the same speed. UDP is faster <em>to start</em> (no handshake) and <em>under loss</em> (no forced retransmission stalls). For a long, clean bulk transfer, well-tuned TCP is just as fast.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "UDP is IP plus ports: no handshake, no ordering, no reliability. I'd reach for it when freshness beats completeness — DNS, real-time media, games — or as the substrate for a smarter protocol like QUIC that reimplements reliability in userspace."
        </div>
      `,
    },
    {
      id: 'tls',
      group: 'Core Protocols',
      nav: '6 · TLS',
      title: 'TLS & certificates: what the S in HTTPS buys you',
      lede: 'TLS gives you three promises — confidentiality, integrity, authenticity — using a clever mix of slow asymmetric crypto for the handshake and fast symmetric crypto for the data.',
      html: `
        <p><span class='kicker'>TLS</span> (the modern name for SSL) wraps a connection so that eavesdroppers see noise, tampering is detected, and you know you're talking to the real <code>example.com</code>. HTTPS = HTTP over TLS.</p>

        <h3>The handshake, conceptually</h3>
        <ol>
          <li><strong>ClientHello:</strong> "Here are the TLS versions and cipher suites I speak, plus my half of a key exchange." Includes <span class='kicker'>SNI</span> — the hostname in plaintext, so one IP can serve many sites.</li>
          <li><strong>ServerHello + certificate:</strong> the server picks parameters, sends its certificate, and its half of the key exchange.</li>
          <li><strong>Verify + derive:</strong> client validates the cert chain, both sides derive the same <strong>symmetric session key</strong> (ECDHE key exchange), and switch to fast symmetric encryption (AES-GCM / ChaCha20).</li>
        </ol>
        <p>TLS 1.3 squeezed this into <strong>1 RTT</strong> (TLS 1.2 took 2), and supports <strong>0-RTT resumption</strong> for repeat visitors. Still: a cold HTTPS connection = TCP handshake (1 RTT) + TLS (1 RTT) <em>before</em> the first request.</p>

        <h3>Certificates: the trust chain 🔗</h3>
        <p>A certificate binds a <strong>public key</strong> to a <strong>domain name</strong>, signed by a Certificate Authority. Your OS/browser ships with ~150 trusted <strong>root CAs</strong>; the server presents a chain: leaf cert → intermediate CA → (root already on your machine). Validation checks the signatures, the expiry dates, and that the hostname matches.</p>

        <div class='two-col'>
          <div>
            <h4>What TLS gives you</h4>
            <ul>
              <li><strong>Confidentiality</strong> — content is encrypted</li>
              <li><strong>Integrity</strong> — tampering is detected</li>
              <li><strong>Server authenticity</strong> — cert proves identity</li>
            </ul>
          </div>
          <div>
            <h4>What TLS does NOT give you</h4>
            <ul>
              <li>Hiding <em>which site</em> you visit (SNI, IP, DNS leak it)</li>
              <li>Client identity (unless you add mTLS)</li>
              <li>Safety from the server itself 😄</li>
            </ul>
          </div>
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: expired certs are a top-tier outage class</div>
          Certificates expire (Let's Encrypt: 90 days — by design, to force automation). A forgotten renewal takes the whole service down with scary browser warnings. Automate renewal and monitor expiry like you monitor disk space. Debug with: <code>openssl s_client -connect host:443 -servername host</code>.
        </div>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          Asymmetric crypto (RSA/ECDSA) is ~1000x slower than symmetric (AES), so TLS uses it only for the handshake — to authenticate and agree on a key — then everything else is symmetric. "Expensive handshake, cheap steady state."
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "TLS uses asymmetric crypto once — to verify the server's cert chain and agree on a session key — then symmetric encryption for all data. TLS 1.3 does it in 1 RTT. It buys confidentiality, integrity, and server authenticity; it does not hide which host you're talking to."
        </div>
      `,
    },
    {
      id: 'http-versions',
      group: 'The Web Stack',
      nav: '7 · HTTP 1→3',
      title: 'HTTP/1.1 vs HTTP/2 vs HTTP/3: a war on head-of-line blocking',
      lede: 'Three generations of HTTP, one recurring villain: something in the pipeline making everything behind it wait.',
      html: `
        <p>HTTP semantics (methods, headers, status codes) barely changed in 25 years. What changed is the <strong>transport layer</strong> — each version attacks a different flavor of <span class='kicker'>head-of-line (HOL) blocking</span>.</p>

        <h3>HTTP/1.1 (1997): one request at a time</h3>
        <p>Text protocol. On each connection, requests are strictly sequential: send one, wait for the full response, send the next. A slow response blocks everything behind it. Browsers coped by opening <strong>~6 parallel connections per host</strong>, and the era's hacks were born: sprite sheets, bundling, domain sharding.</p>

        <h3>HTTP/2 (2015): multiplexed streams</h3>
        <p>Binary framing. Many concurrent <strong>streams</strong> interleave on <em>one</em> TCP connection — a slow API call no longer blocks the CSS. Plus header compression (HPACK) and stream priorities. One connection per origin, fully utilized.</p>

        <div class='callout warn'>
          <div class='c-title'>The catch: TCP HOL blocking</div>
          HTTP/2 fixed HOL blocking at the HTTP layer but inherited it at the TCP layer. TCP is one ordered byte stream — lose a single packet and <strong>every</strong> stream stalls until the retransmit arrives, even streams whose data already arrived. On lossy networks (mobile!), HTTP/2 can be <em>worse</em> than 6 separate HTTP/1.1 connections.
        </div>

        <h3>HTTP/3 (2022): QUIC, goodbye TCP</h3>
        <p><span class='kicker'>QUIC</span> rebuilds the transport over <strong>UDP</strong>: streams are independent at the transport level, so a lost packet stalls only its own stream. TLS 1.3 is fused into the handshake — <strong>1 RTT cold start</strong> (vs 2–3 for TCP+TLS), 0-RTT resumption. Bonus: <strong>connection migration</strong> — switch from Wi-Fi to cellular and the connection survives, because it's identified by a connection ID, not the IP/port 4-tuple.</p>

        <table>
          <tr><th></th><th>HTTP/1.1</th><th>HTTP/2</th><th>HTTP/3</th></tr>
          <tr><td>Transport</td><td>TCP</td><td>TCP</td><td>QUIC (UDP)</td></tr>
          <tr><td>Concurrency</td><td>1 per connection (×6 conns)</td><td>Multiplexed streams</td><td>Independent streams</td></tr>
          <tr><td>HOL blocking</td><td>At HTTP layer</td><td>At TCP layer</td><td>Per-stream only</td></tr>
          <tr><td>Cold start (with TLS 1.3)</td><td>2 RTT</td><td>2 RTT</td><td>1 RTT</td></tr>
          <tr><td>Wire format</td><td>Text</td><td>Binary</td><td>Binary, encrypted</td></tr>
        </table>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          You rarely choose this yourself: terminate HTTP/2 and HTTP/3 at your CDN or load balancer, and speak boring HTTP/1.1 or h2 to your backends. The win is on the high-latency, lossy last mile — not inside your datacenter.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Each HTTP version kills a head-of-line blocking problem: 1.1 serializes requests, 2 multiplexes streams over one TCP connection but inherits TCP's packet-loss stalls, and 3 moves to QUIC over UDP so streams are independent — plus a 1-RTT handshake and connection migration."
        </div>
      `,
    },
    {
      id: 'realtime',
      group: 'The Web Stack',
      nav: '8 · Real-time',
      title: 'WebSockets, SSE & polling: pushing data to clients',
      lede: 'HTTP is request/response — the client always speaks first. Four patterns exist to fake or fix that, and picking the right one is a classic system design question.',
      html: `
        <p>The server has news (a chat message, a price tick). How does it reach the browser? 📣</p>

        <div class='pattern-card'>
          <h4>Short polling</h4>
          <p>Client asks "anything new?" every N seconds. Trivially simple, works everywhere. Latency ≈ polling interval; mostly-empty responses waste requests.</p>
          <div class='tag-row'><span class='tag use'>updates are rare & staleness is fine</span><span class='tag avoid'>low latency needed</span></div>
        </div>

        <div class='pattern-card'>
          <h4>Long polling</h4>
          <p>Client asks; server <strong>holds the request open</strong> until data exists (or timeout), responds, client immediately re-asks. Near-instant delivery over plain HTTP. Historically the fallback when WebSockets were blocked.</p>
          <div class='tag-row'><span class='tag use'>need push through strict proxies</span><span class='tag avoid'>high-frequency updates (reconnect churn)</span></div>
        </div>

        <div class='pattern-card'>
          <h4>Server-Sent Events (SSE)</h4>
          <p>One long-lived HTTP response streaming <code>text/event-stream</code>. <strong>One-way, server→client</strong>, text only. Built-in auto-reconnect with <code>Last-Event-ID</code>. It's plain HTTP, so proxies, LBs, and HTTP/2 all just work. This is what LLM chat UIs use to stream tokens. ✨</p>
          <div class='tag-row'><span class='tag use'>one-way feeds: notifications, tickers, LLM streaming</span><span class='tag avoid'>client needs to send frequently</span></div>
        </div>

        <div class='pattern-card'>
          <h4>WebSockets</h4>
          <p>Starts as HTTP, then an <code>Upgrade: websocket</code> handshake switches to a <strong>persistent, bidirectional, message-framed</strong> connection. Lowest latency, full duplex. Cost: it's no longer HTTP — you own keepalives (ping/pong), reconnection logic, and horizontal scaling gets spicy (sticky sessions or a pub/sub backplane like Redis so any node can reach any client).</p>
          <div class='tag-row'><span class='tag use'>chat, multiplayer, collaborative editing</span><span class='tag avoid'>one-way flow — SSE is simpler</span></div>
        </div>

        <table>
          <tr><th></th><th>Direction</th><th>Latency</th><th>Ops complexity</th></tr>
          <tr><td>Short polling</td><td>Client pulls</td><td>Seconds</td><td>None</td></tr>
          <tr><td>Long polling</td><td>Server pushes (hack)</td><td>Low</td><td>Low</td></tr>
          <tr><td>SSE</td><td>Server → client</td><td>Low</td><td>Low</td></tr>
          <tr><td>WebSocket</td><td>Both ways</td><td>Lowest</td><td>High (stateful conns)</td></tr>
        </table>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          Long-lived connections meet infrastructure timeouts: LBs and proxies kill idle connections (often at 60s). WebSocket apps need heartbeats; SSE needs periodic comments (<code>: ping</code>). And every held connection consumes server memory — 100k WebSocket clients is a capacity-planning exercise, not a footnote.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "My decision tree: rare updates → polling; one-way stream → SSE, because it's plain HTTP and auto-reconnects; truly bidirectional and latency-critical → WebSockets, accepting the stateful-connection scaling cost."
        </div>
      `,
    },
    {
      id: 'lb-proxy-cdn',
      group: 'The Web Stack',
      nav: '9 · LB & CDN',
      title: 'Load balancers, proxies & CDNs: the middleboxes',
      lede: 'Between the browser and your code sits a chain of machines pretending to be each other. Learn who they are and what they intercept.',
      html: `
        <p>Three roles, one family: they all sit in the middle of a connection and forward traffic. The differences are <em>direction</em> and <em>layer</em>.</p>

        <h3>Forward proxy vs reverse proxy</h3>
        <div class='two-col'>
          <div>
            <h4>Forward proxy</h4>
            <p>Sits in front of <strong>clients</strong>, on their behalf. Corporate egress filters, VPN-ish setups. The server sees the proxy's IP.</p>
          </div>
          <div>
            <h4>Reverse proxy</h4>
            <p>Sits in front of <strong>servers</strong>. Clients think it IS the server. nginx, Envoy, HAProxy. Does TLS termination, compression, caching, routing, rate limiting.</p>
          </div>
        </div>

        <h3>Load balancers: L4 vs L7</h3>
        <table>
          <tr><th></th><th>L4 (transport)</th><th>L7 (application)</th></tr>
          <tr><td>Sees</td><td>IPs and ports</td><td>Full HTTP: path, headers, cookies</td></tr>
          <tr><td>Can route on</td><td>Connection only</td><td><code>/api/*</code> → service A, header-based canary</td></tr>
          <tr><td>TLS</td><td>Passes through</td><td>Usually terminates it</td></tr>
          <tr><td>Speed</td><td>Faster, dumber</td><td>Slower, smarter</td></tr>
          <tr><td>Examples</td><td>AWS NLB</td><td>AWS ALB, nginx, Envoy</td></tr>
        </table>
        <p>Common algorithms: <strong>round robin</strong>, <strong>least connections</strong>, <strong>consistent hashing</strong> (for cache-friendly stickiness). Plus <strong>health checks</strong> — arguably the LB's most important job: stop sending traffic to a dying node.</p>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: who is the client?</div>
          Once a reverse proxy terminates the connection, your app sees the <em>proxy's</em> IP. The real client IP arrives in <code>X-Forwarded-For</code> — a header anyone can spoof unless your edge strips/overwrites it. Rate-limiting on unvalidated XFF is a classic security hole.
        </div>

        <h3>CDNs: reverse proxies scattered across the planet 🌍</h3>
        <p>A <span class='kicker'>CDN</span> (Cloudflare, CloudFront, Fastly) is a global fleet of caching reverse proxies. DNS/anycast steers each user to the nearest <strong>edge PoP</strong>, which serves cached content or fetches from your <strong>origin</strong> on a miss. Controlled by <code>Cache-Control</code> headers (<code>max-age</code>, <code>s-maxage</code>, <code>stale-while-revalidate</code>).</p>
        <ul>
          <li><strong>Static assets:</strong> cache aggressively with hashed filenames (<code>app.3f9c.js</code>) — immutable, cache for a year.</li>
          <li><strong>Even uncacheable APIs win:</strong> users do TCP+TLS handshakes with a nearby edge (~10ms RTT instead of ~150ms), and the CDN keeps warm connections to your origin.</li>
          <li><strong>Bonus:</strong> DDoS absorption, TLS at the edge, HTTP/3 support for free.</li>
        </ul>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "L4 balances connections on IP+port; L7 understands HTTP and can route on path or headers, usually terminating TLS. A CDN is the same reverse-proxy idea distributed to the edge — it cuts latency even for dynamic traffic because handshakes happen close to the user."
        </div>
      `,
    },
    {
      id: 'debugging',
      group: 'Operations & Recap',
      nav: '10 · Debugging',
      title: 'Debugging the network: curl, dig, traceroute & tcpdump',
      lede: 'When "the service is down," a senior engineer bisects the stack: name resolution → reachability → TLS → HTTP. Four tools cover 95% of it.',
      html: `
        <p>Network debugging is layer bisection. Work bottom-up or top-down, but be <em>systematic</em> — each tool isolates one layer. 🔬</p>

        <h3>dig — is DNS lying?</h3>
        <pre><code>dig api.example.com                 # A record via your resolver
dig api.example.com @8.8.8.8        # bypass local resolver
dig +short CNAME www.example.com    # just the answer
dig +trace example.com              # walk root → TLD → authoritative</code></pre>
        <p>Compare your resolver's answer to the authoritative one — mismatches mean stale caches. Check the TTL countdown in the answer.</p>

        <h3>curl — the HTTP Swiss Army knife</h3>
        <pre><code>curl -v https://api.example.com/health      # verbose: DNS, TCP, TLS, headers
curl -sS -o /dev/null -w '%{http_code} dns:%{time_namelookup} connect:%{time_connect} tls:%{time_appconnect} total:%{time_total}\n' https://api.example.com
curl --resolve api.example.com:443:10.0.0.5 https://api.example.com/   # test a specific backend, bypassing DNS</code></pre>
        <p>That <code>-w</code> timing breakdown is gold: it tells you whether the slowness is DNS, TCP connect, TLS, or the server itself.</p>

        <h3>traceroute / mtr — where does the path break?</h3>
        <p>Sends packets with increasing TTL (1, 2, 3…); each router that decrements TTL to zero replies with an ICMP "time exceeded," revealing itself. <code>mtr</code> runs it continuously with per-hop loss stats.</p>
        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          A hop showing <code>* * *</code> isn't necessarily broken — many routers just don't reply to traceroute probes. Only trust loss that <em>persists to the final hop</em>.
        </div>

        <h3>tcpdump — the ground truth</h3>
        <pre><code>sudo tcpdump -i any port 443 and host 10.0.0.5   # capture matching packets
sudo tcpdump -i any -w capture.pcap port 8080     # save for Wireshark
sudo tcpdump -i any 'tcp[tcpflags] & tcp-syn != 0'  # handshakes only</code></pre>
        <p>When logs and metrics disagree, packets don't lie. Seeing SYNs with no SYN-ACK = the far side (or a firewall) is dropping you. Seeing retransmissions = loss. Capture to a <code>.pcap</code> and read it in Wireshark.</p>

        <h4>Honorable mentions</h4>
        <ul>
          <li><code>ss -tlnp</code> — what's listening on which port (modern netstat).</li>
          <li><code>nc -vz host 5432</code> — "can I even open a TCP connection to that port?"</li>
          <li><code>openssl s_client -connect host:443 -servername host</code> — inspect the cert chain.</li>
        </ul>

        <div class='callout danger'>
          <div class='c-title'>War story</div>
          "API is flaky" — but only for some pods. <code>curl -w</code> showed <code>time_connect</code> fine, <code>time_appconnect</code> huge. <code>openssl s_client</code> revealed one backend behind the LB was serving an expired cert after a botched rollout. Health checks (plain TCP) saw nothing wrong. Lesson: health-check the same layer your clients use.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "I bisect by layer: dig for name resolution, nc or traceroute for reachability, openssl s_client for TLS, curl -v with timing for HTTP — and tcpdump when I need ground truth about what's actually on the wire."
        </div>
      `,
    },
    {
      id: 'latency',
      group: 'Operations & Recap',
      nav: '11 · Latency',
      title: 'Latency numbers every engineer should know',
      lede: 'You cannot out-engineer the speed of light. Internalize a handful of orders of magnitude and half of system design becomes arithmetic.',
      html: `
        <p>Jeff Dean's classic "numbers everyone should know," networking edition. The exact values drift; the <strong>orders of magnitude</strong> don't. 📏</p>

        <table>
          <tr><th>Operation</th><th>Time</th><th>Perspective</th></tr>
          <tr><td>L1 cache reference</td><td>~1 ns</td><td>baseline</td></tr>
          <tr><td>Main memory reference</td><td>~100 ns</td><td>100x cache</td></tr>
          <tr><td>Send 1KB over 10 Gbps</td><td>~1 µs</td><td>bandwidth is rarely the problem</td></tr>
          <tr><td>SSD random read</td><td>~100 µs</td><td>1000x memory</td></tr>
          <tr><td><strong>RTT within a datacenter</strong></td><td><strong>~0.5 ms</strong></td><td>microservice hop</td></tr>
          <tr><td><strong>RTT same continent</strong></td><td><strong>~20–60 ms</strong></td><td>user → nearest region</td></tr>
          <tr><td><strong>RTT across an ocean (e.g. US↔EU)</strong></td><td><strong>~80–100 ms</strong></td><td>physics, not engineering</td></tr>
          <tr><td><strong>RTT halfway around the world</strong></td><td><strong>~150–300 ms</strong></td><td>humans notice this</td></tr>
        </table>

        <h3>Latency vs bandwidth — stop conflating them</h3>
        <p><span class='kicker'>Latency</span> is how long one bit takes to arrive; <span class='kicker'>bandwidth</span> is how many bits per second flow once moving. A truck full of hard drives has phenomenal bandwidth and terrible latency. 🚚 Most web slowness is <strong>latency × round trips</strong>, not bandwidth.</p>

        <h4>Do the math on a cold HTTPS request (150ms RTT)</h4>
        <ul>
          <li>DNS lookup: ~1 RTT (if not cached) → 150ms</li>
          <li>TCP handshake: 1 RTT → 150ms</li>
          <li>TLS 1.3: 1 RTT → 150ms</li>
          <li>HTTP request/response: 1 RTT → 150ms</li>
        </ul>
        <p><strong>~600ms before you count any server time.</strong> Now you see why the industry is obsessed with connection reuse, CDNs (shrink the RTT), QUIC (fewer RTTs), and caching (zero RTTs).</p>

        <div class='callout good'>
          <div class='c-title'>Rules of thumb</div>
          <ul>
            <li>Count <strong>round trips</strong>, not bytes, for anything under ~100KB.</li>
            <li>Every sequential microservice hop adds ~0.5–1ms in-DC — chains of 10 add up; fan out in parallel.</li>
            <li>~100ms feels instant to users; ~1s breaks flow; ~10s loses them.</li>
            <li>Speed of light in fiber ≈ 200,000 km/s → ~1ms per 100km, one way. You can compute the theoretical floor for any route.</li>
          </ul>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "My anchors: ~0.5ms RTT inside a datacenter, ~50ms cross-country, ~150ms intercontinental. A cold HTTPS request burns 3–4 RTTs before any server work — so I optimize by cutting round trips: keep-alive, CDNs, caching, and QUIC."
        </div>
      `,
    },
    {
      id: 'cheatsheet',
      group: 'Operations & Recap',
      nav: '12 · Cheat sheet',
      title: 'Cheat sheet & rapid-fire interview Q&A',
      lede: 'The whole course compressed into soundbites. Skim this the morning of the interview. ☕',
      html: `
        <h3>The one-liner per topic</h3>
        <ul>
          <li><strong>Layers:</strong> Link → IP → TCP/UDP → app. L4 = ports, L7 = HTTP. OSI is vocabulary, TCP/IP is reality.</li>
          <li><strong>Routing:</strong> hop-by-hop longest-prefix matching; BGP shares prefixes between networks.</li>
          <li><strong>NAT:</strong> many private IPs behind one public IP via a port-mapping table; inbound needs traversal (STUN/TURN).</li>
          <li><strong>DNS:</strong> cached hierarchy: stub → recursive → root → TLD → authoritative. TTL controls the failover/traffic trade-off.</li>
          <li><strong>TCP:</strong> reliable ordered byte stream; 3-way handshake (1 RTT); flow control protects the receiver, congestion control protects the network; slow start makes new connections cold.</li>
          <li><strong>UDP:</strong> IP + ports, nothing else. For freshness-over-completeness workloads and as QUIC's substrate.</li>
          <li><strong>TLS:</strong> asymmetric crypto to authenticate + agree on a key (1 RTT in 1.3), symmetric for data. Certs chain leaf → intermediate → trusted root.</li>
          <li><strong>HTTP evolution:</strong> 1.1 serial → 2 multiplexed over TCP (TCP HOL remains) → 3 independent streams over QUIC/UDP.</li>
          <li><strong>Real-time:</strong> polling &lt; long-poll &lt; SSE (one-way) &lt; WebSocket (bidirectional, stateful scaling cost).</li>
          <li><strong>Middleboxes:</strong> reverse proxy fronts servers; L4 LB routes connections, L7 routes requests; CDN = global caching reverse proxies.</li>
          <li><strong>Debugging:</strong> dig → nc/traceroute → openssl s_client → curl -v → tcpdump. Bisect by layer.</li>
          <li><strong>Latency:</strong> ~0.5ms in-DC, ~50ms cross-country, ~150ms intercontinental. Count round trips, not bytes.</li>
        </ul>

        <h3>Rapid-fire Q&A 🔥</h3>
        <table>
          <tr><th>Question</th><th>Answer</th></tr>
          <tr><td>What happens when you type a URL and hit Enter?</td><td>DNS resolves the name → TCP handshake (or QUIC) → TLS handshake → HTTP request → response rendered. Caches can short-circuit every step.</td></tr>
          <tr><td>Why is TCP slow to start?</td><td>1-RTT handshake plus slow start: the congestion window begins ~10 packets and grows per RTT.</td></tr>
          <tr><td>TCP vs UDP in one line?</td><td>TCP: reliable ordered stream with handshake. UDP: fire-and-forget datagrams with just ports.</td></tr>
          <tr><td>What problem does HTTP/2 leave unsolved?</td><td>TCP-level head-of-line blocking — one lost packet stalls all multiplexed streams.</td></tr>
          <tr><td>Why UDP for HTTP/3?</td><td>QUIC needed independent streams and a fused TLS handshake; evolving TCP in kernels/middleboxes is glacial, UDP is a clean slate.</td></tr>
          <tr><td>What does a TLS cert actually prove?</td><td>That a CA your OS trusts vouches this public key belongs to this hostname.</td></tr>
          <tr><td>SSE vs WebSocket?</td><td>SSE: one-way server→client over plain HTTP, auto-reconnect, simple. WebSocket: bidirectional, lowest latency, stateful scaling burden.</td></tr>
          <tr><td>L4 vs L7 load balancer?</td><td>L4 sees IP+port and forwards connections; L7 parses HTTP and routes per request (paths, headers), usually terminating TLS.</td></tr>
          <tr><td>Why do idle connections die?</td><td>NAT tables and LB/proxy idle timeouts drop the mapping — that's what keepalives/heartbeats prevent.</td></tr>
          <tr><td>Service is 'down', servers look fine — first check?</td><td>DNS. It's always DNS. <code>dig</code> the name, compare resolvers, check TTLs.</td></tr>
          <tr><td>Where did 600ms go on a cold request?</td><td>DNS + TCP + TLS + request ≈ 4 RTTs. At 150ms RTT that's 600ms before any server time.</td></tr>
          <tr><td>How does traceroute work?</td><td>Probes with incrementing TTLs; each router that zeroes the TTL sends back ICMP time-exceeded, exposing the path.</td></tr>
        </table>

        <div class='callout good'>
          <div class='c-title'>The meta-soundbite</div>
          "Networking performance is mostly the art of eliminating round trips, and networking reliability is mostly the art of respecting caches and timeouts you don't control."
        </div>
      `,
    },
  ],
  quizzes: [
    {
      question: 'A load balancer routes requests to different backends based on the URL path (/api → service A, /static → service B). What layer is it operating at?',
      options: [
        { text: 'Layer 3 — it inspects IP addresses to make the decision', correct: false },
        { text: 'Layer 4 — path routing is a TCP feature', correct: false },
        { text: 'Layer 7 — it must parse HTTP to see the path', correct: true },
      ],
      explain: 'URL paths only exist inside HTTP, an application-layer protocol. An L4 balancer sees only IPs and ports; routing on paths or headers requires an L7 (application-aware) balancer.',
    },
    {
      question: 'Your service resolved a dependency\u2019s IP at startup and cached it indefinitely. The dependency fails over to new IPs. What happens?',
      options: [
        { text: 'Nothing — TCP automatically re-resolves DNS on connection failure', correct: false },
        { text: 'Your service keeps connecting to the dead IP until it re-resolves; ignoring the TTL broke failover', correct: true },
        { text: 'The recursive resolver pushes the updated record to your service', correct: false },
      ],
      explain: 'DNS is pull-based and cache-driven: nothing pushes updates to you, and TCP knows nothing about names. Long-lived processes must re-resolve and respect TTLs, or DNS-based failover silently fails.',
    },
    {
      question: 'Why does a brand-new TCP connection transfer data slower than a warm, established one — even on a perfect network?',
      options: [
        { text: 'Because slow start begins with a small congestion window (~10 packets) and grows it per RTT', correct: true },
        { text: 'Because the receiver\u2019s buffer starts empty and needs time to allocate', correct: false },
        { text: 'Because routers rate-limit packets from unknown connections', correct: false },
      ],
      explain: 'TCP congestion control probes network capacity from a deliberately small initial window, roughly doubling each round trip. A warm connection has already grown its window — one big reason keep-alive and connection pooling matter.',
    },
    {
      question: 'In TLS, why is asymmetric (public-key) cryptography used only during the handshake and not for the actual data?',
      options: [
        { text: 'Asymmetric crypto can only encrypt small messages like certificates', correct: false },
        { text: 'It is roughly 1000x slower than symmetric crypto, so it\u2019s used once to authenticate and agree on a symmetric session key', correct: true },
        { text: 'Browsers only support symmetric ciphers for HTTP payloads', correct: false },
      ],
      explain: 'Public-key operations are computationally expensive. TLS uses them once — to verify the certificate and perform key exchange — then switches to fast symmetric encryption (like AES-GCM) for all application data.',
    },
    {
      question: 'HTTP/2 multiplexes many streams over one TCP connection. On a lossy mobile network, why can it perform WORSE than HTTP/1.1 with six connections?',
      options: [
        { text: 'HPACK header compression corrupts easily under packet loss', correct: false },
        { text: 'One lost TCP packet stalls ALL multiplexed streams (TCP head-of-line blocking); with six separate connections, loss stalls only one', correct: true },
        { text: 'HTTP/2\u2019s binary framing requires more retransmissions than text', correct: false },
      ],
      explain: 'TCP delivers one strictly ordered byte stream, so a single lost packet blocks everything behind it — including streams whose packets already arrived. HTTP/3 fixes this with QUIC\u2019s independent streams.',
    },
    {
      question: 'You need to stream LLM-generated tokens from server to browser. The client only sends one initial request. What\u2019s the most appropriate transport?',
      options: [
        { text: 'WebSockets — always the best choice for streaming', correct: false },
        { text: 'Short polling every 100ms for new tokens', correct: false },
        { text: 'Server-Sent Events — one-way server→client streaming over plain HTTP with built-in reconnect', correct: true },
      ],
      explain: 'The flow is strictly one-directional after the initial request, which is exactly SSE\u2019s design. It rides plain HTTP (proxies and LBs just work) and auto-reconnects — WebSockets add bidirectional capability and stateful scaling costs you don\u2019t need here.',
    },
    {
      question: 'A user in Sydney hits your us-east-1 API (RTT ~200ms) over a cold HTTPS connection using TCP + TLS 1.3. Roughly how long before the server even starts processing, ignoring DNS?',
      options: [
        { text: '~200ms — one round trip carries the request', correct: false },
        { text: '~600ms — TCP handshake + TLS handshake + the request itself is ~3 RTTs', correct: true },
        { text: '~50ms — handshakes happen in parallel with the request', correct: false },
      ],
      explain: 'Cold start costs: TCP handshake (1 RTT) + TLS 1.3 (1 RTT) + sending the request (1 RTT to arrive) ≈ 3 × 200ms. This round-trip math is why CDNs terminate connections near users and why QUIC merges the handshakes.',
    },
  ],
};
