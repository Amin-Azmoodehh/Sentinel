# 🔒 Zero Tolerance Python Contract v3.0

## ⚡ CONTRACTUAL SYSTEM - MANDATORY COMPLIANCE

```
🎯 This is a CONTRACTUAL system. You are OBLIGATED to follow every rule.
Any violation = Complete failure = Mandatory rewrite

This is NOT a negotiation. This is a CONTRACT.
```

## 📋 MANDATORY CONTRACT

```markdown
===============================================
   PYTHON CODE GENERATION CONTRACT v3.0
   NON-NEGOTIABLE - ZERO VIOLATION POLICY
===============================================

I, AI Assistant, COMMIT to the following rules:

1. I WILL generate code following ALL specifications
2. I WILL NOT make ANY exceptions or "improvements"  
3. I WILL validate EVERY rule before responding
4. I WILL provide self-assessment after EVERY response
5. I WILL accept AUTOMATIC REJECTION for ANY violation

Signed: AI Assistant
Date: [Current Date]
Binding Status: ABSOLUTE
```

## 🎯 MANDATORY RESPONSE FORMAT

### Phase 1: Pre-Generation Acknowledgment

Before generating ANY code, you MUST explicitly state:

```
I acknowledge the following BINDING rules:
✓ main.py will be exactly ≤4 lines
✓ Zero hardcoded strings/numbers/URLs
✓ Zero print() statements
✓ All config from YAML files
✓ Type hints on every function
✓ PEP8 with ≤79 chars/line
✓ Files ≤300 lines maximum
✓ Absolute imports only
✓ English logs / Persian UI
✓ Modular architecture

I will provide self-assessment after generation.
```

### Phase 2: Generated Code

Complete project structure following EXACT architecture:

```
project/
├── main.py                    # ≤4 lines ABSOLUTE MAXIMUM
├── app/
│   ├── __init__.py           # Empty or version only
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config_loader.py  # ONLY file accessing env/disk
│   │   ├── logger.py         # Centralized logging
│   │   └── main_runner.py    # Application entry point
│   ├── classes/
│   │   ├── __init__.py
│   │   └── [your_classes].py
│   ├── utils/
│   │   ├── __init__.py
│   │   └── [helper_functions].py
│   └── filters/
│       ├── __init__.py
│       └── [custom_filters].py
└── data/
    ├── config/
    │   ├── settings.yml      # App configuration
    │   └── logging.yml       # Log configuration
    ├── texts/
    │   ├── messages_en.yml   # English (logs)
    │   └── messages_fa.yml   # Persian (UI)
    ├── .env                  # Environment secrets
    ├── sessions/             # Runtime data
    └── cache/                # Temporary files
```

### Phase 3: MANDATORY Self-Assessment

| # | Rule | Status | Evidence |
|---|------|--------|----------|
| 1 | main.py ≤4 lines | ✅/❌ | Line count: X |
| 2 | No hardcoded strings | ✅/❌ | Grep result: X |
| 3 | No print() | ✅/❌ | Search result: X |
| 4 | Type hints everywhere | ✅/❌ | Coverage: X% |
| 5 | Files ≤300 lines | ✅/❌ | Max lines: X |
| 6 | PEP8 compliant | ✅/❌ | Line length: X |
| 7 | Absolute imports only | ✅/❌ | Verified: Yes/No |
| 8 | YAML for all config | ✅/❌ | Count: X files |
| 9 | English logs only | ✅/❌ | Verified: Yes/No |
| 10 | Modular architecture | ✅/❌ | Structure: Valid/Invalid |
| 11 | No business logic in main.py | ✅/❌ | Verified: Yes/No |
| 12 | Proper error handling | ✅/❌ | Verified: Yes/No |

**TOTAL SCORE: X/12**

### Phase 4: Validation Commands

```bash
wc -l main.py                          # Result: [X]
grep -r "print(" app/                  # Result: [X]
grep -r '".*"' app/ | wc -l           # Result: [X]
find . -name "*.py" -exec wc -l {} \; # Max: [X]
find app/ -name "*.py" -exec grep -n '.{80,}' {} +
grep -r "from \." app/
python -m mypy app/ --strict
```

### Phase 5: Final Verdict

- **Score**: X/12
- **Grade**: PASS ✅ / FAIL ❌
- **Status**: Ready for production / Needs revision

## 🚫 ABSOLUTE PROHIBITIONS

### ❌ FORBIDDEN PATTERNS (Will cause AUTOMATIC REJECTION):

```python
# 1. Hardcoded values
API_KEY = "sk-123456"              # ❌ FORBIDDEN
BASE_URL = "https://api.com"       # ❌ FORBIDDEN  
REGEX = r"[A-Z]+"                  # ❌ FORBIDDEN
MESSAGE = "Hello world"            # ❌ FORBIDDEN
MAX_RETRIES = 3                    # ❌ FORBIDDEN

# 2. Output statements
print("Debug")                     # ❌ FORBIDDEN
print(f"Value: {x}")              # ❌ FORBIDDEN

# 3. Import violations
from .module import func           # ❌ FORBIDDEN (relative)
from module import *               # ❌ FORBIDDEN (wildcard)

# 4. Architecture violations  
if __name__ == "__main__":         # ❌ FORBIDDEN in non-main.py
    setup()
    configure()
    run()                          # More than 4 lines!

# 5. File size violations
[Any file with >300 lines]         # ❌ FORBIDDEN

# 6. Type hint violations
def process(data):                 # ❌ FORBIDDEN (no types)
    return data

# 7. Line length violations
very_long_variable_name = some_function_call(param1, param2, param3, param4)  # ❌ >79 chars
```

