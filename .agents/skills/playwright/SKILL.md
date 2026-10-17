---
name: playwright-skill
description: Test websites and automate browser interactions through available Playwright MCP tools. Use when testing pages, forms, login flows, links, responsive layouts, or other browser-based functionality. Requires a connected Playwright tool provider; does not bundle a standalone runner or browser installer.
---

# Playwright Browser Automation

Use the connected Playwright tools to inspect and interact with the browser. This skill is instructions only: it has no local runner, helper library, setup command, or bundled API reference.

## Workflow

1. **Discover capabilities.** Use the host's tool discovery mechanism when tools are deferred. Find the available Playwright navigation, snapshot, interaction, resize, screenshot, console/network, and code-execution tools as needed. Read their actual input schemas before calling them; names and capabilities vary by host. Do not assume all tools exist.
2. **Choose the target.** Prefer the URL supplied by the user or the current session's verified preview URL. For local development, inspect workspace scripts/configuration and session-owned server output to establish the correct app and port. If the target is still ambiguous, ask which URL to test. Do not scan unrelated local services or assume port 3000 belongs to this workspace.
3. **Confirm local readiness.** Check that the selected server responds. If it is not running, use the project's documented development command when starting it is in scope; otherwise ask the user. Use a unique port for a worktree. If browser and server run on different hosts, localhost may not refer to the same machine: establish a reachable URL rather than exposing the server publicly by default.
4. **Navigate and inspect.** Load the target and capture an accessibility snapshot. Use observed roles, accessible names, labels, and current element references to locate controls. Capture a screenshot for visual checks; a snapshot alone cannot establish visual quality.
5. **Exercise the requested behavior.** Use dedicated interaction tools for simple steps. Use the code-execution tool for multi-step Playwright checks only if available. Refresh snapshots after navigation or meaningful UI changes before reusing element references.
6. **Verify the outcome.** Check a concrete postcondition such as the destination URL, visible success state, changed data, or validation error. A successful click or screenshot is not proof that a flow works. Inspect console errors and failed network requests when supported, distinguishing pre-existing issues from failures caused by the tested flow.
7. **Report evidence and limits.** Summarize the target URL, checks performed, observed results, and untested cases. Include screenshot/artifact paths when produced. Never label a check as passed if it was not executed or its expected result was not observed.

## Interaction Guidelines

- Prefer role/label locators over brittle CSS selectors. Derive selectors from the live page rather than inventing them.
- Wait for meaningful conditions such as a visible element or expected URL. Avoid fixed sleeps and treating network idleness as a universal readiness signal.
- Use explicit checks that throw on failure when an assertion helper is unavailable. Do not assume an imported test framework exists in the code tool.
- Keep the target URL in one variable for multi-step snippets. Do not launch Chromium, import Playwright, create a replacement browser, or close the provider's shared browser inside snippets; use the page supplied by the tool.
- Browser visibility, headless mode, browser installation, and persistent profiles are managed by the provider. Do not promise a visible window or change launch settings unless the provider explicitly supports it.
- Use temporary/session artifact storage for screenshots or scratch files, not the skill directory. Do not add test files to the repository unless requested. Remove task-created temporary files when no longer needed; preserve requested evidence.
- Do not close unrelated tabs or stop servers owned by other sessions. Restore changed viewport settings when practical. Keep a requested review server running and report its preview URL.

## Common Checks

### Page and Responsive Layout

Navigate to the requested route. Confirm its key heading/content appears. Check representative desktop, tablet, and mobile viewport sizes using the resize tool, with screenshots and interaction checks at each relevant size. Look for clipped content, horizontal overflow, overlapping controls, unreadable text, and inaccessible navigation. Screenshots alone are not automated visual regression tests.

If the provider exposes a code tool accepting an async function with a supplied `page`, this illustrates a concrete page check. Replace the URL and heading with values established from the task and live page, and adapt the tool input to its discovered schema:

```javascript
async (page) => {
  const TARGET_URL = 'http://localhost:4173';
  await page.goto(TARGET_URL);
  const heading = page.getByRole('heading', { name: 'Savings', exact: true });
  await heading.waitFor({ state: 'visible' });
  return { url: page.url(), heading: await heading.textContent() };
}
```

The URL and heading above are examples, not discovered defaults. A code tool is optional; navigation, snapshot, and interaction tools can perform equivalent checks.

### Login and Forms

Use an authorized test account and test data. Inspect the form, fill observed fields, submit only within the user's authorized scope, and verify the expected redirect or success state. Check relevant validation errors when requested. Do not assume login succeeded merely because the submit button was clicked.

Never copy credentials, session cookies, or tokens into committed scripts, screenshots, or reports. Ask before sending real messages, making purchases, deleting data, or performing other consequential actions not already authorized by the task. Do not bypass authentication, CAPTCHAs, or access controls.

### Links

Collect links from the requested page and test only the agreed scope. Avoid following logout, deletion, or other state-changing links. Record the URL and observed status/failure. Authentication, rate limits, and servers that reject HEAD requests can make link checks inconclusive; do not report those as confirmed broken links without verification. Avoid crawling an entire external site unless requested.

## Capability Limits and Troubleshooting

- **No Playwright provider:** Explain that browser execution is unavailable and ask the user to enable a provider. Do not run a nonexistent local setup command or install dependencies as a fallback without authorization.
- **A tool is missing:** Discover a supported equivalent. If none exists, report the untested capability; do not claim screenshots, console inspection, or code execution were performed.
- **Cannot reach the page:** Verify the selected URL, server readiness, and whether the browser runs remotely. Report reachability failures separately from application defects.
- **Element not found:** Refresh the snapshot, check the current route, loading state, dialogs, and frames, and use an observed locator. Do not hide a real failure with unconditional retries.
- **Advanced context features:** Headers, authentication state, network mocking, device emulation, and launch options depend on the provider. Use only exposed capabilities and avoid changing shared browser settings without considering other tabs. There are no skill-specific environment variables that configure these features.
