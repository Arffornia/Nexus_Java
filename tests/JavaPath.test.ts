import fs from 'fs';
import path from 'path';
import { extract } from 'tar';
import { JavaVersionInfo } from "../src/JavaVersionInfo";
import { NexusJava } from "../src/NexusJava";
import { JavaType } from "../src/distribution/JavaType";
import { OsType } from "../src/distribution/OsType";
import { ArchType } from "../src/distribution/ArchType";
import { makeFakeJavaTarGz, makeTmpDir } from './helpers/azulMock';

const isWindowsHost = process.platform === 'win32';
const itPosix = isWindowsHost ? it.skip : it;

const javaFor = (installPath: string, os: OsType, version = "21") => new NexusJava(
    installPath,
    new JavaVersionInfo(version, JavaType.JRE, os, ArchType.X64, false),
    null,
    true);

/** Simulates what downloadAndExtract leaves on disk: the archive's top dir renamed to java_<version>. */
async function installFake(installPath: string, version: string, binSubPath: string): Promise<void> {
    const dirName = `zulu-fake-${version}`;
    const work = makeTmpDir('nexus-java-fixture-');
    try {
        const archive = await makeFakeJavaTarGz(work, dirName, version, binSubPath);
        fs.mkdirSync(installPath, { recursive: true });
        await extract({ file: archive, cwd: installPath });
        fs.renameSync(path.join(installPath, dirName), path.join(installPath, `java_${version}`));
    } finally {
        fs.rmSync(work, { recursive: true, force: true });
    }
}

describe("Java executable path", () => {
    let workDir: string;

    beforeEach(() => {
        workDir = makeTmpDir();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        fs.rmSync(workDir, { recursive: true, force: true });
    });

    it.each([
        [OsType.WINDOWS, ["bin", "java.exe"]],
        [OsType.LINUX, ["bin", "java"]],
        [OsType.MACOS, ["Contents", "Home", "bin", "java"]],
        [OsType.SOLARIS, ["bin", "java"]],
    ])("getJavaPath() on %s", (os, subPath) => {
        expect(javaFor(workDir, os).getJavaPath())
            .toEqual(path.resolve(workDir, "java_21", ...subPath));
    });

    itPosix("isJavaInstalled() finds the macOS bundle layout", async () => {
        await installFake(workDir, "21", path.join("Contents", "Home", "bin"));
        const nexusJava = javaFor(workDir, OsType.MACOS);

        expect(fs.existsSync(nexusJava.getJavaPath())).toBe(true);
        expect(nexusJava.isJavaInstalled()).toBe(true);
    });

    itPosix("isJavaInstalled() works when the install path contains spaces", async () => {
        const installPath = path.join(workDir, "My Games", "Arffornia Launcher", "java");
        await installFake(installPath, "21", "bin");

        expect(javaFor(installPath, OsType.LINUX).isJavaInstalled()).toBe(true);
    });

    itPosix("isJavaInstalled() is false when the binary reports another version", async () => {
        await installFake(workDir, "17", "bin");
        fs.renameSync(path.join(workDir, "java_17"), path.join(workDir, "java_21"));

        expect(javaFor(workDir, OsType.LINUX).isJavaInstalled()).toBe(false);
    });

    it("isJavaInstalled() is false when nothing is installed", () => {
        expect(javaFor(workDir, OsType.MACOS).isJavaInstalled()).toBe(false);
    });
});
