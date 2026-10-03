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
// Sur Android, start() ne renvoie pas les résultats : ils arrivent par l'événement
// 'partialResults', et la fin d'une phrase par 'listeningState: stopped'. On relance
// alors l'écoute (mode continu), en ne demandant la permission qu'une seule fois.
export class NativeRecognizer {
  constructor(lang = 'ar-SA') {
    this.lang = lang; this.active = false; this.plugin = nativePlugin();
    this.on = { final() {}, interim() {}, state() {}, error() {}, end() {} };
    this._ph = null; this._sh = null; this._last = ''; this._starting = false;
  }
  async _ensurePermission() {
    const p = this.plugin;
    try {
      let st = null;
      if (p.checkPermissions) { try { st = await p.checkPermissions(); } catch {} }
      let granted = st && (st.speechRecognition === 'granted');
      if (!granted) {
        const req = await p.requestPermissions();
        granted = req && (req.speechRecognition === 'granted' || req.speechRecognition === true || req.granted === true);
      }
      return granted;
    } catch { return true; } // certaines versions n'exposent pas les permissions
  }
  async start() {
    const p = this.plugin;
    if (!p) { this.on.error('unsupported'); return; }
    const granted = await this._ensurePermission();
    if (!granted) { this.on.error('not-allowed'); return; }
    try { const av = await (p.available ? p.available() : null); if (av && av.available === false) { this.on.error('unsupported'); return; } } catch {}
    this.active = true;
    try {
      this._ph = await p.addListener('partialResults', (d) => {
        const m = d && d.matches; if (m && m.length) { this._last = m[0]; this.on.interim(m[0]); }
      });
      this._sh = await p.addListener('listeningState', (d) => {
        const status = d && d.status;
        if (status === 'started') { this.on.state(true); }
        else {
          this.on.state(false);
          if (this._last) { this.on.final(this._last); this._last = ''; }
          if (this.active) setTimeout(() => this._listen(), 600);
        }
      });
    } catch {}
    this._listen();
  }
  async _listen() {
    const p = this.plugin;
    if (!p || !this.active || this._starting) return;
    this._starting = true;
    try {
      await p.start({ language: this.lang, maxResults: 3, partialResults: true, popup: false });
      this._starting = false;
    } catch (e) {
      this._starting = false;
      const msg = ((e && (e.message || e.code)) || '').toString().toLowerCase();
      if (msg.includes('permission') || msg.includes('denied')) { this.on.error('not-allowed'); this.active = false; }
      else if (this.active) setTimeout(() => this._listen(), 800); // occupé / pas de parole : on réessaie
    }
  }
  async stop() {
    this.active = false; this._last = '';
    const p = this.plugin;
    try { if (this._ph) (await this._ph).remove ? (await this._ph).remove() : this._ph.remove(); } catch {}
    try { if (this._sh) this._sh.remove(); } catch {}
    try { if (p) await p.stop(); } catch {}
    this.on.state(false); this.on.end();
  }
}

// Fabrique : choisit l'implémentation disponible.
export function createRecognizer(lang = 'ar-SA') {
  if (isNative() && nativePlugin()) return new NativeRecognizer(lang);
  return new WebSpeechRecognizer(lang);
}
