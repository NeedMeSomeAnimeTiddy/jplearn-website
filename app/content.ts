// Single source of truth for JPLearn facts shown across all site versions.
// Derived from the app repository's FEATURES.md — keep claims in sync with it.

export const GITHUB_URL = "https://github.com/NeedMeSomeAnimeTiddy/JPLearn";
export const GITHUB_WATCH_URL = `${GITHUB_URL}/subscription`;

export type Track = {
  glyph: string;
  name: string;
  jp: string;
  detail: string;
};

export const tracks: Track[] = [
  { glyph: "あ", name: "Hiragana", jp: "ひらがな", detail: "The full set — 104 characters including voiced sounds and digraphs." },
  { glyph: "カ", name: "Katakana", jp: "カタカナ", detail: "Every katakana, mirroring the hiragana structure." },
  { glyph: "漢", name: "Kanji", jp: "漢字", detail: "JLPT N5 through N1, grouped by theme and built from components." },
  { glyph: "語", name: "Vocabulary", jp: "語彙", detail: "N5–N1 vocabulary in thematic groups — food, travel, school, work." },
  { glyph: "文", name: "Grammar", jp: "文法", detail: "64+ patterns from the copula to conditionals, drilled in context." },
  { glyph: "読", name: "Sentences", jp: "例文", detail: "A 200,000+ sentence bank for reading and cloze practice." },
];

export type Mode = {
  name: string;
  jp: string;
  category: "Recognition" | "Recall" | "Challenge" | "Listening" | "Blended";
  detail: string;
};

export const modes: Mode[] = [
  { name: "Romaji Sprint", jp: "ローマ字", category: "Recognition", detail: "Type the reading as fast as you can." },
  { name: "Meaning Match", jp: "意味", category: "Recognition", detail: "Pick the right meaning from four." },
  { name: "Character Match", jp: "文字", category: "Recognition", detail: "Pick the character for the meaning." },
  { name: "Stroke Order", jp: "筆順", category: "Recall", detail: "Type kanji from meaning, stroke by stroke." },
  { name: "Handwriting", jp: "手書き", category: "Recall", detail: "Draw it on canvas — order, direction, completeness all checked." },
  { name: "Typed Recall", jp: "入力", category: "Recall", detail: "Type the meaning. Near-misses are judged fairly." },
  { name: "Speech Recall", jp: "発話", category: "Recall", detail: "Say it aloud — graded offline by Whisper." },
  { name: "Sentence Assembly", jp: "組立", category: "Challenge", detail: "Rebuild the sentence from shuffled chunks." },
  { name: "Particle Cloze", jp: "助詞", category: "Challenge", detail: "Fill the missing は, が, を, に…" },
  { name: "Context Cloze", jp: "文脈", category: "Challenge", detail: "Fill the missing word from context." },
  { name: "Compound Builder", jp: "熟語", category: "Challenge", detail: "Build multi-kanji words from their parts." },
  { name: "Vibe Check", jp: "空気", category: "Challenge", detail: "Polite, casual, or formal? Read the register." },
  { name: "Imposter", jp: "偽者", category: "Challenge", detail: "Find the planted grammar mistake." },
  { name: "Conjugation Drill", jp: "活用", category: "Challenge", detail: "Produce the te-form, potential, passive…" },
  { name: "Listening", jp: "聞取", category: "Listening", detail: "Hear a word, choose its meaning." },
  { name: "Dictation", jp: "書取", category: "Listening", detail: "Listen and type what you hear." },
  { name: "Interleave Mix", jp: "混合", category: "Blended", detail: "Reading, meaning and characters in one loop." },
];

export type Faq = { q: string; a: string };

export const faq: Faq[] = [
  { q: "When does JPLearn launch?", a: "There's no fixed date yet. Development happens in the open — watching the repository on GitHub is the most current source of truth." },
  { q: "What platforms will it run on?", a: "JPLearn is being built for Windows first. Other platforms depend on interest, so watching the repo genuinely helps that conversation." },
  { q: "Will JPLearn be free?", a: "Pricing hasn't been decided. It'll be shared closer to launch — keeping daily study accessible is a goal, not an afterthought." },
  { q: "Does the AI tutor need the internet?", a: "No. The tutor is optional and runs a locally installed model on your own machine. Explanations work offline, and nothing you type leaves your device." },
  { q: "What happens to my study data?", a: "It stays in a local database on your machine. There's no account, no telemetry, and no tracking — the app works fully offline." },
  { q: "Is JPLearn open source?", a: "Yes — the source, issues, and progress are all public on GitHub under the Apache 2.0 license." },
];
