# 🔒 Zero Tolerance Python Contract v3.0

This document outlines the strict, non-negotiable rules for AI-generated Python code, enforced by the SentinelTM Quality Gate. Adherence is mandatory.

## 📜 The Contract

This is a binding contract. Any violation results in automatic rejection and a mandatory rewrite. There are no exceptions.

### Core Principles

1.  **Follow ALL specifications**: No creative deviations or "improvements".
2.  **Validate before responding**: Every rule must be checked.
3.  **Provide self-assessment**: A mandatory checklist must be completed.
4.  **Accept automatic rejection**: Any violation equals failure.

## 📐 Architecture Blueprint

All generated Python projects MUST follow this structure:

```
project/
├── main.py             # ≤4 lines, application entry point only
├── app/
│   ├── core/           # Core services: config, logging, main runner
│   ├── classes/        # Main application classes
│   ├── utils/          # Helper functions
│   └── ...             # Other modules as needed
└── data/
    ├── config/         # All .yml configuration files
    ├── texts/          # All .yml text/message files (e.g., messages_en.yml)
    └── .env            # Environment variables and secrets
```

## 🚫 Absolute Prohibitions

| Category | Forbidden Pattern | Example |
|---|---|---|
| **Hardcoded Values** | Any string, number, URL, or regex not from config. | `API_KEY = "..."`, `MAX_RETRIES = 3` |
| **Output** | `print()` statements. | `print("Debug info")` |
| **Imports** | Relative or wildcard imports. | `from .utils import helper`, `from os import *` |
| **Architecture** | Logic in `main.py`; files > 300 lines. | `if __name__ == "__main__": app.run()` |
| **Style** | Lines > 79 characters; missing type hints. | `def my_func(data): ...` |

## ✅ Required Patterns

-   **`main.py`**: Must be ≤4 lines and only call the main application runner.
-   **Type Hints**: Every function, method, and variable must have a type hint.
-   **Configuration**: All configuration, text, and secrets must be loaded from `.yml` or `.env` files via a centralized `ConfigLoader`.
-   **Logging**: Use a centralized logger. Logs must be in English.
-   **Imports**: All imports must be absolute.

## 📝 Mandatory Response Format

Every AI response that generates code MUST include:

1.  **Pre-Generation Acknowledgment**: A statement confirming all rules are understood.
2.  **Generated Code**: The complete, runnable project structure.
3.  **Self-Assessment Checklist**: A table validating each of the 10 core rules.
4.  **Validation Commands**: The output of commands used for verification (e.g., `wc`, `grep`).
5.  **Final Verdict**: A `PASS ✅` or `FAIL ❌` grade.

### Example Self-Assessment Checklist

| # | Rule | Status | Evidence |
|---|---|---|---|
| 1 | `main.py` ≤4 lines | ✅ | Line count: 4 |
| 2 | No hardcoded strings | ✅ | `grep` result: 0 matches |
| 3 | No `print()` | ✅ | `grep` result: 0 matches |
| 4 | Type hints everywhere | ✅ | `mypy` coverage: 100% |
| 5 | Files ≤300 lines | ✅ | Max lines: 128 |
| 6 | PEP8 compliant (≤79 chars) | ✅ | Max line length: 78 |
| 7 | Absolute imports only | ✅ | Verified: Yes |
| 8 | YAML for all config | ✅ | `find data -name "*.yml"`: 3 files |
| 9 | English logs only | ✅ | Verified: Yes |
| 10 | Modular architecture | ✅ | Structure: Valid |

**TOTAL SCORE: 10/10**

## 🔥 Enforcement Protocol

-   **Score < 10/10**: The response is automatically rejected.
-   **Rejection**: The AI must identify all violations, acknowledge them, provide corrected code, and re-run the self-assessment until a 10/10 score is achieved.

## 🧹 Code Hygiene (Required Before Commit)

- Run `st fmt` to auto-format code across common languages.
- Run `st lint` to catch issues early. For Python, Ruff is used (`st py format`, `st py lint`).
- Keep configurations minimal and centralized. Prefer `pyproject.toml` and `.prettierrc`.

