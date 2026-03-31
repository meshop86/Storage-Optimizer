// ─────────────────────────────────────────────────────────────────────────────
//  Disk Manager — System Tray  (systray2 v2.x compatible)
//  Run standalone: node tray.js
//  Or toggled from the Monitor tab web UI → /api/tray/start
// ─────────────────────────────────────────────────────────────────────────────

const { exec } = require("child_process");
const os   = require("os");
const zlib = require("zlib");
const path = require("path");

const PORT   = process.env.PORT || 7788;
const IS_WIN = process.platform === "win32";
const IS_MAC = process.platform === "darwin";
const APP_URL = `http://localhost:${PORT}`;

// ─── PNG ENGINE (pure Node.js, no dependencies) ───────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const tb = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcVal = Buffer.alloc(4); crcVal.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([len, tb, data, crcVal]);
}

function makePNG(size, rgba) {
  const sig  = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = [];
  for (let y = 0; y < size; y++) {
    raw.push(0); // filter: None
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      raw.push(rgba[i], rgba[i+1], rgba[i+2], rgba[i+3]);
    }
  }
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(Buffer.from(raw))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// Anti-aliased arc drawing via pixel supersampling
function setPixel(rgba, size, x, y, r, g, b, a) {
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const i = (y * size + x) * 4;
  const sa = a / 255, da = rgba[i+3] / 255;
  const oa = sa + da * (1 - sa);
  if (oa < 0.001) return;
  rgba[i]   = Math.round((r * sa + rgba[i]   * da * (1 - sa)) / oa);
  rgba[i+1] = Math.round((g * sa + rgba[i+1] * da * (1 - sa)) / oa);
  rgba[i+2] = Math.round((b * sa + rgba[i+2] * da * (1 - sa)) / oa);
  rgba[i+3] = Math.round(oa * 255);
}

function drawArc(rgba, size, cx, cy, radius, thickness, startRad, endRad, R, G, B, alpha=255) {
  if (endRad <= startRad) return;
  const Ro = radius + thickness / 2, Ri = radius - thickness / 2;
  const bx0 = Math.floor(cx - Ro - 1), bx1 = Math.ceil(cx + Ro + 1);
  const by0 = Math.floor(cy - Ro - 1), by1 = Math.ceil(cy + Ro + 1);
  for (let py = by0; py <= by1; py++) {
    for (let px = bx0; px <= bx1; px++) {
      let sum = 0;
      for (let sy = 0; sy < 3; sy++) {
        for (let sx = 0; sx < 3; sx++) {
          const fx = px + (sx - 1) / 3, fy = py + (sy - 1) / 3;
          const dx = fx - cx, dy = fy - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < Ri || d > Ro) continue;
          let angle = Math.atan2(dy, dx);
          while (angle < startRad) angle += 2 * Math.PI;
          while (angle >= startRad + 2 * Math.PI) angle -= 2 * Math.PI;
          if (angle <= endRad) sum++;
        }
      }
      if (sum === 0) continue;
      setPixel(rgba, size, px, py, R, G, B, Math.round((sum / 9) * alpha));
    }
  }
}

function colorFor(pct) {
  if (pct >= 80) return [255, 69, 58];    // red
  if (pct >= 50) return [255, 159, 10];   // amber
  return [48, 209, 88];                   // green
}

// Generate dual-ring donut PNG: outer=CPU, inner=RAM
function generateIcon(cpuPct = 0, ramPct = 0, size = 22) {
  const rgba = new Uint8Array(size * size * 4);
  const cx = (size - 1) / 2, cy = (size - 1) / 2;
  const START = -Math.PI / 2; // 12 o'clock

  // Outer ring: CPU
  const outerR = size / 2 - 2.5, outerT = 3.2;
  drawArc(rgba, size, cx, cy, outerR, outerT, START, START + 2 * Math.PI, 255, 255, 255, 30);
  if (cpuPct > 0) {
    const [r,g,b] = colorFor(cpuPct);
    drawArc(rgba, size, cx, cy, outerR, outerT, START, START + (cpuPct / 100) * 2 * Math.PI, r, g, b, 240);
  }

  // Inner ring: RAM
  const innerR = size / 2 - 7.5, innerT = 2.4;
  if (innerR > 1.5) {
    drawArc(rgba, size, cx, cy, innerR, innerT, START, START + 2 * Math.PI, 255, 255, 255, 25);
    if (ramPct > 0) {
      const [r,g,b] = colorFor(ramPct);
      drawArc(rgba, size, cx, cy, innerR, innerT, START, START + (ramPct / 100) * 2 * Math.PI, r, g, b, 210);
    }
  }

  return makePNG(size, rgba);
}

// ─── RESOURCE POLLING ─────────────────────────────────────────────────────────

let _prevCpu = os.cpus().map(c => ({ ...c.times }));

function getCpuPct() {
  const curr = os.cpus();
  let tot = 0, idl = 0;
  curr.forEach((c, i) => {
    const p = _prevCpu[i] || c.times;
    const cv = Object.values(c.times).reduce((a, b) => a + b, 0);
    const pv = Object.values(p).reduce((a, b) => a + b, 0);
    tot += cv - pv; idl += c.times.idle - p.idle;
  });
  _prevCpu = curr.map(c => ({ ...c.times }));
  return tot > 0 ? Math.max(0, Math.min(100, (1 - idl / tot) * 100)) : 0;
}

