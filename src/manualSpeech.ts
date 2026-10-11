/** Speech output is started only by an explicit Listen / Read aloud action. */
export function createManualSpeech(onState: (active: boolean) => void, host: Window = window) {
  let generation = 0;
  let cleanupPending = () => {};
  let disposed = false;

  function stop() {
    generation += 1;
    cleanupPending();
    cleanupPending = () => {};
    host.speechSynthesis?.cancel();
    if (!disposed) onState(false);
  }

  function play(text: string, language: "EN" | "HI") {
    stop();
    if (disposed || !text.trim() || !host.speechSynthesis) return;
    const synth = host.speechSynthesis;
    const request = generation;
    const targetLang = language === "HI" ? "hi-IN" : "en-IN";
    let started = false;
    onState(true);

    const begin = () => {
      if (started || disposed || request !== generation) return;
      started = true;
      cleanupPending();
      cleanupPending = () => {};
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = synth.getVoices();
      const matches = voices.filter(v => v.lang.toLowerCase() === targetLang.toLowerCase());
      const preferred = language === "HI" ? /swara|kalpana|hindi/i : /neerja|heera|raveena/i;
      utterance.voice = matches.find(v => preferred.test(v.name)) || matches[0] ||
        voices.find(v => v.lang.toLowerCase().startsWith(targetLang.slice(0, 2))) || null;
      utterance.lang = targetLang;
      utterance.rate = language === "HI" ? 0.98 : 1;
      utterance.pitch = 1.04;
      const finish = () => {
        if (!disposed && request === generation) onState(false);
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      try { synth.speak(utterance); } catch { finish(); }
    };

    if (synth.getVoices().length) begin();
    else {
      const timer = host.setTimeout(begin, 500);
      synth.addEventListener("voiceschanged", begin);
      cleanupPending = () => {
        host.clearTimeout(timer);
        synth.removeEventListener("voiceschanged", begin);
      };
    }
  }

  return { play, stop, dispose() { stop(); disposed = true; } };
}
