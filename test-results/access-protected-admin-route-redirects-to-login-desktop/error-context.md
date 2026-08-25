# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: access.spec.ts >> protected admin route redirects to login
- Location: tests/e2e/access.spec.ts:8:5

# Error details

```
Error: browserType.launch: Executable doesn't exist at /var/folders/xd/ygvxch4962b39tlvg97vhwr80000gn/T/cursor-sandbox-cache/5c319f2fe62183a9468984e00a2724cd/playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-x64/chrome-headless-shell
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     pnpm exec playwright install                           ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```