// ─────────────────────────────────────────────────────────────────────────────
//  Storage Optimizer — License Manager
//  Key format: SO-XXXX-XXXX-XXXX-XXXX  (HMAC-SHA256 based, base36 encoded)
//  Trial: 60 ngày từ lần chạy đầu tiên
// ─────────────────────────────────────────────────────────────────────────────

"use strict";

const crypto = require("crypto");
const fs     = require("fs");
const path   = require("path");
const os     = require("os");

// ── Cấu hình ────────────────────────────────────────────────────────────────
const TRIAL_DAYS   = 60;          // số ngày dùng thử miễn phí
const LICENSE_FILE = path.join(os.homedir(), ".storage-optimizer", "license.json");
const SECRET       = "SO_2026_s3cr3t_k3y_!xZ9";   // phải giống hệt trong keygen.js

// ── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir() {
  const dir = path.dirname(LICENSE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** Tạo fingerprint máy: username + hostname + platform (không thu thập PII nhạy cảm) */
function getMachineId() {
  const raw = `${os.userInfo().username}|${os.hostname()}|${os.platform()}|${os.arch()}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

/** Đọc license file */
function readLicense() {
  try {
    if (!fs.existsSync(LICENSE_FILE)) return null;
    const raw = fs.readFileSync(LICENSE_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Ghi license file */
function writeLicense(data) {
  ensureDir();
  fs.writeFileSync(LICENSE_FILE, JSON.stringify(data, null, 2), "utf8");
}

// ── Key validation ────────────────────────────────────────────────────────────

/**
 * Giải mã key:  SO-XXXX-XXXX-XXXX-XXXX
 * Cấu trúc payload (trước khi encode):
 *   [8 hex: expiry days since epoch] [4 hex: type] [8 hex: hmac prefix]
 */
function parseKey(rawKey) {
  // Xóa prefix "SO" và ký tự gạch nối, giữ lại phần raw 20 ký tự
  let key = rawKey.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (key.startsWith("SO")) key = key.slice(2);
  if (key.length < 20) return null;

  try {
    const payload = key.slice(0, 12);
    const nonce   = key.slice(12, 16);
    const sig     = key.slice(16, 20);

    // Tính lại chữ ký & so sánh
    const hmac  = crypto.createHmac("sha256", SECRET).update(payload + nonce).digest("hex");
    const check = parseInt(hmac.slice(0, 4), 16).toString(36).toUpperCase().padStart(4, "0");

    if (check !== sig) return null;

    // Giải mã ngày hết hạn
    const payloadNum  = parseInt(payload, 36);
    const expiryDays  = Math.floor(payloadNum / 100);
    const typeCode    = payloadNum % 100;
    const expiryMs    = expiryDays * 86400000;
    const expiryDate  = new Date(expiryMs);

    const licenseType = typeCode === 10 ? "personal"
                      : typeCode === 20 ? "business"
                      : typeCode === 99 ? "lifetime"
                      : "unknown";

    return { expiryDate, licenseType, valid: true };
  } catch {
    return null;
  }
}

/** Format key đẹp: SO-XXXX-XXXX-XXXX-XXXX */
function formatKey(raw20) {
  const c = raw20.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (c.length < 20) return raw20;
  return `SO-${c.slice(0,4)}-${c.slice(4,8)}-${c.slice(8,12)}-${c.slice(12,16)}-${c.slice(16,20)}`;
}

// ── API công khai ─────────────────────────────────────────────────────────────

/**
 * Trả về trạng thái license hiện tại.
 * @returns {{ status, daysLeft, expiryDate, licenseType, machineId, trialStart }}
 */
function getLicenseStatus() {
  const machineId = getMachineId();
  const data      = readLicense();
  const now       = Date.now();

  // ── Đã kích hoạt bằng key ────────────────────────────────────────────────
  if (data && data.activatedKey) {
    const parsed = parseKey(data.activatedKey);
    if (!parsed) {
      return { status: "invalid_key", daysLeft: 0, machineId };
    }

    const expiry   = new Date(data.keyExpiry).getTime();
    const daysLeft = Math.ceil((expiry - now) / 86400000);

    if (daysLeft <= 0) {
      return { status: "key_expired", daysLeft: 0, expiryDate: data.keyExpiry,
               licenseType: parsed.licenseType, machineId };
    }

    return {
      status: "activated",
      daysLeft,
      expiryDate: data.keyExpiry,
      licenseType: parsed.licenseType,
      machineId,
    };
  }

  // ── Chưa có key — tính trial ─────────────────────────────────────────────
  let trialStart = data && data.trialStart ? data.trialStart : null;

  if (!trialStart) {
    // Lần đầu chạy — bắt đầu trial
    trialStart = new Date().toISOString();
    writeLicense({ trialStart, machineId });
  }

  const trialMs  = new Date(trialStart).getTime();
  const elapsed  = now - trialMs;
  const daysUsed = Math.floor(elapsed / 86400000);
  const daysLeft = Math.max(0, TRIAL_DAYS - daysUsed);
  const expiry   = new Date(trialMs + TRIAL_DAYS * 86400000).toISOString();

  if (daysLeft <= 0) {
    return { status: "trial_expired", daysLeft: 0, expiryDate: expiry,
             licenseType: "trial", machineId, trialStart };
  }

  return {
    status:      "trial",
    daysLeft,
    expiryDate:  expiry,
    licenseType: "trial",
    machineId,
    trialStart,
  };
}

/**
 * Kích hoạt key. Trả về { ok, message }.
 */
function activateKey(rawKey) {
  const key    = rawKey.trim().replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const parsed = parseKey(key);

  if (!parsed) {
    return { ok: false, message: "Key không hợp lệ. Kiểm tra lại ký tự và thử lại." };
  }

  const now      = Date.now();
  const expiry   = parsed.expiryDate.getTime();
  const daysLeft = Math.ceil((expiry - now) / 86400000);

  if (daysLeft <= 0) {
    return { ok: false, message: `Key đã hết hạn (${parsed.expiryDate.toLocaleDateString("vi-VN")}).` };
  }

  // Lưu kích hoạt
  const data = readLicense() || {};
  data.activatedKey  = key;
  data.keyExpiry     = parsed.expiryDate.toISOString();
  data.licenseType   = parsed.licenseType;
  data.activatedAt   = new Date().toISOString();
  data.machineId     = getMachineId();
  writeLicense(data);

  return {
    ok: true,
    message: `✅ Kích hoạt thành công! Còn ${daysLeft} ngày (${parsed.licenseType}).`,
    daysLeft,
    licenseType: parsed.licenseType,
    expiryDate: parsed.expiryDate.toISOString(),
  };
}

/**
 * Kiểm tra app có được phép chạy không.
 * Trả về true nếu trial còn hạn HOẶC key còn hạn.
 */
function isAllowed() {
  const s = getLicenseStatus();
  return s.status === "trial" || s.status === "activated";
}

module.exports = { getLicenseStatus, activateKey, isAllowed, getMachineId, formatKey };
