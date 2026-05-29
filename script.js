const year = document.getElementById("year");
const connectBtn = document.getElementById("connectBtn");
const verifyBtn = document.getElementById("verifyBtn");
const gateHint = document.getElementById("gateHint");
const lockedCard = document.getElementById("lockedCard");

if (year) year.textContent = String(new Date().getFullYear());

// --- Hero background shader (CodePen: Neon Strings v2) ---
function startHeroShader() {
  const canvas = document.getElementById("glCanvas");
  if (!canvas) return;
  const host = canvas.closest(".hero");
  if (!host) return;

  const gl = canvas.getContext("webgl2", { antialias: false, alpha: true });
  if (!gl) {
    // If WebGL2 isn't supported, just hide the canvas and keep the site usable.
    canvas.style.display = "none";
    return;
  }

  const vertexShaderSource = `#version 300 es
in vec4 aPosition;
void main() {
    gl_Position = aPosition;
}`;

  const fragmentShaderSource = `#version 300 es
precision highp float;

uniform vec3 iResolution;
uniform float iTime;
uniform vec4 iMouse;
out vec4 fragColor;

vec4 getMainImage(vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec4 o = vec4(0.0);
    float t = 4.0 * iTime;
    vec3 p;

    float z = 0.0;
    float d = 0.0;

    for (int i = 0; i < 80; i++) {
        p = z * normalize(vec3(uv, 0.95));
        p.z += t;

        float len = length(p.xy);
        float swirl = 0.1 * sin(len - t * 0.5);
        mat2 rot = mat2(cos(swirl), -sin(swirl),
                        sin(swirl),  cos(swirl));
        p.xy *= rot;

        vec4 angle = vec4(0.0, 33.0, 11.0, 0.0);
        vec4 a = -z * 0.3 + -t * 0.2 + angle;
        p.xy *= mat2(cos(a.x), -sin(a.x),
                     sin(a.x),  cos(a.x));

        d = length(cos(p + cos(p.yzx + p.z - t * 0.2)).xy) / 5.0;
        z += d;

        o += (sin(p.x + t + vec4(0.0, 2.0, 3.0, 0.0)) + 0.8) / d;
    }

    o = 2.0 * tanh(o / 6000.0);
    return vec4(o.rgb, 1.0);
}

vec4 getMainImage2(vec2 o) {
    float d = 0.0;
    float t = iTime;
    vec4 color = vec4(0.0);

    for (int i = 0; i < 50; i++) {
        vec3 p = d * normalize(vec3(o + o, 0.0) - vec3(iResolution.x, iResolution.y, iResolution.y));
        p.z -= t;

        float s = 0.1;
        for (int j = 0; j < 10; j++) {
            p -= dot(cos(t + p * s * 16.0), vec3(0.01)) / s;
            p += sin(p.yzx * 3.0) * 0.3;
            s *= 0.9;
            if (s > 2.0) break;
        }

        s = 0.02 + abs(3.0 - length(p.yx)) * 0.3;
        d += s;

        color += (0.1 + cos(d + vec4(4.0, 2.0, 1.0, 0.0))) / s;
    }

    return tanh(color / 500.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    fragColor = mix(
        getMainImage(fragCoord),
        getMainImage2(fragCoord),
        0.5
    );
}

void main() {
    vec4 c;
    mainImage(c, gl_FragCoord.xy);

    // Retint to Block Futures neon-yellow theme
    float luma = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    vec3 neon = vec3(0.984, 0.910, 0.129);
    vec3 yellowized = luma * neon * 1.55;
    vec3 outCol = mix(c.rgb, yellowized, 0.88);
    fragColor = vec4(outCol, 1.0);
}
`;

  function createShader(type, source) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createProgram(vs, fs) {
    const program = gl.createProgram();
    if (!program) return null;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  const vs = createShader(gl.VERTEX_SHADER, vertexShaderSource);
  const fs = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
  if (!vs || !fs) {
    canvas.style.display = "none";
    return;
  }

  const program = createProgram(vs, fs);
  if (!program) {
    canvas.style.display = "none";
    return;
  }

  const positionAttributeLocation = gl.getAttribLocation(program, "aPosition");
  const resolutionUniformLocation = gl.getUniformLocation(program, "iResolution");
  const timeUniformLocation = gl.getUniformLocation(program, "iTime");
  const mouseUniformLocation = gl.getUniformLocation(program, "iMouse");

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  gl.useProgram(program);
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  let mouseX = 0;
  let mouseY = 0;

  function setMouse(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = rect.height - (e.clientY - rect.top);
  }
  host.addEventListener("pointermove", setMouse, { passive: true });

  function resize() {
    const rect = host.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  let raf = 0;
  let running = false;
  function render(t) {
    if (!running) return;
    gl.uniform3f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height, 1.0);
    gl.uniform1f(timeUniformLocation, t * 0.001);
    gl.uniform4f(mouseUniformLocation, mouseX, mouseY, 0.0, 0.0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(render);
  }

  function start() {
    if (running) return;
    running = true;
    canvas.style.display = "";
    resize();
    raf = requestAnimationFrame(render);
  }

  function stop() {
    if (!running) return;
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    // Hiding the canvas helps GPU/paint cost on scroll
    canvas.style.display = "none";
  }

  // Pause rendering when hero is out of view (fixes scroll lag)
  const io = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry) return;
      if (entry.isIntersecting) start();
      else stop();
    },
    { root: null, threshold: 0.08 }
  );
  io.observe(host);

  // Set initial state immediately (avoid rendering off-screen on load)
  const rect = host.getBoundingClientRect();
  const visible = rect.bottom > 0 && rect.top < (window.innerHeight || 1);
  if (visible) start();
  else stop();

  // Also stop when tab is hidden
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) stop();
      else {
        // If hero is visible again, IntersectionObserver will start it
        // but if we became visible while already intersecting, kick once.
        const rect = host.getBoundingClientRect();
        const visible = rect.bottom > 0 && rect.top < (window.innerHeight || 1);
        if (visible) start();
      }
    },
    { passive: true }
  );

  // Rendering is started/stopped by the IntersectionObserver.
}

