import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { BawsVPC, BawsVPCProps } from "../vpc/cnfvpc";
import { CfnTargetGroup } from "@aws-cdk/aws-elasticloadbalancingv2";
import { Matcher } from "netparser";

export class BawsTarget extends Stack {
  target: CfnTargetGroup;
  targetArn:string;

  constructor(scope: Construct, id: string, props: BawsVPCProps) {
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
