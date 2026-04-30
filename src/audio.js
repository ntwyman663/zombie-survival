export function createAudioSystem() {
  let audioCtx = null;

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

  return { ensureAudio, playTone, playShot };
}
