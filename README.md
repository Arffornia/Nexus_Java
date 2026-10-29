# Nexus Java

`@arffornia/nexus_java` downloads and installs a Java runtime (JRE or JDK) from [Azul Zulu](https://www.azul.com/downloads/)
for a given version, OS and CPU architecture, and tells you where the `java` binary is.
It is part of the Arffornia ecosystem: the [Arffornia launcher](https://github.com/Arffornia/Arffornia_Launcher_V.5.2)
uses it to install the Java 21 runtime that Minecraft needs. Architecture docs (coming soon): https://arffornia.github.io/docs/

## Requirements

- Node.js 22 (the package targets modern Node; CI runs on 22)
- Network access to `api.azul.com` and `cdn.azul.com` at runtime

## Install

```bash
npm i @arffornia/nexus_java
```

## Usage

```ts
import { NexusJava, JavaVersionInfo, JavaType, OsType, ArchType, Step } from '@arffornia/nexus_java';

const nexusJava = new NexusJava(
    './java',                        // install directory (created if missing)
    new JavaVersionInfo(
        '21',                        // Java major version
        JavaType.JRE,                // JRE or JDK
        OsType.WINDOWS,              // target OS
        ArchType.X64,                // target architecture
        false),                      // bundle JavaFX
    { onStep: (step: Step) => console.log(step) }, // progress callback, or null
    true);                           // delete the archive once extracted

if (!nexusJava.isJavaInstalled()) {
    await nexusJava.downloadAndExtract();
}
console.log('java binary: ' + nexusJava.getJavaPath());
```

- `downloadAndExtract()` queries the Azul metadata API, downloads the archive (`.zip` on Windows, `.tar.gz` elsewhere)
  to a temporary file, checks it against the SHA-256 published by Azul, then extracts it to
  `<installPath>/java_<version>` and resolves with the path of the `java` binary. A checksum mismatch rejects with an
  error and leaves nothing behind; an existing archive is reused only if its checksum matches.
- `isJavaInstalled()` checks that the binary exists and that `java --version` reports the requested major version.
- `getJavaPath()` returns the absolute path of the `java` binary (it does not check that it exists).
- Progress steps: `FETCHING`, `DOWNLOADING`, `EXTRACTING`, `CLEANING`, `DONE`.
- `AzulApiRequest`, `JavaVersionInfo` and the `OsType` / `ArchType` / `JavaType` enums are exported too.

## Commands

| Command | What it does |
|---|---|
| `npm ci` | Install the exact dependency tree from `package-lock.json` |
| `make check` | Type-check, run the tests, build (what CI runs) |
| `make test` / `npm test` | Run the Jest tests (offline: Azul is mocked) |
| `make build` / `npm run build` | Compile to `dist/` (`tsc` + `tsc-alias`) |

## Configuration

None. Everything is passed to the constructor. No environment variables are read.

## Release process

Releases are done by the maintainer: bump `version` in `package.json` in a PR, merge, then publish the merged
commit to npm and tag it `v<version>`. Contributors never publish.

## License

MIT, see [LICENSE](LICENSE).
