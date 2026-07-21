import { SETTINGS } from "../core/config/settings";
import type { AIProvider } from "./provider";
import { OpenRouterProvider } from "./openRouter";
import { OmniRouteProvider } from "./omniRoute";

export class ProviderManager {
  private provider: AIProvider;

  constructor() {
    switch (SETTINGS.provider) {
      case "omniroute":
        this.provider = new OmniRouteProvider();
        break;

      case "openrouter":
      default:
        this.provider = new OpenRouterProvider();
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
