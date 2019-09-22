import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { CfnAutoScalingGroup } from "@aws-cdk/aws-autoscaling";
import { CfnTargetGroup } from "@aws-cdk/aws-elasticloadbalancingv2";
import { CfnSubnet, CfnSecurityGroup } from "@aws-cdk/aws-ec2";
import { BawsTemplate } from "../servers/launch-template";

export class BawsScaling extends Stack {
  constructor(scope: Construct, id: string, props: ScalingProps) {
    super(scope, id, props);

    const vpcZoneIdentifier = Array.from(props.publicSubnets, x => x.ref);    

    new CfnAutoScalingGroup(this, "baws-cfn-scaling", {
      autoScalingGroupName: "baws-autoscale",
      desiredCapacity: props.config.desiredSize,
      maxSize: props.config.maxSize,
      minSize: props.config.minSize,
      launchTemplate: {
        version: props.launchTemplateVersion,
        launchTemplateId: props.launchTemplateId,
      },
      vpcZoneIdentifier
    });
  }
}

interface ScalingProps extends StackProps {
  vpcId: string;  
  launchTemplateVersion: string;
  launchTemplateId: string;
  publicSubnets: CfnSubnet[];
  config: any;
}
