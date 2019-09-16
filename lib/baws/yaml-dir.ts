import * as Yaml from "js-yaml";
import * as FS from "fs";
import * as Path from "path";

/**
 * Retrieves yaml files as configuration objects
 */
export class YamlConfig {
  /**
   *
   * Reads a directory -relative to the project root- of YAML files and returns an array
   * of the yaml contents as readable objects.
   *
   * @param relativeDir
   */
  public static getDirConfigs(relativeDir: string): any[] {
    let configs: any[] = [];

    try {
      const dirPath = Path.join(__dirname, `../../${relativeDir}`);
      const configFiles = FS.readdirSync(dirPath);

      configFiles.forEach(file => {
        const filePath = Path.join(dirPath, file);
        const config = Yaml.safeLoad(FS.readFileSync(filePath, "utf-8"));
        configs.push(config);
      });
    } catch (error) {
      console.log(`Directory read failed: ${error}`);
    }

    return configs;
  }

  /**
   * Reads a single yaml file and returns the configuration object.
   * @param relativeDir
   *
   */
  public static getConfigFile(relativeDir: string): any {
    let config: any | undefined;

    try {
      const filePath = Path.join(__dirname, `../../${relativeDir}`);
      config = Yaml.safeLoad(FS.readFileSync(filePath, "utf8"));
    } catch (error) {
      console.log(`File load failed: ${error}`);
    }

    return config;
  }
}
