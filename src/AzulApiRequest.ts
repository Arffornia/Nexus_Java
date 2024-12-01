import axios from 'axios';
import { URL } from 'url';
import { JavaVersionInfo } from './JavaVersionInfo';
import packageInfo from './../package.json';

export class AzulApiRequest {
    private static readonly AZUL_ENDPOINT = 'https://api.azul.com/metadata/v1/zulu/packages/';
    private readonly javaVersionInfo: JavaVersionInfo;
    private archiveUrl!: URL;
    private javaHomeDirName!: string;

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

        const javaVersion = response[0];
        this.archiveUrl = new URL(javaVersion.download_url);

        this.javaHomeDirName = javaVersion.name.replace(
            `.${this.javaVersionInfo.getArchiveType()}`,
            ''
        );
    }

    private getUserAgent(): string {
        const { name, version, repository } = packageInfo;
        return `${name}/${version} (${repository?.url || 'no-repo'})`;
    }

    private async getAPIResponse(): Promise<any[]> {
        try {
            const requestUrl = this.buildRequestUrl().toString();

            const response = await axios.get(requestUrl, {
                headers: {
                    'User-Agent': this.getUserAgent(),
                },
            });

            if (response.status === 200) {
                return response.data as any[];
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
        });

        return new URL(`${AzulApiRequest.AZUL_ENDPOINT}?${queryParams.toString()}`);
    }

    public getArchiveUrl(): URL {
        return this.archiveUrl;
    }

    public getJavaHomeDirName(): string {
        return this.javaHomeDirName;
    }

    public getRequestUrl(): string {
        return this.buildRequestUrl().toString();
    }
}
