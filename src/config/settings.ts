export type ProviderType =
  | "openai"
  | "local";

export const SETTINGS = {
  debug: true,

  banner: true,

  thinking: true,

  provider: "openai" as ProviderType,
};
