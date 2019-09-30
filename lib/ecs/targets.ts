import { StackProps } from "@aws-cdk/core";
import { CfnTargetGroupProps } from "@aws-cdk/aws-elasticloadbalancingv2";

export class Target{
  targetMap: Map<string, string> = new Map;
  targetArns: string[] = [];
  props: TargetProps;

  constructor() {}

  public static getTargetProps(configItem: any, props: any):CfnTargetGroupProps {
    return({
      name: configItem.name,
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
      vpcId: props.vpcId,
    });
  }
}

interface TargetProps extends StackProps {
  vpcId:string;
  config: any;
  configDir?: string;
}
