// Interface de reconnaissance vocale, avec deux implémentations :
//  - WebSpeechRecognizer : API Web Speech du navigateur (version web / TWA).
//  - NativeRecognizer : plugin natif @capacitor-community/speech-recognition (app autonome).
// Le moteur d'alignement (tracker.js) est indépendant de l'implémentation choisie.

const SR = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition || null;

function cap() { return globalThis.Capacitor; }
function isNative() { return !!(cap() && cap().isNativePlatform && cap().isNativePlatform()); }
function nativePlugin() { return cap() && cap().Plugins ? cap().Plugins.SpeechRecognition : null; }

export function isSupported() { return !!SR || (isNative() && !!nativePlugin()); }
export function engineName() { return isNative() && nativePlugin() ? 'native' : (SR ? 'web' : 'none'); }

// ---- Web Speech (navigateur) ----
export class WebSpeechRecognizer {
  constructor(lang = 'ar-SA') {
    this.lang = lang; this.rec = null; this.active = false;
    this.on = { final() {}, interim() {}, state() {}, error() {}, end() {} };
  }
  start() { if (!SR) { this.on.error('unsupported'); return; } this.active = true; this._spawn(); }
  _spawn() {
    const rec = new SR();
    rec.lang = this.lang; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]; const txt = r[0] ? r[0].transcript : '';
        if (r.isFinal) this.on.final(txt); else this.on.interim(txt);
      }
    };
    rec.onstart = () => this.on.state(true);
    rec.onerror = (e) => { if (e.error && e.error !== 'no-speech' && e.error !== 'aborted') this.on.error(e.error); };
    rec.onend = () => {
      this.on.state(false);
      if (this.active) { try { rec.start(); } catch { setTimeout(() => this.active && this._spawn(), 300); } }
      else this.on.end();
    };
    this.rec = rec;
    try { rec.start(); } catch { this.on.error('start-failed'); }
  }
  stop() { this.active = false; if (this.rec) { try { this.rec.stop(); } catch {} } }
}

// ---- Reconnaissance native (Capacitor) ----
export class NativeRecognizer {
  constructor(lang = 'ar-SA') {
    this.lang = lang; this.active = false; this.plugin = nativePlugin();
    this.on = { final() {}, interim() {}, state() {}, error() {}, end() {} };
    this._partialHandle = null; this._stateHandle = null; this._lastEmit = '';
  }
  async start() {
    const p = this.plugin;
    if (!p) { this.on.error('unsupported'); return; }
    try {
      const perm = await p.requestPermissions();
      const g = perm && (perm.speechRecognition || perm.recordAudio || perm.granted);
      if (g && g !== 'granted' && g !== true) { this.on.error('not-allowed'); return; }
    } catch { /* certaines versions n'exigent pas requestPermissions */ }
    this.active = true;
    try {
      this._partialHandle = await p.addListener('partialResults', (data) => {
        const m = data && data.matches; if (m && m.length) this.on.interim(m[0]);
      });
      this._stateHandle = await p.addListener('listeningState', (data) => {
        const started = data && data.status === 'started';
        this.on.state(started);
        if (!started && this.active) setTimeout(() => this.active && this._listen(), 250);
      });
    } catch {}
    this._listen();
  }
  async _listen() {
    const p = this.plugin; if (!p || !this.active) return;
    try {
      const res = await p.start({ language: this.lang, maxResults: 2, partialResults: true, popup: false });
      // Selon la plateforme, start() peut renvoyer les correspondances finales
      const matches = res && res.matches;
      if (matches && matches.length) this.on.final(matches[0]);
    } catch (e) {
      const msg = (e && (e.message || e.code || '')).toString().toLowerCase();
      if (msg.includes('permission') || msg.includes('denied')) { this.on.error('not-allowed'); this.active = false; }
      // sinon : relance gérée par listeningState
    }
  }
  async stop() {
    this.active = false;
    const p = this.plugin;
    try { if (this._partialHandle) this._partialHandle.remove(); } catch {}
    try { if (this._stateHandle) this._stateHandle.remove(); } catch {}
    try { if (p) await p.stop(); } catch {}
    this.on.state(false); this.on.end();
  }
}

// Fabrique : choisit l'implémentation disponible.
export function createRecognizer(lang = 'ar-SA') {
  if (isNative() && nativePlugin()) return new NativeRecognizer(lang);
  return new WebSpeechRecognizer(lang);
}
