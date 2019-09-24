import { Construct, Stack, Fn, StackProps } from "@aws-cdk/core";
import { CfnTargetGroup } from "@aws-cdk/aws-elasticloadbalancingv2";
import { YamlConfig } from "../baws/yaml-dir";

export class BawsTargets extends Stack {
  targetMap: Map<string, string>;
  targetArns: string[] = [];
  props: TargetProps;

  constructor(scope: Construct, id: string, props: TargetProps) {
    super(scope, id, props);

    this.props = props;

    // Pull in config files from directory.
    if (typeof props.configDir !== "undefined") {
      const configs = YamlConfig.getDirConfigs(props.configDir);
      configs.forEach(item => {
        this.createTarget(item);
      });
    }

    if (typeof props.config !== "undefined") {
      // Create any services in the main config file.
      props.config.forEach((item:any) => {
        this.createTarget(item);
      });
    }
  }

  private createTarget(configItem: any) {

    const target = new CfnTargetGroup(this, `baws-target-${configItem.name}`, {
      healthCheckEnabled: true,
      healthCheckIntervalSeconds: 30,
      healthCheckPath: "/",
      healthCheckProtocol: "HTTP",
      healthCheckTimeoutSeconds: 15,
      healthyThresholdCount: 2,
      matcher: { httpCode: "200,302" },
      port: 80,
      protocol: "HTTP",
      unhealthyThresholdCount: 5,
      vpcId: this.props.vpcId,
    });
    this.targetArns.push(target.ref);
  }
}

interface TargetProps extends StackProps {
  vpcId:string;
  config: any;
  configDir?: string;
}
