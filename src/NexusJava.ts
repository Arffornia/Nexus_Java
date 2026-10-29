import axios from 'axios';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { execFileSync } from 'child_process';
import AdmZip from 'adm-zip';
import { extract } from 'tar';
import { JavaVersionInfo } from './JavaVersionInfo';
import { Callback, Step } from './Callback';
import { OsType } from './distribution/OsType';
import { AzulApiRequest } from './AzulApiRequest';

export class NexusJava {
    private installPath: string;
    private javaVersionInfo: JavaVersionInfo;
    private callback: Callback | null;
    private cleanArchive: boolean;

    constructor(installPath: string, javaVersionInfo: JavaVersionInfo, callback: Callback | null, cleanArchive: boolean) {
        this.installPath = installPath;
        this.javaVersionInfo = javaVersionInfo;
        this.callback = callback;
        this.cleanArchive = cleanArchive;
    }

    public async downloadAndExtract(): Promise<string> {
        // Build the path for the downloaded archive
        const archivePath = this.getArchivePath();

        // If the directory doesn't exist, create it
        if (!fs.existsSync(this.installPath)) {
            fs.mkdirSync(this.installPath, { recursive: true });
        }

        this.callback?.onStep(Step.FETCHING);

        const apiRequest = await AzulApiRequest.build(this.javaVersionInfo);
        const archiveUrl = apiRequest.getArchiveUrl();


        this.callback?.onStep(Step.DOWNLOADING);

        const expectedSha256 = apiRequest.getSha256();

        // Reuse an existing archive only if it is complete and intact
        if (fs.existsSync(archivePath) && await NexusJava.sha256File(archivePath) !== expectedSha256) {
            fs.rmSync(archivePath, { force: true });
        }

        if (!fs.existsSync(archivePath)) {
            await this.downloadVerified(archiveUrl.toString(), archivePath, expectedSha256);
        }

        this.callback?.onStep(Step.EXTRACTING);

        // Extract archive
        if (this.javaVersionInfo.getOsType() === OsType.WINDOWS) {
            this.extractZip(archivePath, this.installPath);
        } else {
            await this.extractTarGz(archivePath, this.installPath);
        }

        this.callback?.onStep(Step.CLEANING);

        // Rename the extracted archive dir to a more standard one
        const extractedDir = path.join(this.installPath, apiRequest.getArchiveName());
        if (fs.existsSync(extractedDir)) {

            // Delete possible corrupted dir
            this.deleteFolderRecursive(this.getJavaInstallDirName());

            fs.renameSync(extractedDir, this.getJavaInstallDirName());
        }

        // Delete the archi if clean flag set
        if (this.cleanArchive) {
            fs.unlinkSync(archivePath);
        }

        this.callback?.onStep(Step.DONE);

        // Return the absolute path to the extracted Java directory
        return this.getJavaPath();
    }

    /**
     * Downloads `url` to a temporary file next to `destination`, checks its SHA-256 and only then
     * renames it to `destination`. On any failure the temporary file is removed and nothing is left
     * at `destination`.
     */
    private async downloadVerified(url: string, destination: string, expectedSha256: string): Promise<void> {
        const tmpPath = `${destination}.download`;
        fs.rmSync(tmpPath, { force: true });

        try {
            const hash = crypto.createHash('sha256');
            const response = await axios.get(url, { responseType: 'stream' });
            response.data.on('data', (chunk: Buffer) => hash.update(chunk));
            await pipeline(response.data, fs.createWriteStream(tmpPath));

            const actualSha256 = hash.digest('hex');
            if (actualSha256 !== expectedSha256) {
                throw new Error(`Checksum mismatch for ${url}: expected sha256 ${expectedSha256}, got ${actualSha256}`);
            }

            fs.renameSync(tmpPath, destination);
        } catch (error) {
            fs.rmSync(tmpPath, { force: true });
            throw error;
        }
    }

    private static async sha256File(filePath: string): Promise<string> {
        const hash = crypto.createHash('sha256');
        for await (const chunk of fs.createReadStream(filePath)) {
            hash.update(chunk as Buffer);
        }
        return hash.digest('hex');
    }

    public isJavaInstalled(): boolean {
        const javaExecutable = this.getJavaPath();

        // Check the java executable exists
        if (!fs.existsSync(javaExecutable)) {
            return false;
        }

        try {
            // execFileSync runs the binary directly (no shell), so paths with spaces work
            const javaVersion = execFileSync(javaExecutable, ['--version'], { stdio: 'pipe' }).toString();

            if (!javaVersion.includes(`build ${this.javaVersionInfo.getJavaVersion()}.`)) {
                return false;
            }
        } catch (err) {
            console.error(err);
            return false;
        }

        return true;
    }

    public getJavaPath(): string {
        return path.resolve(this.getJavaInstallDirName(), ...this.getJavaExecutableSubPath());
    }

    // Location of the java binary inside the extracted Azul archive, per OS
    private getJavaExecutableSubPath(): string[] {
        switch (this.javaVersionInfo.getOsType()) {
            case OsType.WINDOWS:
                return ["bin", "java.exe"];
            case OsType.MACOS:
                // Azul macOS archives use the bundle layout: <dir>/Contents/Home/bin/java
                return ["Contents", "Home", "bin", "java"];
            default:
                return ["bin", "java"];
        }
    }

    // Generate the path for the standart archive name
    private getArchivePath(): string {
        return path.join(this.installPath, `java_${this.javaVersionInfo.getJavaVersion()}.${this.javaVersionInfo.getArchiveType()}`);
    }

    // Generate the standard name of the installed java dir
    private getJavaInstallDirName(): string {
        return path.join(this.installPath, `java_${this.javaVersionInfo.getJavaVersion()}`);
    }

    private extractZip(archivePath: string, extractPath: string): void {
        const zip = new AdmZip(archivePath);
        zip.extractAllTo(extractPath, true);
    }

    private async extractTarGz(archivePath: string, extractPath: string): Promise<void> {
        await extract({ file: archivePath, cwd: extractPath });
    }

    private deleteFolderRecursive(folderPath: string): void {
        try {
            if (fs.existsSync(folderPath)) {
                fs.rmSync(folderPath, { recursive: true, force: true });
            }
        } catch (error) {
            console.error(`Error deleting folder: ${error}`);
        }
    }
}
