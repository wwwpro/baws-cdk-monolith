import { StackProps } from "@aws-cdk/core";
import { CfnTargetGroupProps } from "@aws-cdk/aws-elasticloadbalancingv2";
import { type } from "os";

export class Target {
  targetMap: Map<string, string> = new Map();
  targetArns: string[] = [];
  props: TargetProps;

  constructor() {}

  public static getTargetProps(
    configItem: any,
    props: any
  ): CfnTargetGroupProps {
    const healthCheckPath =
      typeof configItem.healthCheckPath !== "undefined"
        ? configItem.healthCheckPath
        : "/";

    const port = typeof configItem.port !== "undefined" ? configItem.port : 80;
    const healthCheckProtocol =
      typeof configItem.healthCheckProtocol !== "undefined"
        ? configItem.healthCheckProtocol
        : "HTTP";

    const protocol =
      typeof configItem.protocol !== "undefined" ? configItem.protocol : "HTTP";

    return {
      name: configItem.name,
      healthCheckEnabled: true,
      healthCheckIntervalSeconds: 30,
      healthCheckPath,
      healthCheckProtocol,
      healthCheckTimeoutSeconds: 15,
      healthyThresholdCount: 2,
      matcher: { httpCode: "200,302" },
      port: configItem.containerPort,
      protocol: "HTTP",
      unhealthyThresholdCount: 5,
      vpcId: props.vpcId
    };
  }
}

interface TargetProps extends StackProps {
  vpcId: string;
  config: any;
  configDir?: string;
}
