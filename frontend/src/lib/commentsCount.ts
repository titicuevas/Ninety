/** Etiqueta del contador de comentarios (botón y línea de invitados). */
export function formatCommentsCountLabel(count: number): string {
  if (count <= 0) return 'Comentar';
  if (count === 1) return '1 comentario';
  return `${count} comentarios`;
}
