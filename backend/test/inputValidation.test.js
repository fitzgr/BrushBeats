const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isSafeIdentifier,
  isSafeLocaleCode,
  safeJsonByteSize,
  sanitizeText,
  toBoundedNumber
} = require("../src/utils/inputValidation");

test("toBoundedNumber clamps and falls back safely", () => {
  assert.equal(toBoundedNumber("15", { min: 0, max: 10, fallback: 4 }), 10);
  assert.equal(toBoundedNumber("-2", { min: 0, max: 10, fallback: 4 }), 0);
  assert.equal(toBoundedNumber("not-a-number", { min: 0, max: 10, fallback: 4 }), 4);
  assert.equal(toBoundedNumber(5.6, { min: 0, max: 10, integer: true }), 6);
});

test("sanitizeText removes control characters, trims, lowercases, and bounds length", () => {
  const input = "  Hello\u0000World\u0007  ";
  assert.equal(sanitizeText(input, { toLowerCase: true }), "helloworld");
  assert.equal(sanitizeText("ABCDEFG", { maxLength: 4 }), "ABCD");
  assert.equal(sanitizeText(42, { fallback: "safe" }), "safe");
});

test("isSafeIdentifier accepts expected tokens and rejects unsafe values", () => {
  assert.equal(isSafeIdentifier("household_123-abc"), true);
  assert.equal(isSafeIdentifier("../etc/passwd"), false);
  assert.equal(isSafeIdentifier("with space"), false);
  assert.equal(isSafeIdentifier(""), false);
});

test("isSafeLocaleCode enforces language code format", () => {
  assert.equal(isSafeLocaleCode("en"), true);
  assert.equal(isSafeLocaleCode("pt-br"), true);
  assert.equal(isSafeLocaleCode("EN"), false);
  assert.equal(isSafeLocaleCode("../../en"), false);
  assert.equal(isSafeLocaleCode("en_us"), false);
});

test("safeJsonByteSize returns finite size for normal values and infinity for invalid objects", () => {
  assert.ok(Number.isFinite(safeJsonByteSize({ a: 1, b: "ok" })));

  const circular = {};
  circular.self = circular;
  assert.equal(safeJsonByteSize(circular), Number.POSITIVE_INFINITY);
});
