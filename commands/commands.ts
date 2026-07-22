// ==========================================
// K.R.Y.T.U.S.
// General Command Module
// DreamForge AI
// ==========================================

export function showHelp(): void {
console.clear();

console.log(`
══════════════════════════════════════════════════════

                 K.R.Y.T.U.S.

══════════════════════════════════════════════════════

SYSTEM COMMANDS

/help                 Show this menu

/about                About K.R.Y.T.U.S.

/version              Show current version

/credits              Project credits

MEMORY COMMANDS

/memory

/memory list

/memory view <id>

/memory search <text>

/memory clear

GENERAL

Type anything else to chat with Atlas.

══════════════════════════════════════════════════════
`);
}

export function showAbout(): void {

console.clear();

console.log(`
══════════════════════════════════════════════════════

                    ABOUT

══════════════════════════════════════════════════════

K.R.Y.T.U.S.

Knowledge
Reasoning
Yielding
Tactical
Unified
System

Built under

DreamForge AI

----------------------------------------------

ARCHITECTURE

KYROSYS

↓

Atlas

↓

Forge

↓

Scholar

↓

NODE

----------------------------------------------

FEATURES

✓ Multi Model Routing

✓ Long Term Memory

✓ Loop System

✓ Evaluator

✓ Token Cutter

✓ Bring Your Own Key (BYOK)

----------------------------------------------

MISSION

Forge the world's smartest open-source AI CLI.

══════════════════════════════════════════════════════
`);
}

export function showVersion(): void {

console.clear();

console.log(`
══════════════════════════════════════════════════════

                 VERSION

══════════════════════════════════════════════════════

Project

K.R.Y.T.U.S.

Version

1.0.0

Release

DreamForge AI V1

Status

Stable

══════════════════════════════════════════════════════
`);
}

export function showCredits(): void {

console.clear();

console.log(`
══════════════════════════════════════════════════════

                  CREDITS

══════════════════════════════════════════════════════

Creator

Rexy

Organization

DreamForge AI

GitHub

https://github.com/rexy45/K.R.Y.T.U.S.

Discord

https://discord.gg/ge8yyQwhn

Instagram

https://www.instagram.com/k.r.y.t.u.s_by_dream_forge_ai

YouTube

https://youtube.com/@dream-forge-ai-w6r

npm

npm install -g krytus

Forge Intelligence.
Build The Future.

══════════════════════════════════════════════════════
`);
}

export function handleCommand(input: string, memory?: any): boolean {

const command = input.trim().toLowerCase();

switch (command) {

case "/help":
showHelp();
return true;

case "/about":
showAbout();
return true;

case "/version":
showVersion();
return true;

case "/credits":
showCredits();
return true;

default:
return false;

}

}
