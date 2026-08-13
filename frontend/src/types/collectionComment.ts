export interface CollectionComment {
  id: string;
  collection_id: string;
  user_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  author: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface CollectionCommentsResponse {
  comments: CollectionComment[];
}
