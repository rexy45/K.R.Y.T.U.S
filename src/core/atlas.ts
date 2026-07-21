import { MODELS } from "../config/models";

export type Intent =
  | "chat"
  | "coding"
  | "math"
  | "robotics"
  | "explain";

export interface AtlasDecision {
  intent: Intent;
  model: string;
  agent: string;
}

export class AtlasEngine {
  analyze(prompt: string): AtlasDecision {
    const text = prompt.toLowerCase();

    // ==========================
    // Coding
    // ==========================
    if (
      text.includes("code") ||
      text.includes("program") ||
      text.includes("bug") ||
      text.includes("typescript") ||
      text.includes("python") ||
      text.includes("javascript") ||
      text.includes("java") ||
      text.includes("c++")
    ) {
      return {
        intent: "coding",
        model: MODELS.coding,
        agent: "forge",
      };
    }

    // ==========================
    // Robotics / Electronics
    // ==========================
    if (
      text.includes("robot") ||
      text.includes("esp32") ||
      text.includes("arduino") ||
      text.includes("sensor") ||
      text.includes("raspberry pi")
    ) {
      return {
        intent: "robotics",
        model: MODELS.robotics,
        agent: "node",
      };
    }

    // ==========================
    // Mathematics
    // ==========================
    if (
      text.includes("solve") ||
      text.includes("math") ||
      text.includes("equation") ||
      text.includes("algebra") ||
      text.includes("geometry") ||
      text.includes("calculus")
    ) {
      return {
        intent: "math",
        model: MODELS.math,
        agent: "atlas",
      };
    }

    // ==========================
    // Teaching / Explaining
    // ==========================
    if (
      text.includes("explain") ||
      text.includes("teach") ||
      text.includes("what is") ||
      text.includes("how does")
    ) {
      return {
        intent: "explain",
        model: MODELS.explain,
        agent: "atlas",
      };
    }

    // ==========================
    // Default Chat
    // ==========================
    return {
      intent: "chat",
      model: MODELS.chat,
      agent: "atlas",
    };
  }
}
