# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: access.spec.ts >> login form remains usable on narrow screens
- Location: tests/e2e/access.spec.ts:14:5

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /var/folders/xd/ygvxch4962b39tlvg97vhwr80000gn/T/cursor-sandbox-cache/5c319f2fe62183a9468984e00a2724cd/playwright/webkit-2336/pw_run.sh --inspector-pipe --headless --no-startup-window
<launched> pid=73893
[pid=73893][err] /var/folders/xd/ygvxch4962b39tlvg97vhwr80000gn/T/cursor-sandbox-cache/5c319f2fe62183a9468984e00a2724cd/playwright/webkit-2336/pw_run.sh: line 7: 73899 Abort trap: 6           DYLD_FRAMEWORK_PATH="$DYLIB_PATH" DYLD_LIBRARY_PATH="$DYLIB_PATH" "$PLAYWRIGHT" "$@"
Call log:
  - <launching> /var/folders/xd/ygvxch4962b39tlvg97vhwr80000gn/T/cursor-sandbox-cache/5c319f2fe62183a9468984e00a2724cd/playwright/webkit-2336/pw_run.sh --inspector-pipe --headless --no-startup-window
  - <launched> pid=73893
  - [pid=73893][err] /var/folders/xd/ygvxch4962b39tlvg97vhwr80000gn/T/cursor-sandbox-cache/5c319f2fe62183a9468984e00a2724cd/playwright/webkit-2336/pw_run.sh: line 7: 73899 Abort trap: 6           DYLD_FRAMEWORK_PATH="$DYLIB_PATH" DYLD_LIBRARY_PATH="$DYLIB_PATH" "$PLAYWRIGHT" "$@"
  - [pid=73893] <gracefully close start>
  - [pid=73893] <kill>
  - [pid=73893] <will force kill>
  - [pid=73893] exception while trying to kill process: Error: kill ESRCH
  - [pid=73893] <process did exit: exitCode=134, signal=null>
  - [pid=73893] starting temporary directories cleanup
  - [pid=73893] finished temporary directories cleanup
  - [pid=73893] <gracefully close end>

```