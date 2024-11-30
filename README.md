# Nexus Java

This package lets you download and manage multiple Java installations.

Download Java from `azul.com`.

## Install :

To include Typescript Template in your project, you can install it using npm:

```bash
npm i @arffornia/nexus_java
```

## Usage :

### Windows example :

```ts
NexusJava nexusJava = new NexusJava(
                installPath, new NexusJavaInfo(
                        "17",                       // Java version
                        JavaType.JRE,               // Java type
                        OsType.WINDOWS,             // Os type
                        ArchType.X64,               // Arch type
                        true),                      // With JavaFx
                        null,                       // Callback function
                        false);                     // Delete archive finished

const javaDirPath = nexusJava.downloadAndExtract();
console.log("Java home dir path is " + javaDirPath);
```

### Linux example :

```ts
NexusJava nexusJava = new NexusJava(
                installPath, new NexusJavaInfo(
                        "11",                       // Java version
                        JavaType.JDK,               // Java type
                        OsType.LINUX,               // Os type
                        ArchType.AMD64,             // Arch type
                        false),                     // With JavaFx
                        null,                       // Callback function
                        true);                      // Delete archive finished

Path javaDirPath = nexusJava.downloadAndExtract();
comsole.log("Java home dir path is " + javaDirPath);
```

## Tests

Tests are managed by **Jest**

You can run the tests using :

```bash
npm test
```

## License

This project is licensed under the MIT licence. You can consult the complete text of the licence in the file [LICENSE](LICENSE).
