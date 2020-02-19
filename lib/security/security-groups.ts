import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { CfnSecurityGroup, CfnSecurityGroupProps } from "@aws-cdk/aws-ec2";

/**
 * All security groups needed for operations go here
 *
 */
export class Security {

  public static getGenericPrivateGroupProps (vpcId:string, port:number): CfnSecurityGroupProps {

    return {
      vpcId,
      groupDescription: 'Created by baws CDK',
      securityGroupIngress:[{
        ipProtocol: 'tcp',
        fromPort: port,
        toPort: port,
        cidrIp: "0.0.0.0/0"
      }]
    }

  }

  public static getAlbGroupProps(vpcId:string, bastionIps: string[] = []): CfnSecurityGroupProps {
    let securityGroupIngress: CfnSecurityGroup.IngressProperty[] = [
      {
        ipProtocol: "tcp",
        fromPort: 80,
        toPort: 80,
        cidrIp: "0.0.0.0/0"
      },
      {
        ipProtocol: "tcp",
        fromPort: 443,
        toPort: 443,
        cidrIp: "0.0.0.0/0"
      }
    ];

    // Add bastion ips if we have any.
    if (bastionIps.length > 0) {
      bastionIps.forEach((element: string) => {
        securityGroupIngress.push({
          ipProtocol: "tcp",
          fromPort: 0,
          toPort: 65535,
          cidrIp: `${element}/32`
        });
      });
    }

    return {
      vpcId,
      groupDescription: "Created by baws cdk",
      securityGroupIngress
    };
  }

  public static getEc2GroupProps (vpcId:string, albGroup: CfnSecurityGroup, bastionIps:string[] = []): CfnSecurityGroupProps {
    // Add our bastion ips, if we have any.

    let securityGroupIngress: CfnSecurityGroup.IngressProperty[] = [
      {
        ipProtocol: "tcp",
        fromPort: 0,
        toPort: 65535,
        sourceSecurityGroupId: albGroup.ref
      }
    ];

    // Add bastion ips if we have any.
    if (bastionIps.length > 0) {
      bastionIps.forEach((element: string) => {
        securityGroupIngress.push({
          ipProtocol: "tcp",
          fromPort: 0,
          toPort: 65535,
          cidrIp: `${element}/32`
        });
      });
    }

    return ({
      vpcId: vpcId,
      groupDescription: "Created by baws cdk",
      securityGroupIngress
    });

  };

  public static getEfsGroupProps (vpcId:string, ec2Group: CfnSecurityGroup): CfnSecurityGroupProps {
    return ({
      vpcId: vpcId,
      groupDescription: "Created by baws cdk",
      securityGroupIngress: [
        {
          ipProtocol: "tcp",
          fromPort: 2049,
          toPort: 2049,
          sourceSecurityGroupId: ec2Group.ref
        }
      ]
    });
  };

  /**
   *
   * @param vpcId
   * @param ec2Group
   */
  public static getRdsGroupProps (vpcId:string, ec2Group: CfnSecurityGroup): CfnSecurityGroupProps {
    return ({
      vpcId: vpcId,
      groupDescription: "Created by baws cdk",
      securityGroupIngress: [
          //MySQL
        {
          ipProtocol: "tcp",
          fromPort: 3306,
          toPort: 3306,
          sourceSecurityGroupId: ec2Group.ref
        },
          //Postgres
        {
          ipProtocol: "tcp",
          fromPort: 5432,
          toPort: 5432,
          sourceSecurityGroupId: ec2Group.ref
        }
      ]
    });
  };

  public static getCacheGroupProps (vpcId:string, ec2Group: CfnSecurityGroup): CfnSecurityGroupProps {
    return ({
      vpcId,
      groupName: "baws-cache",
      groupDescription: "Created by baws cdk",
      securityGroupIngress: [
        {
          ipProtocol: "tcp",
          fromPort: 11211,
          toPort: 11211,
          sourceSecurityGroupId: ec2Group.ref
        },
        {
          ipProtocol: "tcp",
          fromPort: 6379,
          toPort: 6379,
          sourceSecurityGroupId: ec2Group.ref
        }
      ]
  });
}
}

interface SecurityProps extends StackProps {
  vpcId: string;
}
