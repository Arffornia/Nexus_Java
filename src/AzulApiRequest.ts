import axios from 'axios';
import { URL } from 'url';
import { JavaVersionInfo } from './JavaVersionInfo';
import packageInfo from './../package.json';
import { OsType } from './distribution/OsType';

export class AzulApiRequest {
    private static readonly AZUL_ENDPOINT = 'https://api.azul.com/metadata/v1/zulu/packages/';
    private readonly javaVersionInfo: JavaVersionInfo;
    private archiveUrl!: URL;
    private archiveFullName!: string;
    private javaHomeDirName!: string;
    private sha256!: string;

    private constructor(javaVersionInfo: JavaVersionInfo) {
        this.javaVersionInfo = javaVersionInfo;
    }

    static async build(javaVersionInfo: JavaVersionInfo): Promise<AzulApiRequest> {
        const instance = new AzulApiRequest(javaVersionInfo);
        await instance.parseApiResponse();
        return instance;
    }

    private async parseApiResponse(): Promise<void> {
        const response = await this.getAPIResponse();
        if (!response || response.length === 0) {
            throw new Error('No response from the API');
        }

        const javaVersion = response[ 0 ];
        this.archiveUrl = new URL(javaVersion.download_url);

        this.archiveFullName = javaVersion.name;

        this.javaHomeDirName = javaVersion.name.replace(
            `.${this.javaVersionInfo.getArchiveType()}`,
            ''
        );

        this.sha256 = await this.resolveSha256(javaVersion);
    }

    /**
     * Returns the SHA-256 published by Azul for the package. The list endpoint returns it when asked
     * with `include_fields=sha256_hash`; otherwise fall back to the package detail endpoint.
     */
    private async resolveSha256(javaVersion: any): Promise<string> {
        let sha256: unknown = javaVersion.sha256_hash;

        if (!AzulApiRequest.isSha256(sha256) && javaVersion.package_uuid) {
            const detail = await this.getJson(
                `${AzulApiRequest.AZUL_ENDPOINT}${encodeURIComponent(javaVersion.package_uuid)}`
            );
            sha256 = detail?.sha256_hash;
        }

        if (!AzulApiRequest.isSha256(sha256)) {
            throw new Error(`No valid sha256_hash published by Azul for ${javaVersion.name}`);
        }

        return sha256.toLowerCase();
    }

    private static isSha256(value: unknown): value is string {
        return typeof value === 'string' && /^[0-9a-fA-F]{64}$/.test(value);
    }

    private getUserAgent(): string {
        const { name, version, repository } = packageInfo;
        return `${name}/${version} (${repository?.url || 'no-repo'})`;
    }

    private async getAPIResponse(): Promise<any[]> {
        return await this.getJson(this.buildRequestUrl().toString()) as any[];
    }

    private async getJson(requestUrl: string): Promise<any> {
        try {
            const response = await axios.get(requestUrl, {
                headers: {
                    'User-Agent': this.getUserAgent(),
                },
            });

            if (response.status === 200) {
                return response.data;
            } else {
                throw new Error(`Failed to load JSON from URL. Response code: ${response.status}`);
            }
        } catch (error) {
            throw new Error(`Error during API request: ${error}`);
        }
    }

    private buildRequestUrl(): URL {
        const queryParams = new URLSearchParams({
            java_version: this.javaVersionInfo.getJavaVersion(),
            os: this.javaVersionInfo.getOsType(),
            arch: this.javaVersionInfo.getArchType(),
            java_package_type: this.javaVersionInfo.getJavaType(),
            javafx_bundled: String(this.javaVersionInfo.isWithJavaFx()),
            support_term: 'lts',
            latest: 'true',
            archive_type: this.javaVersionInfo.getArchiveType(),
            page: '1',
            page_size: '1',
            include_fields: 'sha256_hash',
        });

        return new URL(`${AzulApiRequest.AZUL_ENDPOINT}?${queryParams.toString()}`);
    }

    public getArchiveUrl(): URL {
        return this.archiveUrl;
    }

    public getArchiveName() {
        return this.archiveFullName.replace(
            `.${this.javaVersionInfo.getArchiveType()}`, "");
    }

    public getArchiveFullName() {
        return this.archiveFullName;
    }

    /** Lower-case hex SHA-256 of the archive, as published by Azul. */
    public getSha256(): string {
        return this.sha256;
    }

    public getJavaHomeDirName(): string {
        return this.javaHomeDirName;
    }

    public getRequestUrl(): string {
        return this.buildRequestUrl().toString();
    }
}
