// Lecteur audio : écoute verset par verset, surlignage synchronisé, boucle (AU-01..06).
import { DATA } from './data.js';
import { getClipURL } from './offline-audio.js';

export const RECITERS = [
  { id: 'Alafasy_128kbps',              name: 'Mishary Rashid Al-ʿAfâsy' },
  { id: 'Husary_128kbps',               name: 'Mahmoud Khalîl Al-Huṣary' },
  { id: 'Minshawy_Murattal_128kbps',    name: 'Muhammad Siddîq Al-Minshâwî (murattal)' },
  { id: 'Abdul_Basit_Murattal_192kbps', name: 'ʿAbd al-Bâsiṭ ʿAbd aṣ-Ṣamad (murattal)' },
  { id: 'Abdurrahmaan_As-Sudais_192kbps', name: 'ʿAbd ar-Rahmân As-Sudays' },
  { id: 'Saood_ash-Shuraym_128kbps',    name: 'Suʿûd Ash-Shuraym' },
  { id: 'Maher_AlMuaiqly_64kbps',       name: 'Mâhir Al-Muʿayqilî' },
  { id: 'Ghamadi_40kbps',               name: 'Saʿd Al-Ghâmidî' },
  { id: 'Yasser_Ad-Dussary_128kbps',    name: 'Yâsir Ad-Dawsarî' },
  { id: 'Hudhaify_128kbps',             name: 'ʿAlî Al-Ḥudhayfî' },
  { id: 'Abdul_Basit_Mujawwad_128kbps', name: 'ʿAbd al-Bâsiṭ ʿAbd aṣ-Ṣamad (mujawwad)' },
  { id: 'Muhammad_Ayyoub_128kbps',      name: 'Muhammad Ayyûb' },
  { id: 'Mohammad_al_Tablaway_128kbps', name: 'Muhammad Aṭ-Ṭablâwî' },
];

const BASE = 'https://everyayah.com/data/';

function pad3(n) { return String(n).padStart(3, '0'); }

function urlFor(reciter, g) {
  const a = DATA.byGlobal.get(g);
  if (!a) return null;
  return `${BASE}${reciter}/${pad3(a.s)}${pad3(a.a)}.mp3`;
}

class Player {
  constructor() {
    this.el = new Audio();
    this.el.preload = 'auto';
    this.reciter = 'Alafasy_128kbps';
    this.rate = 1.0;
    this.current = null;         // numéro global en cours
    this.loop = null;            // {from,to,count,mode:'whole'|'each'}
    this.pass = 0;
    this.unitRep = 0;
    this.on = { change() {}, state() {}, time() {}, stop() {} };

    this.el.addEventListener('ended', () => this._onEnded());
    this.el.addEventListener('play', () => { this.on.state(true); this._media(); });
    this.el.addEventListener('pause', () => this.on.state(false));
    this.el.addEventListener('timeupdate', () => this.on.time(this.el.currentTime, this.el.duration || 0));
    this.el.addEventListener('error', () => { if (this.current != null) this.on.state(false); });
    this._setupMedia();
  }

  setReciter(r) { this.reciter = r; }
  setRate(x) { this.rate = x; this.el.playbackRate = x; }

  get isPlaying() { return !this.el.paused && !this.el.ended && this.current != null; }

  async _load(g) {
    this.current = g;
    // Révoque l'URL blob précédente (hors-ligne) pour éviter les fuites mémoire
    if (this._blobURL) { try { URL.revokeObjectURL(this._blobURL); } catch {} this._blobURL = null; }
    // Priorité au clip téléchargé (hors-ligne), sinon flux réseau
    let url = null;
    try { url = await getClipURL(this.reciter, g); } catch {}
    if (url) this._blobURL = url; else url = urlFor(this.reciter, g);
    if (!url) return;
    if (this.current !== g) return; // un autre chargement a eu lieu entre-temps
    this.el.src = url;
    this.el.playbackRate = this.rate;
    this.on.change(g);
    try { await this.el.play(); } catch (e) { /* lecture auto refusée tant qu'il n'y a pas d'interaction */ }
    this._media();
  }

  playAyah(g, loop = null) {
    this.loop = loop;
    this.pass = 0;
    this.unitRep = 0;
    if (loop) { this._load(loop.from); } else { this._load(g); }
  }

  toggle() {
    if (this.current == null) return;
    if (this.el.paused) { this.el.play(); } else { this.el.pause(); }
  }

  next() {
    if (this.current == null) return;
    const g = Math.min(6236, this.current + 1);
    this.loop = null; this._load(g);
  }
  prev() {
    if (this.current == null) return;
    const g = Math.max(1, this.current - 1);
    this.loop = null; this._load(g);
  }

  stop() {
    this.el.pause();
    this.el.removeAttribute('src');
    const was = this.current;
    this.current = null; this.loop = null;
    this.on.stop(was);
    this.on.state(false);
  }

  seekFraction(fr) {
    if (this.el.duration) this.el.currentTime = fr * this.el.duration;
  }

  _onEnded() {
    const L = this.loop;
    if (L) {
      if (L.mode === 'each') {
        this.unitRep++;
        if (this.unitRep < L.count) { this._load(this.current); return; }
        this.unitRep = 0;
        const n = this.current + 1;
        if (n > L.to) { this.on.stop(this.current); this.on.state(false); return; }
        this._load(n); return;
      } else { // 'whole'
        const n = this.current + 1;
        if (n > L.to) {
          this.pass++;
          if (this.pass < L.count) { this._load(L.from); return; }
          this.on.stop(this.current); this.on.state(false); return;
        }
        this._load(n); return;
      }
    }
    // lecture continue
    const n = this.current + 1;
    if (n <= 6236) this._load(n);
    else { this.on.stop(this.current); this.on.state(false); }
  }

  _setupMedia() {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    ms.setActionHandler('play', () => this.toggle());
    ms.setActionHandler('pause', () => this.toggle());
    ms.setActionHandler('previoustrack', () => this.prev());
    ms.setActionHandler('nexttrack', () => this.next());
  }

  _media() {
    if (!('mediaSession' in navigator) || this.current == null) return;
    const a = DATA.byGlobal.get(this.current);
    const sur = DATA.surahByNum.get(a.s);
    const rec = RECITERS.find(r => r.id === this.reciter);
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${sur ? sur.en : 'Sourate ' + a.s} — verset ${a.a}`,
        artist: rec ? rec.name : 'Récitateur',
        album: 'Nûr al-Qur\'ân',
      });
    } catch {}
  }
}

export const player = new Player();
