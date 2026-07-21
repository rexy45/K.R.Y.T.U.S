export type ProviderType = "openrouter" | "omniroute";

export const SETTINGS: {
  debug: boolean;
  banner: boolean;
  thinking: boolean;
  provider: ProviderType;
} = {
  debug: true,
  banner: true,
  thinking: true,

  provider: "openrouter",
};
