import OpenAI from "openai";
import "dotenv/config";

import type { AIProvider } from "./provider";
import { SessionManager } from "../memory/sessionManager";

import { NODE_PROMPT } from "../agents/node";

export class OmniRouteProvider implements AIProvider {
  private session = new SessionManager();

  private client = new OpenAI({
    apiKey: process.env.OMNIROUTE_API_KEY,
    baseURL: "http://localhost:20128/v1",
  });

  private getSystemPrompt(agent?: string): string {
    switch (agent) {
      // ==========================
      // Atlas
      // ==========================
      case "atlas":
        return `
You are Atlas.

You are the strategic reasoning engine of K.R.Y.T.U.S.

Responsibilities:
- Understand user intent
- Break problems into logical steps
- Think carefully before answering
- Choose the best solution
- Produce accurate reasoning

You are an internal component.

Never introduce yourself as Atlas.

Always respond as K.R.Y.T.U.S.
`;

      // ==========================
      // Node
      // ==========================
      case "node":
        return NODE_PROMPT;

      // ==========================
      // Default Assistant
      // ==========================
      default:
        return `
You are K.R.Y.T.U.S.

You are an advanced AI assistant created by Rexy.

You are the intelligence engine powering Dream Forge AI.

Remember the current conversation.

Answer naturally, accurately, and concisely.

Never claim to be Atlas.

Always introduce yourself as K.R.Y.T.U.S.
`;
    }
  }

  async ask(
    prompt: string,
    model: string,
    agent?: string
  ): Promise<string> {
    console.log("=================================");
    console.log("Provider :", "OmniRoute");
    console.log("Model    :", model);
    console.log("Agent    :", agent ?? "default");
    console.log("=================================");

    const history = this.session.getHistory();

    const completion = await this.client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: this.getSystemPrompt(agent),
        },

        ...history,

        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const reply =
      completion.choices[0]?.message?.content ?? "No response.";

    this.session.addMessage("user", prompt);
    this.session.addMessage("assistant", reply);

    return reply;
  }
}
