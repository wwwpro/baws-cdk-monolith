import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { CfnCacheCluster, CfnSubnetGroup } from "@aws-cdk/aws-elasticache";
import { CfnSecurityGroup, CfnSubnet } from "@aws-cdk/aws-ec2";
import { StringParameter } from "@aws-cdk/aws-ssm";

export class BawsCache extends Stack {
  cluster: CfnCacheCluster;
  constructor(scope: Construct, id: string, props: CacheProps) {
    super(scope, id, props);

    const config = props.config;

    const subnetIds = props.publicSubnets.map(x => x.ref);

    const subnetGroup = new CfnSubnetGroup(this, "baws-cache-subnet", {
      cacheSubnetGroupName: "baws-subnet",
      description: "Subnet group created by Baws CDK.",
      subnetIds
    });

    for (let i = 0; i < config.length; i++) {
      const cluster = config[i];
      this.cluster = new CfnCacheCluster(
        this,
        `baws-cache-cluster-${cluster.name}`,
        {
          clusterName: cluster.name,
          cacheNodeType: cluster.instanceType,
          numCacheNodes: cluster.clusterSize,
          engine: cluster.engine,
          vpcSecurityGroupIds: [props.securityGroup.ref],
          cacheSubnetGroupName: "baws-subnet"
        }
      );
      this.cluster.addDependsOn(subnetGroup);

      const endPoint =
        cluster.engine == "memcached"
          ? this.cluster.attrConfigurationEndpointAddress
          : this.cluster.attrRedisEndpointAddress;

      // Create host endpoints in SSM for container reference.
      new StringParameter(this, `baws-cache-host-${cluster.name}`, {
        description: "Created by baws cdk",
        parameterName: cluster.hostParamName,
        stringValue: endPoint
      });
    }
  }
}

interface CacheProps extends StackProps {
  config: any[];
  securityGroup: CfnSecurityGroup;
  publicSubnets: CfnSubnet[];
}
