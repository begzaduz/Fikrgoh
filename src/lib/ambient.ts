/** Fon shovqini (yumshoq "yomg‘ir/shamol" ovozi): tayyor fayl kerak emas, Web Audio bilan hosil qilinadi. */
export function createAmbient() {
  let ctx: AudioContext | null = null;
  let gain: GainNode | null = null;
  let src: AudioBufferSourceNode | null = null;

  const start = () => {
    if (ctx) return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    // Oq shovqin takrorlanganda "tiq" bermaydi; past chastotali filtr uni yumshoq shovqinga aylantiradi.
    const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 650;
    gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(lp).connect(gain).connect(ctx.destination);
    src.start();
    void ctx.resume();
    gain.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 1.2); // yumshoq boshlanadi
  };

  const stop = () => {
    const c = ctx, g = gain, s = src;
    ctx = gain = src = null;
    if (!c || !g || !s) return;
    g.gain.cancelScheduledValues(c.currentTime);
    g.gain.setValueAtTime(g.gain.value, c.currentTime);
    g.gain.linearRampToValueAtTime(0, c.currentTime + 0.3);
    window.setTimeout(() => { try { s.stop(); } catch { /* allaqachon to‘xtagan */ } void c.close(); }, 350);
  };

  return { start, stop };
}
