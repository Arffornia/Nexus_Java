import { JavaVersionInfo as JavaVersionInfo } from "../src/JavaVersionInfo";
import { NexusJava } from "../src/NexusJava";
import { JavaType } from "../src/distribution/JavaType";
import { OsType } from "../src/distribution/OsType";
import { ArchType } from "../src/distribution/ArchType";
import { Callback, } from "../src/Callback";
import fs from 'fs';


const callback: Callback = {
    onStep(step) {
        // console.log(step);
    },
};

describe("Download Java version", () => {
    afterAll(() => {
        try {
            if (fs.existsSync("testsuite")) {
                fs.rmSync("testsuite", { recursive: true, force: true });
            }
        } catch (error) {
            console.error(`Error deleting folder: ${error}`);
        }
    });

    const linuxNexusJava = new NexusJava(
        "testsuite/linux/",
        new JavaVersionInfo(
            "11",
            JavaType.JDK,
            OsType.LINUX,
            ArchType.AMD64,
            false
        ),
        callback,
        true);

    const winNexusJava = new NexusJava(
        "testsuite/win/",
        new JavaVersionInfo(
            "11",
            JavaType.JRE,
            OsType.WINDOWS,
            ArchType.X64,
            true
        ),
        callback,
        true);

    it("Should download java for linux", async () => {
        expect(linuxNexusJava.isJavaInstalled()).not.toBe(true);

        const linuxJavaPath = await linuxNexusJava.downloadAndExtract();
        console.log("linuxJavaPath: " + linuxJavaPath.toString());

        expect(linuxNexusJava.isJavaInstalled()).toBe(true);
    }, 120 * 1000);

    it("Should download java for windows", async () => {
        // const winJavaPath = await winNexusJava.downloadAndExtract();
        // console.log("winJavaPath: " + winJavaPath.toString());
    }, 120 * 1000);
});