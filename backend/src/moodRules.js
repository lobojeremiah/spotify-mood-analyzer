// Metadata-based mood inference only. Tracks without a matching MusicBrainz tag
// remain unclassified and are never assigned a mood by title or artist.
export const MOOD_TAGS = {
  Happy: ["happy", "uplifting", "joyful", "fun", "feel good"],
  Sad: ["sad", "melancholic", "melancholy", "heartbreak", "sadness"],
  Energetic: ["energetic", "energy", "dance", "dance-pop", "upbeat", "workout"],
  Calm: ["calm", "chill", "chillout", "ambient", "relaxing", "relaxed"],
  Romantic: ["romantic", "love", "ballad"],
  Reflective: ["reflective", "introspective", "contemplative"],
  Dark: ["dark", "darkwave", "gothic", "angry"]
};

const normalizedTagMood = new Map(Object.entries(MOOD_TAGS).flatMap(([mood, tags]) => tags.map((tag) => [tag.toLowerCase(), mood])));
export function moodForTag(tag) { return normalizedTagMood.get(String(tag).toLowerCase()) || null; }
