import { Construct, Stack, StackProps } from "@aws-cdk/core";
import {
  CfnDBCluster,
  CfnDBClusterParameterGroupProps,
  CfnDBClusterProps,
  CfnDBInstanceProps
} from "@aws-cdk/aws-rds";
import { StringParameter } from "@aws-cdk/aws-ssm";

export class RDS {
  cluster: CfnDBCluster;

  constructor() {}

  public static getDBClusterParamProps(
    config: any
  ): CfnDBClusterParameterGroupProps {
    return {
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
    };
  }

  public static getRdsInstanceProps(
    config: any,
    dbSubnetGroupName: string,
    dbClusterIdentifier: string
  ): CfnDBInstanceProps[] {
    let results: CfnDBInstanceProps[] = [];
    for (let i = 0; i < config.clusterSize; i++) {
      results.push({
        engine: config.auroraEngine,
        dbInstanceIdentifier: `${config.clusterName}-${i}`,
        dbInstanceClass: config.instanceType,
        dbSubnetGroupName,
        autoMinorVersionUpgrade: true,
        allowMajorVersionUpgrade: true,
        dbClusterIdentifier
      });
    }
    return results;
  }

  public static getDBClusterProps(
    app: Construct,
    config: any,
    props: ClusterProps,
  ): CfnDBClusterProps {
    // Set variables for cluster and instance(s).
    const engine =
      typeof config.auroraEngine !== "undefined"
        ? config.auroraEngine
        : "aurora-mysql";

    const clusterName =
      typeof config.clusterName !== "undefined"
        ? config.clusterName
        : `baws-cluster`;

    const masterUsername = StringParameter.fromStringParameterAttributes(
      app,
      "baws-rds-user-lookup",
      {
        parameterName: config.masterUsernameSSM
      }
    );

    const masterUserPassword = StringParameter.fromSecureStringParameterAttributes(
      app,
      "baws-rds-pass-lookup",
      {
        parameterName: config.masterPasswordSSM,
        version: config.masterPasswordVersion
      }
    );

    return {
      dbClusterIdentifier: clusterName,
      engine: engine,
      dbClusterParameterGroupName: props.dbClusterParamGroupName,
      dbSubnetGroupName: props.dbSubnetGroupName,
      backupRetentionPeriod: config.backupRetention,
      masterUsername: masterUsername.stringValue,
      masterUserPassword: masterUserPassword.stringValue,
      vpcSecurityGroupIds: [props.dbSecurityGroupRef]
    };
  }
}

interface ClusterProps {
  dbSecurityGroupRef: string;
  dbSubnetGroupName: string;
  dbClusterParamGroupName: string;
}