function getRamPct() {
  return new Promise(resolve => {
    if (IS_MAC) {
      exec("vm_stat", (err, out) => {
        if (err) {
          const t = os.totalmem(), f = os.freemem();
          return resolve(Math.round((t - f) / t * 100));
        }
        const ps = parseInt((out.match(/page size of (\d+)/) || [])[1]) || 16384;
        const get = k => (parseInt((out.match(new RegExp(k + ":\\s*(\\d+)")) || [])[1]) || 0) * ps;
        const free = get("Pages free") + get("Pages inactive") + get("Pages speculative");
        const total = os.totalmem();
        resolve(Math.round(Math.max(0, total - free) / total * 100));
      });
    } else {
      const t = os.totalmem(), f = os.freemem();
      resolve(Math.round((t - f) / t * 100));
    }
  });
}

function fmtB(b) {
  if (!b) return "0B";
  const u = ["B","KB","MB","GB"]; let i = 0, s = b;
  while (s >= 1024 && i < 3) { s /= 1024; i++; }
  return `${s.toFixed(i > 1 ? 1 : 0)}${u[i]}`;
}

// ─── TRAY ─────────────────────────────────────────────────────────────────────

async function startTray() {
  let SysTray;
  try {
    SysTray = require("systray2").default;
  } catch {
    console.error("  ⚠️  systray2 not installed. Run: npm install systray2@2.1.4");
    process.exit(1);
  }

  let cpuPct = 0, ramPct = 0;

  // Build initial menu
  const makeMenu = () => ({
    icon: generateIcon(cpuPct, ramPct, 22).toString("base64"),
    isTemplateIcon: false,  // false = keep colors; true = macOS renders monochrome
    title: "",
    tooltip: `Disk Manager — ${APP_URL}`,
    items: [
      { title: "🌐  Mở Disk Manager",          checked: false, enabled: true  },
      SysTray.separator,
      { title: statusLine(cpuPct, ramPct),       checked: false, enabled: false },
      SysTray.separator,
      { title: "🔄  Restart Server",             checked: false, enabled: true  },
      { title: "❌  Thoát / Quit",               checked: false, enabled: true  },
    ],
  });

  const tray = new SysTray({ menu: makeMenu(), debug: false, copyDir: true });

  // Wait for tray binary to be ready before registering callbacks
  await tray._ready;
  console.log("  ✓ Tray icon active in menu bar");

  // ── Click handler ──
  tray.onClick(action => {
    switch (action.seq_id) {
      case 0: // Open in browser
        exec(IS_WIN ? `start ${APP_URL}` : `open ${APP_URL}`);
        break;
      case 4: // Restart server
        if (IS_MAC) {
          exec(`osascript -e 'tell app "Terminal" to do script "cd ${path.dirname(__filename)} && node server.js"'`);
        } else {
          exec(`start cmd /c "cd /d ${path.dirname(__filename)} && node server.js"`);
        }
        break;
      case 5: // Quit
        tray.kill(true);
        break;
    }
  });

  // ── Exit handler — safe to call AFTER _ready ──
  tray.onExit(() => {
    console.log("  Tray exited.");
    process.exit(0);
  });

  // ── Resource polling — update text + icon ──
  let tick = 0;
  const update = async () => {
    cpuPct = Math.round(getCpuPct());
    ramPct = await getRamPct();
    tick++;

    // Update stats text item (seq_id 2)
    try {
      await tray.sendAction({
        type: "update-item",
        seq_id: 2,
        item: { title: statusLine(cpuPct, ramPct), checked: false, enabled: false },
      });
    } catch {}

    // Update icon every 5 ticks (5s) to avoid heavy PNG regen
    if (tick % 5 === 0) {
      try {
        const newIcon = generateIcon(cpuPct, ramPct, 22).toString("base64");
        await tray.sendAction({
          type: "update-menu",
          menu: {
            ...makeMenu(),
            icon: newIcon,
            items: [
              { title: "🌐  Mở Disk Manager",    checked: false, enabled: true  },
              SysTray.separator,
              { title: statusLine(cpuPct, ramPct), checked: false, enabled: false },
              SysTray.separator,
              { title: "🔄  Restart Server",      checked: false, enabled: true  },
              { title: "❌  Thoát / Quit",         checked: false, enabled: true  },
            ],
          },
        });
      } catch {}
    }
  };

  // First tick after 1s (CPU diff needs 2 samples)
  setTimeout(() => {
    update();
    setInterval(update, 1000);
  }, 1000);
}

function statusLine(cpu, ram) {
  const dot = (cpu >= 80 || ram >= 85) ? "🔴" : (cpu >= 50 || ram >= 70) ? "🟡" : "🟢";
  return `${dot}  CPU ${String(cpu).padStart(3)}%    RAM ${String(ram).padStart(3)}%`;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

console.log("\n  ╔══════════════════════════════════╗");
console.log("  ║  🖥️   Disk Manager — Tray Icon   ║");
console.log("  ╚══════════════════════════════════╝");
console.log(`\n  ➜  Server: ${APP_URL}\n`);

startTray().catch(err => {
  console.error("  ✗ Tray failed:", err.message);
  process.exit(1);
});
