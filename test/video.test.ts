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
