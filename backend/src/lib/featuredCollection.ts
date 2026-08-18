import type { SupabaseClient } from '@supabase/supabase-js';
import { attachCollectionAlsoFollowed } from './collectionAlsoFollowed.js';
import { resolveCollectionCoverUrl } from './collectionCover.js';
import type { CollectionAlsoLikedPerson } from './collectionLikes.js';

export type FeaturedCollectionSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  items_count: number;
  likes_count: number;
  comments_count: number;
  also_liked?: CollectionAlsoLikedPerson[];
  also_commented?: CollectionAlsoLikedPerson[];
};

export function isMissingFeaturedCollectionColumn(error: unknown): boolean {
  const message =
    error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);

  return (
    message.includes('featured_collection_id') &&
    (message.includes('schema cache') ||
      message.includes('Could not find') ||
      message.includes('column') ||
      message.includes('does not exist'))
  );
}

export function featuredCollectionMigrationHint(): string {
  return 'Ejecuta la migración 20250826120000_featured_collection.sql en Supabase.';
}

/** Carga resumen de colección destacada (solo si es pública o propia). */
export async function loadFeaturedCollectionSummary(
  supabase: SupabaseClient,
  featuredCollectionId: string | null | undefined,
  opts: { viewerId?: string; ownerId: string },
): Promise<FeaturedCollectionSummary | null> {
  if (!featuredCollectionId) return null;

  const { data: collection, error } = await supabase
    .from('collections')
    .select('id, user_id, name, slug, description, is_public, cover_capsule_id')
    .eq('id', featuredCollectionId)
    .maybeSingle();

  if (error || !collection) return null;
  if (collection.user_id !== opts.ownerId) return null;

  const isOwner = !!opts.viewerId && opts.viewerId === collection.user_id;
  if (!collection.is_public && !isOwner) return null;

  const { count } = await supabase
    .from('collection_items')
    .select('capsule_id', { count: 'exact', head: true })
    .eq('collection_id', collection.id);

  const { count: likesCount } = await supabase
    .from('collection_likes')
    .select('user_id', { count: 'exact', head: true })
    .eq('collection_id', collection.id);

  const { count: commentsCount } = await supabase
    .from('collection_comments')
    .select('id', { count: 'exact', head: true })
    .eq('collection_id', collection.id);

  let coverUrl: string | null = null;
  if (collection.cover_capsule_id) {
    const { data: capsule } = await supabase
      .from('capsules')
      .select('id, photo_urls, is_public')
      .eq('id', collection.cover_capsule_id)
      .maybeSingle();
    if (capsule && (isOwner || capsule.is_public !== false)) {
      coverUrl = resolveCollectionCoverUrl({
        coverCapsuleId: collection.cover_capsule_id,
        capsules: [capsule as { id: string; photo_urls?: string[] | null }],
      });
    }
  }

  if (!coverUrl) {
    const { data: items } = await supabase
      .from('collection_items')
      .select('capsule_id')
      .eq('collection_id', collection.id)
      .order('position', { ascending: true })
      .limit(6);
    const ids = (items ?? []).map((row) => row.capsule_id as string);
    if (ids.length > 0) {
      let q = supabase.from('capsules').select('id, photo_urls, is_public').in('id', ids);
      if (!isOwner) q = q.eq('is_public', true);
      const { data: capsules } = await q;
      coverUrl = resolveCollectionCoverUrl({
        coverCapsuleId: null,
        capsules: (capsules ?? []) as Array<{ id: string; photo_urls?: string[] | null }>,
      });
    }
  }

  const [withFollowed] = await attachCollectionAlsoFollowed(opts.viewerId ?? '', [
    { id: collection.id as string, user_id: collection.user_id as string },
  ]);

  return {
    id: collection.id as string,
    name: collection.name as string,
    slug: collection.slug as string,
    description: (collection.description as string | null) ?? null,
    cover_url: coverUrl,
    items_count: count ?? 0,
    likes_count: likesCount ?? 0,
    comments_count: commentsCount ?? 0,
    also_liked: withFollowed?.also_liked ?? [],
    also_commented: withFollowed?.also_commented ?? [],
  };
}

/** Valida que la colección sea del usuario y pública. */
export async function assertFeaturedCollectionAllowed(
  supabase: SupabaseClient,
  userId: string,
  collectionId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('collections')
    .select('id, user_id, is_public')
    .eq('id', collectionId)
    .maybeSingle();

  if (error) {
    if (isMissingFeaturedCollectionColumn(error)) {
      return featuredCollectionMigrationHint();
    }
    return error.message;
  }
  if (!data || data.user_id !== userId) {
    return 'Colección no encontrada';
  }
  if (!data.is_public) {
    return 'Solo puedes destacar una colección pública';
  }
  return null;
}
