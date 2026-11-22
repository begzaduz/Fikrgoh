import { test } from "node:test";
import assert from "node:assert/strict";
import { tgUserId } from "../src/lib/tg.js";

const init = (u: object) => `auth_date=1&hash=abc&user=${encodeURIComponent(JSON.stringify(u))}`;

test("initData ichidan Telegram ID olinadi", () => {
  assert.equal(tgUserId(init({ id: 1282050618, first_name: "A" })), 1282050618);
});
test("yaroqsiz initData null qaytaradi", () => {
  assert.equal(tgUserId(""), null);
  assert.equal(tgUserId("hash=abc"), null);
  assert.equal(tgUserId(init({})), null);
});
