import { JavaType } from "./distribution/JavaType";
import { OsType } from "./distribution/OsType";
import { ArchType } from "./distribution/ArchType";

export class JavaVersionInfo {
    private readonly javaVersion: string;
    private readonly javaType: JavaType;
    private readonly osType: OsType;
    private readonly archType: ArchType;
    private readonly withJavaFx: boolean;

    constructor(javaVersion: string, javaType: JavaType, osType: OsType, archType: ArchType, withJavaFx: boolean) {
        this.javaVersion = javaVersion;
        this.javaType = javaType;
        this.osType = osType;
        this.archType = archType;
        this.withJavaFx = withJavaFx;
    }

    getJavaVersion(): string {
        return this.javaVersion;
    }

    getJavaType(): JavaType {
        return this.javaType;
    }

    getOsType(): OsType {
        return this.osType;
    }

    getArchType(): ArchType {
        return this.archType;
    }

    isWithJavaFx(): boolean {
        return this.withJavaFx;
    }

    getArchiveType(): string {
        return this.getOsType() === OsType.WINDOWS ? 'zip' : 'tar.gz';
    }

    getArchiveName(): string {
        return `java_${this.getJavaType()}_${this.getJavaVersion()}_archive.${this.getArchiveType()}`;
    }
}