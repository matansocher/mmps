---
name: review-style
description: Check changed code against MMPS project conventions and report violations with fix suggestions
---

# /review-style

Scan changed or specified files for MMPS code convention violations and report them with fix suggestions.

## Instructions

1. **Determine scope**: If the user specified files or directories, use those. Otherwise, find changed files via `git diff --name-only HEAD` and `git diff --cached --name-only`. Only check `.ts` files.

2. **Check for these violations** by grepping the target files:

   | # | Violation | Pattern to find | Fix |
   |---|-----------|----------------|-----|
   | 1 | `interface` usage | `^export interface` or `^interface` | Change to `type X = {` |
   | 2 | Default exports | `export default` | Use named exports only |
   | 3 | `.then()` chains | `.then(` | Refactor to `async/await` |
   | 4 | JSDoc comments | `/** ... */` multi-line doc blocks (not single-line `//` comments) | Remove JSDoc, use inline `//` comments only if needed |
   | 5 | Missing `readonly` on type properties | Type alias properties without `readonly` modifier | Add `readonly` to type properties |
   | 6 | Wrong import: `@services/telegram` | `from '@services/telegram'` (not `telegram-grammy`) | Change to `from '@services/telegram-grammy'` |
   | 7 | Wrong import: `node-telegram-bot-api` | `from 'node-telegram-bot-api'` | Use grammY via `@services/telegram-grammy` |
   | 8 | Wrong keyboard util | `getInlineKeyboardMarkup` | Use `buildInlineKeyboard` from `@services/telegram-grammy` |
   | 9 | Missing barrel exports | New `.ts` files in a directory that has an `index.ts` but doesn't re-export the new file | Add export to `index.ts` |
   | 10 | `this.bot.api.*` in controllers | `this.bot.api.` in `*.controller.ts` files inside handler methods that receive `ctx` | Use `ctx.reply()`, `ctx.deleteMessage()`, etc. instead |

3. **Report format**: For each violation found, output:
   - `file_path:line_number` — violation description
   - The offending line of code
   - Suggested fix (short code snippet)

4. **Summary**: End with a count — e.g., "Found 3 violations in 2 files" or "No violations found."

5. **Do NOT auto-fix** unless the user explicitly asks to fix them. Only report.
