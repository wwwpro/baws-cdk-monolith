import { StackProps } from "@aws-cdk/core";
import { CfnAutoScalingGroupProps } from "@aws-cdk/aws-autoscaling";
import { CfnSubnet } from "@aws-cdk/aws-ec2";


export class Scaling {
  constructor() {}

  public static getScalingProps(
    configItem: any,
    props: any
  ): CfnAutoScalingGroupProps {
    return {
      autoScalingGroupName: "baws-autoscale",
      desiredCapacity: configItem.desiredSize,
      maxSize: configItem.maxSize,
      minSize: configItem.minSize,
      launchTemplate: {
        version: props.launchTemplate.attrLatestVersionNumber,
        launchTemplateId: props.launchTemplate.ref
      },
      vpcZoneIdentifier: props.subnets,
      targetGroupArns: props.targetArns
    };
  }
}

interface ScalingProps extends StackProps {
  vpcId: string;
  efsId?: string;
  clusterName: string;
  publicSubnets: CfnSubnet[];
  instanceRole: string;
  ec2SecurityGroup: string;
  config: any;
  targetArns: string[];
}

interface configItem {
  name: string;
  type: string;
  instanceName: string;
  instanceType: string;
  storageSize: number;
  instanceSize: string;
}
