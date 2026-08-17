export type FollowActivityActor = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type FollowActivityCapsule = {
  id: string;
  home_team_name: string;
  away_team_name: string;
  competition_name: string | null;
  rating: number | null;
  photo_urls: string[] | null;
  watched_at: string | null;
};

export type FollowActivityCollection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  author_username?: string | null;
};

export type FollowActivityEvent =
  | {
      id: string;
      type: 'capsule';
      occurred_at: string;
      actor: FollowActivityActor;
      capsule: FollowActivityCapsule;
    }
  | {
      id: string;
      type: 'capsule_like';
      occurred_at: string;
      actor: FollowActivityActor;
      capsule: FollowActivityCapsule;
    }
  | {
      id: string;
      type: 'capsule_comment';
      occurred_at: string;
      actor: FollowActivityActor;
      capsule: FollowActivityCapsule;
      comment_body: string;
    }
  | {
      id: string;
      type: 'collection';
      occurred_at: string;
      actor: FollowActivityActor;
      collection: FollowActivityCollection;
    }
  | {
      id: string;
      type: 'collection_like';
      occurred_at: string;
      actor: FollowActivityActor;
      collection: FollowActivityCollection;
    }
  | {
      id: string;
      type: 'collection_comment';
      occurred_at: string;
      actor: FollowActivityActor;
      collection: FollowActivityCollection;
      comment_body: string;
    };

export type FollowActivityResponse = {
  events: FollowActivityEvent[];
  total: number;
  following_count: number;
  limit: number;
  offset: number;
};
