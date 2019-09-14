import { Construct, Stack, StackProps } from "@aws-cdk/core";
import {
  CfnDBCluster,
  CfnDBSubnetGroup,
  CfnDBInstance,
  CfnDBClusterParameterGroup
} from "@aws-cdk/aws-rds";
import { CfnSecurityGroup, CfnSubnet } from "@aws-cdk/aws-ec2";
import { StringParameter, IStringParameter } from "@aws-cdk/aws-ssm";

export class BawsRDS extends Stack {
  cluster: CfnDBCluster;

  private masterUsername: IStringParameter;
  private masterUserPassword: IStringParameter;
  private subnetGroup: CfnDBSubnetGroup;
  private engine: string;

  constructor(scope: Construct, id: string, props: RDSProps) {
    super(scope, id, props);

    const config = props.config;
    const hostName = config.dbHostParamName;
    const readOnlyHost = config.dbROHostParamName;

    const subnetIds: string[] =
      typeof props.publicSubnets !== "undefined"
        ? Array.from(props.publicSubnets, x => x.ref)
        : [];

    const dbSubnetGroupName = `baws-${id}-subnet`;
    this.subnetGroup = new CfnDBSubnetGroup(this, "baws-db-subnet-group", {
      dbSubnetGroupName,
      dbSubnetGroupDescription: "Baws subnet for aurora.",
      subnetIds
    });

    const paramGroup = new CfnDBClusterParameterGroup(
      this,
      "baws-param-group",
      {
        family: config.paramFamily,
        parameters: {
          max_allowed_packet: "64000000"
        },
        tags: [
          {
            key: "Name",
            value: config.paramGroupName
          }
        ],
        description: "Created by baws cdk."
      }
    );

    // Set variables for cluster and instance(s).
    this.engine =
      typeof config.auroraEngine !== "undefined"
        ? config.auroraEngine
        : "aurora-mysql";

    const clusterName =
      typeof config.clusterName !== "undefined"
        ? config.clusterName
        : `baws-cluster`;

    this.masterUsername = StringParameter.fromStringParameterAttributes(
      this,
      "baws-rds-user-lookup",
      {
        parameterName: config.masterUsernameSSM
      }
    );

    this.masterUserPassword = StringParameter.fromSecureStringParameterAttributes(
      this,
      "baws-rds-pass-lookup",
      {
        parameterName: config.masterPasswordSSM,
        version: 1
      }
    );

    this.cluster = new CfnDBCluster(this, "baws-rds-cluster", {
      dbClusterIdentifier: clusterName,
      engine: this.engine,
      dbClusterParameterGroupName: paramGroup.ref,
      dbSubnetGroupName: this.subnetGroup.dbSubnetGroupName,
      backupRetentionPeriod: config.backupRetention,
      masterUsername: this.masterUsername.stringValue,
      masterUserPassword: this.masterUserPassword.stringValue,
      vpcSecurityGroupIds: [props.securityGroup.ref],
    });
    this.cluster.addDependsOn(paramGroup);
    this.cluster.addDependsOn(this.subnetGroup);
    

    for (let i = 0; i < config.clusterSize; i++) {
      
      const instance = new CfnDBInstance(this, `baws-instance-${i}`, {
        engine: this.engine,
        dbInstanceIdentifier: `${config.clusterName}-${i}`,
        dbInstanceClass: config.instanceType,
        dbSubnetGroupName: this.subnetGroup.dbSubnetGroupName,
        autoMinorVersionUpgrade: true,
        allowMajorVersionUpgrade: true,
        dbClusterIdentifier: this.cluster.dbClusterIdentifier,
      });
      
      instance.addDependsOn(this.cluster);
    }

    // Create host endpoints in SSM for container reference.
    new StringParameter(this, 'baws-db-host', {
      description: 'Created by baws cdk',
      parameterName: hostName,
      stringValue: this.cluster.attrEndpointAddress,
    });

    new StringParameter(this, 'baws-db-host-read', {
      description: 'Created by baws cdk',
      parameterName: readOnlyHost,
      stringValue: this.cluster.attrReadEndpointAddress,
    });
  }
}

interface RDSProps extends StackProps {
  securityGroup: CfnSecurityGroup;
  publicSubnets: CfnSubnet[];
  config: any;
}
