export interface AIProvider {
  ask(
    prompt: string,
    model: string,
    agent?: string
  ): Promise<string>;
}
