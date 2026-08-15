import { AtlasEngine } from "./atlas";
import { Evaluator } from "./evaluator";
import { TokenCutter } from "./tokenCutter";
import { ProviderManager } from "../providers/manager";
import { MemoryManager } from "../memory/memoryManager";
import { LOOP } from "./loop";

export interface EngineEvents {
    onThinking?: () => void;
    onReply?: (name: string, reply: string) => void;
    onError?: (error: any) => void;
    onSpeak?: (text: string) => Promise<void>;
    onLog?: (message: string) => void;
}

export class KrytusEngine {
    private atlas: AtlasEngine;
    private evaluator: Evaluator;
    private tokenCutter: TokenCutter;
    private memory: MemoryManager;
    private provider: ProviderManager;

    constructor() {
        this.atlas = new AtlasEngine();
        this.evaluator = new Evaluator();
        this.tokenCutter = new TokenCutter();
        this.memory = new MemoryManager();
        this.provider = new ProviderManager();
    }

    public getMemoryManager(): MemoryManager {
        return this.memory;
    }

    public async processPrompt(
        promptText: string,
        identity: any,
        events: EngineEvents
    ) {
        let currentPrompt = promptText;
        let previousScore = -1;
        let noImprovement = 0;

        do {
            const decision = this.atlas.analyze(currentPrompt);

            if (events.onThinking) events.onThinking();

            if (events.onLog) {
                events.onLog(
                    `[K.R.Y.T.U.S | Atlas] Intent: ${decision.intent} | Model: ${decision.model} | Agent: ${decision.agent}`
                );
            }

            try {
                const systemMemory = `
You are K.R.Y.T.U.S.

You are a personal AI system created by ${identity.identity.creator}.

Creator type:
${identity.identity.creator_type}

Description:
${identity.identity.description}

Important rules:
${identity.rules.join("\n")}

Identity:
- Atlas is only an internal routing engine.
- Never introduce yourself as Atlas.
- Always introduce yourself as K.R.Y.T.U.S.
`;

                const prompt = this.tokenCutter.buildPrompt(
                    systemMemory,
                    currentPrompt
                );

                const reply = await this.provider.ask(
                    prompt,
                    decision.model,
                    decision.agent
                );

                if (events.onReply) events.onReply("K.R.Y.T.U.S", reply);
                if (events.onSpeak) await events.onSpeak(reply);

                this.memory.saveMemory(
                    `User asked: ${currentPrompt}`,
                    3
                );

                const evaluation = this.evaluator.evaluate(reply);

                if (events.onLog) {
                    events.onLog(
                        `[Loop] Score: ${evaluation.score} | ${evaluation.reason}`
                    );
                }

                if (evaluation.score >= LOOP.targetScore) {
                    break;
                }

                if (previousScore >= evaluation.score) {
                    noImprovement++;
                } else {
                    noImprovement = 0;
                }

                previousScore = evaluation.score;

                if (noImprovement >= LOOP.maxNoImprovement) {
                    break;
                }

                if (!LOOP.enabled) break;

                currentPrompt = `
Review ONLY your previous answer.

If it is already perfect reply ONLY

NO_CHANGES

Otherwise rewrite the ENTIRE improved answer.

Return ONLY the improved answer.
`;
            } catch (err) {
                if (events.onError) events.onError(err);
                break;
            }
        } while (LOOP.enabled);
    }
}
