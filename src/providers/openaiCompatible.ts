import OpenAI from "openai";
import "dotenv/config";
import type { AIProvider } from "./provider";

export class OpenRouterProvider implements AIProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });
  }

  async ask(prompt: string): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: "google/gemma-4-26b-a4b-it:free",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return completion.choices[0]?.message?.content ?? "No response.";
  }
}

const provider = new OpenRouterProvider();

export async function askAI(prompt: string): Promise<string> {
  return provider.ask(prompt);
}
