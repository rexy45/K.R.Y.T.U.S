// src/autonomous/kyrosys.ts
const TEST_MODE = process.env.KYROSYS_TEST_MODE === "1";

export type UserProfile = {
  name: string;
  tone: "formal" | "casual" | "mixed";
  humor: "low" | "medium" | "high";
};

export type DesktopState = {
  battery?: number;
  internet?: boolean;
  currentFolder?: string;
  runningApps?: string[];
  cpu?: number;
  ram?: number;
  mission?: string;
};

export type KYROSYSEvent =
  | { type: "battery_low"; battery: number }
  | { type: "internet_lost" }
  | { type: "build_failed"; detail?: string }
  | { type: "build_succeeded" }
  | { type: "idle_check" }
  | { type: "project_update"; detail: string };

export class KYROSYS {
  constructor(private profile: UserProfile) {}

  observeDesktop(): DesktopState {
    if (TEST_MODE) {
      return {
        battery: 10,
        internet: false,
        currentFolder: process.cwd(),
        runningApps: [],
        cpu: 0,
        ram: 0,
        mission: "Build KRYTUS",
      };
    }

    return {
      battery: 100,
      internet: true,
      currentFolder: process.cwd(),
      runningApps: [],
      cpu: 0,
      ram: 0,
      mission: "Build KRYTUS",
    };
  }

  decide(state: DesktopState): KYROSYSEvent[] {
    const events: KYROSYSEvent[] = [];

    if (typeof state.battery === "number" && state.battery <= 15) {
      events.push({ type: "battery_low", battery: state.battery });
    }

    if (state.internet === false) {
      events.push({ type: "internet_lost" });
    }

    return events;
  }

  formatMessage(event: KYROSYSEvent): string {
    const name = this.profile.name;

    switch (event.type) {
      case "battery_low":
        return `Rexy, battery is at ${event.battery}%. Please connect the charger.`;
      case "internet_lost":
        return `Rexy, the internet connection is down.`;
      case "build_failed":
        return `Rexy, the build failed. I can inspect the logs.`;
      case "build_succeeded":
        return `Rexy, the build completed successfully.`;
      case "project_update":
        return `Rexy, ${event.detail}`;
      case "idle_check":
      default:
        return `${name}, all systems are stable.`;
    }
  }

  shouldInterrupt(event: KYROSYSEvent): boolean {
    return event.type === "battery_low" || event.type === "internet_lost" || event.type === "build_failed";
  }

  async runOnce(speak: (text: string) => Promise<void>): Promise<void> {
    const state = this.observeDesktop();
    const events = this.decide(state);

    for (const event of events) {
      if (this.shouldInterrupt(event)) {
        const message = this.formatMessage(event);
        await speak(message);
      }
    }
  }
}
