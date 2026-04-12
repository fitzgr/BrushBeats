export type AgeBucket = "child" | "teen" | "adult" | "senior";

export interface UserMusicContext {
  browserLanguage: string;
  countryCode: string;
  ageBucket: AgeBucket;
  targetBpm: number;
  genreHint?: string;
}
