import { Construct, Fn } from "@aws-cdk/core";
import {
  CfnLaunchTemplate,
  UserData,
  CfnLaunchTemplateProps
} from "@aws-cdk/aws-ec2";
import { EcsOptimizedImage, AmiHardwareType } from "@aws-cdk/aws-ecs";

export class LaunchTemplate {
  /**
   * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-launchtemplate-launchtemplatedata.html
   */


  app: Construct;

  public getLaunchTemplateProps = (
    config: LaunchConfig,
    props: LaunchProps
  ): CfnLaunchTemplateProps => {
    let template: CfnLaunchTemplateProps = {};

    let image: EcsOptimizedImage;
    let imageId: string = "";

    // @todo enable other launch template types
    if (config.type == "ecs") {
      image = EcsOptimizedImage.amazonLinux2(AmiHardwareType.STANDARD);
      imageId = image.getImage(props.app).imageId;

      const instanceType =
        typeof config.instanceType !== "undefined"
          ? config.instanceType
          : "t3a.small";

      // Assemble our userdata.
      const rawData = UserData.forLinux();
      const commands = this.buildUserData(props.clusterName, props.efsId);
      rawData.addCommands(...commands);
      const renderedData = rawData.render();
      const userData = Fn.base64(renderedData);

      template = {
        launchTemplateName: config.name,
        launchTemplateData: {
          imageId,
          instanceType,
          keyName: props.keyName,
          securityGroupIds: [props.securityId],
          userData,
          iamInstanceProfile: {
            arn: props.instanceProfileRole
          },
          blockDeviceMappings: [
            {
              deviceName: "/dev/xvda",
              ebs: {
                deleteOnTermination: true,
                encrypted: false,
                volumeSize: config.storageSize
              }
            }
          ],
          tagSpecifications: [
            {
              resourceType: "instance",
              tags: [
                {
                  key: "Name",
                  value: config.instanceName
                }
              ]
            }
          ]
        }
      };
    }
    return template;
  };

  private buildUserData = (
    clusterName: string = "",
    efsId: string | boolean = false,
  ): string[] => {
    const commands: string[] = [];
    // Update everything.
    commands.push("yum update -y");

    // If we belong to a cluster, add ourselves.
    if (clusterName !== null) {
      commands.push(
        `echo ECS_CLUSTER=${clusterName} >> /etc/ecs/ecs.config`
      );
    }

    // Mount our EFS id if we have it.
    if (efsId !== false) {
      const efsDir = "/mnt/efs";
      //Install efs utilities so we can deal with efs.
      commands.push("yum install amazon-efs-utils -y");
      // Mount our new efs.
      commands.push(`mkdir -p ${efsDir}`);
      commands.push(
        `echo "${efsId}:/ ${efsDir} efs tls,_netdev" >> /etc/fstab`
      );
      commands.push("mount -a -t efs defaults");
    }

    return commands;
  };
}

export interface LaunchConfig {
  name: string;
  type: string;
  instanceName: string;
  instanceType: string;
  storageSize: number;
  instanceSize: string;
}

export interface LaunchProps {
  keyName: string;
  securityId: string;
  instanceProfileRole: string;
  clusterName: string;
  app: Construct;
  efsId: string | boolean;
}
