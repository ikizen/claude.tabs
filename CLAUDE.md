# CLAUDE.md - AI Assistant Guide

**Repository**: claude.tabs
**Owner**: ikizen
**Last Updated**: 2026-01-21

## Project Overview

This is the `claude.tabs` project - a repository currently in its initial stages. This document serves as a comprehensive guide for AI assistants (like Claude) to understand the codebase structure, development workflows, and key conventions.

## Current State

**Status**: Initial repository setup
**Branch Strategy**: Feature branches prefixed with `claude/`

### Repository Structure

```
claude.tabs/
├── .git/           # Git version control
└── CLAUDE.md       # This file
```

## Development Workflows

### Branch Management

- **Main Branch**: (to be determined)
- **Feature Branches**: Must be prefixed with `claude/`
- **Branch Naming Convention**: `claude/<description>-<session-id>`

#### Git Operations Best Practices

**Pushing Changes:**
```bash
git push -u origin <branch-name>
```
- Branch MUST start with `claude/` and end with matching session ID
- If push fails due to network errors, retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s)
- Push failures with 403 status usually indicate branch naming issues

**Fetching/Pulling:**
```bash
git fetch origin <branch-name>
git pull origin <branch-name>
```
- Prefer fetching specific branches
- Retry network failures up to 4 times with exponential backoff

### Commit Standards

**DO:**
- Write clear, descriptive commit messages
- Focus on the "why" rather than the "what"
- Use conventional commit format when established
- Ensure commits are atomic and focused

**DON'T:**
- Commit without explicit user request
- Use `--amend` unless specific conditions are met
- Skip hooks (--no-verify) without permission
- Force push to main/master branches

## Code Conventions

### General Principles

1. **Avoid Over-Engineering**
   - Make only requested changes
   - Keep solutions simple and focused
   - Don't add unrequested features or refactoring
   - Don't add comments/docs to unchanged code

2. **Security First**
   - Watch for OWASP Top 10 vulnerabilities
   - Validate at system boundaries only
   - Don't add error handling for impossible scenarios
   - Trust internal code and framework guarantees

3. **No Premature Abstraction**
   - Don't create helpers for one-time operations
   - Avoid designing for hypothetical requirements
   - Three similar lines are better than premature abstraction

4. **Clean Deletions**
   - Avoid backwards-compatibility hacks
   - No unused variable renaming (`_vars`)
   - No `// removed` comments
   - Delete unused code completely

### File Operations

**Prefer Built-in Tools:**
- Use `Read` instead of `cat/head/tail`
- Use `Edit` instead of `sed/awk`
- Use `Write` instead of `echo >` or heredoc
- Reserve bash for actual system commands

## Testing Strategy

*To be established as the project develops*

**Placeholder for:**
- Unit testing framework and conventions
- Integration testing approach
- E2E testing setup
- Test coverage requirements
- CI/CD pipeline integration

## Build and Deployment

*To be established as the project develops*

**Placeholder for:**
- Build commands and scripts
- Environment configuration
- Deployment procedures
- Environment-specific settings

## Architecture Guidelines

*To be established as the project develops*

### Expected Sections:

#### Technology Stack
- Programming language(s)
- Frameworks and libraries
- Database systems
- External services

#### Project Structure
- Source code organization
- Configuration files location
- Asset management
- Documentation location

#### Key Patterns
- Design patterns in use
- State management approach
- API structure and conventions
- Error handling patterns

## Dependencies Management

*To be established as the project develops*

**Guidelines for:**
- Adding new dependencies
- Version management
- Dependency updates
- Security audit procedures

## Documentation Standards

### Code Documentation
- Comment only where logic isn't self-evident
- Update docs when changing functionality
- Keep inline documentation minimal and relevant
- Use clear variable and function names

### Project Documentation
- README.md for project overview and quick start
- CLAUDE.md (this file) for AI assistant guidance
- Architecture docs for system design
- API documentation where applicable

## Common Tasks

### For AI Assistants Working on This Project

**Before Making Changes:**
1. Read existing code first
2. Understand current patterns and conventions
3. Ask clarifying questions if unclear
4. Plan complex changes using TodoWrite tool

**During Development:**
1. Make minimal, focused changes
2. Follow established patterns
3. Test changes thoroughly
4. Keep security in mind

**After Changes:**
1. Review for over-engineering
2. Check for security issues
3. Verify nothing is broken
4. Commit with clear messages
5. Push to correct branch

## Project-Specific Notes

*To be added as the project develops*

This section will contain:
- Quirks and gotchas specific to this codebase
- Important implementation details
- Performance considerations
- Known issues and workarounds
- Contact information for project leads

## AI Assistant Guidelines

### Tool Usage Priorities

1. **File Operations**: Use Read/Edit/Write tools, not bash commands
2. **Code Search**: Use Explore agent for contextual searches
3. **Planning**: Use TodoWrite for multi-step tasks
4. **Questions**: Use AskUserQuestion when clarification needed

### Response Style

- Be concise and direct
- Avoid emojis unless requested
- Use markdown formatting
- Output text for communication, not bash echo
- No superlatives or excessive praise

### Task Management

- Use TodoWrite for complex (3+ step) tasks
- Mark todos in progress before starting
- Complete todos immediately after finishing
- Only one todo in progress at a time
- Remove irrelevant todos

## Maintenance

### Updating This Document

This document should be updated when:
- Project structure changes significantly
- New conventions are established
- New tools or frameworks are added
- Workflow processes are modified
- Important patterns emerge

**Update Procedure:**
1. Review changes since last update
2. Update relevant sections
3. Update "Last Updated" date at top
4. Commit with message: "docs: update CLAUDE.md"

### Document Review Schedule

Recommend reviewing this document:
- After major feature additions
- When onboarding new team members
- Monthly during active development
- Quarterly during maintenance phase

---

## Quick Reference

### Essential Commands
```bash
# Check status
git status

# Create and checkout feature branch
git checkout -b claude/<feature>-<session-id>

# Stage and commit changes
git add <files>
git commit -m "type: clear description"

# Push to origin
git push -u origin <branch-name>
```

### Key Principles
1. Read before modifying
2. Minimal, focused changes
3. Security-conscious coding
4. Clear communication
5. Proper branch management

---

*This document is a living guide. Keep it updated as the project evolves.*
