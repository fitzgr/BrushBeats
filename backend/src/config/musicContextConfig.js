const AGE_BUCKET_THRESHOLDS = [
  { maxTeeth: 12, bucket: "child" },
  { maxTeeth: 24, bucket: "teen" },
  { maxTeeth: 31, bucket: "adult" },
  { maxTeeth: 32, bucket: "adult" }
];

const AGE_TERMS = {
  child: ["kids", "clean", "fun", "family"],
  teen: ["official", "lyric video"],
  adult: ["official"],
  senior: ["classic", "official"]
};

const COUNTRY_TERMS = {
  DE: ["deutsch", "german"],
  FR: ["francais", "french"],
  MX: ["espanol", "latino"],
  BR: ["brasileiro", "portugues"],
  JP: ["japanese", "j-pop", "nihongo"],
  TR: ["turkce", "turkish"],
  ES: ["espanol", "spanish"],
  US: ["english"],
  GB: ["english"]
};

const LANGUAGE_TERMS = {
  de: ["deutsch", "german"],
  fr: ["francais", "french"],
  es: ["espanol", "spanish"],
  pt: ["portugues", "brazil"],
  ja: ["japanese", "nihongo"],
  tr: ["turkce", "turkish"],
  en: ["english"]
};

const YOUTUBE_LANGUAGE_MAP = {
  de: "de",
  fr: "fr",
  es: "es",
  pt: "pt",
  ja: "ja",
  tr: "tr",
  en: "en"
};

const QUERY_VARIANT_COUNT = 5;
const BPM_TOLERANCE = 2;

module.exports = {
  AGE_BUCKET_THRESHOLDS,
  AGE_TERMS,
  COUNTRY_TERMS,
  LANGUAGE_TERMS,
  YOUTUBE_LANGUAGE_MAP,
  QUERY_VARIANT_COUNT,
  BPM_TOLERANCE
};
