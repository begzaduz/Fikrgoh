import { test } from "node:test";
import assert from "node:assert/strict";
import { foldForSearch, toNew, toOld } from "../src/lib/alphabet.js";

test("eskidan yangiga: to‘rt harf", () => {
  assert.equal(toNew("O‘zbekiston"), "Özbekiston");
  assert.equal(toNew("to‘g‘ri"), "töğri");
  assert.equal(toNew("shoshilinch"), "şoşilinç");
  assert.equal(toNew("Sh, SH va Ch"), "Ş, Ş va Ç");
});

test("apostrof turlari va tutuq belgisi", () => {
  assert.equal(toNew("o'zbek o’zbek oʻzbek"), "özbek özbek özbek");
  assert.equal(toNew("ma’no, a’lo, san’at"), "ma’no, a’lo, san’at");
  assert.equal(toNew("s’h"), "s’h");
});

test("yangidan eskiga", () => {
  assert.equal(toOld("Özbekiston"), "O‘zbekiston");
  assert.equal(toOld("şoşilinç"), "shoshilinch");
  assert.equal(toOld("ÖZBEK ŞAHAR"), "O‘ZBEK SHAHAR");
  assert.equal(toOld("Şahar"), "Shahar");
});

test("aylanib o‘tganda matn o‘zgarmaydi", () => {
  for (const s of ["Ba’zan to‘g‘ri savol — javobdan muhimroq.", "Shahar, charx, o‘rtoq, g‘oya, achchiq, mashhur."]) {
    assert.equal(toOld(toNew(s)), s);
  }
});

test("qidiruv ikkala yozuvni bir xil ko‘radi", () => {
  assert.equal(foldForSearch("shoshilinch"), foldForSearch("şoşilinç"));
  assert.equal(foldForSearch("O‘zbek"), foldForSearch("Özbek"));
  assert.equal(foldForSearch("g‘oya"), foldForSearch("ğoya"));
});
