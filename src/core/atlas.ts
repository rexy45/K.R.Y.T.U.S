export interface AtlasDecision {
  task: string;
  provider: string;
  model: string;
}

export class AtlasEngine {
  analyze(prompt: string): AtlasDecision {
    return {
      task: "chat",
      provider: "OpenRouter",
      model: "google/gemma-4-26b-a4b-it:free",
    };
  }
}
