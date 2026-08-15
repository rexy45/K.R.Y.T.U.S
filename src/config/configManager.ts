import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

export interface ProviderConfig {
  provider: "openai" | "openrouter";
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
}

const CONFIG_DIR = path.join(process.cwd(), "config");
const CONFIG_FILE = path.join(CONFIG_DIR, "provider.json");

const DEFAULT_CONFIG: ProviderConfig = {
  provider: "openai",
  baseUrl: "",
  apiKey: "",
  defaultModel: "",
};

export class ConfigManager {
  private static cachedConfig: ProviderConfig | null = null;

  static async exists(): Promise<boolean> {
    try {
      await fs.access(CONFIG_FILE);
      return true;
    } catch {
      return false;
    }
  }

  static async init(): Promise<void> {
    try {
      await fs.mkdir(CONFIG_DIR, { recursive: true });
    } catch (e) {
      // Ignore directory exists errors
    }

    const fileExists = await this.exists();
    if (!fileExists) {
      await fs.writeFile(
        CONFIG_FILE,
        JSON.stringify(DEFAULT_CONFIG, null, 2),
        "utf8"
      );
      this.cachedConfig = { ...DEFAULT_CONFIG };
    } else {
      try {
        const raw = await fs.readFile(CONFIG_FILE, "utf8");
        this.cachedConfig = {
          ...DEFAULT_CONFIG,
          ...JSON.parse(raw),
        };
      } catch {
        this.cachedConfig = { ...DEFAULT_CONFIG };
        await this.save(this.cachedConfig);
      }
    }
  }

  /**
   * Retrieves the current configuration. Ensure `init()` is called before `get()`.
   * For backwards compatibility in synchronous contexts, it will attempt a synchronous read if cache is empty.
   */
  static get(): ProviderConfig {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }
    
    // Fallback if accessed synchronously before init()
    if (!fsSync.existsSync(CONFIG_DIR)) {
      fsSync.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    if (!fsSync.existsSync(CONFIG_FILE)) {
      fsSync.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf8");
      this.cachedConfig = { ...DEFAULT_CONFIG };
      return this.cachedConfig;
    }
    
    try {
      const raw = fsSync.readFileSync(CONFIG_FILE, "utf8");
      this.cachedConfig = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch {
      this.cachedConfig = { ...DEFAULT_CONFIG };
    }
    return this.cachedConfig;
  }

  // Deprecated: use get() or init() instead. Kept for backwards compatibility until full refactor.
  static load(): ProviderConfig {
    return this.get();
  }

  static async save(config: ProviderConfig): Promise<void> {
    try {
      await fs.mkdir(CONFIG_DIR, { recursive: true });
    } catch (e) {
      // Ignore
    }

    await fs.writeFile(
      CONFIG_FILE,
      JSON.stringify(config, null, 2),
      "utf8"
    );
    this.cachedConfig = { ...config };
  }

  static async update(
    values: Partial<ProviderConfig>
  ): Promise<ProviderConfig> {
    const current = this.get();
    const updated = {
      ...current,
      ...values,
    };

    await this.save(updated);
    return updated;
  }
}
