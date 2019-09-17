import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { CfnSecurityGroup, CfnSecurityGroupProps } from "@aws-cdk/aws-ec2";

/**
 * All security groups needed for operations go here, and are passed to their respective 
 * 
 */
export class BawsSecurity extends Stack {
  public readonly props: SecurityProps;
  public readonly vpcId: string;
  public readonly alb: CfnSecurityGroup;
  public readonly ec2: CfnSecurityGroup;
  public readonly rds: CfnSecurityGroup;
  public readonly efs: CfnSecurityGroup;
  public readonly cache: CfnSecurityGroup;

  constructor(scope: Construct, id: string, props: SecurityProps) {
    super(scope, id, props);

    this.props = props;
    this.vpcId = props.vpcId !== null ? props.vpcId : "";

    this.alb = this.albGroup();
    this.ec2 = this.ec2Group(this.alb);
    this.efs = this.efsGroup(this.ec2);
    this.rds = this.rdsGroup(this.ec2);
    this.cache = this.cacheGroup(this.ec2);
  }

  private albGroup = (): CfnSecurityGroup => {
    const group: CfnSecurityGroup = new CfnSecurityGroup(this, "baws-lb-sg", {
      vpcId: this.vpcId,
      groupName: "baws-alb",
      groupDescription: "Created by baws cdk",
      securityGroupIngress: [
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
      ]
    });
    return group;
  };

  private ec2Group = (albGroup: CfnSecurityGroup): CfnSecurityGroup => {
    // Add our bastion ips, if we have any.
    const bastionIps = this.node.tryGetContext('bastionIps');
  
    let securityGroupIngress:CfnSecurityGroup.IngressProperty[] = [{
      ipProtocol: "tcp",
      fromPort: 0,
      toPort: 65535,
      sourceSecurityGroupId: albGroup.ref
    }];


    // Add bastion ips if we have any.
    if (bastionIps.length > 0) {
      bastionIps.forEach((element:string) => {
        securityGroupIngress.push({
          ipProtocol: "tcp",
          fromPort: 0,
          toPort: 65535,
          cidrIp: `${element}/32`
        });
      });
    }

    let groupProps:CfnSecurityGroupProps = {
      vpcId: this.vpcId,
      groupName: "baws-ec2",
      groupDescription: "Created by baws cdk",
      securityGroupIngress
    }

    const group = new CfnSecurityGroup(this, "baws-ec2-sg", groupProps);
    return group;
  };

  private efsGroup = (ec2Group: CfnSecurityGroup): CfnSecurityGroup => {
    const group = new CfnSecurityGroup(this, "baws-efs-sg", {
      vpcId: this.vpcId,
      groupName: "baws-efs",
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
    return group;
  };

  private rdsGroup = (ec2Group: CfnSecurityGroup): CfnSecurityGroup => {
    const group = new CfnSecurityGroup(this, "baws-rds-sg", {
      vpcId: this.vpcId,
      groupName: "baws-rds",
      groupDescription: "Created by baws cdk",
      securityGroupIngress: [
        {
          ipProtocol: "tcp",
          fromPort: 3306,
          toPort: 3306,
          sourceSecurityGroupId: ec2Group.ref
        }
      ]
    });

    return group;
  };

  private cacheGroup = (ec2Group: CfnSecurityGroup): CfnSecurityGroup => {
    const group = new CfnSecurityGroup(this, "baws-cache-sg", {
      vpcId: this.vpcId,
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
    return group;
  };
}

interface SecurityProps extends StackProps {
  vpcId: string;
}
