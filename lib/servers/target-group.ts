import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { CfnTargetGroup } from "@aws-cdk/aws-elasticloadbalancingv2";

export class BawsTarget extends Stack {
  target: CfnTargetGroup;
  targetArn:string;

  constructor(scope: Construct, id: string, props: TargetProps) {
    super(scope, id, props);

    this.target = new CfnTargetGroup(this, `baws-target-${id}`, {
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
  
     this.targetArn = this.target.ref;
  }
}

interface TargetProps extends StackProps {
  vpcId: string;
}