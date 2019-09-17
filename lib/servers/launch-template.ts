import { Construct, Stack, Fn, StackProps } from "@aws-cdk/core";
import {
  CfnLaunchTemplate,
  UserData,
  CfnSecurityGroup
} from "@aws-cdk/aws-ec2";
import {
  EcsOptimizedImage,
  AmiHardwareType,
} from "@aws-cdk/aws-ecs";

export class BawsTemplate extends Stack {
  
  /**
   * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-launchtemplate-launchtemplatedata.html
   */
  launchTemplate: CfnLaunchTemplate;
  templateId: string;
  latestVersion: string;
  clusterName: string | null;
  efsId: string | boolean;

  constructor(scope: Construct, id: string, props: LaunchProps) {
    super(scope, id, props);

    this.node.addInfo(`Security group: ${props.securityGroup.ref}`);
    this.clusterName = props.clusterName;

    this.efsId = typeof props.efsId !== "undefined" ? props.efsId : false;

    for (let i = 0; i < props.config.length; i++) {
      const templateConfig = props.config[i];

      let image: EcsOptimizedImage;
      let imageId: string = "";

      // @todo enable other launch template types
      if (templateConfig.type == "ecs") {
        image = EcsOptimizedImage.amazonLinux2(AmiHardwareType.STANDARD);
        imageId = image.getImage(this).imageId;

        const instanceType =
          typeof templateConfig.instanceType !== "undefined"
            ? templateConfig.instanceType
            : "t3a.small";

        const keyName = this.node.tryGetContext("ec2Key");

        // Assemble our userdata.
        const rawData = UserData.forLinux();
        const commands = this.buildUserData();
        rawData.addCommands(...commands);
        const renderedData = rawData.render();
        const userData = Fn.base64(renderedData);

        const securityId =
          props.securityGroup !== null ? props.securityGroup.ref : "";

        this.launchTemplate = new CfnLaunchTemplate(
          this,
          `baws-template-${id}-${i}`,
          {
            launchTemplateName: props.config[i].Name,
            launchTemplateData: {
              imageId,
              instanceType,
              keyName,
              securityGroupIds: [securityId],
              userData,
              iamInstanceProfile: {
                arn: props.instanceRole
              },
              blockDeviceMappings: [
                {
                  deviceName: "/dev/xvda",
                  ebs: {
                    deleteOnTermination: true,
                    encrypted: false,
                    volumeSize: props.config[i].storageSize
                  }
                }
              ],
              tagSpecifications: [
                {
                  resourceType: "instance",
                  tags: [
                    {
                      key: "Name",
                      value: props.config[i].instanceName
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
    }
  }

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

interface LaunchProps extends StackProps {
  vpcId: string;
  clusterName: string;
  efsId?: string;
  instanceRole: string;
  storageSize?: string;
  securityGroup: CfnSecurityGroup;
  config: any[];
}
