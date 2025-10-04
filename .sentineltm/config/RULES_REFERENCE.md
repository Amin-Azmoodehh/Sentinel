# 🛡️ SentinelTM Universal Rules Reference
## Zero Tolerance • Military-Grade Quality Standards

> **BINDING CONTRACT**: These rules apply to ALL IDE profiles and programming languages.
> **ENFORCEMENT**: Automatic rejection for ANY violation.
> **SCOPE**: Universal standards for VS Code, Cursor, Windsurf, Zed, and all supported IDEs.

---

## 🎯 UNIVERSAL QUALITY STANDARDS

### 🔥 Zero Tolerance Principles

1. **ABSOLUTE COMPLIANCE**: No exceptions, no negotiations
2. **MILITARY PRECISION**: Every rule enforced automatically  
3. **UNIVERSAL APPLICATION**: Same standards across ALL IDEs
4. **IMMEDIATE REJECTION**: Any violation = automatic failure

### 📊 Quality Gate Thresholds

| Metric | Minimum | Action on Failure |
|--------|---------|-------------------|
| **Overall Score** | 95/100 | AUTOMATIC REJECTION |
| **Code Quality** | 90/100 | MANDATORY REWRITE |
| **Security Score** | 100/100 | IMMEDIATE BLOCK |
| **Performance** | 85/100 | OPTIMIZATION REQUIRED |

---

## 🌐 MULTI-LANGUAGE STANDARDS

### Python Projects

**Entry Point Rules:**
- **Filename**: `main.py` (EXACTLY 4 lines maximum)
- **Content**: Import-only, zero side effects
- **Structure**: Delegate to `app.core.main_runner`

```python
# ✅ COMPLIANT main.py (4 lines max)
from app.core.main_runner import run_application

if __name__ == "__main__":
    run_application()
```

**Code Standards:**
- **Line Length**: 79 characters (PEP8 STRICT)
- **Type Hints**: MANDATORY for ALL functions
- **Imports**: Absolute only, NO wildcards
- **Logging**: English only, NO print() statements

### TypeScript/JavaScript Projects

**Entry Point Rules:**
- **Filename**: `src/main.ts` or `src/index.ts`
- **Max Lines**: 10 (including imports)
- **Structure**: Clean separation of concerns

```typescript
// ✅ COMPLIANT main.ts
import { Application } from './core/application';
import { ConfigLoader } from './core/config-loader';

async function main(): Promise<void> {
  const config = await ConfigLoader.load();
  const app = new Application(config);
  await app.start();
}

main().catch(console.error);
```

**Code Standards:**
- **Strict TypeScript**: NO `any` types allowed
- **Interface Definitions**: Required for all data structures
- **Error Handling**: Comprehensive try-catch blocks
- **Async/Await**: Preferred over Promises

### Go Projects

**Entry Point Rules:**
- **Filename**: `cmd/main.go`
- **Package**: `package main`
- **Structure**: Minimal main function

```go
// ✅ COMPLIANT main.go
package main

import (
    "github.com/project/internal/app"
    "github.com/project/internal/config"
)

func main() {
    cfg := config.Load()
    app.Run(cfg)
}
```

### Rust Projects

**Entry Point Rules:**
- **Filename**: `src/main.rs`
- **Error Handling**: Result<T, E> pattern
- **Memory Safety**: Zero unsafe blocks

```rust
// ✅ COMPLIANT main.rs
use crate::app::Application;
use crate::config::Config;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = Config::load()?;
    let app = Application::new(config);
    app.run()
}
```

---

## 🔒 UNIVERSAL SECURITY STANDARDS

### 🚫 FORBIDDEN PATTERNS (ALL LANGUAGES)

**High-Risk Functions:**
```
❌ eval()          ❌ exec()          ❌ system()
❌ shell_exec()    ❌ passthru()      ❌ proc_open()
❌ dangerouslySetInnerHTML            ❌ innerHTML
❌ document.write() ❌ setTimeout(string) ❌ setInterval(string)
```

**Dangerous Modules/Packages:**
```
❌ subprocess (Python)     ❌ os.system (Python)
❌ child_process (Node.js)  ❌ vm (Node.js)  
❌ unsafe (Rust)           ❌ reflect (Go)
```

