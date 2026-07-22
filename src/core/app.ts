import { LOOP } from "./loop";
import { AtlasEngine } from "./atlas";
import { Evaluator } from "./evaluator";
import { TokenCutter } from "./tokenCutter";
import { handleCommand } from "../commands/commands";
import { handleMemoryCommand } from "../commands/memory";

import { ProviderManager } from "../providers/manager";
import { MemoryManager } from "../memory/memoryManager";

import { input } from "@inquirer/prompts";

import {
  showThinking,
  showReply,
  showError,
} from "../ui/output";

import { handleExit } from "../commands/exit";
import { SETTINGS } from "../config/settings";

const atlas = new AtlasEngine();
const memory = new MemoryManager();

let provider: ProviderManager;

const evaluator = new Evaluator();
const tokenCutter = new TokenCutter();



export async function startCLI() {

    // Create provider only after CLI starts
    provider = new ProviderManager();

    const identity = memory.loadCore();

    while (true) {

        const command = await input({
            message: "KRYTUS >",
        });

        //----------------------------------------
        // LOOP COMMANDS
        //----------------------------------------

        if (command === "/loop on") {

            LOOP.enabled = true;

            console.log("\n✓ Autonomous Loop Enabled\n");

            continue;
        }

        if (command === "/loop off") {

            LOOP.enabled = false;

            console.log("\n✓ Autonomous Loop Disabled\n");

            continue;
        }

        //----------------------------------------

        // ----------------------------------------
        // SYSTEM COMMANDS
        // ----------------------------------------

        if (handleCommand(command))
            continue;

        // ----------------------------------------
        // EXIT
        // ----------------------------------------

        if (handleExit(command))
            continue;

        // ----------------------------------------
        // MEMORY COMMANDS (old remember/recall)
        // ----------------------------------------

        if (handleMemoryCommand(command))
          continue;

        let currentPrompt = command;
        let previousScore = -1;
        let noImprovement = 0;

        do {

            const decision = atlas.analyze(currentPrompt);

            if (SETTINGS.thinking)
                showThinking();

            if (SETTINGS.debug) {

                console.log(
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
- Atlas is only a reasoning/router module inside K.R.Y.T.U.S.
- You are not Atlas.
- Always identify yourself as K.R.Y.T.U.S.
`;

                const prompt = tokenCutter.buildPrompt(
                    systemMemory,
                    currentPrompt
                );

                const reply = await provider.ask(
                    prompt,
                    decision.model,
                    decision.agent
                );

                showReply("K.R.Y.T.U.S", reply);

                memory.saveMemory(
                    `User asked: ${currentPrompt}`,
                    3
                );

                const evaluation = evaluator.evaluate(reply);

                if (SETTINGS.debug) {

                    console.log(
                        `[Loop] Score: ${evaluation.score} | ${evaluation.reason}`
                    );

                }

                if (evaluation.score >= LOOP.targetScore) {

                    console.log("\n✓ Target quality reached.\n");

                    break;
                }

                if (previousScore >= evaluation.score) {

                    noImprovement++;

                } else {

                    noImprovement = 0;

                }

                previousScore = evaluation.score;

                if (noImprovement >= LOOP.maxNoImprovement) {

                    console.log("\n✓ Loop stopped (no more improvements).\n");

                    break;
                }

                if (!LOOP.enabled)
                    break;

                currentPrompt = `
Review ONLY your previous answer.

If it is already complete and nothing meaningful can be improved,

reply with EXACTLY

NO_CHANGES

Otherwise rewrite the ENTIRE improved answer.

Do not explain.

Return ONLY the improved answer.
`;

            }

            catch (error) {

                showError(error);

                break;

            }

        }

        while (LOOP.enabled);

    }

}
