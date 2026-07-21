import { LOOP } from "./loop";
import { AtlasEngine } from "./atlas";
import { Evaluator } from "./evaluator";
import { TokenCutter } from "./tokenCutter";

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
const provider = new ProviderManager();
const memory = new MemoryManager();

const evaluator = new Evaluator();
const tokenCutter = new TokenCutter();

function handleMemoryCommand(command: string, memory: MemoryManager) {

    const lower = command.toLowerCase();
    if (lower.startsWith("remember this:")) {

        const text = command.substring(14).trim();

        memory.saveMemory(text, 10);

        console.log("\n✓ Memory stored.\n");

        return true;
    }

    if (lower.startsWith("recall")) {

        const keyword = command.replace(/recall/i, "").trim();

        const results = memory.searchMemory(keyword);

        if (results.length === 0) {

            console.log("\nNo memories found.\n");

        } else {

            console.log("\nMemory found:\n");

            results.forEach((item: any) => {
                console.log(`- ${item.memory}`);
            });

            console.log("");
        }

        return true;
    }

    return false;
}

export async function startCLI() {

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

        if (handleExit(command))
            continue;

        if (handleMemoryCommand(command, memory))
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

                //----------------------------------------
                // LOOP STOP
                //----------------------------------------

                const evaluation = evaluator.evaluate(reply);

                if (SETTINGS.debug) {
                    console.log(
                        `[Loop] Score: ${evaluation.score} | ${evaluation.reason}`
                    );
                }

                // High enough quality -> stop
                if (evaluation.score >= LOOP.targetScore) {
                    console.log("\n✓ Target quality reached.\n");
                    break;
                }

                // Didn't improve?
                if (previousScore >= evaluation.score) {
                    noImprovement++;
                } else {
                    noImprovement = 0;
                }

                previousScore = evaluation.score;

                // Stuck -> stop
                if (noImprovement >= LOOP.maxNoImprovement) {
                    console.log("\n✓ Loop stopped (no more improvements).\n");
                    break;
                }

                // User disabled loop
                if (!LOOP.enabled) {
                    break;
                }
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
