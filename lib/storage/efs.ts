import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { CfnFileSystem, CfnMountTarget } from "@aws-cdk/aws-efs";
import { CfnSecurityGroup, CfnSubnet } from "@aws-cdk/aws-ec2";

export class BawsEFS extends Stack {
  cfnefs: CfnFileSystem;
  cfnfsTarget: CfnMountTarget;
  efsId: string;

  constructor(scope: Construct, id: string, props: EFSProps) {
    super(scope, id, props);
    
    this.cfnefs = new CfnFileSystem(this, "baws-cfnefs", {
      encrypted: false,
      fileSystemTags: [
        {
          key: "Name",
          value: props.name
        }
      ]
    });

    if (props.securityGroup !== null) {
      
      for (let i = 0; i < props.publicSubnets.length; i++) {
        const cfnfsTarget = new CfnMountTarget(this, `baws-efs-target-${i}`, {
          subnetId: props.publicSubnets[i].ref,
          fileSystemId: this.cfnefs.ref,
          securityGroups: [props.securityGroup.ref]
        });
        cfnfsTarget.addDependsOn(this.cfnefs);
      }
    }
    

    this.efsId = this.cfnefs.ref;
  }
}

export interface EFSProps extends StackProps {
  securityGroup: CfnSecurityGroup | null;
  publicSubnets: CfnSubnet[];
  vpcId: string;
  encrypted: boolean;
  name: string;
}
