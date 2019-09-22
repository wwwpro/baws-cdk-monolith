import { Construct, Stack, Fn, StackProps } from "@aws-cdk/core";
import {
  CfnLaunchTemplate,
  UserData,
  CfnSecurityGroup
} from "@aws-cdk/aws-ec2";
import { EcsOptimizedImage, AmiHardwareType } from "@aws-cdk/aws-ecs";
import { config } from "aws-sdk";

export class BawsTemplate extends Stack {
  /**
   * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-launchtemplate-launchtemplatedata.html
   */
  launchTemplate: CfnLaunchTemplate;
  templateId: string;
  latestVersion: string;
  clusterName: string | null;
  efsId: string | boolean;
  props: LaunchProps;

  constructor(scope: Construct, id: string, props: LaunchProps) {
    super(scope, id, props);
    this.props = props;

    if (typeof props.config !== "undefined") {
      for (let i = 0; i < props.config.length; i++) {
        this.createLaunchTemplate(props.config[i]);
      }
    }
  }

  public createLaunchTemplate = (configItem: configItem): void => {
    this.clusterName = this.props.clusterName;
    this.efsId =
      typeof this.props.efsId !== "undefined" ? this.props.efsId : false;

    let image: EcsOptimizedImage;
    let imageId: string = "";

    // @todo enable other launch template types
    if (configItem.type == "ecs") {
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

      this.launchTemplate = new CfnLaunchTemplate(
        this,
        `baws-template-${configItem.name}`,
        {
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
        }
      );

      this.templateId = this.launchTemplate.ref;
      this.latestVersion = this.launchTemplate.attrLatestVersionNumber;
    }
  };

  private buildUserData = (): string[] => {
    const commands: string[] = [];
    // Update everything.
    commands.push("yum update -y");

    // If we belong to a cluster, add ourselves.
    if (this.clusterName !== null) {
      commands.push(
        `echo ECS_CLUSTER=${this.clusterName} >> /etc/ecs/ecs.config`
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

interface configItem {
  name: string;
  type: string;
  instanceName: string;
  instanceType: string;
  storageSize: number;
  instanceSize: string;
}

interface LaunchProps extends StackProps {
  vpcId: string;
  clusterName: string;
  efsId?: string;
  instanceRole: string;
  storageSize?: string;
  ec2SecurityGroup: string;
  config: any[];
}
