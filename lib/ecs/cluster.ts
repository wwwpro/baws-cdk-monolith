import {Construct, Stack, StackProps} from '@aws-cdk/core';
import { CfnCluster } from '@aws-cdk/aws-ecs';

export class BawsCluster extends Stack {

  cluster:CfnCluster;
  clusterName: string;

    constructor(scope: Construct, id: string, props: ClusterProps) {
      super(scope, id, props);

      this.clusterName = props.clusterName;

      this.cluster = new CfnCluster(this, 'baws-cluster' , {
        clusterName: this.clusterName,
      });
    }
  }

interface ClusterProps extends StackProps {
  clusterName:string,
}
