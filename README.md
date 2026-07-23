# ⚡ K.R.Y.T.U.S.

> **Forge Intelligence. Build the Future.**

K.R.Y.T.U.S. is an open-source AI Command Line Interface (CLI) developed by **DreamForge AI**.

Rather than being its own language model, K.R.Y.T.U.S. intelligently routes requests, evaluates responses, manages memory, and optimizes prompts to create a smarter AI workflow.

---

# Features

* 🧠 Intelligent request routing (Atlas)
* 💾 Long-term memory system
* 🔁 Autonomous Loop System
* 📊 Response Evaluator
* ✂️ Token Cutter for prompt optimization
* ⚡ Lightweight TypeScript CLI
* 🔓 Open Source (MIT License)

---

# Installation

Clone the repository:

```bash
git clone https://github.com/rexy45/K.R.Y.T.U.S.
cd K.R.Y.T.U.S.
```

Install dependencies:

```bash
npm install
```

---

# Configuration

Create a `.env` file in the project root.

Add your OpenRouter API key:

```env
OPENROUTER_API_KEY=your_api_key_here
```

Open:

```
src/config/settings.ts
```

and set the provider to:

```ts
provider: "openrouter"
```

---

# Run

Development:

```bash
npm run dev
```

If installed globally through npm:

```bash
krytus
```

---

# Architecture

```text
                K.R.Y.T.U.S.
                     │
                 KYROSYS Core
                     │
     ┌──────────┬──────────┬──────────┐
     │          │          │          │
   Atlas      Forge     Scholar     NODE
 Routing   Engineering Knowledge Robotics
                     │
              Provider Manager
                     │
                    LLM
                     │
               Response Evaluator
                     │
                 Loop System
                     │
                 Token Cutter
                     │
                    Memory
```

---

# Roadmap

## Version 1

* ✅ CLI
* ✅ Memory
* ✅ Evaluator
* ✅ Loop System
* ✅ Token Cutter

## Version 2

* Specialized Agents
* Better Routing
* Planning
* Research

## Version 3

* DreamForge Cloud
* Marketplace
* Extensions
* Enterprise Features

---

# Community

GitHub

https://github.com/rexy45/K.R.Y.T.U.S.

Discord

https://discord.gg/ge8yyQwhn

Instagram

https://www.instagram.com/k.r.y.t.u.s_by_dream_forge_ai

YouTube

https://youtube.com/@dream-forge-ai-w6r

npm

https://www.npmjs.com/package/krytus

---

# Contributing

Contributions are welcome.

If you find a bug, have an idea, or want to improve K.R.Y.T.U.S., feel free to open an issue or submit a pull request.

---

# License

MIT License

---

## Built by DreamForge AI

K.R.Y.T.U.S. is the flagship open-source AI CLI of DreamForge AI.

This is Version **1.0.0** — the beginning of a much larger ecosystem.

KRYTUS CLI
An intelligent, voice-enabled AI terminal assistant powered by Node.js & TSX.

Node.js >= 20 TypeScript Piper TTS MIT License
Prerequisites
Before running KRYTUS, ensure you have the following installed on your system:
1. Node.js (v20.0.0 or higher)
Download and install Node.js (LTS recommended) from nodejs.org.
To verify your installation, run:
node -v
npm -v
2. Git
Download Git from git-scm.com to clone the repository.

Installation & Setup
1. Clone the Repository
git clone https://github.com/Rexy45/krytus.git
cd krytus
2. Install Dependencies
npm install
3. Configure Environment Variables
Create a .env file in the root directory and add your API keys/config:
OPENAI_API_KEY=your_api_key_here
# Optional: If using FreeLLMAPI or local proxy
LLM_BASE_URL=http://localhost:3000/v1

Troubleshooting Common Setup Issues
Fixing "Top-level await is currently not supported with CJS" error:
If you encounter an error regarding Top-level await when running npm run dev , update your package.json to
include "type": "module" :

{
"name": "krytus",
"version": "1.0.1",
"type": "module",
"scripts": {
"dev": "tsx src/index.ts"
}
}

Running & Using KRYTUS
Start the Application
npm run dev
Voice Mode Commands
Type /voice in the CLI to enter hands-free Voice Mode.
Speak directly into your microphone; KRYTUS will listen, generate a response, and speak back using Piper TTS.
To exit voice mode, simply say:
"Exit voice mode"
"Stop listening"
"Voice off"
