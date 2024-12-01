import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
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

        // If the archive doesn't exist, download it
        if (!fs.existsSync(archivePath)) {
            const writer = fs.createWriteStream(archivePath);
            const response = await axios.get(archiveUrl.toString(), { responseType: 'stream' });
            response.data.pipe(writer);
            await new Promise<void>((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
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
        return path.resolve(this.getJavaInstallDirName(), 
            "bin", 
            `java ${this.javaVersionInfo.getOsType() == OsType.LINUX ? "" : ".exe"}`);
    }

    public isJavaInstalled(): boolean {
        const javaBinDir = path.join(this.getJavaInstallDirName(), "bin");

        // Check the java bin dir exists
        if (!fs.existsSync(javaBinDir)) {
            return false;
        }

        // Check if the java executable
        const javaExecutable = path.join(javaBinDir,
            this.javaVersionInfo.getOsType() == OsType.LINUX ? 'java' : 'java.exe');

        if (!fs.existsSync(javaExecutable)) {
            return false;
        }

        try {
            const javaVersion = execSync(`${javaExecutable} --version`, { stdio: 'pipe' }).toString();

            if (!javaVersion.includes(`build ${this.javaVersionInfo.getJavaVersion()}.`)) {
                return false;
            }
        } catch (err) {
            console.error(err);
            return false;
        }

        return true;
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