### 🛡️ SECURITY REQUIREMENTS

**Authentication:**
- API keys in environment variables ONLY
- NO hardcoded credentials anywhere
- Secure token rotation mechanisms

**Data Validation:**
- Input sanitization for ALL user data
- SQL injection prevention (parameterized queries)
- XSS protection (output encoding)

**File Operations:**
- Workspace-relative paths ONLY
- Path traversal prevention (`../` blocked)
- File size limits enforced

---

## 📁 UNIVERSAL PROJECT ARCHITECTURE

### 🏗️ MANDATORY DIRECTORY STRUCTURE

```
project/
├── src/                    # Source code (ALL languages)
│   ├── core/              # Core business logic
│   ├── services/          # External service integrations  
│   ├── utils/             # Utility functions
│   ├── types/             # Type definitions
│   └── main.*             # Entry point
├── data/                  # Configuration & localization
│   ├── config/            # App configuration files
│   │   ├── settings.yml   # Main settings
│   │   └── logging.yml    # Logging configuration
│   └── texts/             # Localized text files
│       ├── en.yml         # English (logs/console)
│       └── fa.yml         # Persian (UI/chat)
├── tests/                 # Test files
├── docs/                  # Documentation
├── .sentineltm/           # SentinelTM configuration
│   ├── config/
│   │   └── rules.json     # Quality rules
│   └── db/                # Local database
└── README.md              # Project documentation
```

### 📋 CONFIGURATION STANDARDS

**settings.yml (Universal Format):**
```yaml
app:
  name: "ProjectName"
  version: "1.0.0"
  environment: "development"

providers:
  openai:
    type: "openai-compatible"
    baseURL: "https://api.openai.com/v1"
    apiKey: "${OPENAI_API_KEY}"
  
  openrouter:
    type: "openai-compatible" 
    baseURL: "https://openrouter.ai/api/v1"
    apiKey: "${OPENROUTER_API_KEY}"

thresholds:
  gate: 95
  security: 100
  performance: 85
```

---

## 🌍 LOCALIZATION STANDARDS

### 📝 TEXT EXTERNALIZATION (MANDATORY)

**English (en.yml) - Console/Logs:**
```yaml
app:
  start: "Application started successfully"
  stop: "Application stopped gracefully"
  error: "Critical error occurred: {error}"

validation:
  required_field: "Field '{field}' is required"
  invalid_format: "Invalid format for '{field}'"
  
security:
  auth_failed: "Authentication failed"
  access_denied: "Access denied to resource"
```

**Persian (fa.yml) - UI/Chat:**
```yaml
ui:
  welcome: "خوش آمدید"
  goodbye: "خداحافظ"
  loading: "در حال بارگذاری..."

chat:
  greeting: "سلام! چطور می‌تونم کمکتون کنم؟"
  error: "متأسفانه خطایی رخ داده: {error}"
  success: "عملیات با موفقیت انجام شد"

validation:
  required: "فیلد '{field}' اجباری است"
  invalid: "فرمت '{field}' نامعتبر است"
```

### 🔧 USAGE PATTERNS

**Python:**
```python
from app.core.config_loader import load_texts

texts = load_texts()
logger.info(texts['en']['app.start'])
chat_response = texts['fa']['chat.greeting']
```

**TypeScript:**
```typescript
import { loadTexts } from './core/config-loader';

const texts = await loadTexts();
console.log(texts.en.app.start);
const chatMessage = texts.fa.chat.greeting;
```

---

## 🧪 TESTING STANDARDS

### 📊 COVERAGE REQUIREMENTS

| Component | Minimum Coverage | Critical Paths |
|-----------|------------------|----------------|
| **Core Logic** | 95% | 100% |
| **API Endpoints** | 90% | 100% |
| **Utilities** | 85% | 95% |
| **UI Components** | 80% | 90% |

### 🔬 TEST STRUCTURE

**TypeScript/JavaScript:**
```typescript
describe('UserService', () => {
  beforeEach(() => {
    // Setup
  });

  describe('createUser', () => {
    it('should create user with valid data', async () => {
      // Test success case
    });

    it('should reject invalid email format', async () => {
      // Test validation
    });

    it('should handle database errors gracefully', async () => {
      // Test error handling
    });
  });
});
```

