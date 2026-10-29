import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { JavaVersionInfo } from "../src/JavaVersionInfo";
import { NexusJava } from "../src/NexusJava";
import { JavaType } from "../src/distribution/JavaType";
import { OsType } from "../src/distribution/OsType";
import { ArchType } from "../src/distribution/ArchType";
import { Callback, Step } from "../src/Callback";
import { fakeAxiosGet, makeFakeJavaTarGz, makeTmpDir, sha256OfFile } from './helpers/azulMock';

jest.mock('axios', () => ({ __esModule: true, default: { get: jest.fn() } }));
const mockedGet = axios.get as jest.Mock;

const isWindowsHost = process.platform === 'win32';
const itPosix = isWindowsHost ? it.skip : it;

const DIR_NAME = "zulu11.99.0-ca-jdk11.0.99-linux_x64";
const ARCHIVE_URL = `https://cdn.azul.com/zulu/bin/${DIR_NAME}.tar.gz`;

describe("Download Java version (Azul mocked, offline)", () => {
    let workDir: string;
    let installPath: string;
    let fixtureArchive: string;

    const linuxJava = (callback: Callback | null = null, cleanArchive = true) => new NexusJava(
        installPath,
        new JavaVersionInfo("11", JavaType.JDK, OsType.LINUX, ArchType.AMD64, false),
        callback,
        cleanArchive);

    const archivePath = () => path.join(installPath, "java_11.tar.gz");

    const mockAzul = (sha256: string) => mockedGet.mockImplementation(fakeAxiosGet(
        [{ name: `${DIR_NAME}.tar.gz`, download_url: ARCHIVE_URL, package_uuid: "uuid-11", sha256_hash: sha256 }],
        { [ARCHIVE_URL]: fixtureArchive },
    ));

    const downloadCalls = () => mockedGet.mock.calls.filter(([url]) => url === ARCHIVE_URL).length;

    beforeEach(async () => {
        workDir = makeTmpDir();
        installPath = path.join(workDir, 'install');
        fixtureArchive = await makeFakeJavaTarGz(path.join(workDir, 'fixture'), DIR_NAME, "11");
        mockedGet.mockReset();
    });

    afterEach(() => {
        fs.rmSync(workDir, { recursive: true, force: true });
    });

    itPosix("Should download, verify and extract java for linux", async () => {
        mockAzul(sha256OfFile(fixtureArchive));

        const steps: Step[] = [];
        const nexusJava = linuxJava({ onStep: (step) => steps.push(step) });

        expect(nexusJava.isJavaInstalled()).toBe(false);

        const javaPath = await nexusJava.downloadAndExtract();

        expect(javaPath).toEqual(path.resolve(installPath, "java_11", "bin", "java"));
        expect(fs.existsSync(javaPath)).toBe(true);
        expect(nexusJava.isJavaInstalled()).toBe(true);
        expect(steps).toEqual([Step.FETCHING, Step.DOWNLOADING, Step.EXTRACTING, Step.CLEANING, Step.DONE]);
        // cleanArchive = true removes the downloaded archive, and no temp file is left
        expect(fs.readdirSync(installPath)).toEqual(["java_11"]);
    });

    it("Should throw on checksum mismatch and leave no archive behind", async () => {
        mockAzul("0".repeat(64));

        await expect(linuxJava().downloadAndExtract()).rejects.toThrow(/Checksum mismatch/);

        expect(fs.existsSync(archivePath())).toBe(false);
        expect(fs.readdirSync(installPath)).toEqual([]);
    });

    itPosix("Should replace a partial archive left by an interrupted download", async () => {
        mockAzul(sha256OfFile(fixtureArchive));
        fs.mkdirSync(installPath, { recursive: true });
        fs.writeFileSync(archivePath(), "truncated");

        const nexusJava = linuxJava(null, false);
        await nexusJava.downloadAndExtract();

        expect(downloadCalls()).toBe(1);
        expect(sha256OfFile(archivePath())).toEqual(sha256OfFile(fixtureArchive));
        expect(nexusJava.isJavaInstalled()).toBe(true);
    });

    itPosix("Should reuse an existing archive whose checksum matches", async () => {
        mockAzul(sha256OfFile(fixtureArchive));
        fs.mkdirSync(installPath, { recursive: true });
        fs.copyFileSync(fixtureArchive, archivePath());

        const nexusJava = linuxJava(null, false);
        await nexusJava.downloadAndExtract();

        expect(downloadCalls()).toBe(0);
        expect(nexusJava.isJavaInstalled()).toBe(true);
    });

    it("Should remove the temp file when the download stream fails", async () => {
        mockedGet.mockImplementation(async (url: string, config?: { responseType?: string }) => {
            if (config?.responseType === 'stream') {
                const { Readable } = await import('stream');
                const stream = new Readable({ read() { this.destroy(new Error('connection reset')); } });
                return { status: 200, data: stream };
            }
            return fakeAxiosGet(
                [{ name: `${DIR_NAME}.tar.gz`, download_url: ARCHIVE_URL, package_uuid: "uuid-11", sha256_hash: "0".repeat(64) }],
                {},
            )(url, config);
        });

        await expect(linuxJava().downloadAndExtract()).rejects.toThrow(/connection reset/);
        expect(fs.readdirSync(installPath)).toEqual([]);
    });

    it("Should report java as not installed when the install dir is empty", () => {
        const nexusJava = new NexusJava(
            path.join(workDir, 'empty'),
            new JavaVersionInfo("21", JavaType.JRE, OsType.WINDOWS, ArchType.X64, false),
            null,
            true);

        expect(nexusJava.isJavaInstalled()).toBe(false);
        expect(nexusJava.getJavaPath()).toEqual(path.resolve(workDir, 'empty', "java_21", "bin", "java.exe"));
    });
});
