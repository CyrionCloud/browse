# CLAUDE.md - AI Assistant Guide for Browse Repository

> **Last Updated:** 2026-01-14
> **Repository:** CyrionCloud/browse
> **Status:** Initial Setup

## Table of Contents

1. [Project Overview](#project-overview)
2. [Repository Structure](#repository-structure)
3. [Development Workflow](#development-workflow)
4. [Key Conventions](#key-conventions)
5. [Common Tasks](#common-tasks)
6. [Technology Stack](#technology-stack)
7. [Best Practices for AI Assistants](#best-practices-for-ai-assistants)

---

## Project Overview

**Project Name:** Browse
**Repository:** CyrionCloud/browse
**Purpose:** [To be documented as project develops]

### Project Status
This is a newly initialized repository. As the codebase develops, this section should include:
- Project goals and objectives
- Key features and capabilities
- Target users/audience
- Current development phase

---

## Repository Structure

### Directory Layout
```
browse/
├── CLAUDE.md           # This file - AI assistant guide
├── README.md           # User-facing documentation (to be created)
├── src/                # Source code (to be created)
├── tests/              # Test files (to be created)
├── docs/               # Additional documentation (to be created)
└── .git/               # Git repository metadata
```

### Key Files and Directories
As the project develops, document:
- Entry points
- Configuration files
- Important modules/packages
- Test locations
- Build outputs

---

## Development Workflow

### Git Branching Strategy

**Branch Naming Convention:**
- Feature branches: `claude/claude-md-<session-id>`
- All development branches must start with `claude/` prefix
- Current development branch: `claude/claude-md-mkdqsdmwp181qugg-9Fu6j`

**Git Operations:**
```bash
# Always use -u flag when pushing to new branches
git push -u origin <branch-name>

# Fetch specific branches
git fetch origin <branch-name>

# Pull with explicit branch
git pull origin <branch-name>
```

**Retry Logic for Network Operations:**
- Retry failed push/fetch operations up to 4 times
- Use exponential backoff: 2s, 4s, 8s, 16s
- Only retry on network errors, not auth failures

### Commit Guidelines

**Commit Message Format:**
```
<type>: <short description>

<optional detailed description>

<optional footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Best Practices:**
- Write clear, concise commit messages
- Focus on the "why" rather than "what"
- Keep commits atomic and focused
- Always run tests before committing

### Pull Request Workflow

1. **Before Creating PR:**
   - Run `git status` to see all changes
   - Run `git diff` to review changes
   - Check commit history with `git log`
   - Ensure all tests pass

2. **PR Description Format:**
   ```markdown
   ## Summary
   - Bullet point 1
   - Bullet point 2

   ## Test Plan
   - [ ] Test case 1
   - [ ] Test case 2
   ```

3. **Creating PR:**
   ```bash
   gh pr create --title "descriptive title" --body "$(cat <<'EOF'
   ## Summary
   <description>

   ## Test Plan
   <test checklist>
   EOF
   )"
   ```

---

## Key Conventions

### Code Style

**General Principles:**
- Follow existing code patterns in the repository
- Maintain consistent indentation (detect from existing files)
- Use meaningful variable and function names
- Write self-documenting code where possible

**When to Add Comments:**
- Only add comments where logic isn't self-evident
- Explain "why" not "what"
- Document complex algorithms or business logic
- Don't add comments to code you didn't change

### File Organization

**Naming Conventions:**
- Use consistent naming patterns (to be established)
- Follow language-specific conventions
- Group related functionality together

**Import/Module Structure:**
- Organize imports logically
- Remove unused imports
- Use relative imports appropriately

### Error Handling

**Security Considerations:**
- Avoid command injection vulnerabilities
- Prevent XSS attacks
- Avoid SQL injection
- Follow OWASP Top 10 guidelines
- Validate input at system boundaries only

**Error Handling Philosophy:**
- Only handle errors at system boundaries
- Don't add unnecessary try-catch blocks
- Trust internal code and framework guarantees
- Don't handle scenarios that can't happen

---

## Common Tasks

### Setting Up Development Environment

```bash
# Clone repository
git clone <repository-url>
cd browse

# Fetch latest changes
git fetch origin

# Create feature branch
git checkout -b claude/feature-<session-id>

# [Add language-specific setup commands as project develops]
```

### Running Tests

```bash
# [Add test commands as project develops]
# Example: npm test, pytest, cargo test, etc.
```

### Building the Project

```bash
# [Add build commands as project develops]
# Example: npm run build, make, cargo build, etc.
```

### Debugging

**Tips for AI Assistants:**
- Always read files before suggesting changes
- Use search tools to understand code relationships
- Check test files to understand expected behavior
- Review recent commits for context

---

## Technology Stack

### Core Technologies
- [To be documented as project develops]

### Development Tools
- Git for version control
- [Package manager to be determined]
- [Build tools to be determined]
- [Testing framework to be determined]

### Dependencies
- [To be documented when dependencies are added]

---

## Best Practices for AI Assistants

### Before Making Changes

1. **Read First:** Always read files before modifying them
2. **Search for Context:** Use grep/glob to find related code
3. **Check Tests:** Look for existing tests to understand behavior
4. **Review History:** Check git log for recent changes

### When Writing Code

1. **Avoid Over-Engineering:**
   - Only make requested changes
   - Don't add extra features
   - Keep solutions simple
   - Three similar lines > premature abstraction

2. **Don't Add Unnecessary Elements:**
   - No extra error handling for impossible scenarios
   - No docstrings for unchanged code
   - No refactoring beyond the task
   - No "improvements" not explicitly requested

3. **Security First:**
   - Check for injection vulnerabilities
   - Validate at boundaries only
   - Follow security best practices
   - Fix security issues immediately

4. **Clean Code:**
   - Delete unused code completely
   - No backwards-compatibility hacks for new code
   - No `_unused` variables or `// removed` comments
   - If something is unused, delete it

### Tool Usage

**Preferred Tools:**
- `Read` for viewing files (not `cat`)
- `Edit` for modifying files (not `sed`)
- `Write` for creating new files (not `echo >`)
- `Grep` for searching content (not `grep` command)
- `Glob` for finding files (not `find`)

**Task Management:**
- Use `TodoWrite` for multi-step tasks
- Keep todo list updated in real-time
- Mark tasks complete immediately after finishing
- Only one task as in_progress at a time

**Parallel Operations:**
- Run independent tools in parallel
- Make multiple read/grep calls together
- Batch git status/diff/log commands
- Use sequential only when dependencies exist

### Communication

- Output text directly to communicate with users
- Never use bash echo for user messages
- Be concise and clear
- Include file references with line numbers: `file.ts:123`
- Avoid emojis unless explicitly requested

### When Stuck

1. Use Task tool with appropriate subagent:
   - `Explore` for codebase exploration
   - `Plan` for complex implementations
   - `general-purpose` for multi-step research

2. Ask clarifying questions when requirements are unclear

3. Check documentation and existing patterns in the codebase

---

## Repository-Specific Notes

### Current State
- Repository is newly initialized
- No source code yet
- Development branch: `claude/claude-md-mkdqsdmwp181qugg-9Fu6j`

### Next Steps
As the project develops, update this document with:
1. Actual project structure and architecture
2. Specific coding conventions adopted
3. Testing strategies and frameworks used
4. Build and deployment processes
5. Common gotchas and troubleshooting tips
6. API documentation and integration points

---

## Changelog

### 2026-01-14 - Initial Creation
- Created comprehensive CLAUDE.md template
- Established git workflow conventions
- Documented AI assistant best practices
- Set up structure for future updates

---

## Additional Resources

- [Claude Code Documentation](https://github.com/anthropics/claude-code)
- [Git Best Practices](https://git-scm.com/book/en/v2)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Note to Future AI Assistants:** This document should be kept up-to-date as the project evolves. When you make significant changes to the codebase structure or development workflow, please update the relevant sections of this document.
