export function calcularAfinidad(current, candidate) {
  const currentSubjects = new Set(
    (current.subjects || []).map((subject) => subject.toLowerCase()),
  );
  const sharedSubjects = (candidate.subjects || []).filter((subject) =>
    currentSubjects.has(subject.toLowerCase()),
  );
  let score = 35 + Math.min(sharedSubjects.length * 25, 45);
  if (current.availability === candidate.availability) score += 12;
  if (current.studyPreference === candidate.studyPreference) score += 8;
  return { score: Math.min(score, 99), sharedSubjects };
}

export function formatearFecha(value, options) {
  return new Intl.DateTimeFormat("es-EC", options).format(new Date(value));
}
