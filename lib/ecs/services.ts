import { Construct, Stack, StackProps } from "@aws-cdk/core";
import {
  ContainerDefinition,
  CfnTaskDefinition,
  CfnService
} from "@aws-cdk/aws-ecs";
import {
  CfnTargetGroup,
  CfnListenerRule,
  CfnListener
} from "@aws-cdk/aws-elasticloadbalancingv2";
import { Repository } from "@aws-cdk/aws-ecr";
import { CfnLogGroup } from "@aws-cdk/aws-logs";
import { YamlConfig } from "../baws/yaml-dir";
import { CfnRole } from "@aws-cdk/aws-iam";

export class BawsServices extends Stack {
  targetRefs: string[] = [];
  counter: number;

  props: ServicesProps;

  constructor(scope: Construct, id: string, props: ServicesProps) {
    super(scope, id, props);

    this.props = props;
    this.counter = 1;

    // Pull in config files from directory.
    if (typeof props.configDir !== "undefined") {
      const configs = YamlConfig.getDirConfigs(props.configDir);
      configs.forEach(item => {
        this.createService(item);
      });
    }

    if (typeof props.config !== "undefined") {
      // Create any services in the main config file.
      for (let i = 0; i < props.config.length; i++) {
        const item = props.config[i];
        this.createService(item);
      }
    }
  }

  /**
   * This was originally decoupled, but quirks within the CDK seems to force a single,
   * bundled function.
   *
   */
  private createService = (configItem: any): void => {
    const logGroupName = `/ecs/${configItem.name}`;

    const logGroup = new CfnLogGroup(
      this,
      `baws-ecs-log-group-${configItem.name}`,
      {
        logGroupName
      }
    );

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

    if (typeof this.props.targetMap !== "undefined") {
      targetGet = this.props.targetMap.get(configItem.name);
      targetRef = typeof targetGet !== "undefined" ? targetGet : "";
    }

    const task = new CfnTaskDefinition(
      this,
      `baws-ecs-definition-${configItem.name}`,
      {
        family: configItem.name,
        containerDefinitions: [
          {
            name: configItem.name,
            image: configItem.imageURI,
            portMappings: [
              {
                hostPort: configItem.hostPort,
                containerPort: configItem.containerPort
              }
            ],
            cpu: configItem.cpuUnits,
            memoryReservation: configItem.softMemoryLimit,
            memory: configItem.hardMemoryLimit,
            environment,
            secrets,
            mountPoints,
            logConfiguration: {
              logDriver: "awslogs",
              options: {
                "awslogs-region": this.region,
                "awslogs-group": logGroupName,
                "awslogs-stream-prefix": "ecs"
              }
            },
            essential: true
          }
        ],
        executionRoleArn: this.props.executionRole.ref,
        volumes
      }
    );

    task.addDependsOn(logGroup);

    const ecrURI =
      configItem.createECR === true
        ? Repository.fromRepositoryName(
            this,
            `baws-ecr-lookup-${configItem.name}`,
            configItem.name
          ).repositoryUri
        : "none";

    const containerPort = configItem.containerPort;
    const containerName = configItem.name;

    const listeners: string[] = configItem.listeners[0].hosts;
    const listenerRule = new CfnListenerRule(
      this,
      `baws-listener-${configItem.name}`,
      {
        actions: [
          {
            type: "forward",
            targetGroupArn: targetRef
          }
        ],
        conditions: [
          {
            field: "host-header",
            hostHeaderConfig: {
              values: listeners
            }
          }
        ],
        listenerArn: this.props.listener.ref,
        priority: this.counter
      }
    );

    const service = new CfnService(this, `baws-service-${configItem.name}`, {
      taskDefinition: task.ref,
      healthCheckGracePeriodSeconds: 60,
      loadBalancers: [
        {
          containerPort,
          containerName,
          targetGroupArn: targetRef
        }
      ],
      cluster: this.props.clusterName,
      serviceName: configItem.name,
      desiredCount: configItem.desiredCount
    });

    //service.addDependsOn(listenerRule);
    this.counter++;
  };
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
