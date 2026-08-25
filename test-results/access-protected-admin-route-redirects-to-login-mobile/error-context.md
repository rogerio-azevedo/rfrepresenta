# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: access.spec.ts >> protected admin route redirects to login
- Location: tests/e2e/access.spec.ts:8:5

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /var/folders/xd/ygvxch4962b39tlvg97vhwr80000gn/T/cursor-sandbox-cache/5c319f2fe62183a9468984e00a2724cd/playwright/webkit-2336/pw_run.sh --inspector-pipe --headless --no-startup-window
<launched> pid=73861
[pid=73861][err] /var/folders/xd/ygvxch4962b39tlvg97vhwr80000gn/T/cursor-sandbox-cache/5c319f2fe62183a9468984e00a2724cd/playwright/webkit-2336/pw_run.sh: line 7: 73867 Abort trap: 6           DYLD_FRAMEWORK_PATH="$DYLIB_PATH" DYLD_LIBRARY_PATH="$DYLIB_PATH" "$PLAYWRIGHT" "$@"
Call log:
  - <launching> /var/folders/xd/ygvxch4962b39tlvg97vhwr80000gn/T/cursor-sandbox-cache/5c319f2fe62183a9468984e00a2724cd/playwright/webkit-2336/pw_run.sh --inspector-pipe --headless --no-startup-window
  - <launched> pid=73861
  - [pid=73861][err] /var/folders/xd/ygvxch4962b39tlvg97vhwr80000gn/T/cursor-sandbox-cache/5c319f2fe62183a9468984e00a2724cd/playwright/webkit-2336/pw_run.sh: line 7: 73867 Abort trap: 6           DYLD_FRAMEWORK_PATH="$DYLIB_PATH" DYLD_LIBRARY_PATH="$DYLIB_PATH" "$PLAYWRIGHT" "$@"
  - [pid=73861] <gracefully close start>
  - [pid=73861] <kill>
  - [pid=73861] <will force kill>
  - [pid=73861] exception while trying to kill process: Error: kill ESRCH
  - [pid=73861] <process did exit: exitCode=134, signal=null>
  - [pid=73861] starting temporary directories cleanup
  - [pid=73861] finished temporary directories cleanup
  - [pid=73861] <gracefully close end>

```