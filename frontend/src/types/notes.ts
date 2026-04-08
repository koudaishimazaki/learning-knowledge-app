export type Note = {
  id: string;
  title: string;
  markdown_content: string;
  summary: string | null;
  is_starred: boolean;
  topic_id: string | null;
  tag_ids: string[];
  created_at: string;
  updated_at: string;
};

export type Topic = {
  id: string;
  name: string;
  color: string;
  icon_type: "emoji" | "image";
  icon_emoji: string | null;
  icon_image_url: string | null;
};

export type Tag = {
  id: string;
  name: string;
};

