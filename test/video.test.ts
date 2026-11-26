import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { inspectMp4 } from "../src/lib/video.js";

const dir = process.env.VIDEO_FIXTURES ?? "/tmp/v";
const load = (n: string) => new Blob([readFileSync(`${dir}/${n}`)]);
const has = (n: string) => existsSync(`${dir}/${n}`);

test("H.264 + faststart: to‘g‘ri aniqlanadi", { skip: !has("h264_fs.mp4") }, async () => {
  assert.deepEqual(await inspectMp4(load("h264_fs.mp4")), { codec: "h264", faststart: true });
});
test("H.264, faststart'siz: moov oxirida", { skip: !has("h264_nofs.mp4") }, async () => {
  assert.deepEqual(await inspectMp4(load("h264_nofs.mp4")), { codec: "h264", faststart: false });
});
test("HEVC aniqlanadi", { skip: !has("hevc.mp4") }, async () => {
  assert.equal((await inspectMp4(load("hevc.mp4"))).codec, "hevc");
});
test("MP4 bo‘lmagan fayl rad etilmaydi (null)", async () => {
  assert.deepEqual(await inspectMp4(new Blob(["salom dunyo, bu video emas"])), { codec: null, faststart: null });
});

// ---- Fixture fayllarsiz ishlaydigan testlar (CI'da ham haqiqiy tekshiruv bo‘lishi uchun) ----
const enc = new TextEncoder();
const box = (type: string, payload: Uint8Array) => {
  const b = new Uint8Array(8 + payload.length);
  new DataView(b.buffer).setUint32(0, b.length);
  b.set(enc.encode(type), 4);
  b.set(payload, 8);
  return b;
};
const bigMoov = (fourcc: string) => {
  const p = new Uint8Array(300_000); // katta moov: eski kod shu yerda RangeError bilan yiqilardi
  p.set(enc.encode(fourcc), 0);
  return box("moov", p);
};
const ftyp = box("ftyp", enc.encode("isom\0\0\0\0"));
const mdat = box("mdat", new Uint8Array(16));

test("katta moov (300 KB): H.264 aniqlanadi, faststart", async () => {
  assert.deepEqual(await inspectMp4(new Blob([ftyp, bigMoov("avc1"), mdat])), { codec: "h264", faststart: true });
});
test("katta moov (300 KB): HEVC aniqlanadi, moov oxirida", async () => {
  assert.deepEqual(await inspectMp4(new Blob([ftyp, mdat, bigMoov("hvc1")])), { codec: "hevc", faststart: false });
});