**Python:**
```python
class TestUserService:
    def setup_method(self):
        # Setup for each test
        pass
    
    def test_create_user_success(self):
        # Test success case
        assert result.is_success()
    
    def test_create_user_invalid_email(self):
        # Test validation
        with pytest.raises(ValidationError):
            service.create_user(invalid_data)
```

---

## 🚀 IDE-SPECIFIC INTEGRATIONS

### VS Code Configuration
```json
{
  "sentineltm.enabled": true,
  "sentineltm.qualityGate": true,
  "sentineltm.autoIndex": true,
  "sentineltm.strictMode": true
}
```

### Cursor Configuration  
```json
{
  "cursor.sentineltm.integration": true,
  "cursor.sentineltm.realTimeValidation": true
}
```

### Windsurf MCP Integration
```json
{
  "mcpServers": {
    "sentineltm": {
      "command": "st",
      "args": ["serve", "--mcp-stdio"],
      "env": {
        "SENTINEL_LOG_LEVEL": "info",
        "SENTINEL_AUTO_INDEX": "true"
      }
    }
  }
}
```

### Zed Configuration
```json
{
  "assistant.default": "sentinel",
  "assistant.providers": {
    "sentinel": {
      "command": "st",
      "args": ["serve", "--mcp-stdio"]
    }
  }
}
```

---

## ⚡ PERFORMANCE STANDARDS

### 🎯 RESPONSE TIME REQUIREMENTS

| Operation | Maximum Time | Optimization Required |
|-----------|-------------|----------------------|
| **File Read** | 100ms | Caching |
| **Index Build** | 5s | Incremental updates |
| **Quality Gate** | 30s | Parallel processing |
| **MCP Response** | 500ms | Async operations |

### 💾 RESOURCE LIMITS

- **Memory Usage**: < 100MB for CLI operations
- **CPU Usage**: < 50% sustained load
- **Disk I/O**: Batched operations preferred
- **Network**: Connection pooling for API calls

---

## 🔄 CONTINUOUS INTEGRATION

### 🛠️ PRE-COMMIT HOOKS

```bash
#!/bin/sh
# .git/hooks/pre-commit

echo "🛡️ SentinelTM Quality Gate"
st gate run --strict

if [ $? -ne 0 ]; then
    echo "❌ Quality gate failed - commit rejected"
    exit 1
fi

echo "✅ Quality gate passed"
```

### 🚀 DEPLOYMENT PIPELINE

1. **Code Quality Check**: `st gate run`
2. **Security Scan**: `st security validate`
3. **Performance Test**: `st benchmark run`
4. **Integration Test**: Full test suite
5. **Documentation Update**: Auto-generated docs
6. **Version Bump**: Semantic versioning
7. **Release**: Automated deployment

---

## 📚 DOCUMENTATION REQUIREMENTS

### 📖 MANDATORY SECTIONS

1. **Installation Guide**: Step-by-step setup
2. **Quick Start**: 5-minute tutorial
3. **API Reference**: Complete function documentation
4. **Configuration**: All options explained
5. **Troubleshooting**: Common issues & solutions
6. **Contributing**: Development guidelines
7. **Changelog**: Version history

### 📝 CODE DOCUMENTATION

**Function Documentation (Required):**
```typescript
/**
 * Processes user authentication with multi-factor validation
 * @param credentials - User login credentials
 * @param options - Authentication options
 * @returns Promise resolving to authentication result
 * @throws AuthenticationError when credentials are invalid
 * @example
 * ```typescript
 * const result = await authenticateUser(creds, { mfa: true });
 * ```
 */
async function authenticateUser(
  credentials: UserCredentials,
  options: AuthOptions
): Promise<AuthResult> {
  // Implementation
}
```

---

## 🎖️ COMPLIANCE VERIFICATION

### ✅ AUTOMATED CHECKS

- **Code Quality**: ESLint, Prettier, Black, Rustfmt
- **Security**: Bandit, ESLint Security, Clippy
- **Performance**: Benchmarks, Memory profiling
- **Documentation**: Doc coverage, Link validation

### 📋 MANUAL REVIEW CHECKLIST

