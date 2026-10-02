// Interface de reconnaissance vocale. Implémentation actuelle : API Web Speech du navigateur.
// Conçue pour être remplacée par un moteur embarqué hors-ligne (ex. Vosk WASM) sans toucher
// au moteur d'alignement (tracker.js). Voir docs — RV-05.

const SR = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition || null;

export function isSupported() { return !!SR; }

export class WebSpeechRecognizer {
  constructor(lang = 'ar-SA') {
    this.lang = lang;
    this.rec = null;
    this.active = false;       // session demandée par l'usager
    this.on = { final() {}, interim() {}, state() {}, error() {}, end() {} };
  }

  start() {
    if (!SR) { this.on.error('unsupported'); return; }
    this.active = true;
    this._spawn();
  }

  _spawn() {
    const rec = new SR();
    rec.lang = this.lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const txt = r[0] ? r[0].transcript : '';
        if (r.isFinal) this.on.final(txt);
        else this.on.interim(txt);
      }
    };
    rec.onstart = () => this.on.state(true);
    rec.onerror = (e) => {
      // 'no-speech' et 'aborted' sont bénins : on relancera via onend
      if (e.error && e.error !== 'no-speech' && e.error !== 'aborted') this.on.error(e.error);
    };
    rec.onend = () => {
      this.on.state(false);
      // L'API s'arrête périodiquement : on relance tant que la session est active.
      if (this.active) { try { rec.start(); } catch { setTimeout(() => this.active && this._spawn(), 300); } }
      else this.on.end();
    };

    this.rec = rec;
    try { rec.start(); } catch (err) { this.on.error('start-failed'); }
  }

  stop() {
    this.active = false;
    if (this.rec) { try { this.rec.stop(); } catch {} }
  }
}
