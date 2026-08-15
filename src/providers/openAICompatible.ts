import OpenAI from "openai";
import "dotenv/config";

import type { AIProvider } from "./provider";

import { SessionManager } from "../memory/sessionManager";
import { NODE_PROMPT } from "../agents/node";
import { ConfigManager } from "../config/configManager";

export class OpenAICompatibleProvider implements AIProvider {

    private client: OpenAI;

    private session = new SessionManager();

    private config = ConfigManager.load();

    constructor() {

        const apiKey =
            this.config.apiKey || process.env.OPENAI_API_KEY;

        const baseURL =
            this.config.baseUrl || process.env.OPENAI_BASE_URL;

        if (!apiKey) {
            throw new Error(
                "No API Key found.\n\n" +
                "Either:\n" +
                "- Run the KRYTUS setup\n" +
                "- OR add OPENAI_API_KEY to your .env"
            );
        }

        if (!baseURL) {
            throw new Error(
                "No Base URL found.\n\n" +
                "Either:\n" +
                "- Run the KRYTUS setup\n" +
                "- OR add OPENAI_BASE_URL to your .env"
            );
        }

        this.client = new OpenAI({
            apiKey,
            baseURL,
        });

    }

    private getSystemPrompt(agent?: string): string {

        switch (agent) {

            case "atlas":

                return `
You are Atlas.

You are the strategic reasoning engine of K.R.Y.T.U.S.

Responsibilities:
- Understand user intent
- Break problems into logical steps
- Think carefully before answering
- Choose the best solution.
- Produce accurate reasoning.

Never introduce yourself as Atlas.

Always respond as K.R.Y.T.U.S.
`;

            case "node":

                return NODE_PROMPT;

            default:

                return `
You are K.R.Y.T.U.S.

You are an advanced AI assistant created by Rexy.

You are the intelligence engine powering Dream Forge AI.

Remember the current conversation.

Answer naturally, accurately and concisely.

Always introduce yourself as K.R.Y.T.U.S.
`;

        }

    }

    async ask(
        prompt: string,
        model: string,
        agent?: string
    ): Promise<string> {

        const apiKey =
            this.config.apiKey || process.env.OPENAI_API_KEY;

        const baseURL =
            this.config.baseUrl || process.env.OPENAI_BASE_URL;

        const defaultModel =
            this.config.defaultModel || model;

        console.log("=================================");
        console.log("Provider :", this.config.provider || "openai");
        console.log("Base URL :", baseURL);
        console.log("Model    :", defaultModel);
        console.log("Agent    :", agent ?? "default");
        console.log("=================================");

        const history = this.session.getHistory();

        const completion = await this.client.chat.completions.create({

            model: defaultModel,

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
            completion.choices[0]?.message?.content ??
            "No response.";

        this.session.addMessage("user", prompt);
        this.session.addMessage("assistant", reply);

        return reply;

    }

}
