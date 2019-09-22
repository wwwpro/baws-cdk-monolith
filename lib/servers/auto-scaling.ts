import { Construct, Stack, StackProps, Fn } from "@aws-cdk/core";
import { CfnAutoScalingGroup } from "@aws-cdk/aws-autoscaling";
import { CfnTargetGroup } from "@aws-cdk/aws-elasticloadbalancingv2";
import {
  CfnSubnet,
  CfnLaunchTemplateProps,
  UserData,
  CfnLaunchTemplate
} from "@aws-cdk/aws-ec2";
import { EcsOptimizedImage, AmiHardwareType } from "@aws-cdk/aws-ecs";

export class BawsScaling extends Stack {
  props: ScalingProps;
  launchTemplateProps: CfnLaunchTemplateProps;
  efsId: string | boolean;

  constructor(scope: Construct, id: string, props: ScalingProps) {
    super(scope, id, props);

    const vpcZoneIdentifier = Array.from(props.publicSubnets, x => x.ref);

    const launchTemplate = new CfnLaunchTemplate(
      this,
      `baws-launch-scaling-${id}`,
      this.prepareLaunchTemplate(this.props.config.launchTemplate)
    );

    new CfnAutoScalingGroup(this, "baws-cfn-scaling", {
      autoScalingGroupName: "baws-autoscale",
      desiredCapacity: props.config.desiredSize,
      maxSize: props.config.maxSize,
      minSize: props.config.minSize,
      launchTemplate: {
        version: launchTemplate.attrLatestVersionNumber,
        launchTemplateId: launchTemplate.ref
      },
      vpcZoneIdentifier
    });
  }

  public prepareLaunchTemplate = (configItem: configItem): CfnLaunchTemplateProps => {
    this.efsId =
      typeof this.props.efsId !== "undefined" ? this.props.efsId : false;

    let image: EcsOptimizedImage;
    let imageId: string = "";

    // @todo enable other launch template types

    image = EcsOptimizedImage.amazonLinux2(AmiHardwareType.STANDARD);
    imageId = image.getImage(this).imageId;

    const instanceType =
      typeof configItem.instanceType !== "undefined"
        ? configItem.instanceType
        : "t3a.small";

    const keyName = this.node.tryGetContext("ec2Key");

    // Assemble our userdata.
    const rawData = UserData.forLinux();
    const commands = this.buildUserData();
    rawData.addCommands(...commands);
    const renderedData = rawData.render();
    const userData = Fn.base64(renderedData);

    const securityId = this.props.ec2SecurityGroup;

    return {
      launchTemplateName: configItem.name,
      launchTemplateData: {
        imageId,
        instanceType,
        keyName,
        securityGroupIds: [securityId],
        userData,
        iamInstanceProfile: {
          arn: this.props.instanceRole
        },
        blockDeviceMappings: [
          {
            deviceName: "/dev/xvda",
            ebs: {
              deleteOnTermination: true,
              encrypted: false,
              volumeSize: configItem.storageSize
            }
          }
        ],
        tagSpecifications: [
          {
            resourceType: "instance",
            tags: [
              {
                key: "Name",
                value: configItem.instanceName
              }
            ]
          }
        ]
      }
    };
  };

  
  private buildUserData = (): string[] => {
    const commands: string[] = [];
    // Update everything.
    commands.push("yum update -y");

    // If we belong to a cluster, add ourselves.
    if (this.props.clusterName !== null) {
      commands.push(
        `echo ECS_CLUSTER=${this.props.clusterName} >> /etc/ecs/ecs.config`
      );
    }

    // Mount our EFS id if we have it.
    if (this.efsId !== false) {
      const efsDir = "/mnt/efs";
      //Install efs utilities so we can deal with efs.
      commands.push("yum install amazon-efs-utils");
      // Mount our new efs.
      commands.push(`mkdir -p ${efsDir}`);
      commands.push(
        `echo "${this.efsId}:/${efsDir} efs tls,_netdev" >> /etc/fstab`
      );
      commands.push("mount -a -t efs defaults");
    }

    return commands;
  };
}

interface ScalingProps extends StackProps {
  vpcId: string;
  efsId?: string;
  clusterName: string;
  publicSubnets: CfnSubnet[];
  instanceRole: string;
  ec2SecurityGroup: string;
  config: any;
}

interface configItem {
  name: string;
  type: string;
  instanceName: string;
  instanceType: string;
  storageSize: number;
  instanceSize: string;
}
