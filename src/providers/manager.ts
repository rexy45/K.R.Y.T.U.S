import { SETTINGS } from "../config/settings";
import type { AIProvider } from "./provider";
import { OpenAICompatibleProvider } from "./openAICompatible";

export class ProviderManager {
  private provider: AIProvider;

  constructor() {
    console.log("Provider:", SETTINGS.provider);

    switch (SETTINGS.provider) {
      case "openai":
      default:
        this.provider = new OpenAICompatibleProvider();
        break;
    }
  }

  async ask(
    prompt: string,
    model: string,
    agent?: string
  ): Promise<string> {
    return this.provider.ask(prompt, model, agent);
  }
}