// --- PnL card animation (number + bar drift) ---
function startPnl() {
  const cards = Array.from(document.querySelectorAll(".pnlCard"));
  if (cards.length === 0) return;

  function fmt(n) {
    const sign = n >= 0 ? "+" : "-";
    const v = Math.abs(n);
    return `${sign}$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const state = cards.map((el) => {
    const seed = el.getAttribute("data-seed") || "x";
    const base =
      seed === "a" ? 1200 + Math.random() * 600 : seed === "b" ? -(180 + Math.random() * 380) : 60 + Math.random() * 140;
    const pnlEl = el.querySelector("[data-pnl]");
    const fill = el.querySelector(".pnlCard__fill");
    const neg = pnlEl?.classList.contains("pnlCard__pnl--neg");
    const markEl = el.querySelector("[data-mark]");
    const roiEl = el.querySelector("[data-roi]");
    const liqEl = el.querySelector("[data-liq]");
    const fundingEl = el.querySelector("[data-funding]");
    const entryText = el.querySelector("[data-entry]");
    const entry = entryText?.textContent?.match(/([\d.,]+)/)?.[1]?.replace(/,/g, "") ?? null;
    const entryNum = entry ? Number(entry) : 67420;
    return {
      el,
      pnlEl,
      fill,
      pnl: base,
      target: base,
      isNeg: Boolean(neg),
      entry: Number.isFinite(entryNum) ? entryNum : 67420,
      markEl,
      roiEl,
      liqEl,
      fundingEl,
      mark: (Number.isFinite(entryNum) ? entryNum : 67420) * (1 + (Math.random() - 0.5) * 0.01),
    };
  });

  function retarget() {
    for (const s of state) {
      const noise = (Math.random() - 0.5) * (s.isNeg ? 220 : 420);
      s.target = s.pnl + noise;
      if (s.isNeg) s.target = Math.min(-20, s.target);
      if (!s.isNeg) s.target = Math.max(20, s.target);
    }
  }

  retarget();
  setInterval(retarget, 1400);

  function fmtNum(n, digits = 1) {
    return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function step() {
    for (const s of state) {
      s.pnl += (s.target - s.pnl) * 0.05;
      if (s.pnlEl) s.pnlEl.textContent = fmt(s.pnl);
      if (s.fill) {
        const p = Math.max(0.06, Math.min(0.94, Math.abs(s.pnl) / (s.isNeg ? 1200 : 2400)));
        s.fill.style.setProperty("--p", String(p));
      }

      // Derived HUD values (small drift; card does not move)
      s.mark += (Math.random() - 0.5) * 4.2;
      if (s.markEl) s.markEl.textContent = fmtNum(s.mark, 1);

      const roi = (s.pnl / 3200) * 100; // margin demo aligns with markup ($3,200)
      if (s.roiEl) {
        s.roiEl.textContent = `${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%`;
        s.roiEl.classList.toggle("pnlDatum__v--pos", roi >= 0);
        s.roiEl.classList.toggle("bfStat__v--pos", roi >= 0);
        s.roiEl.classList.toggle("bfMini__v--pos", roi >= 0);
      }

      if (s.liqEl) {
        const liq = s.entry * 0.947; // demo liq estimate
        s.liqEl.textContent = liq.toLocaleString(undefined, { maximumFractionDigits: 0 });
      }

      if (s.fundingEl) {
        const f = 0.006 + Math.sin(performance.now() / 2500) * 0.004;
        s.fundingEl.textContent = `+${f.toFixed(3)}%`;
      }
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// --- Token-gated demo interactions (UI only) ---
function startGate() {
  if (!connectBtn || !verifyBtn || !gateHint) return;
  let connected = false;
  let unlocked = false;

  function render() {
    const status = gateHint.querySelector(".gate__status");
    if (!status) return;
    if (unlocked) {
      status.textContent = "UNLOCKED";
      status.classList.remove("gate__status--locked");
      status.classList.add("gate__status--unlocked");
      if (lockedCard) lockedCard.style.borderColor = "rgba(245, 232, 74, 0.32)";
    } else {
      status.textContent = connected ? "CONNECTED" : "LOCKED";
      status.classList.remove("gate__status--unlocked");
      status.classList.add("gate__status--locked");
      if (lockedCard) lockedCard.style.borderColor = "rgba(255,255,255,0.08)";
    }
  }

  connectBtn.addEventListener("click", () => {
    connected = true;
    unlocked = false;
    render();
  });

  verifyBtn.addEventListener("click", () => {
    if (!connected) return;
    unlocked = true;
    render();
  });

  render();
}

startPnl();
startGate();
startHeroShader();

// --- About section market scanner feed (UI demo) ---
function startScannerFeed() {
  const feed = document.getElementById("eventFeed");
  if (!feed) return;

  function randHex(len) {
    const chars = "0123456789abcdef";
    let s = "";
    for (let i = 0; i < len; i++) s += chars[(Math.random() * chars.length) | 0];
    return s;
  }

  function addrEth() {
    return `0x${randHex(40)}`;
  }

  function addrSol() {
    const base58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let s = "";
    for (let i = 0; i < 44; i++) s += base58[(Math.random() * base58.length) | 0];
    return s;
  }

  const kinds = [
    { k: "LIQUIDATION", tone: "neg" },
    { k: "WHALE TXN", tone: "pos" },
    { k: "AI NEWS", tone: "pos" },
    { k: "LIQUIDITY", tone: "pos" },
    { k: "OI SHIFT", tone: "pos" },
    { k: "FUNDING", tone: "pos" },
  ];

  const pairs = ["BTC", "ETH", "SOL", "XRP", "BNB", "DOGE"];
  const venues = ["BINANCE", "BYBIT", "OKX", "DERIBIT"];
  const news = [
    "Headline velocity spike detected",
    "AI impact score raised",
    "Macro catalyst re-priced by futures",
    "Risk-on rotation spotted",
    "Orderbook imbalance confirmed",
  ];

  function nowStamp() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function fmtMoney(n) {
    return `$${Math.round(n).toLocaleString()}`;
  }

  function makeEvent() {
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    const venue = venues[Math.floor(Math.random() * venues.length)];
    const size = 25000 + Math.random() * 900000;
    const dir = Math.random() > 0.5 ? "BUY" : "SELL";
    const chain = Math.random() > 0.55 ? "EVM" : "SOL";
    const address = chain === "EVM" ? addrEth() : addrSol();
    const shortAddr =
      chain === "EVM"
        ? `${address.slice(0, 6)}…${address.slice(-4)}`
        : `${address.slice(0, 4)}…${address.slice(-4)}`;

    let msg = "";
    switch (kind.k) {
      case "LIQUIDATION":
        msg = `${pair}-PERP liquidation cluster • ${fmtMoney(size)} • ${venue} • ${shortAddr}`;
        break;
      case "WHALE TXN":
        msg = `Whale ${dir} sweep detected • ${pair}-PERP • ${fmtMoney(size)} • ${venue} • ${shortAddr}`;
        break;
      case "AI NEWS":
        msg = `AI: ${news[Math.floor(Math.random() * news.length)]} • ${pair}`;
        break;
      case "LIQUIDITY":
        msg = `Hidden liquidity pocket mapped • ${pair} • depth ↑ • route ${chain}`;
        break;
      case "OI SHIFT":
        msg = `Open interest shift • ${pair}-PERP • pressure ${dir === "BUY" ? "↑" : "↓"}`;
        break;
      case "FUNDING":
        msg = `Funding skew detected • ${pair}-PERP • basis diverging`;
        break;
      default:
        msg = `Signal detected • ${pair}`;
    }

    return { kind: kind.k, tone: kind.tone, msg, t: nowStamp() };
  }

  function renderItem(e) {
    const sev = e.tone === "neg" ? "critical" : e.kind === "AI NEWS" ? "news" : "signal";
    const icon =
      sev === "critical" ? "⚠" : sev === "news" ? "⟡" : e.kind === "WHALE TXN" ? "◎" : e.kind === "LIQUIDITY" ? "▦" : "➤";

    const el = document.createElement("div");
    el.className = `event ${e.tone === "neg" ? "event--neg" : ""} event--${sev}`;
    el.setAttribute("role", "listitem");
    el.innerHTML = `
      <div class="event__rail" aria-hidden="true"></div>
      <div class="event__top">
        <div class="event__kind"><span class="event__icon" aria-hidden="true">${icon}</span>${e.kind}</div>
        <div class="event__time">${e.t}</div>
      </div>
      <div class="event__msg">${e.msg}</div>
    `;
    return el;
  }

  // seed
  for (let i = 0; i < 6; i++) {
    feed.appendChild(renderItem(makeEvent()));
  }

  setInterval(() => {
    const el = renderItem(makeEvent());
    feed.prepend(el);
    while (feed.children.length > 8) feed.lastElementChild?.remove();
  }, 1300);
}

startScannerFeed();

function startMapPanelAddrs() {
  const panel = document.getElementById("scannerMap");
  if (!panel) return;
  const addrs = Array.from(panel.querySelectorAll("[data-addr]"));
  if (addrs.length === 0) return;

  const chars = "0123456789abcdef";
  const randHex = (len) => {
    let s = "";
    for (let i = 0; i < len; i++) s += chars[(Math.random() * chars.length) | 0];
    return s;
  };
  const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;

  for (const el of addrs) {
    const a = `0x${randHex(40)}`;
    el.textContent = short(a);
  }
}

startMapPanelAddrs();

// --- How it works: generated signal cards (UI demo) ---
function startHowSignals() {
  const host = document.getElementById("signalCards");
  if (!host) return;

  const cardsWrap = host.closest(".howSignals__grid") || host;
  let rafTilt = 0;
  let lastX = 0;
  let lastY = 0;
  let activeCard = null;

  function applyTilt(e) {
    const card = activeCard;
    if (!card) return;
    const r = card.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = (lastX - cx) / Math.max(1, r.width / 2);
    const dy = (lastY - cy) / Math.max(1, r.height / 2);
    const rx = Math.max(-1, Math.min(1, -dy)) * 8; // up/down
    const ry = Math.max(-1, Math.min(1, dx)) * 10; // left/right
    card.style.setProperty("--sigRx", `${rx.toFixed(2)}deg`);
    card.style.setProperty("--sigRy", `${ry.toFixed(2)}deg`);
    rafTilt = 0;
  }

  function onMove(e) {
    lastX = e.clientX;
    lastY = e.clientY;
    if (rafTilt) return;
    rafTilt = requestAnimationFrame(applyTilt);
  }

  function resetCardTilt(card) {
    if (!card) return;
    card.style.setProperty("--sigRx", `0deg`);
    card.style.setProperty("--sigRy", `0deg`);
  }

  cardsWrap.addEventListener(
    "pointermove",
    (e) => {
      const next = e.target instanceof Element ? e.target.closest(".signalCard") : null;
      if (next !== activeCard) {
        resetCardTilt(activeCard);
        activeCard = next;
        // Ensure the newly active card tilts immediately (even if rAF was pending)
        if (rafTilt) cancelAnimationFrame(rafTilt);
        rafTilt = 0;
      }
      onMove(e);
    },
    { passive: true }
  );
  cardsWrap.addEventListener(
    "pointerleave",
    () => {
      resetCardTilt(activeCard);
      activeCard = null;
    },
    { passive: true }
  );

  const pairs = ["BTC", "ETH", "SOL", "XRP", "BNB"];
  const venues = ["BYBIT", "BINANCE", "OKX", "HYPERLIQUID"];
  const setups = [
    "Liquidity sweep + reclaim",
    "Whale momentum ignition",
    "Funding skew reversal",
    "OI expansion breakout",
    "Liquidation cluster bounce",
    "Absorption confirmed at key level",
    "News catalyst repriced by futures",
  ];

  function nowStamp() {
    const d = new Date();
    // Fixed-width time string (no layout shift)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function fmtPx(n) {
    return n >= 1000
      ? n.toLocaleString(undefined, { maximumFractionDigits: 1 })
      : n >= 10
        ? n.toFixed(2)
        : n.toFixed(4);
  }

  function makeSignal() {
    const pair = pairs[(Math.random() * pairs.length) | 0];
    const setup = setups[(Math.random() * setups.length) | 0];
    const sev = setup.includes("Liquidation") ? "critical" : "signal";
    const dir = Math.random() > 0.5 ? "LONG" : "SHORT";
    const venue = venues[(Math.random() * venues.length) | 0];
    const lev = [5, 10, 15, 20, 25][(Math.random() * 5) | 0];
    const conf = clamp(Math.round(70 + Math.random() * 28), 0, 100);
    const score = clamp(Math.round(64 + Math.random() * 34), 0, 100);

    const base =
      pair === "BTC"
        ? 68000
        : pair === "ETH"
          ? 3600
          : pair === "SOL"
            ? 170
            : pair === "XRP"
              ? 0.62
              : 520;
    const entryN = base * (1 + (Math.random() - 0.5) * 0.02);
    const stopN = entryN * (dir === "LONG" ? 0.992 : 1.008);
    const t1N = entryN * (dir === "LONG" ? 1.006 : 0.994);

    const vol = Math.round(12 + Math.random() * 240); // in M
    const oi = Math.round(80 + Math.random() * 420); // in M
    const oiDelta = Math.round((Math.random() - 0.45) * 18 * 10) / 10; // %
    const funding = Math.round((0.002 + Math.random() * 0.03) * 1000) / 1000; // %

    const pnl = (Math.random() * 1800 + 120) * (dir === "LONG" ? 1 : 1) * (Math.random() > 0.28 ? 1 : -1);
    const pnlP = clamp(Math.abs(pnl) / 2200, 0.06, 0.94);

    const pts = Array.from({ length: 16 }, (_, i) => {
      const baseP = 50 + Math.sin(i / 2.3) * 10 + (Math.random() - 0.5) * 16;
      return clamp(Math.round(baseP), 8, 92);
    });

    return {
      kind: `${pair}-PERP • ${dir}`,
      dir,
      time: nowStamp(),
      msg: `${setup} detected. Signal confirms with flow + structure alignment.`,
      sev,
      venue,
      lev,
      conf,
      score,
      entry: fmtPx(entryN),
      stop: fmtPx(stopN),
      t1: fmtPx(t1N),
      vol,
      oi,
      oiDelta,
      funding,
      pnl,
      pnlP,
      pts,
    };
  }

  function applySignal(el, sig) {
    el.classList.toggle("signalCard--critical", sig.sev === "critical");
    el.classList.toggle("signalCard--long", sig.dir === "LONG");
    el.classList.toggle("signalCard--short", sig.dir !== "LONG");

    const setText = (sel, v) => {
      const n = el.querySelector(sel);
      if (n) n.textContent = String(v);
    };

    setText("[data-sig-kind]", sig.kind);
    setText("[data-sig-time]", sig.time);
    setText("[data-sig-msg]", sig.msg);

    setText("[data-sig-vol]", `$${sig.vol}M`);
    setText("[data-sig-oi]", `$${sig.oi}M`);
    setText("[data-sig-oi-delta]", `${sig.oiDelta >= 0 ? "+" : ""}${sig.oiDelta}%`);
    setText("[data-sig-funding]", `+${sig.funding.toFixed(3)}%`);
    const pnlEl = el.querySelector("[data-sig-pnl]");
    if (pnlEl) {
      const sign = sig.pnl >= 0 ? "+" : "-";
      pnlEl.textContent = `${sign}$${Math.abs(sig.pnl).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
      pnlEl.classList.toggle("signalPnl__v--neg", sig.pnl < 0);
    }
    const pnlFill = el.querySelector("[data-sig-pnl-fill]");
    if (pnlFill) pnlFill.style.setProperty("--p", String(sig.pnlP));

    const viz = el.querySelector(".signalCard__viz");
    if (viz) viz.setAttribute("data-pts", sig.pts.join(","));

    const oiMetric = el.querySelector("[data-sig-oi-metric]");
    if (oiMetric) {
      oiMetric.classList.toggle("sigMetric--pos", sig.oiDelta >= 0);
      oiMetric.classList.toggle("sigMetric--neg", sig.oiDelta < 0);
    }
    const fundMetric = el.querySelector("[data-sig-fund-metric]");
    if (fundMetric) {
      const hot = sig.funding >= 0.015;
      fundMetric.classList.toggle("sigMetric--hot", hot);
    }
  }

  function renderShell() {
    const el = document.createElement("div");
    el.className = `signalCard signalCard--short`;
    el.innerHTML = `
      <div class="signalCard__top">
        <div class="signalCard__kindWrap">
          <img class="signalCard__logo" src="./assets/logo-mark.png" alt="" />
          <div class="signalCard__kind" data-sig-kind>—</div>
        </div>
        <div class="signalCard__time" data-sig-time>—</div>
      </div>
      <div class="signalCard__badges" aria-label="Signal badges">
        <div class="sigBadge">LIVE</div>
        <div class="sigBadge sigBadge--soft">Flow</div>
        <div class="sigBadge sigBadge--soft">Liquidity</div>
        <div class="sigBadge sigBadge--soft">AI</div>
      </div>
      <div class="signalCard__msg" data-sig-msg>—</div>
      <div class="signalCard__viz" aria-hidden="true" data-pts="">
        <div class="sigViz__grid"></div>
        <div class="sigViz__spark">
          <div class="sigSpark__line"></div>
          <div class="sigSpark__glow"></div>
        </div>
        <div class="sigViz__map">
          <span class="sigMap__dot sigMap__dot--a"></span>
          <span class="sigMap__dot sigMap__dot--b"></span>
          <span class="sigMap__dot sigMap__dot--c"></span>
          <span class="sigMap__dot sigMap__dot--d"></span>
          <span class="sigMap__link sigMap__link--1"></span>
          <span class="sigMap__link sigMap__link--2"></span>
          <span class="sigMap__link sigMap__link--3"></span>
        </div>
      </div>
      <div class="signalCard__metrics" aria-label="Market metrics">
        <div class="sigMetric">
          <div class="sigMetric__k">Vol (24h)</div>
          <div class="sigMetric__v" data-sig-vol>—</div>
        </div>
        <div class="sigMetric">
          <div class="sigMetric__k">OI</div>
          <div class="sigMetric__v" data-sig-oi>—</div>
        </div>
        <div class="sigMetric" data-sig-oi-metric>
          <div class="sigMetric__k">OI Δ</div>
          <div class="sigMetric__v" data-sig-oi-delta>—</div>
        </div>
        <div class="sigMetric" data-sig-fund-metric>
          <div class="sigMetric__k">Funding</div>
          <div class="sigMetric__v" data-sig-funding>—</div>
        </div>
      </div>
      <div class="signalPnl" aria-label="PnL module">
        <div class="signalPnl__k">Unrealized PnL</div>
        <div class="signalPnl__v" data-sig-pnl>—</div>
        <div class="signalPnl__bar" aria-hidden="true">
          <span class="signalPnl__fill" data-sig-pnl-fill></span>
        </div>
      </div>
    `;
    return el;
  }

  // Seed 2 cards
  host.innerHTML = "";
  const c1 = renderShell();
  const c2 = renderShell();
  host.appendChild(c1);
  host.appendChild(c2);

  applySignal(c1, makeSignal());
  applySignal(c2, makeSignal());

  // Auto-regenerate content without replacing buttons/layout
  setInterval(() => {
    applySignal(c1, makeSignal());
    applySignal(c2, makeSignal());
  }, 2400);
}

startHowSignals();

// --- Simple scroll reveal (clean) ---
function startScrollReveal() {
  let reduceMotion = false;
  try {
    reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    reduceMotion = false;
  }
  if (reduceMotion) return;

  // Footer should always be visible (no reveal), to avoid it "disappearing" near page end.
  // Apply reveal globally, but keep About static (no scrolling effect).
  const nodes = Array.from(document.querySelectorAll(".section, .hero")).filter(
    (el) => el.id !== "about"
  );
  if (nodes.length === 0) return;

  for (const el of nodes) el.classList.add("reveal");

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) e.target.classList.add("is-inview");
        else e.target.classList.remove("is-inview");
      }
    },
    { root: null, threshold: 0.12, rootMargin: "0px 0px -12% 0px" }
  );

  for (const el of nodes) io.observe(el);
}

startScrollReveal();

// --- Tokenomics: copy CA ---
function startTokenomics() {
  const ca = document.getElementById("tokenCa");
  const btn = document.getElementById("copyCaBtn");
  const label = btn?.querySelector(".copyCaBtn__label");
  if (!ca || !btn) return;

  btn.addEventListener("click", async () => {
    const text = (ca.textContent || "").trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (label) label.textContent = "Copied";
      window.setTimeout(() => {
        if (label) label.textContent = "Copy CA";
      }, 1100);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      if (label) label.textContent = "Copied";
      window.setTimeout(() => {
        if (label) label.textContent = "Copy CA";
      }, 1100);
    }
  });
}

startTokenomics();
