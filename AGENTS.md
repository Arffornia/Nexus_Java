# AGENTS.md — Nexus_Java

Guide for AI agents and newcomers. Read it before changing anything.

## Purpose

TypeScript library published to npm as `@arffornia/nexus_java`. It downloads an Azul Zulu JRE/JDK for a
version/OS/arch, extracts it to `<installPath>/java_<version>` and returns the `java` binary path.
Main consumer: the Arffornia launcher (`Arffornia/Arffornia_Launcher_V.5.2`, `src/main/minecraftManager.js`
and `src/main/utils.js`, which also uses the `OsType`/`ArchType` enums).

## Repo map

| Path | What |
|---|---|
| `src/index.ts` | Public exports (everything exported here is public API) |
| `src/NexusJava.ts` | Download, extract, install checks, `getJavaPath()` |
| `src/AzulApiRequest.ts` | Azul metadata API query (`api.azul.com/metadata/v1/zulu/packages/`) |
| `src/JavaVersionInfo.ts` | Version/OS/arch/type value object, archive type (`zip` on Windows, `tar.gz` otherwise) |
| `src/Callback.ts` | `Step` enum and `Callback` interface for progress |
| `src/distribution/*` | `OsType`, `ArchType`, `JavaType` enums (values are Azul API query values) |
| `tests/*.test.ts` | Jest tests; `tests/helpers/azulMock.ts` builds fake archives and a mocked `axios.get` |
| `dist/` | Build output (ignored; `main` is `dist/src/index.js` because `package.json` is imported) |

## Commands

```bash
npm ci          # install (lockfile is committed)
make check      # tsc --noEmit + jest + build — must pass before any PR
make test       # jest only
make build      # tsc && tsc-alias -> dist/
```

## Conventions

- English everywhere (code, comments, docs, commits, PRs).
- Conventional Commits; one PR per issue; PR body: What / Why / How it was tested / Risk & revert.
- Public API is used by the launcher: keep it backward compatible (semver minor/patch). Do not rename exports,
  constructor parameters or enum values.
- Do not bump `version` or publish: the maintainer releases.

## Hard rules

- Never replace this library (or Nexus_Logger / Nexus_Saver / Nexus_Mods) with a third-party one. Improve it.
- Never commit secrets. Never merge, tag, publish or push to `main`.
- Behaviour changes need an issue.

## Testing strategy

- Tests must run **offline**. Mock `axios` with `jest.mock('axios', ...)` and `fakeAxiosGet()` from
  `tests/helpers/azulMock.ts`; build archives with `makeFakeJavaTarGz()`.
- Write to a temp dir (`makeTmpDir()`), never into the repo.
- The fake `java` binary is a shell script, so the end-to-end extract test is skipped on Windows hosts.

## Gotchas (from the 2026-10-29 audit)

- `axios` is imported at runtime but declared as a devDependency (issue: declare it as a dependency).
- Archives are verified against Azul's `sha256_hash` (list query uses `include_fields=sha256_hash`, with a
  fallback to `GET /packages/{uuid}`) and downloaded to `<archive>.download` before an atomic rename.
  Test fixtures must therefore provide a matching hash (`sha256OfFile()`).
- `isJavaInstalled()` builds a shell command without quoting (breaks with spaces in the path).
- Non-Linux OSes get `java.exe`; macOS archives keep the binary in `<dir>/Contents/Home/bin/java`.
- Windows zips are extracted with `adm-zip` (advisories, no fix): replacement needs a decision.

## Related repos

- `Arffornia/Arffornia_Launcher_V.5.2` (consumer)
- `Arffornia/Nexus_Logger`, `Arffornia/Nexus_Saver`, `Arffornia/Nexus_Mods` (sibling libraries)
