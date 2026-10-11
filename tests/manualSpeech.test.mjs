import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compiled = ts.transpileModule(fs.readFileSync(new URL('../src/manualSpeech.ts', import.meta.url), 'utf8'), {compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ES2020}}).outputText;
const {createManualSpeech} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
globalThis.SpeechSynthesisUtterance = class { constructor(text) {this.text=text;} };
function harness() {
  const timers = new Map(); const listeners = new Set(); const spoken = []; const states = [];
  let next = 0; let voices=[];
  const host = {setTimeout(fn){timers.set(++next,fn);return next;},clearTimeout(id){timers.delete(id);},speechSynthesis:{cancel(){},getVoices(){return voices;},speak(u){spoken.push(u);},addEventListener(name,fn){listeners.add(fn);},removeEventListener(name,fn){listeners.delete(fn);}}};
  const speech = createManualSpeech(s=>states.push(s),host);
  return {speech,spoken,states,ready(){voices=[{name:'Neerja',lang:'en-IN'}];for(const fn of [...listeners])fn();},timers(){for(const fn of [...timers.values()])fn();}};
}
test('initialization is silent; a manual request starts playback',()=>{const h=harness();h.ready();assert.equal(h.spoken.length,0);h.speech.play('Manual answer','EN');assert.equal(h.spoken.length,1);assert.equal(h.spoken[0].text,'Manual answer');});
test('voiceschanged and timeout cannot speak the same answer twice',()=>{const h=harness();h.speech.play('One answer','EN');h.ready();h.timers();assert.equal(h.spoken.length,1);});
test('Stop cancels delayed speech even if voices load later',()=>{const h=harness();h.speech.play('Cancelled','EN');h.speech.stop();h.ready();h.timers();assert.equal(h.spoken.length,0);assert.equal(h.states.at(-1),false);});
test('new manual request replaces the previous pending answer',()=>{const h=harness();h.speech.play('Old','EN');h.speech.play('New','EN');h.ready();h.timers();assert.deepEqual(h.spoken.map(u=>u.text),['New']);});
test('logout/unmount cleanup cancels pending voice output',()=>{const h=harness();h.speech.play('Pending','EN');h.speech.dispose();h.ready();h.timers();assert.equal(h.spoken.length,0);});
test('late completion from an older utterance cannot stop the new control state',()=>{const h=harness();h.ready();h.speech.play('First','EN');h.speech.play('Second','EN');h.spoken[0].onend();assert.equal(h.states.at(-1),true);h.spoken[1].onend();assert.equal(h.states.at(-1),false);});
