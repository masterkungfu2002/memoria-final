export type AlbumPhoto = {
  url: string;
  caption: string;
};

export type Album = {
  id: string;
  admin_id: string;
  recipient_name: string;
  cover_image: string;
  photos: AlbumPhoto[];
  video_url: string;
  background_music_url: string;
  created_at: string;
};

export type Feedback = {
  id: string;
  album_id: string;
  rating: number;
  comment: string;
  created_at: string;
};
