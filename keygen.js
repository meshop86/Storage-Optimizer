#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
//  Storage Optimizer — Key Generator (dành cho nhà phát triển)
//
//  Sử dụng:
//    node keygen.js                          → gen key 30 ngày (personal)
//    node keygen.js --days 90               → gen key 90 ngày
//    node keygen.js --days 365 --type business
//    node keygen.js --days 36500 --type lifetime
//    node keygen.js --batch 5 --days 60     → gen 5 key cùng lúc
//    node keygen.js --verify SO-XXXX-...    → kiểm tra key có hợp lệ không
// ─────────────────────────────────────────────────────────────────────────────

"use strict";

const crypto = require("crypto");

// ── PHẢI GIỐNG HỆT trong license.js ─────────────────────────────────────────
const SECRET = "SO_2026_s3cr3t_k3y_!xZ9";

// Type codes
const TYPES = { personal: 10, business: 20, lifetime: 99 };

// ── Core gen ─────────────────────────────────────────────────────────────────

function genKey(days, typeName = "personal") {
  const typeCode = TYPES[typeName] ?? TYPES.personal;

  // Expiry: ngày hết hạn tính theo ms epoch
  const expiryMs   = Date.now() + days * 86400000;
  const expiryDays = Math.floor(expiryMs / 86400000);

  // Encode payload: expiryDays * 100 + typeCode → base36, pad 12 chars
  const payloadNum = expiryDays * 100 + typeCode;
  const payload    = payloadNum.toString(36).toUpperCase().padStart(12, "0");

  // Nonce ngẫu nhiên 4 kyự (mỗi key unique)
  const nonce = crypto.randomBytes(2).toString("hex").toUpperCase().slice(0,4);

  // HMAC chữ ký 4 ký tự (của payload+nonce)
  const hmacInput = payload + nonce;
  const hmac      = crypto.createHmac("sha256", SECRET).update(hmacInput).digest("hex");
  const sig       = parseInt(hmac.slice(0, 4), 16).toString(36).toUpperCase().padStart(4, "0");

  const raw = payload + nonce + sig; // 12+4+4 = 20 chars

  // Format: SO-XXXX-XXXX-XXXX-XXXX-XXXX (5 groups of 4)
  return `SO-${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}-${raw.slice(16,20)}`;
}

function verifyKey(rawKey) {
  // Xóa prefix "SO" và dấu gạch nối, giữ lại phần raw 20 ký tự
  let key = rawKey.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (key.startsWith("SO")) key = key.slice(2);
  if (key.length < 20) return { valid: false, reason: "Quá ngắn" };

  const payload = key.slice(0, 12);
  const nonce   = key.slice(12, 16);
  const sig     = key.slice(16, 20);

  const hmac  = crypto.createHmac("sha256", SECRET).update(payload + nonce).digest("hex");
  const check = parseInt(hmac.slice(0, 4), 16).toString(36).toUpperCase().padStart(4, "0");

  if (check !== sig) return { valid: false, reason: "Chữ ký sai — key bị giả mạo hoặc nhập sai" };

  const payloadNum  = parseInt(payload, 36);
  const expiryDays  = Math.floor(payloadNum / 100);
  const typeCode    = payloadNum % 100;
  const expiryMs    = expiryDays * 86400000;
  const expiryDate  = new Date(expiryMs);
  const daysLeft    = Math.ceil((expiryMs - Date.now()) / 86400000);
  const typeName    = Object.keys(TYPES).find(k => TYPES[k] === typeCode) || "unknown";

  return {
    valid: true,
    expired: daysLeft <= 0,
    expiryDate: expiryDate.toLocaleDateString("vi-VN"),
    daysLeft: Math.max(0, daysLeft),
    licenseType: typeName,
  };
}

// ── CLI ───────────────────────────────────────────────────────────────────────

// Chỉ chạy CLI khi gọi trực tiếp: node keygen.js ...
if (require.main === module) {
  const args = process.argv.slice(2);
  const get  = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i+1] : null; };
  const has  = (flag) => args.includes(flag);

if (has("--verify")) {
  const keyArg = get("--verify") || args.find(a => a.startsWith("SO-"));
  if (!keyArg) { console.error("❌ Thiếu key. Dùng: node keygen.js --verify SO-XXXX-..."); process.exit(1); }
  const r = verifyKey(keyArg);
  console.log("\n  ── Kiểm tra Key ─────────────────────────────────");
  console.log(`  Key      : ${keyArg}`);
  console.log(`  Hợp lệ  : ${r.valid ? "✅ CÓ" : "❌ KHÔNG — " + r.reason}`);
  if (r.valid) {
    console.log(`  Loại    : ${r.licenseType}`);
    console.log(`  Hết hạn : ${r.expiryDate}`);
    console.log(`  Còn lại : ${r.expired ? "⚠️  ĐÃ HẾT HẠN" : r.daysLeft + " ngày"}`);
  }
  console.log("");
  process.exit(0);
}

const days    = parseInt(get("--days")  || "30");
const type    = (get("--type")  || "personal").toLowerCase();
const batch   = parseInt(get("--batch") || "1");

if (!TYPES[type]) {
  console.error(`❌ Loại không hợp lệ: ${type}. Dùng: personal | business | lifetime`);
  process.exit(1);
}

console.log(`\n  ── Storage Optimizer Key Generator ────────────────`);
console.log(`  Loại    : ${type}`);
console.log(`  Hạn     : ${days} ngày`);
console.log(`  Số lượng: ${batch}`);
console.log(`  ────────────────────────────────────────────────────`);

for (let i = 0; i < batch; i++) {
  const key = genKey(days, type);
  console.log(`  ${String(i+1).padStart(2,"0")}. ${key}`);
}
console.log("");
} // end if (require.main === module)

module.exports = { genKey, verifyKey };

