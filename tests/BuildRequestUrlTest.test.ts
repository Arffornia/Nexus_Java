import axios from 'axios';
import { AzulApiRequest } from "../src/AzulApiRequest"
import { JavaVersionInfo } from "../src/JavaVersionInfo";
import { JavaType } from "../src/distribution/JavaType";
import { OsType } from "../src/distribution/OsType";
import { ArchType } from "../src/distribution/ArchType";
import { fakeAxiosGet } from './helpers/azulMock';

jest.mock('axios', () => ({ __esModule: true, default: { get: jest.fn() } }));
const mockedGet = axios.get as jest.Mock;

describe("Build the azul api request", () => {
    const expectedLinuxRequestUrl = "https://api.azul.com/metadata/v1/zulu/packages/?java_version=11&os=linux&arch=amd64&java_package_type=jdk&javafx_bundled=false&support_term=lts&latest=true&archive_type=tar.gz&page=1&page_size=1&include_fields=sha256_hash";
    const expectWinRequestUrl = "https://api.azul.com/metadata/v1/zulu/packages/?java_version=17&os=windows&arch=x86&java_package_type=jre&javafx_bundled=true&support_term=lts&latest=true&archive_type=zip&page=1&page_size=1&include_fields=sha256_hash";
    let azulApiRequestLinux: AzulApiRequest;
    let azulApiRequestWin: AzulApiRequest;

    beforeAll(async () => {
        mockedGet.mockImplementation(fakeAxiosGet([
            {
                name: "zulu11.99.0-ca-jdk11.0.99-linux_x64.tar.gz",
                download_url: "https://cdn.azul.com/zulu/bin/zulu11.99.0-ca-jdk11.0.99-linux_x64.tar.gz",
                package_uuid: "00000000-0000-0000-0000-000000000011",
                sha256_hash: "A".repeat(64),
            },
        ], {}));

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
        expect(azulApiRequestLinux.getJavaHomeDirName()).toEqual("zulu11.99.0-ca-jdk11.0.99-linux_x64");

        expect(azulApiRequestWin.getRequestUrl()).toEqual(expectWinRequestUrl);
        expect(azulApiRequestWin.getJavaHomeDirName()).not.toBeNull();
    });

    it("Should call the Azul API with the built URL and a User-Agent", () => {
        expect(mockedGet).toHaveBeenCalledWith(
            expectedLinuxRequestUrl,
            expect.objectContaining({ headers: expect.objectContaining({ 'User-Agent': expect.stringContaining('@arffornia/nexus_java/') }) }),
        );
    });

    it("Should expose the lower-cased sha256 published by Azul", () => {
        expect(azulApiRequestLinux.getSha256()).toEqual("a".repeat(64));
    });

    it("Should fetch the package detail when the list has no sha256_hash", async () => {
        mockedGet.mockImplementation(fakeAxiosGet([
            {
                name: "zulu21.1.1-ca-jre21.0.1-linux_x64.tar.gz",
                download_url: "https://cdn.azul.com/zulu/bin/zulu21.1.1-ca-jre21.0.1-linux_x64.tar.gz",
                package_uuid: "uuid-21",
            },
        ], {}));
        mockedGet.mockImplementationOnce(async () => ({ status: 200, data: [{
            name: "zulu21.1.1-ca-jre21.0.1-linux_x64.tar.gz",
            download_url: "https://cdn.azul.com/zulu/bin/zulu21.1.1-ca-jre21.0.1-linux_x64.tar.gz",
            package_uuid: "uuid-21",
        }] }));
        mockedGet.mockImplementationOnce(async (url: string) => {
            expect(url).toEqual("https://api.azul.com/metadata/v1/zulu/packages/uuid-21");
            return { status: 200, data: { package_uuid: "uuid-21", sha256_hash: "b".repeat(64) } };
        });

        const request = await AzulApiRequest.build(
            new JavaVersionInfo("21", JavaType.JRE, OsType.LINUX, ArchType.X64, false)
        );
        expect(request.getSha256()).toEqual("b".repeat(64));
    });

    it("Should throw when Azul publishes no valid sha256", async () => {
        mockedGet.mockResolvedValueOnce({ status: 200, data: [{ name: "x.tar.gz", download_url: "https://cdn.azul.com/x.tar.gz", sha256_hash: "not-a-hash" }] });
        await expect(AzulApiRequest.build(
            new JavaVersionInfo("21", JavaType.JRE, OsType.LINUX, ArchType.X64, false)
        )).rejects.toThrow('No valid sha256_hash');
    });

    it("Should throw when the API returns no package", async () => {
        mockedGet.mockResolvedValueOnce({ status: 200, data: [] });
        await expect(AzulApiRequest.build(
            new JavaVersionInfo("21", JavaType.JRE, OsType.LINUX, ArchType.X64, false)
        )).rejects.toThrow('No response from the API');
    });
});
