import { AzulApiRequest } from "../src/AzulApiRequest"
import { JavaVersionInfo } from "../src/JavaVersionInfo";
import { JavaType } from "../src/distribution/JavaType";
import { OsType } from "../src/distribution/OsType";
import { ArchType } from "../src/distribution/ArchType";

describe("Build the azul api request", () => {
    const expectedLinuxRequestUrl = "https://api.azul.com/metadata/v1/zulu/packages/?java_version=11&os=linux&arch=amd64&java_package_type=jdk&javafx_bundled=false&support_term=lts&latest=true&archive_type=tar.gz&page=1&page_size=1";
    const expectWinRequestUrl = "https://api.azul.com/metadata/v1/zulu/packages/?java_version=17&os=windows&arch=x86&java_package_type=jre&javafx_bundled=true&support_term=lts&latest=true&archive_type=zip&page=1&page_size=1";
    let azulApiRequestLinux: AzulApiRequest;
    let azulApiRequestWin: AzulApiRequest;

    beforeAll(async () => {
        azulApiRequestLinux = await AzulApiRequest.build(
            new JavaVersionInfo(
                "11",
                JavaType.JDK,
                OsType.LINUX,
                ArchType.AMD64,
                false
            )
        );
    
        azulApiRequestWin = await AzulApiRequest.build(
            new JavaVersionInfo(
                "17",
                JavaType.JRE,
                OsType.WINDOWS,
                ArchType.X86,
                true
            )
        );
    });

    it("Should return the corresponding api request", () => {
        expect(azulApiRequestLinux.getRequestUrl()).toEqual(expectedLinuxRequestUrl);
        expect(azulApiRequestLinux.getRequestUrl()).not.toBeNull();
        expect(azulApiRequestLinux.getJavaHomeDirName()).not.toBeNull();

        expect(azulApiRequestWin.getRequestUrl()).toEqual(expectWinRequestUrl);
        expect(azulApiRequestWin.getRequestUrl()).not.toBeNull();
        expect(azulApiRequestWin.getJavaHomeDirName()).not.toBeNull();
        
    });
});