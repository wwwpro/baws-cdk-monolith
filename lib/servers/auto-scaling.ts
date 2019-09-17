import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { CfnAutoScalingGroup } from "@aws-cdk/aws-autoscaling";
import { CfnTargetGroup } from "@aws-cdk/aws-elasticloadbalancingv2";
import { CfnSubnet } from "@aws-cdk/aws-ec2";

export class BawsScaling extends Stack {
  constructor(scope: Construct, id: string, props: ScalingProps) {
    super(scope, id, props);
    
    const vpcZoneIdentifier = Array.from(props.publicSubnets, x => x.ref);

    new CfnAutoScalingGroup(this, "baws-cfn-scaling", {
      autoScalingGroupName: "baws-autoscale",
      desiredCapacity: props.desiredSize,
      maxSize: props.maxSize,
      minSize: props.minSize,
      launchTemplate: {
        version: props.launchTemplateVersion,
        launchTemplateId: props.launchTemplateId
      },
      vpcZoneIdentifier
    });
  }
}

interface ScalingProps extends StackProps {
  vpcId: string;
  desiredSize: string;
  maxSize: string;
  minSize: string;
  launchTemplateId: string;
  launchTemplateVersion: string;
  baseTarget?: CfnTargetGroup;
  publicSubnets: CfnSubnet[];
}
