// Cours de tajwīd en français, avec exemples. Contenu pédagogique introductif.
// Les couleurs des exemples reprennent la légende de l'affichage tajwīd de l'application.

export function tajwidCourseHTML() {
  return `
  <p class="intro">Le <b>tajwīd</b> (التَّجْويد) désigne l'ensemble des règles qui permettent de
  prononcer le Coran correctement, comme il a été révélé et transmis. Ce cours est une
  <b>introduction</b> : le tajwīd s'apprend avant tout <b>auprès d'un maître</b> et par l'écoute
  des grands récitateurs. Les exemples colorés ci-dessous suivent la même légende que l'affichage
  tajwīd de l'application.</p>

  <h2>1. Avant de réciter</h2>
  <h3>L'isti'âdha et la basmala</h3>
  <p>On commence par chercher refuge en Allah, puis par la basmala :</p>
  <div class="ex"><div class="ar">أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ</div>
    <div class="exp">A'ûdhu bi-llâhi mina-sh-shayṭâni-r-rajîm — « Je cherche refuge… »</div></div>
  <div class="ex"><div class="ar">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
    <div class="exp">Bismi-llâhi-r-raḥmâni-r-raḥîm.</div></div>

  <h2>2. Le noûn sâkinah (نْ) et le tanwîn (ــًـ ـٍـ ـٌـ)</h2>
  <p>Quatre règles selon la lettre qui suit :</p>

  <h3>a. Al-Izhâr — l'éclaircissement</h3>
  <p>Devant les <b>lettres de la gorge</b> (ء ه ع ح غ خ), le noûn se prononce <b>clairement</b>, sans nasalisation prolongée.</p>
  <div class="ex"><div class="ar">مِنْ <span class="tj-silent">ه</span>َادٍ — أَنْ<span class="tj-silent">ع</span>َمْتَ</div>
    <div class="exp">La noûn est nette devant ه et ع.</div></div>

  <h3>b. Al-Idghâm — la fusion</h3>
  <p>Devant les lettres de <b>يَرْمَلُونَ</b> (ي ر م ل و ن), le noûn <b>fusionne</b> avec la lettre suivante.
  Avec <span class="rule-color tj-ghunna">nasalisation (ghunna)</span> pour (ي ن م و), et <b>sans</b> ghunna pour (ل ر).</p>
  <div class="ex"><div class="ar">مَن <span class="tj-ghunna">يَ</span>قُولُ — مِن <span class="tj-ghunna">وَ</span>الٍ</div>
    <div class="exp">Fusion avec ghunna : « may-yaqûlu », « miw-wâlin ».</div></div>
  <div class="ex"><div class="ar">مِن <span class="tj-idgham">رَّ</span>بِّهِمْ — مِن <span class="tj-idgham">لَّ</span>دُنْهُ</div>
    <div class="exp">Fusion sans ghunna avec ر et ل : « mir-rabbihim », « mil-ladunhu ».</div></div>

  <h3>c. Al-Iqlâb — la substitution</h3>
  <p>Devant la lettre <b>ب</b>, le noûn se transforme en un <span class="rule-color tj-iqlab">mîm</span> caché, avec ghunna.</p>
  <div class="ex"><div class="ar">مِن <span class="tj-iqlab">بَ</span>عْدِ — سَمِيعٌ <span class="tj-iqlab">بَ</span>صِيرٌ</div>
    <div class="exp">« mim-ba'di », « samî'um-baṣîr ».</div></div>

  <h3>d. Al-Ikhfâ' — la dissimulation</h3>
  <p>Devant les <b>quinze lettres restantes</b>, le noûn est <span class="rule-color tj-ikhfa">partiellement caché</span>, avec une légère ghunna.</p>
  <div class="ex"><div class="ar">أَن<span class="tj-ikhfa">تُ</span>مْ — مِن <span class="tj-ikhfa">قَ</span>بْلُ</div>
    <div class="exp">Son intermédiaire, nasalisé, vers ت et ق.</div></div>

  <h2>3. Le mîm sâkinah (مْ)</h2>
  <ul>
    <li><b>Ikhfâ' shafawî</b> : devant <b>ب</b>, mîm caché avec ghunna. Ex : <span class="ar" style="font-size:1.4rem">تَرْمِيهِم <span class="tj-ikhfa">بِ</span>حِجَارَةٍ</span></li>
    <li><b>Idghâm shafawî</b> : devant <b>م</b>, fusion avec ghunna. Ex : <span class="ar" style="font-size:1.4rem">لَهُم <span class="tj-ghunna">مَّ</span>ا</span></li>
    <li><b>Izhâr shafawî</b> : devant toutes les autres lettres, mîm clair.</li>
  </ul>

  <h2>4. Al-Qalqala — le rebond</h2>
  <p>Les lettres <b>قُطْبُ جَدٍ</b> (ق ط ب ج د), lorsqu'elles portent un sukûn, produisent un léger
  <span class="rule-color tj-qalqala">rebond</span> sonore.</p>
  <div class="ex"><div class="ar">قُل <span class="tj-qalqala">هُ</span>وَ — أَحَ<span class="tj-qalqala">دْ</span> — <span class="tj-qalqala">ٱقْ</span>رَأْ</div>
    <div class="exp">Rebond net surtout en fin de mot (qalqala kubrâ).</div></div>

  <h2>5. Al-Madd — la prolongation</h2>
  <h3>Madd naturel (2 temps)</h3>
  <p>Causé par les lettres de prolongation ا و ي ; on allonge de <b>deux temps</b>.</p>
  <div class="ex"><div class="ar">قَ<span class="tj-madd">ا</span>لَ — يَقُ<span class="tj-madd">و</span>لُ — قِ<span class="tj-madd">ي</span>لَ</div></div>
  <h3>Madd dérivé (allongé)</h3>
  <ul>
    <li><b>Muttasil</b> (obligatoire) : voyelle longue + hamza <b>dans le même mot</b> → 4–5 temps.
      Ex : <span class="ar" style="font-size:1.4rem">ج<span class="tj-madd">َا</span>ءَ — السَّم<span class="tj-madd">َا</span>ءِ</span></li>
    <li><b>Munfasil</b> : voyelle longue en fin de mot + hamza au début du suivant → 4–5 temps.</li>
    <li><b>Lâzim</b> (nécessaire) : suivi d'un sukûn permanent → <b>6 temps</b>.
      Ex : <span class="ar" style="font-size:1.4rem">الضّ<span class="tj-madd">َا</span>لّينَ — <span class="tj-madd">الٓمٓ</span></span></li>
    <li><b>'Âriḍ</b> : sukûn dû à l'arrêt en fin de verset → 2, 4 ou 6 temps.</li>
  </ul>

  <h2>6. La ghunna — la nasalisation</h2>
  <p>Le <b>noûn</b> et le <b>mîm</b> portant une <b>shadda</b> (نّ، مّ) se prononcent avec une
  <span class="rule-color tj-ghunna">nasalisation</span> d'environ deux temps.</p>
  <div class="ex"><div class="ar">إِ<span class="tj-ghunna">نّ</span> — ثُ<span class="tj-ghunna">مّ</span> — الجَ<span class="tj-ghunna">نّ</span>ةِ</div></div>

  <h2>7. Lâm solaire et lâm lunaire</h2>
  <p>L'article <b>الـ</b> :</p>
  <ul>
    <li><b>Lâm lunaire</b> : le ل se <b>prononce</b> (devant ء ب ج ح خ ع غ ف ق ك م ه و ي).
      Ex : <span class="ar" style="font-size:1.4rem">الْقَمَر — الْكِتَاب</span></li>
    <li><b>Lâm solaire</b> : le ل <b>ne se prononce pas</b> ; la lettre suivante est redoublée.
      Ex : <span class="ar" style="font-size:1.4rem">ال<span class="tj-silent">شَّ</span>مْس — ال<span class="tj-silent">رَّ</span>حْمَٰن</span></li>
  </ul>

  <h2>8. Les points d'articulation (makhârij)</h2>
  <p>Chaque lettre a un <b>point de sortie</b> précis (gorge, langue, lèvres…). Les respecter évite de
  confondre des lettres proches (ex. س / ص, ت / ط, ه / ح). C'est un point qui demande l'oreille et la
  correction d'un enseignant.</p>

  <h2>9. L'emphase et l'affinement (tafkhîm / tarqîq)</h2>
  <p>Certaines lettres se prononcent <b>emphatiques</b> (grosses, tafkhîm), d'autres <b>fines</b> (tarqîq).
  Les lettres d'élévation <b>خُصَّ ضَغْطٍ قِظْ</b> (خ ص ض غ ط ق ظ) sont toujours emphatiques.</p>

  <h3>La lettre Râ (ر)</h3>
  <ul>
    <li><b>Emphatique</b> : si elle porte fatha ou damma, ou sukûn précédé de fatha/damma.
      Ex : <span class="ar" style="font-size:1.4rem">رَبّ — رُزِقوا — وَالعَصْر</span></li>
    <li><b>Fine</b> : si elle porte kasra, ou sukûn précédé de kasra.
      Ex : <span class="ar" style="font-size:1.4rem">رِزْق — فِرْعَوْن</span></li>
  </ul>

  <h3>Le Lâm de « Allah » (lafẓ al-Jalâla)</h3>
  <ul>
    <li><b>Emphatique</b> après fatha ou damma : <span class="ar" style="font-size:1.4rem">قَالَ اللَّه — عَبْدُ اللَّه</span></li>
    <li><b>Fin</b> après kasra : <span class="ar" style="font-size:1.4rem">بِسْمِ اللَّه — قُلْ هُوَ اللَّه</span></li>
  </ul>

  <h2>10. La hamza : coupante et de liaison</h2>
  <ul>
    <li><b>Hamzat al-qaṭʿ</b> (ء / أ / إ) : toujours prononcée.</li>
    <li><b>Hamzat al-waṣl</b> (ٱ) : prononcée seulement en début de récitation, muette en liaison.
      Ex : <span class="ar" style="font-size:1.4rem"><span class="tj-silent">ٱ</span>لْحَمْدُ — قَالُوا <span class="tj-silent">ٱ</span>تَّخَذَ</span></li>
  </ul>

  <h2>11. Les signes de pause (ʿalâmât al-waqf)</h2>
  <p>De petits signes au-dessus du texte indiquent où s'arrêter ou poursuivre :</p>
  <ul>
    <li><b>مـ</b> : arrêt <b>obligatoire</b> (waqf lâzim).</li>
    <li><b>ﻻ</b> : <b>ne pas</b> s'arrêter.</li>
    <li><b>ج</b> : arrêt <b>autorisé</b> (indifférent).</li>
    <li><b>صلى</b> : il vaut mieux <b>continuer</b>.</li>
    <li><b>قلى</b> : il vaut mieux <b>s'arrêter</b>.</li>
    <li><b>∴ … ∴</b> (muʿânaqa) : s'arrêter à <b>l'un</b> des deux points, pas aux deux.</li>
  </ul>
  <p>Bien choisir ses pauses préserve le sens : on évite de s'arrêter au milieu d'une idée.</p>

  <h2>12. Les attributs des lettres (ṣifât) — aperçu</h2>
  <p>Au-delà du point d'articulation, chaque lettre a des <b>attributs</b> : sonore/sourde,
  forte/faible, avec ou sans sifflement, etc. Ils affinent la prononciation (ex. le
  <i>hams</i> souffle de ف ح ث, le <i>safîr</i> sifflement de س ص ز). Ce point s'acquiert surtout
  à l'oral.</p>

  <div class="note-adab">
    <b>Adab (bienséance).</b> Ce cours est une initiation. La récitation correcte s'acquiert par
    l'écoute attentive des récitateurs et la correction d'un maître (talaqqî). Qu'Allah facilite votre
    apprentissage. Les couleurs ci-dessus correspondent à l'option « Règles de tajwīd » de l'affichage,
    activable dans les Réglages.
  </div>
  `;
}
