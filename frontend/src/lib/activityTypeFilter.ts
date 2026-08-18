/** Filtro del feed de actividad por tipo (URL `?type=`). */

export type ActivityTypeFilter = 'capsule' | 'collection' | 'like' | 'comment';

export type ActivityListFilter = ActivityTypeFilter | null;

export const ACTIVITY_TYPE_FILTER_CHIPS: ReadonlyArray<{
  value: ActivityListFilter;
  label: string;
}> = [
  { value: null, label: 'Todas' },
  { value: 'capsule', label: 'Capsules' },
  { value: 'collection', label: 'Listas' },
  { value: 'like', label: 'Me gusta' },
  { value: 'comment', label: 'Comentarios' },
];

export function parseActivityTypeParam(value: string | null): ActivityListFilter {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === 'capsule' || v === 'collection' || v === 'like' || v === 'comment') return v;
  return null;
}

export function activityTypeSearchParams(type: ActivityListFilter): string {
  if (!type) return '';
  return `?type=${type}`;
}

export function activityTypePath(type: ActivityListFilter = null): string {
  return `/activity${activityTypeSearchParams(type)}`;
}

export function hasActivityTypeFilter(type: ActivityListFilter): boolean {
  return type != null;
}

export function activityTypeEmptyCopy(type: ActivityTypeFilter): {
  title: string;
  description: string;
} {
  switch (type) {
    case 'capsule':
      return {
        title: 'Sin Capsules recientes',
        description:
          'Cuando alguien a quien sigues publique, comente o dé me gusta a una Capsule, aparecerá aquí.',
      };
    case 'collection':
      return {
        title: 'Sin listas recientes',
        description: 'Cuando creen, comenten o den me gusta a una lista pública, aparecerá aquí.',
      };
    case 'like':
      return {
        title: 'Sin me gusta recientes',
        description: 'Cuando alguien a quien sigues dé me gusta a una Capsule o lista, aparecerá aquí.',
      };
    case 'comment':
      return {
        title: 'Sin comentarios recientes',
        description: 'Cuando comenten una Capsule o lista pública, aparecerá aquí.',
      };
  }
}

export function activityDocumentTitle(type: ActivityListFilter): string {
  if (type === 'capsule') return 'Actividad · Capsules';
  if (type === 'collection') return 'Actividad · Listas';
  if (type === 'like') return 'Actividad · Me gusta';
  if (type === 'comment') return 'Actividad · Comentarios';
  return 'Actividad · Ninety';
}
