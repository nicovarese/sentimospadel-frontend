
export interface RatingResult {
  rating: number;
  categoryNumber: number;
  categoryName: string;
  scoreS: number;
  scoreS40: number;
  valuesEffective: number[];
  appliedRules: string[];
}

export const QUESTIONS = [
  {
    id: 'Q1',
    weight: 5,
    text: 'Si tuvieras que definir tu nivel hoy, dirías que sos…',
    options: [
      { label: 'Principiante', value: 0 },
      { label: 'Principiante alto', value: 1 },
      { label: 'Intermedio', value: 2 },
      { label: 'Intermedio alto', value: 3 },
      { label: 'Avanzado', value: 4 },
    ],
  },
  {
    id: 'Q2',
    weight: 4,
    text: 'Hace cuánto jugás pádel de forma relativamente constante',
    options: [
      { label: '<3 meses', value: 0 },
      { label: '3–12 meses', value: 1 },
      { label: '1–2 años', value: 2 },
      { label: '2–4 años', value: 3 },
      { label: '4+ años', value: 4 },
    ],
  },
  {
    id: 'Q3',
    weight: 4,
    text: 'Cuántos partidos/jugadas de pádel hacés por semana (promedio)',
    options: [
      { label: 'Menos de 1', value: 0 },
      { label: '1', value: 1 },
      { label: '2', value: 2 },
      { label: '3', value: 3 },
      { label: '4 o más', value: 4 },
    ],
  },
  {
    id: 'Q4',
    weight: 3,
    text: 'Jugaste torneos/ligas (aunque sean amateurs)',
    options: [
      { label: 'Nunca', value: 0 },
      { label: '1 vez', value: 1 },
      { label: 'Algunas veces', value: 2 },
      { label: 'Varias veces al año', value: 3 },
      { label: 'Regularmente / liga fija', value: 4 },
    ],
  },
  {
    id: 'Q5',
    weight: 3,
    text: 'Tomás clases o entrenás con profesor',
    options: [
      { label: 'Nunca', value: 0 },
      { label: 'Tomé pocas veces', value: 1 },
      { label: 'Tomo cada tanto', value: 2 },
      { label: 'Tomo con frecuencia', value: 3 },
      { label: 'Entreno regularmente (semanal o más)', value: 4 },
    ],
  },
  {
    id: 'Q6',
    weight: 6,
    text: 'En un partido, tu consistencia general es…',
    options: [
      { label: 'Se me va rápido, cometo muchos errores', value: 0 },
      { label: 'Muy irregular', value: 1 },
      { label: 'Bastante estable', value: 2 },
      { label: 'Estable incluso con presión', value: 3 },
      { label: 'Muy estable, casi no regalo puntos', value: 4 },
    ],
  },
  {
    id: 'Q7',
    weight: 4,
    text: 'Bandeja / víbora / rulo: qué tan seguido te salen “como querés”',
    options: [
      { label: 'Casi nunca / no las uso', value: 0 },
      { label: 'A veces, pero muy irregular', value: 1 },
      { label: 'Me salen seguido en pelotas cómodas', value: 2 },
      { label: 'Me salen seguido incluso con presión moderada', value: 3 },
      { label: 'Las uso con intención para atacar o sostener ataque', value: 4 },
    ],
  },
  {
    id: 'Q8',
    weight: 4,
    text: 'Cuando te tiran un globo y tenés que resolver arriba',
    options: [
      { label: 'Me complica casi siempre', value: 0 },
      { label: 'La paso como puedo', value: 1 },
      { label: 'La resuelvo bastante bien', value: 2 },
      { label: 'La resuelvo y quedo bien posicionado', value: 3 },
      { label: 'La resuelvo y muchas veces saco ventaja', value: 4 },
    ],
  },
  {
    id: 'Q9',
    weight: 2,
    text: 'Sacar la pelota de la cancha (o “traerla”)',
    options: [
      { label: 'Nunca / no lo intento', value: 0 },
      { label: 'Muy raro', value: 1 },
      { label: 'A veces, en pelotas ideales', value: 2 },
      { label: 'Bastante seguido', value: 3 },
      { label: 'Lo hago con facilidad cuando se presenta la oportunidad', value: 4 },
    ],
  },
  {
    id: 'Q10',
    weight: 5,
    text: 'En qué tipo de grupo solés jugar hoy',
    options: [
      { label: 'Con gente que recién empieza', value: 0 },
      { label: 'Mayormente principiantes', value: 1 },
      { label: 'Intermedios', value: 2 },
      { label: 'Intermedios altos / competitivos amateurs', value: 3 },
      { label: 'Gente fuerte (segunda/primera de clubes, o muy competitivos)', value: 4 },
    ],
  },
];

export const ratingToUruguayCategory = (rating: number): { category_number: number; category_name: string } => {
  if (rating >= 6.40) return { category_number: 1, category_name: 'Primera' };
  if (rating >= 5.50) return { category_number: 2, category_name: 'Segunda' };
  if (rating >= 4.80) return { category_number: 3, category_name: 'Tercera' };
  if (rating >= 4.10) return { category_number: 4, category_name: 'Cuarta' };
  if (rating >= 3.40) return { category_number: 5, category_name: 'Quinta' };
  if (rating >= 2.60) return { category_number: 6, category_name: 'Sexta' };
  return { category_number: 7, category_name: 'Séptima' };
};

export const computeInitialRating = (answers: number[]): RatingResult => {
  const appliedRules: string[] = [];
  const valuesEffective = [...answers];

  // Rule: Q9 (sacar/traer) SOLO se toma en cuenta si Q6_value >= 2
  if (answers[5] < 2) {
    valuesEffective[8] = Math.min(answers[8], 1);
    appliedRules.push('Anti-inflación Q9: Limitado por baja consistencia (Q6 < 2)');
  }

  // Weighted Score S
  let scoreS = 0;
  QUESTIONS.forEach((q, i) => {
    scoreS += q.weight * valuesEffective[i];
  });

  // Normalized Score S40
  const scoreS40 = scoreS / 4;

  // Map S40 to Rating R
  let r = 0;
  if (scoreS40 <= 10) {
    r = 1.00 + (scoreS40 / 10) * 1.40;
  } else if (scoreS40 <= 24) {
    r = 2.40 + ((scoreS40 - 10) / 14) * 2.30;
  } else if (scoreS40 <= 35) {
    r = 4.70 + ((scoreS40 - 24) / 11) * 1.20;
  } else {
    r = 5.90 + ((scoreS40 - 35) / 5) * 1.10;
  }

  // Gates
  // Gate Primera (R >= 6.40): Q10 >= 3 AND Q6 >= 3
  if (r >= 6.40 && (valuesEffective[9] < 3 || valuesEffective[5] < 3)) {
    r = 6.39;
    appliedRules.push('Gate Primera: No cumple requisitos de grupo o consistencia');
  }

  // Gate Segunda (R >= 5.50): Q6 >= 2
  if (r >= 5.50 && valuesEffective[5] < 2) {
    r = 5.49;
    appliedRules.push('Gate Segunda: No cumple requisito de consistencia mínima');
  }

  const rating = Math.round(r * 100) / 100;
  const { category_number, category_name } = ratingToUruguayCategory(rating);

  return {
    rating,
    categoryNumber: category_number,
    categoryName: category_name,
    scoreS,
    scoreS40,
    valuesEffective,
    appliedRules,
  };
};
