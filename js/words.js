// Découpage d'un verset en mots — utilisé à l'identique par le rendu et le moteur d'alignement,
// afin que les index de mots concordent entre le DOM et la logique.
export function splitArabic(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean);
}
