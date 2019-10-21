import { Construct, Stack, StackProps } from "@aws-cdk/core";
import {
  ContainerDefinition,
  CfnTaskDefinition,
  CfnService,
  CfnServiceProps
} from "@aws-cdk/aws-ecs";
import {
  CfnListener,
  CfnListenerRuleProps
} from "@aws-cdk/aws-elasticloadbalancingv2";

import { CfnRole } from "@aws-cdk/aws-iam";

export class Services {
  targetRefs: string[] = [];
  counter: number;

  props: ServicesProps;

  constructor() {}

  public static getServiceProps(configItem: any, props: any): CfnServiceProps {
    const containerPort = configItem.containerPort;
    const containerName = configItem.name;

    return {
      serviceName: configItem.name,
      taskDefinition: props.taskRef,
      healthCheckGracePeriodSeconds: 60,
      deploymentConfiguration: {
        minimumHealthyPercent: 50,
        maximumPercent: 200
      },
      loadBalancers: [
        {
          containerPort,
          containerName,
          targetGroupArn: props.targetRef
        }
      ],
      cluster: props.clusterName,
      desiredCount: configItem.desiredCount
    };
  }

  public static getHostListenerProps(
    configItem: any,
    props: any,
  ): CfnListenerRuleProps {
    const hosts: string[] = configItem.listeners[0].hosts;

    return {
      actions: [
        {
          type: "forward",
          targetGroupArn: props.targetRef
        }
      ],
      conditions: [
        {
          field: "host-header",
          hostHeaderConfig: {
            values: hosts
          }
        }
      ],
      listenerArn: props.listenerRef,
      priority: props.priority
    };
  }

  public static getProps(configItem: any, props: any): void {
    let counter = 0;

    // Now we extract our config values.
    let volumes: CfnTaskDefinition.VolumeProperty[] = [];
    let secrets: CfnTaskDefinition.SecretProperty[] = [];
    let environment: CfnTaskDefinition.KeyValuePairProperty[] = [];
    let mountPoints: CfnTaskDefinition.MountPointProperty[] = [];

    for (let key in configItem.volumes) {
      volumes.push({ name: key, host: configItem.volumes[key] });
    }

    for (let key in configItem.params) {
      secrets.push({ name: key, valueFrom: configItem.params[key] });
    }

    for (let key in configItem.variables) {
      environment.push({ name: key, value: configItem.variables[key] });
    }

    for (let key in configItem.mounts) {
      mountPoints.push({
        sourceVolume: key,
        containerPath: configItem.mounts[key]
      });
    }

    let targetGet: string | undefined = "";
    let targetRef: string = "";

    const containerPort = configItem.containerPort;
    const containerName = configItem.name;

  }
}

interface ServicesProps extends StackProps {
  config: any[];
  configDir?: string;
  executionRole: CfnRole;
  taskRole: CfnRole;
  targetMap: Map<string, string>;
  albName: string;
  listener: CfnListener;
  clusterName: string;
  vpcId: string;
}
