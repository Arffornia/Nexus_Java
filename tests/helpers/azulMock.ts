import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from "crypto";
import { create } from "tar";

/**
 * Helpers to run Nexus_Java tests fully offline.
 * Tests mock `axios` and route Azul API / CDN calls to local fixtures.
 */

export interface FakePackage {
    name: string;
    download_url: string;
    package_uuid: string;
    sha256_hash?: string;
}

export function makeTmpDir(prefix = 'nexus-java-'): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/**
 * Builds a .tar.gz that looks like an Azul archive: `<dirName>/<binSubPath>/java`,
 * where `java` is a shell script printing a `--version` banner for `javaVersion`.
 */
export async function makeFakeJavaTarGz(
    workDir: string,
    dirName: string,
    javaVersion: string,
    binSubPath = 'bin',
): Promise<string> {
    const srcRoot = path.join(workDir, 'src');
    const binDir = path.join(srcRoot, dirName, binSubPath);
    fs.mkdirSync(binDir, { recursive: true });
    const javaBin = path.join(binDir, 'java');
    fs.writeFileSync(
        javaBin,
        `#!/bin/sh\necho "openjdk ${javaVersion}.0.1 2024-01-01 LTS"\necho "OpenJDK Runtime Environment Zulu (build ${javaVersion}.0.1+1-LTS)"\n`,
    );
    fs.chmodSync(javaBin, 0o755);

    const archive = path.join(workDir, `${dirName}.tar.gz`);
    await create({ gzip: true, file: archive, cwd: srcRoot }, [dirName]);
    return archive;
}

/**
 * Returns an implementation for a mocked `axios.get`:
 * - Azul metadata URLs answer with `packages`
 * - any other URL with `responseType: 'stream'` streams the matching local file
 */
export function fakeAxiosGet(packages: FakePackage[], files: Record<string, string>) {
    return async (url: string, config?: { responseType?: string }) => {
        if (url.startsWith('https://api.azul.com/metadata/v1/zulu/packages/')) {
            const uuid = new URL(url).pathname.split('/').filter(Boolean).pop();
            const single = packages.find((p) => p.package_uuid === uuid);
            return { status: 200, data: single ?? packages };
        }
        if (config?.responseType === 'stream' && files[url]) {
            return { status: 200, data: fs.createReadStream(files[url]) };
        }
        throw new Error(`Unexpected network call in test: ${url}`);
    };
}

export function sha256OfFile(filePath: string): string {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}