- [ ] All functions have type hints/annotations
- [ ] No hardcoded strings or configuration
- [ ] Error handling covers all edge cases
- [ ] Tests cover critical paths (100%)
- [ ] Documentation is complete and accurate
- [ ] Security review completed
- [ ] Performance benchmarks pass

---

## 🚨 VIOLATION CONSEQUENCES

### ⚡ IMMEDIATE ACTIONS

| Violation Type | Action | Recovery |
|---------------|--------|----------|
| **Security Risk** | BLOCK IMMEDIATELY | Security review required |
| **Quality < 95** | REJECT COMMIT | Rewrite mandatory |
| **Missing Tests** | BUILD FAILURE | Add comprehensive tests |
| **Hardcoded Values** | AUTO-REJECT | Externalize to config |

### 🔄 REMEDIATION PROCESS

1. **Automatic Detection**: SentinelTM identifies violation
2. **Immediate Block**: Operation halted instantly  
3. **Detailed Report**: Specific issues highlighted
4. **Guided Fix**: Step-by-step remediation
5. **Re-validation**: Automatic re-check after fix
6. **Approval**: Only after 100% compliance

---

**⚖️ LEGAL NOTICE**: These rules constitute a binding quality contract. Compliance is mandatory for all code contributions across ALL supported IDEs and programming languages.

**🛡️ ENFORCEMENT**: Powered by SentinelTM Quality Gates - Zero Tolerance, Military-Grade Standards.

---

## 🎯 QUICK REFERENCE CHECKLIST

### ✅ Before Every Commit
- [ ] Code quality score ≥ 95/100
- [ ] Security scan passes (100/100)
- [ ] All tests pass with required coverage
- [ ] No hardcoded strings or credentials
- [ ] Documentation updated
- [ ] Performance benchmarks meet standards

### ✅ Before Every Release
- [ ] Full integration test suite passes
- [ ] All IDE configurations validated
- [ ] Localization files updated
- [ ] Version bumped according to semver
- [ ] Changelog updated with all changes
- [ ] Security review completed

### ✅ Multi-Language Compliance
- [ ] **Python**: PEP8, type hints, 4-line main.py
- [ ] **TypeScript**: Strict mode, no `any`, proper interfaces
- [ ] **Go**: Standard formatting, minimal main function
- [ ] **Rust**: Memory safety, Result<T,E> patterns

---

**📞 SUPPORT**: For questions about these standards, run `st help rules` or visit the SentinelTM documentation.

**🔄 UPDATES**: This document is automatically synchronized across all IDE profiles and updated with each SentinelTM release.

---

## 🆕 Latest Features (v2.2+)

### 🏗️ High-Level Workflows
SentinelTM now supports **Declarative Development** through intelligent workflows:

```bash
# Scaffold complete component with tests
st workflow component UserProfile --path src/components

# Generate API endpoint with validation
st workflow api getUserData --method GET --path /api/users/:id

# Refactor symbols across entire project
st workflow rename oldFunction newFunction --scope project
```

**Benefits:**
- Follows existing project patterns automatically
- Generates tests and documentation
- Maintains code consistency
- Reduces boilerplate by 80%

### 🧠 Context Enrichment
AI code generation now uses **Project-Aware Context**:
- Analyzes existing code patterns
- Extracts naming conventions
- Identifies dependency usage
- Follows project architecture

**Result:** AI-generated code matches your project style perfectly, reducing hallucination by 70%.

### 🎟️ Context Window Monitor
Real-time token tracking with MCP integration:
- Monitor usage: `st monitor stats`
- Smart warnings at 85% and 95%
- MCP Tool: `sentinel_context_monitor`
- Prevents context overflow
- **MANDATORY**: AI models MUST display token usage after every response
- Use `st monitor count <text>` to count tokens in any text
- Automatic tracking with tiktoken for accuracy

### 🤝 Friendly Companion
Personalized AI interaction through `friendly.yml`:
- Custom tone and personality
- Smart command aliases (Persian/English)
- Remembers your preferences
- Context-aware workflows

### 📜 Named Scripts
Secure, reusable command workflows:
- Define in `scripts.yml`
- Security validation built-in
- Parameter substitution
- Confirmation prompts for sensitive operations

---
