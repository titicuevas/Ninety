export interface CapsuleComment {
  id: string;
  capsule_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface CapsuleCommentsResponse {
  comments: CapsuleComment[];
}
