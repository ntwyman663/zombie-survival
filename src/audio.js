export function createAudioSystem() {
  let audioCtx = null;
  let musicTimer = null;
  let musicStep = 0;
  let musicGain = null;

  function ensureAudio() {
    if (!audioCtx) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioCtor) audioCtx = new AudioCtor();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }

  function playTone(frequency, duration, gainValue, type = "sine") {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = gainValue;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration + 0.02);
  }

  function playShot(weapon) {
    if (!audioCtx) return;
    const base = weapon.id === "shotgun" ? 85 : weapon.id === "smg" ? 190 : 130;
    playTone(base, 0.055, 0.1, "sawtooth");
    playTone(base * 2.1, 0.035, 0.045, "square");
  }

  function startMusic() {
    ensureAudio();
    if (!audioCtx || musicTimer) return;
    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.045;
    musicGain.connect(audioCtx.destination);
    musicStep = 0;
    playMusicStep();
    musicTimer = window.setInterval(playMusicStep, 150);
  }

  function stopMusic() {
    if (musicTimer) window.clearInterval(musicTimer);
    musicTimer = null;
    if (musicGain) {
      musicGain.disconnect();
      musicGain = null;
    }
  }

  function playMusicTone(frequency, duration, gainValue, type = "square") {
    if (!audioCtx || !musicGain) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = gainValue;
    osc.connect(gain);
    gain.connect(musicGain);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration + 0.02);
  }

  function playNoise(duration, gainValue) {
    if (!audioCtx || !musicGain) return;
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * duration, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const noise = audioCtx.createBufferSource();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    filter.type = "highpass";
    filter.frequency.value = 1200;
    gain.gain.value = gainValue;
    noise.buffer = buffer;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);
    noise.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  }

  function playMusicStep() {
    const bass = [55, 55, 65.41, 55, 73.42, 65.41, 55, 49];
    const arp = [220, 261.63, 329.63, 392, 329.63, 261.63, 196, 164.81];
    const step = musicStep % 16;
    if (step % 2 === 0) playMusicTone(bass[(step / 2) % bass.length], 0.11, 0.22, "square");
    if ([3, 7, 11, 15].includes(step)) playNoise(0.045, 0.09);
    if (step % 4 !== 0) playMusicTone(arp[step % arp.length], 0.055, 0.09, "triangle");
    musicStep += 1;
  }

  return { ensureAudio, playTone, playShot, startMusic, stopMusic };
}
