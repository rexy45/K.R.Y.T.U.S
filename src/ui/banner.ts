const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

const RED = "\x1b[38;2;220;20;60m";
const WHITE = "\x1b[97m";
const GREEN = "\x1b[92m";
const GRAY = "\x1b[90m";
const RESET = "\x1b[0m";

export async function showBanner() {
  console.clear();

  console.log(
`${RED}══════════════════════════════════════════════════════════════════════════════════════════════════

██╗  ██╗██████╗ ██╗   ██╗████████╗██╗   ██╗███████╗
██║ ██╔╝██╔══██╗╚██╗ ██╔╝╚══██╔══╝██║   ██║██╔════╝
█████╔╝ ██████╔╝ ╚████╔╝    ██║   ██║   ██║███████╗
██╔═██╗ ██╔══██╗  ╚██╔╝     ██║   ██║   ██║╚════██║
██║  ██╗██║  ██║   ██║      ██║   ╚██████╔╝███████║
╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝      ╚═╝    ╚═════╝ ╚══════╝${RESET}

${WHITE}Knowledge • Reasoning • Yield • Technology • Unified System${RESET}

${GRAY}Version 0.6 Developer Preview${RESET}
`
  );

  await boot("Atlas");
  await boot("KYROSYS");
  await boot("Forge");
  await boot("Scholar");
  await boot("Node");

  console.log(
`${RED}
══════════════════════════════════════════════════════════════════════════════════════════════════
${RESET}`
  );
}

async function boot(name: string) {
  process.stdout.write(`${GRAY}Initializing ${name}...${RESET}`);

  await sleep(180);

  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);

  console.log(`${GREEN}✓ ${name} Online${RESET}`);

  await sleep(70);
}
