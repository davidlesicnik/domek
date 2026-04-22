#!/usr/bin/env python3
import re
from pathlib import Path

URL_REGEX = re.compile(r"https?://[^\s)]+")
PATH_CHARS = frozenset(
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "0123456789"
    "_-./\\"
)


class ValidationResult:
    def __init__(self):
        self.is_valid = True
        self.errors = []
        self.warnings = []

    def add_error(self, msg):
        self.is_valid = False
        self.errors.append(msg)

    def add_warning(self, msg):
        self.warnings.append(msg)


def read_file(path: Path) -> str:
    return path.read_text(errors="ignore")


# ---------- Extractors ----------


def extract_headings(text):
    headings = []
    for line in text.splitlines():
        stripped = line.lstrip()
        if not stripped.startswith("#"):
            continue
        level = 0
        while level < len(stripped) and stripped[level] == "#" and level < 6:
            level += 1
        if level == 0 or level >= len(stripped) or stripped[level] != " ":
            continue
        headings.append((stripped[:level], stripped[level + 1 :].strip()))
    return headings


def parse_fence_line(line):
    i = 0
    indent = 0
    while i < len(line) and line[i] == " " and indent < 3:
        i += 1
        indent += 1
    if i >= len(line) or line[i] not in {"`", "~"}:
        return None

    fence_char = line[i]
    start = i
    while i < len(line) and line[i] == fence_char:
        i += 1
    fence_len = i - start
    if fence_len < 3:
        return None

    return indent, fence_char * fence_len, line[i:]


def extract_code_blocks(text):
    """Line-based fenced code block extractor.

    Handles ``` and ~~~ fences with variable length (CommonMark: closing
    fence must use same char and be at least as long as opening). Supports
    nested fences (e.g. an outer 4-backtick block wrapping inner 3-backtick
    content).
    """
    blocks = []
    lines = text.split("\n")
    i = 0
    n = len(lines)
    while i < n:
        m = parse_fence_line(lines[i])
        if not m:
            i += 1
            continue
        fence_char = m[1][0]
        fence_len = len(m[1])
        open_line = lines[i]
        block_lines = [open_line]
        i += 1
        closed = False
        while i < n:
            close_m = parse_fence_line(lines[i])
            if (
                close_m
                and close_m[1][0] == fence_char
                and len(close_m[1]) >= fence_len
                and close_m[2].strip() == ""
            ):
                block_lines.append(lines[i])
                closed = True
                i += 1
                break
            block_lines.append(lines[i])
            i += 1
        if closed:
            blocks.append("\n".join(block_lines))
        # Unclosed fences are silently skipped — they indicate malformed markdown
        # and including them would cause false-positive validation failures.
    return blocks


def extract_urls(text):
    return set(URL_REGEX.findall(text))


def extract_paths(text):
    paths = set()
    token = []

    def flush():
        if not token:
            return
        candidate = "".join(token).strip(".,:;!?()[]{}<>\"'")
        token.clear()
        if not candidate:
            return
        if is_path_candidate(candidate):
            paths.add(candidate)

    for char in text:
        if char in PATH_CHARS:
            token.append(char)
        else:
            flush()
    flush()
    return paths


def is_path_candidate(token: str) -> bool:
    if len(token) < 2:
        return False
    if token.startswith(("./", "../", "/")):
        return any(sep in token[1:] for sep in ("/", "\\"))
    if len(token) >= 3 and token[1:3] == ":\\" and token[0].isalpha():
        return "\\" in token[3:] or "/" in token[3:]
    return any(sep in token for sep in ("/", "\\")) and any(
        ch.isalnum() for ch in token.replace("/", "").replace("\\", "")
    )


def count_bullets(text):
    count = 0
    for line in text.splitlines():
        stripped = line.lstrip()
        if stripped.startswith(("- ", "* ", "+ ")):
            count += 1
    return count


# ---------- Validators ----------


def validate_headings(orig, comp, result):
    h1 = extract_headings(orig)
    h2 = extract_headings(comp)

    if len(h1) != len(h2):
        result.add_error(f"Heading count mismatch: {len(h1)} vs {len(h2)}")

    if h1 != h2:
        result.add_warning("Heading text/order changed")


def validate_code_blocks(orig, comp, result):
    c1 = extract_code_blocks(orig)
    c2 = extract_code_blocks(comp)

    if c1 != c2:
        result.add_error("Code blocks not preserved exactly")


def validate_urls(orig, comp, result):
    u1 = extract_urls(orig)
    u2 = extract_urls(comp)

    if u1 != u2:
        result.add_error(f"URL mismatch: lost={u1 - u2}, added={u2 - u1}")


def validate_paths(orig, comp, result):
    p1 = extract_paths(orig)
    p2 = extract_paths(comp)

    if p1 != p2:
        result.add_warning(f"Path mismatch: lost={p1 - p2}, added={p2 - p1}")


def validate_bullets(orig, comp, result):
    b1 = count_bullets(orig)
    b2 = count_bullets(comp)

    if b1 == 0:
        return

    diff = abs(b1 - b2) / b1

    if diff > 0.15:
        result.add_warning(f"Bullet count changed too much: {b1} -> {b2}")


# ---------- Main ----------


def validate(original_path: Path, compressed_path: Path) -> ValidationResult:
    result = ValidationResult()

    orig = read_file(original_path)
    comp = read_file(compressed_path)

    validate_headings(orig, comp, result)
    validate_code_blocks(orig, comp, result)
    validate_urls(orig, comp, result)
    validate_paths(orig, comp, result)
    validate_bullets(orig, comp, result)

    return result


# ---------- CLI ----------

if __name__ == "__main__":
    import sys

    if len(sys.argv) != 3:
        print("Usage: python validate.py <original> <compressed>")
        sys.exit(1)

    orig = Path(sys.argv[1]).resolve()
    comp = Path(sys.argv[2]).resolve()

    res = validate(orig, comp)

    print(f"\nValid: {res.is_valid}")

    if res.errors:
        print("\nErrors:")
        for e in res.errors:
            print(f"  - {e}")

    if res.warnings:
        print("\nWarnings:")
        for w in res.warnings:
            print(f"  - {w}")
