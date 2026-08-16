# Pi Subagent Sources

This directory contains project-local agent definitions for `pi-subagents`.

## Copilot conversions

Converted from local GitHub Copilot agent definitions:

- `copilot/beast-mode.md` ← `C:/Users/Shiv/AppData/Roaming/Code/User/prompts/Beast Mode.agent.md`
- `copilot/ask.md` ← VS Code Copilot `Ask.agent.md`
- `copilot/explore.md` ← VS Code Copilot `Explore.agent.md`
- `copilot/plan.md` ← VS Code Copilot `Plan.agent.md`

The conversions replace unavailable Copilot/VS Code tools, memory, model labels, and handoffs with Pi built-ins, Pi skills, and `pi-subagents`. Unsafe or counterproductive instructions were corrected rather than copied verbatim.

## External adaptations

Source: [`github/awesome-copilot`](https://github.com/github/awesome-copilot), pinned review commit `a80885b76044550770f60f360f8a0e5ae3524a31`.

- `external/accessibility-reviewer.md` ← `agents/accessibility.agent.md`
- `external/playwright-tester.md` ← `agents/playwright-tester.agent.md`
- `external/sast-sca-reviewer.md` ← `agents/sast-sca-security-analyzer.agent.md`
- `external/frontend-performance-reviewer.md` ← `agents/frontend-performance-investigator.agent.md`

These are adapted prompts, not verbatim copies. VS Code/MCP tools and model pins were removed or replaced with tools available in this Pi project. Consult the upstream repository for original attribution and license terms.
