import type { TaxonomyKind } from "@/lib/generated/prisma/client";

/**
 * The canonical starting taxonomy. This seeds the database; it is not read by
 * the app at runtime — once seeded, admins own these records through
 * /admin/taxonomy, and components read from the database.
 *
 * Slugs are the stable identity. Several deliberately match records that
 * already existed before the taxonomy upgrade (`afrobeat`, `randb`, `lo-fi`)
 * so re-seeding updates them rather than creating near-duplicates, and so
 * existing URLs keep resolving.
 *
 * A concept appears under exactly one kind. "Instrumental" is a VOCAL
 * characteristic, not also a LANGUAGE; "Cinematic" is a GENRE, not also a TAG.
 * Intersections ("Romantic wedding music") are queried, never stored as terms.
 */

export interface TermSeed {
  name: string;
  slug: string;
  description?: string;
  isFeatured?: boolean;
  children?: TermSeed[];
}

export const TAXONOMY: Record<TaxonomyKind, TermSeed[]> = {
  GENRE: [
    { name: "Afrobeats", slug: "afrobeat", isFeatured: true, description: "Rhythm-first music rooted in West African percussion, highlife and modern pop production." },
    { name: "Ambient", slug: "ambient", isFeatured: true, description: "Atmospheric music built around space, texture and immersive sound." },
    { name: "Electronic", slug: "electronic", isFeatured: true, description: "Synthesised sound, sequenced rhythm and everything the machines can dream up." },
    { name: "Cinematic", slug: "cinematic", isFeatured: true, description: "Widescreen, score-like compositions that feel like a scene unfolding." },
    { name: "Jazz", slug: "jazz", description: "Improvisation, swing and harmonic colour, from smoky clubs to modern fusion." },
    { name: "Classical", slug: "classical", description: "Orchestral, chamber and solo works in the classical tradition." },
    { name: "Hip-Hop", slug: "hip-hop", isFeatured: true, description: "Beat-driven music built on rhythm, sampling and low end." },
    { name: "R&B", slug: "randb", description: "Smooth grooves, soulful melody and late-night warmth." },
    { name: "Pop", slug: "pop", description: "Hook-forward songs built to be sung back." },
    { name: "Rock", slug: "rock", description: "Guitars, drums and energy, from anthemic to raw." },
    { name: "Reggae", slug: "reggae", description: "Offbeat rhythm and deep bass from the Jamaican tradition." },
    { name: "Soul", slug: "soul", description: "Expressive, gospel-rooted music with feeling at its core." },
    { name: "World", slug: "world", description: "Traditions and sounds from every corner of the globe." },
    { name: "Lo-Fi", slug: "lo-fi", description: "Warm, imperfect loops with tape texture and a relaxed pulse." },
    { name: "Highlife", slug: "highlife", description: "Guitar-led, horn-bright dance music from Ghana and Nigeria." },
  ],

  MOOD: [
    { name: "Calm", slug: "calm", isFeatured: true, description: "Music for slowing down, unwinding and finding a quieter moment." },
    { name: "Dreamy", slug: "dreamy", isFeatured: true, description: "Soft-focus, floating music that drifts somewhere just out of reach." },
    { name: "Happy", slug: "happy", description: "Bright, sunny music that lifts the room." },
    { name: "Romantic", slug: "romantic", isFeatured: true, description: "Tender, intimate music for moments shared with someone." },
    { name: "Dark", slug: "dark", description: "Brooding, shadowed music with tension and weight." },
    { name: "Epic", slug: "epic", isFeatured: true, description: "Soaring, large-scale music that feels like the big moment." },
    { name: "Chill", slug: "chill", description: "Easy-going, laid-back music with nowhere to be." },
    { name: "Motivational", slug: "motivational", description: "Driving music that pushes you forward." },
    { name: "Peaceful", slug: "peaceful", description: "Still, gentle music with room to breathe." },
    { name: "Melancholic", slug: "melancholic", description: "Bittersweet, reflective music that sits with a feeling." },
    { name: "Energetic", slug: "energetic", isFeatured: true, description: "High-intensity music with momentum from the first beat." },
    { name: "Nostalgic", slug: "nostalgic", description: "Music that sounds like a memory." },
    { name: "Uplifting", slug: "uplifting", description: "Hopeful music that raises the spirits." },
  ],

  ACTIVITY: [
    {
      name: "Sleep",
      slug: "sleep",
      isFeatured: true,
      description: "Music designed for winding down, falling asleep and a peaceful night.",
      children: [
        { name: "Deep Sleep", slug: "deep-sleep", description: "Slow, low-energy soundscapes for staying asleep." },
        { name: "Falling Asleep", slug: "falling-asleep", description: "Gentle music for the drift from awake to asleep." },
        { name: "Rain & Nature", slug: "rain-and-nature", description: "Natural textures and quiet rainfall." },
        { name: "Long Sleep Sessions", slug: "long-sleep-sessions", description: "Extended pieces that play through the night." },
      ],
    },
    {
      name: "Study",
      slug: "study",
      isFeatured: true,
      description: "Focused, unobtrusive music that helps you get through the work.",
      children: [
        { name: "Deep Focus", slug: "deep-focus", description: "Minimal, steady music for long stretches of concentration." },
        { name: "Lo-Fi Study", slug: "lo-fi-study", description: "Warm beats that keep you company without pulling focus." },
        { name: "Exam Preparation", slug: "exam-preparation", description: "Calm, steady music for revision and recall." },
      ],
    },
    { name: "Focus", slug: "focus", isFeatured: true, description: "Music that clears the noise so you can think." },
    { name: "Work", slug: "work", description: "Background music that keeps the day moving." },
    { name: "Coding", slug: "coding", description: "Steady, instrumental music for getting into flow." },
    { name: "Workout", slug: "workout", isFeatured: true, description: "High-energy music to power through the session." },
    { name: "Running", slug: "running", description: "Driving rhythm to keep your pace." },
    { name: "Meditation", slug: "meditation", isFeatured: true, description: "Still, spacious music for breath and presence." },
    { name: "Reading", slug: "reading", description: "Quiet music that sits softly behind the page." },
    { name: "Yoga", slug: "yoga", description: "Flowing, grounded music for movement and stillness." },
    { name: "Relaxation", slug: "relaxation", isFeatured: true, description: "Music for letting the day go." },
    { name: "Travel", slug: "travel", description: "Music for the road, the window seat and the journey." },
  ],

  OCCASION: [
    {
      name: "Wedding",
      slug: "wedding",
      isFeatured: true,
      description: "Music for every moment of your wedding.",
      children: [
        {
          name: "Ceremony",
          slug: "wedding-ceremony",
          description: "From the first entrance to the final walk.",
          children: [
            { name: "Bride Entrance", slug: "bride-entrance" },
            { name: "Groom Entrance", slug: "groom-entrance" },
            { name: "Processional", slug: "processional" },
            { name: "Vows", slug: "vows" },
            { name: "Recessional", slug: "recessional" },
          ],
        },
        {
          name: "Reception",
          slug: "wedding-reception",
          description: "The first dance through to the last song.",
          children: [
            { name: "First Dance", slug: "first-dance" },
            { name: "Wedding Dinner", slug: "wedding-dinner" },
            { name: "Dance Floor", slug: "dance-floor" },
            { name: "Wedding Celebration", slug: "wedding-celebration" },
            { name: "Closing", slug: "wedding-closing" },
          ],
        },
        {
          name: "African Wedding",
          slug: "african-wedding",
          description: "Afrobeat, highlife and Afro-romantic music for the celebration.",
          children: [
            { name: "Afrobeat Wedding", slug: "afrobeat-wedding" },
            { name: "Highlife Wedding", slug: "highlife-wedding" },
            { name: "Afro-Romantic", slug: "afro-romantic" },
          ],
        },
      ],
    },
    { name: "Dinner", slug: "dinner", isFeatured: true, description: "Warm, conversational music for the table." },
    { name: "Romantic Evening", slug: "romantic-evening", isFeatured: true, description: "Intimate music for a night in together." },
    { name: "Birthday", slug: "birthday", description: "Bright music to celebrate someone." },
    { name: "Party", slug: "party", isFeatured: true, description: "Music to get people moving." },
    { name: "Celebration", slug: "celebration", description: "Joyful music for the big wins." },
    { name: "Ceremony", slug: "ceremony", description: "Dignified music for formal moments." },
    { name: "Memorial", slug: "memorial", description: "Respectful, reflective music for remembrance." },
    { name: "Road Trip", slug: "road-trip", description: "Music for long drives and open roads." },
  ],

  INSTRUMENT: [
    { name: "Piano", slug: "piano" },
    { name: "Guitar", slug: "guitar" },
    { name: "Acoustic Guitar", slug: "acoustic-guitar" },
    { name: "Drums", slug: "drums" },
    { name: "Bass", slug: "bass" },
    { name: "Synth", slug: "synth" },
    { name: "Strings", slug: "strings" },
    { name: "Violin", slug: "violin" },
    { name: "Brass", slug: "brass" },
    { name: "Saxophone", slug: "saxophone" },
    { name: "Flute", slug: "flute" },
    { name: "Percussion", slug: "percussion" },
    { name: "Kora", slug: "kora" },
  ],

  LANGUAGE: [
    { name: "English", slug: "english" },
    { name: "French", slug: "french" },
    { name: "German", slug: "german" },
    { name: "Spanish", slug: "spanish" },
    { name: "Portuguese", slug: "portuguese" },
    { name: "Arabic", slug: "arabic" },
    { name: "Japanese", slug: "japanese" },
    { name: "Chinese", slug: "chinese" },
    { name: "Swahili", slug: "swahili" },
    { name: "Yoruba", slug: "yoruba" },
    { name: "Other", slug: "other" },
  ],

  VOCAL: [
    { name: "Instrumental", slug: "instrumental" },
    { name: "Vocals", slug: "vocals" },
    { name: "Male Vocals", slug: "male-vocals" },
    { name: "Female Vocals", slug: "female-vocals" },
    { name: "Choir", slug: "choir" },
    { name: "Spoken Word", slug: "spoken-word" },
  ],

  TAG: [
    { name: "African", slug: "african" },
    { name: "Night", slug: "night" },
    { name: "Rain", slug: "rain" },
    { name: "Luxury", slug: "luxury" },
    { name: "Elegant", slug: "elegant" },
    { name: "Acoustic", slug: "acoustic" },
    { name: "Nature", slug: "nature" },
    { name: "Retro", slug: "retro" },
    { name: "Futuristic", slug: "futuristic" },
    { name: "Space", slug: "space" },
    { name: "Ocean", slug: "ocean" },
  ],
};
