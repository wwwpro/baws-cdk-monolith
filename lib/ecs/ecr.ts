import { Stack, Construct, StackProps } from "@aws-cdk/core";
import { CfnRepository } from "@aws-cdk/aws-ecr";
import { YamlConfig } from "../baws/yaml-dir";

export class BawsECR extends Stack {
  repoMap: Map<string, string>;
  props: ECRProps;
  constructor(scope: Construct, id: string, props: ECRProps) {
    super(scope, id, props);

    // Pull in config files from directory, and create them if we got 'em.
    if (typeof props.configDir !== "undefined") {
      const configs = YamlConfig.getDirConfigs(props.configDir);
      configs.forEach(item => {
        if (item.createECR === true) {
          this.createECRRepo(item);
        }
      });
    }

    if (typeof props.config !== "undefined") {
      // Create tasks expressed directly in the config file.
      for (let i = 0; i < props.config.length; i++) {
        const configItem = props.config[i];
        if (configItem.createECR === true) {
          this.createECRRepo(configItem);
        }
      }
    }
  }

  private createECRRepo = (config: any): void => {
    const repo = new CfnRepository(this, `baws-ecr-${config.name}`, {
      repositoryName: config.name
    });
    this.repoMap.set(config.name, repo.ref);
  };
}

interface ECRProps extends StackProps {
  config: any;
  configDir?: string;
}
