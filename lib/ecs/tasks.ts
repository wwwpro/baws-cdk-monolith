import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { Repository } from "@aws-cdk/aws-ecr";
import { CfnTaskDefinition, TaskDefinition } from "@aws-cdk/aws-ecs";
import { CfnRole } from "@aws-cdk/aws-iam";
import { CfnLogGroup } from "@aws-cdk/aws-logs";

export class BawsTasks extends Stack {

  taskMap: Map<string, TaskInfo>;
  logGroup: CfnLogGroup;

  constructor(scope: Construct, id: string, props: TaskProps) {
    super(scope, id, props);

    this.taskMap = new Map();

    for (let i = 0; i < props.config.length; i++) {
      const configItem = props.config[i];

      // @todo decouple logs from task.
      this.logGroup = new CfnLogGroup(this, `baws-ecs-log-group-${configItem.name}`, {
        logGroupName: `/ecs/${configItem.logGroup}`
      });


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

      // Our configItem. We use nginx:alpine to start. This is to provide a simple mechanism
      // for returning a 200 code, until we can deploy our actual container to this taskthrough a pipeline.
      const task = new CfnTaskDefinition(
        this,
        `baws-ecs-definition-${configItem.name}`,
        {
          family: configItem.name,
          containerDefinitions: [
            {
              name: configItem.ecrRepoName,
              image: "nginx:alpine",
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
                  "awslogs-region": configItem.logRegion,
                  "awslogs-group": `/ecs/${configItem.logGroup}`,
                  "awslogs-stream-prefix": "ecs"
                }
              },
              essential: true
            }
          ],
          executionRoleArn: props.executionRole.ref,
          volumes
        }
      );
      this.taskMap.set(configItem.name, {
          containerName: configItem.ecrRepoName,
          containerPort: configItem.containerPort,
          taskRef: task.ref
      });
    }
  }
}

interface TaskProps extends StackProps {
  config: any[];
  executionRole: CfnRole;
  taskRole: CfnRole;
}

export interface TaskInfo {
    containerPort: number;
    containerName: string;
    taskRef: string;
}