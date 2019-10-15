import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { CfnTaskDefinition, CfnTaskDefinitionProps } from "@aws-cdk/aws-ecs";
import { CfnRole } from "@aws-cdk/aws-iam";
import { Repository } from "@aws-cdk/aws-ecr";
import { CfnLogGroup } from "@aws-cdk/aws-logs";
import { YamlConfig } from "../baws/yaml-dir";

export class Tasks {
  props: TaskProps;
  taskMap: Map<string, TaskInfo>;

  constructor() {}

  public static getTaskProps = (configItem: any, props:any): CfnTaskDefinitionProps => {
    // @todo decouple logs from task.

    // Now we extract our config values.
    let volumes: CfnTaskDefinition.VolumeProperty[] = [];
    let secrets: CfnTaskDefinition.SecretProperty[] = [];
    let environment: CfnTaskDefinition.KeyValuePairProperty[] = [];
    let mountPoints: CfnTaskDefinition.MountPointProperty[] = [];

    for (let key in configItem.volumes) {
      volumes.push({ name: key, host: {sourcePath: configItem.volumes[key]} });
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

    // Our configItem. We use nginx:alpine to start. This is to provide a simple mechanism
    // for returning a 200 code, until we can deploy our actual container to this taskthrough a pipeline.
    const task:CfnTaskDefinitionProps = 
      {
        family: configItem.name,
        containerDefinitions: [
          {
            name: configItem.name,
            ...(configItem.updateEcrImage === true && {image: configItem.imageURI}),
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
                "awslogs-region": props.region,
                "awslogs-group": `/ecs/${configItem.name}`,
                "awslogs-stream-prefix": "ecs"
              }
            },
            essential: true
          }
        ],
        executionRoleArn: props.executionRoleRef,
        volumes
      }

      if (configItem.updateEcrImage === true) {
        const tempTask:any = {
          containerDefinitions:[{

          }]
        }
      }

      return task;
  };
}

interface TaskProps extends StackProps {
  config: any[];
  executionRole: CfnRole;
  taskRole: CfnRole;
  configDir?: string;
}

export interface TaskInfo {
  containerPort: number;
  containerName: string;
  ecrURI: string;
  taskRef: string;
}
