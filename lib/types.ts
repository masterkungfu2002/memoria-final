export type AlbumProfileMode = "genz" | "classic" | "auto";

export type AlbumThemePreset =
  | "genz-midnight"
  | "genz-dreamy-lilac"
  | "genz-warm-blush"
  | "genz-sunset-rose"
  | "classic-walnut"
  | "classic-ivory"
  | "classic-sepia"
  | "classic-espresso";

export type AlbumPhoto = {
  url: string;
  caption: string;
  title?: string;
  chapter?: string;
  hidden_note?: string;
  highlight?: boolean;
};

export type Album = {
  id: string;
  admin_id: string;
  recipient_name: string;
  sender_name?: string;
  occasion?: string;
  opening_letter?: string;
  opening_message?: string;
  letter_signoff?: string;
  final_message?: string;
  relationship_mode?: AlbumProfileMode;
  profile_mode?: AlbumProfileMode;
  theme_preset?: AlbumThemePreset | string;
  important_date?: string;
  location_label?: string;
  voice_url?: string;
  unlock_date?: string;
  time_capsule_message?: string;
  setup_token?: string;
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
