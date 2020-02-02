import { Construct, Stack, StackProps } from "@aws-cdk/core";
import {
  CfnTaskDefinition,
  CfnServiceProps,
  CfnService
} from "@aws-cdk/aws-ecs";
import {
  CfnListener,
  CfnListenerRuleProps,
  CfnListenerProps
} from "@aws-cdk/aws-elasticloadbalancingv2";

import { CfnRole } from "@aws-cdk/aws-iam";
import { RedirectProtocol } from "@aws-cdk/aws-s3";
import { type } from "os";

export class Services {
  targetRefs: string[] = [];
  counter: number;

  props: ServicesProps;

  constructor() {}

  public static getServiceProps(configItem: any, props: any): CfnServiceProps {
    let result: CfnServiceProps = {
      serviceName: configItem.name,
      taskDefinition: props.taskRef,
      deploymentConfiguration: {
        minimumHealthyPercent: 50,
        maximumPercent: 200
      },

      cluster: props.clusterName,
      desiredCount: configItem.desiredCount
    };

    if (typeof props.networkConfiguration !== "undefined") {
      result = {
        ...result,
        networkConfiguration: {
          awsvpcConfiguration: {
            subnets: props.networkConfiguration.subnets,
            securityGroups: props.networkConfiguration.securityGroups
          }
        }
      };
    }

    if (typeof configItem.listeners !== "undefined") {
      const containerPort = configItem.containerPort;
      const containerName = configItem.name;
      const alb = {
        healthCheckGracePeriodSeconds: 60,
        loadBalancers: [
          {
            containerPort,
            containerName,
            targetGroupArn: props.targetRef
          }
        ]
      };

      result = { ...result, ...alb };
    }

    return result;
  }

  public getListenerRuleProps = (
    config: any,
    props: any
  ): CfnListenerRuleProps => {
    let listenerProps: CfnListenerRuleProps;

    if (config.type == "forward") {
      listenerProps = this.getHostListenerProps(config, props);
    } else {
      listenerProps = this.getRedirectListenerProps(config, props);
    }

    return listenerProps;
  };

  private getHostListenerProps = (
    configItem: any,
    props: any
  ): CfnListenerRuleProps => {
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
            values: configItem.hosts
          }
        }
      ],
      listenerArn: props.listenerRef,
      priority: configItem.priority
    };
  };

  private getRedirectListenerProps(
    configItem: any,
    props: any
  ): CfnListenerRuleProps {
    return {
      actions: [
        {
          type: "redirect",
          redirectConfig: {
            statusCode: "HTTP_301",
            protocol: "HTTPS",
            port: "443",
            path: "/#{path}",
            query: "#{query}",
            host: configItem.to
          }
        }
      ],
      conditions: [
        {
          field: "host-header",
          hostHeaderConfig: {
            values: configItem.from
          }
        }
      ],
      listenerArn: props.listenerRef,
      priority: configItem.priority
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
