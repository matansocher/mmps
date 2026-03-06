---
name: update-docs
description: Sync VitePress documentation with recent code changes
---

# /update-docs

Sync VitePress documentation with recent code changes.

## Instructions

1. **Determine what changed**: Run `git diff --name-only HEAD~1` (or a broader range if the user specifies). If the user points to a specific area, focus on that.

2. **Map changes to doc pages** using this guide:

   | Code area changed | Docs page to update |
   |-------------------|---------------------|
   | `src/features/{name}/` | `docs/bots/{name}.md` |
   | `src/shared/ai/tools/` | `docs/development/ai-tools.md` |
   | `src/services/{name}/` | Relevant architecture or service docs |
   | Architecture patterns, new patterns | `docs/architecture/*.md` |
   | Setup, config, env vars | `docs/guide/*.md` |
   | `CLAUDE.md` conventions | `docs/architecture/*.md` or `docs/development/*.md` |

3. **Read the existing doc pages** that need updating. Understand their current structure and style before making changes.

4. **Update only what's needed**:
   - Add new sections for new features/tools/services
   - Update existing sections when behavior or APIs changed
   - Remove docs for deleted features
   - Keep the existing writing style and formatting consistent with the rest of the doc page

5. **Do NOT**:
   - Create new doc pages unless the change clearly requires one (e.g., a brand new bot)
   - Rewrite sections that weren't affected by the code change
   - Add speculative documentation for things not yet implemented
   - Change the VitePress config (`docs/.vitepress/`) unless sidebar entries are needed for new pages

6. **Report**: After updating, list which doc files were changed and summarize what was updated in each.
