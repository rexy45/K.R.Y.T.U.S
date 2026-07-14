import { AtlasEngine } from "./atlas";
import { askAI } from "../providers/openaiCompatible";
import { input } from "@inquirer/prompts";
import {
  showThinking,
  showReply,
  showError,
} from "../ui/output";
import { handleExit } from "../commands/exit";
const atlas = new AtlasEngine();

export async function startCLI() {
  while (true) {
    const command = await input({
      message: "KRYTUS >",
    });

    const cmd = command.trim().toLowerCase();

    if (handleExit(command)) {
      continue;
    }

     const decision = atlas.analyze(command); showThinking();

    try {
      const reply = await askAI(command);
      showReply("K.R.Y.T.U.S", reply);
    } catch (error) {
      showError(error);
    }
  }
}
