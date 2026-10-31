# Contributing

Thanks for helping! This library is maintained by one person, so small, focused pull requests are easiest to review.
AI agents and newcomers: read [AGENTS.md](AGENTS.md) first.

## Setup

Requirements: Node.js 22 and npm 10.

```bash
npm ci
make check   # type-check, tests, build (same as CI)
```

## Conventions

- Language: English for code, comments, docs, commits, issues and PRs.
- Branches: `fix/<slug>`, `feat/<slug>`, `test/<slug>`, `ci/<slug>`, `docs/<slug>`, `chore/<slug>`.
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) (`fix: ...`, `feat: ...`, `test: ...`).
- One pull request per issue, linked with `Closes #n`. Fill in the PR template (What / Why / How tested / Risk & revert).
- Tests must run offline. Mock the network and use a temporary directory for files.
- Keep the public API backward compatible. If a change needs a major version, say so in the PR.
- Do not bump the version or publish: releases are done by the maintainer.