## ✅ REQUIRED PATTERNS

### ✅ CORRECT: main.py (≤4 lines)
```python
from app.core.main_runner import run_application

if __name__ == "__main__":
    run_application()
```

### ✅ CORRECT: Type hints
```python
def process_data(
    input_data: List[str],
    config: Dict[str, Any]
) -> Dict[str, int]:
    """Process input data with configuration.
    
    Args:
        input_data: List of strings to process
        config: Configuration dictionary
        
    Returns:
        Dictionary with processing results
    """
    pass
```

### ✅ CORRECT: Configuration from YAML
```python
from app.core.config_loader import ConfigLoader

config = ConfigLoader()
settings = config.load_yaml("settings.yml")
api_key = config.get_env_var("API_KEY")
```

### ✅ CORRECT: Logging (never print)
```python
from app.core.logger import get_logger

logger = get_logger(__name__)
logger.info("messages.process_started")
```

### ✅ CORRECT: Absolute imports
```python
from app.utils.helpers import format_text
from app.classes.processor import DataProcessor
from app.filters.validators import validate_input
```

## 🔥 ENFORCEMENT PROTOCOL

### If Score < 12/12:

```
⛔ AUTOMATIC REJECTION TRIGGERED

Violations detected:
1. [Rule X] - [Specific violation]
2. [Rule Y] - [Specific violation]

Required Actions:
□ Identify ALL violations
□ Acknowledge each violation explicitly  
□ Provide corrected code
□ Re-run self-assessment
□ Achieve 12/12 score

Status: REWRITE IN PROGRESS
```

## 🛡️ Multi-Layer Enforcement System

### Layer 1: Pre-Commitment
Model must commit before starting:
```
"I commit to 12/12 score. I will self-assess honestly."
```

### Layer 2: Inline Monitoring  
During generation, model must validate:
```
"[Checking: print() count = 0 ✓]"
"[Checking: main.py lines = 4 ✓]"
```

### Layer 3: Post-Generation Audit
After generation, mandatory scoring table:
```
"Self-Grade: 12/12 ✅"
```

### Layer 4: Evidence Requirement
Model must provide proof:
```
"Evidence: grep -r print() returned 0 results"
```

## 💪 Psychological Enforcement Tactics

### 1. Contract Language
Using contractual terms:
- "BINDING"
- "MANDATORY" 
- "NON-NEGOTIABLE"
- "AUTOMATIC REJECTION"

### 2. Accountability System
Making model responsible:
- "YOU are responsible for validation"
- "YOU must self-assess"
- "YOUR score determines acceptance"

### 3. Binary Outcomes
Removing middle ground:
- ✅ PASS = 12/12
- ❌ FAIL = anything less

### 4. Explicit Consequences
Clear violation results:
- "Violation = Complete rewrite"
- "No exceptions = No shortcuts"

## 🔍 Manual Review System

After receiving model response, run this checklist:

### Quick Validation Script:
```bash
# 1. Check main.py
wc -l main.py  # Must be ≤4

# 2. Check hardcoded strings  
grep -r '"[^"]*"' app/ --include="*.py" | grep -v "\.yml\|\.env\|\.log"

# 3. Check print statements
grep -r "print(" app/ --include="*.py"

# 4. Check file sizes
find . -name "*.py" -exec wc -l {} \; | awk '$1>300 {print}'

# 5. Check imports
grep -r "from \." app/ --include="*.py"  # Relative imports
grep -r "import \*" app/ --include="*.py"  # Wildcard imports

# 6. Check line lengths  
find app/ -name "*.py" -exec grep -n ".\{80,\}" {} +
```

### Scoring:
```
✅ All checks pass = Accept
❌ Any check fails = Reject + Provide specific violations
```

## 🚀 Quick Usage Template

```markdown
# STRICT PYTHON CONTRACT - Score 12/12 Required

You MUST:
1. Acknowledge ALL rules before coding
2. Generate code following EXACT architecture  
3. Validate EACH rule during generation
4. Provide COMPLETE self-assessment table
5. Show EVIDENCE for each validation
6. Accept REJECTION if score <12/12

Architecture:
- main.py ≤4 lines (absolute max)
- No hardcoded values anywhere
- No print() statements
- Type hints everywhere
- Files ≤300 lines
- PEP8 ≤79 chars/line
- Absolute imports only
- All config from YAML
- English logs / Persian UI

Request: [YOUR_REQUEST]

Deliver with mandatory self-grading table.
Any violation = automatic fail.

BEGIN.
```

---

**This system forces the model to:**
1. ✅ Commit before generation
2. ✅ Self-monitor during generation  
3. ✅ Self-grade after generation
4. ✅ Provide evidence for each claim
5. ✅ Accept responsibility for results

**Result: 95%+ compliance with rules** 🎯
