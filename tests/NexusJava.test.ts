import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { JavaVersionInfo } from "../src/JavaVersionInfo";
import { NexusJava } from "../src/NexusJava";
import { JavaType } from "../src/distribution/JavaType";
import { OsType } from "../src/distribution/OsType";
import { ArchType } from "../src/distribution/ArchType";
import { Callback, Step } from "../src/Callback";
import { fakeAxiosGet, makeFakeJavaTarGz, makeTmpDir } from './helpers/azulMock';

jest.mock('axios', () => ({ __esModule: true, default: { get: jest.fn() } }));
const mockedGet = axios.get as jest.Mock;

const isWindowsHost = process.platform === 'win32';

describe("Download Java version (Azul mocked, offline)", () => {
    let workDir: string;

    beforeEach(() => {
        workDir = makeTmpDir();
        mockedGet.mockReset();
    });

    afterEach(() => {
        fs.rmSync(workDir, { recursive: true, force: true });
    });

    (isWindowsHost ? it.skip : it)("Should download and extract java for linux", async () => {
        const dirName = "zulu11.99.0-ca-jdk11.0.99-linux_x64";
        const url = `https://cdn.azul.com/zulu/bin/${dirName}.tar.gz`;
        const archive = await makeFakeJavaTarGz(path.join(workDir, 'fixture'), dirName, "11");
        mockedGet.mockImplementation(fakeAxiosGet(
            [{ name: `${dirName}.tar.gz`, download_url: url, package_uuid: "uuid-11" }],
            { [url]: archive },
        ));

        const steps: Step[] = [];
        const callback: Callback = { onStep: (step) => steps.push(step) };
        const installPath = path.join(workDir, 'install');
        const nexusJava = new NexusJava(
            installPath,
            new JavaVersionInfo("11", JavaType.JDK, OsType.LINUX, ArchType.AMD64, false),
            callback,
            true);

        expect(nexusJava.isJavaInstalled()).toBe(false);

        const javaPath = await nexusJava.downloadAndExtract();

        expect(javaPath).toEqual(path.resolve(installPath, "java_11", "bin", "java"));
        expect(fs.existsSync(javaPath)).toBe(true);
        expect(nexusJava.isJavaInstalled()).toBe(true);
        expect(steps).toEqual([Step.FETCHING, Step.DOWNLOADING, Step.EXTRACTING, Step.CLEANING, Step.DONE]);
        // cleanArchive = true removes the downloaded archive
        expect(fs.existsSync(path.join(installPath, "java_11.tar.gz"))).toBe(false);
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
