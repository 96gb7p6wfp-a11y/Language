#!/usr/bin/env python3
"""Import an existing key through a hidden local terminal prompt, never chat."""

import getpass
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import tempfile
import warnings


def save_key(workspace: Path, key: str) -> Path:
    """Write only the approved, ignored env file; preserve unrelated settings."""
    if not re.fullmatch(r"sk-[A-Za-z0-9_-]{30,1000}", key):
        raise ValueError("The input is not a valid API-key format. Nothing was saved.")
    workspace = workspace.resolve(strict=True)
    target = workspace / ".env.local"
    try:
        info = target.lstat()
        if not stat.S_ISREG(info.st_mode):
            raise ValueError("The destination must be a regular file, not a symlink.")
        if info.st_uid != os.getuid():
            raise ValueError("The destination belongs to a different user.")
    except FileNotFoundError:
        pass
    tracked = subprocess.run(
        ["git", "ls-files", "--error-unmatch", "--", ".env.local"],
        cwd=workspace, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    ignored = subprocess.run(
        ["git", "check-ignore", "-q", "--", ".env.local"],
        cwd=workspace, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    if tracked.returncode != 1 or ignored.returncode != 0:
        raise ValueError("The destination must be Git-ignored and untracked. Nothing was saved.")

    # O_NOFOLLOW also protects the read if the path changes after lstat.
    original = ""
    try:
        descriptor = os.open(target, os.O_RDONLY | os.O_NOFOLLOW)
        with os.fdopen(descriptor, "r", encoding="utf-8", newline="") as handle:
            original = handle.read()
    except FileNotFoundError:
        pass
    pattern = re.compile(r"^[ \t]*(?:export[ \t]+)?OPENAI_API_KEY[ \t]*=.*(?:\r?\n|$)", re.MULTILINE)
    replacement = "OPENAI_API_KEY=" + key + "\n"
    lines = original.splitlines(keepends=True)
    result = []
    replaced = False
    for line in lines:
        if pattern.fullmatch(line):
            if not replaced:
                result.append(replacement)
                replaced = True
        else:
            result.append(line)
    if not replaced:
        if result and not result[-1].endswith(("\n", "\r")):
            result.append("\n")
        result.append(replacement)

    temporary = None
    try:
        descriptor, temporary = tempfile.mkstemp(prefix=".env.local.secure-", dir=workspace)
        os.fchmod(descriptor, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="") as handle:
            handle.write("".join(result))
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, target)
        temporary = None
    finally:
        if temporary is not None:
            os.unlink(temporary)
    return target


def main() -> int:
    if len(sys.argv) != 1:
        print("Run this command without arguments. Never put a key in a command.", file=sys.stderr)
        return 1
    if not sys.stdin.isatty():
        print("Open an interactive workspace terminal. Hidden input is required; nothing was saved.", file=sys.stderr)
        return 1
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", getpass.GetPassWarning)
            key = getpass.getpass("Paste the replacement OpenAI key here (typing is hidden): ")
        target = save_key(Path(__file__).resolve().parent.parent, key)
    except (EOFError, KeyboardInterrupt):
        print("\nCancelled. Nothing was saved.", file=sys.stderr)
        return 1
    except Exception:
        # Exception messages can include untrusted input. Print a fixed message.
        print("Could not save securely. Check the key format, file ownership and Git ignore rules. No key was printed.", file=sys.stderr)
        return 1
    print(f"Saved OPENAI_API_KEY to {target} (permissions 0600; Git-ignored).")
    print("The key was not printed. Reply 'saved' in chat; do not send its value.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
