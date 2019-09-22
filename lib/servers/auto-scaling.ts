import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { CfnAutoScalingGroup } from "@aws-cdk/aws-autoscaling";
import { CfnTargetGroup } from "@aws-cdk/aws-elasticloadbalancingv2";
import { CfnSubnet, CfnSecurityGroup } from "@aws-cdk/aws-ec2";
import { BawsTemplate } from "../servers/launch-template";

export class BawsScaling extends Stack {
  constructor(scope: Construct, id: string, props: ScalingProps) {
    super(scope, id, props);

    const vpcZoneIdentifier = Array.from(props.publicSubnets, x => x.ref);

    const template = new BawsTemplate(this, `baws-scaling-template-${id}`, {
      env: props.env,
      ec2SecurityGroup: props.ec2SecurityGroup,
      instanceRole: props.instanceRole,
      vpcId: props.vpcId,
      efsId: props.efsId,
      clusterName: props.clusterName,
      config: props.config.launchTemplate
    });

    new CfnAutoScalingGroup(this, "baws-cfn-scaling", {
      autoScalingGroupName: "baws-autoscale",
      desiredCapacity: props.config.desiredSize,
      maxSize: props.config.maxSize,
      minSize: props.config.minSize,
      launchTemplate: {
        version: template.latestVersion,
        launchTemplateId: template.templateId
      },
      vpcZoneIdentifier
    });
  }
}

interface ScalingProps extends StackProps {
  vpcId: string;
  instanceRole: string;
  clusterName: string;
  ec2SecurityGroup: CfnSecurityGroup;
  efsId: string;
  baseTarget?: CfnTargetGroup;
  publicSubnets: CfnSubnet[];
  config: any;
}
