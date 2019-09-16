import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { CfnTaskDefinition, TaskDefinition } from "@aws-cdk/aws-ecs";
import { CfnRole } from "@aws-cdk/aws-iam";
import { CfnLogGroup } from "@aws-cdk/aws-logs";
import { YamlConfig } from '../baws/yaml-dir';

export class BawsTasks extends Stack {
  props: TaskProps;
  taskMap: Map<string, TaskInfo>;
  logGroup: CfnLogGroup;

  constructor(scope: Construct, id: string, props: TaskProps) {
    super(scope, id, props);
    this.props = props;
    this.taskMap = new Map();

    // Pull in config files from directory, and create them if we got 'em.
    if (typeof props.configDir !== "undefined") {
      const configs = YamlConfig.getDirConfigs(props.configDir);
      configs.forEach(item => {
        this.createTask(item);
      });
    }

    // Create tasks expressed directly in the config file.
    for (let i = 0; i < props.config.length; i++) {
      const configItem = this.props.config[i];
      this.createTask(configItem);
    }
  }

  private createTask = (taskConfig: any): CfnTaskDefinition => {
    // @todo decouple logs from task.
    const logGroupName = `/ecs/${taskConfig.name}`;

    this.logGroup = new CfnLogGroup(
      this,
      `baws-ecs-log-group-${taskConfig.name}`,
      {
        logGroupName
      }
    );

    // Now we extract our config values.
    let volumes: CfnTaskDefinition.VolumeProperty[] = [];
    let secrets: CfnTaskDefinition.SecretProperty[] = [];
    let environment: CfnTaskDefinition.KeyValuePairProperty[] = [];
    let mountPoints: CfnTaskDefinition.MountPointProperty[] = [];

    for (let key in taskConfig.volumes) {
      volumes.push({ name: key, host: taskConfig.volumes[key] });
    }

    for (let key in taskConfig.params) {
      secrets.push({ name: key, valueFrom: taskConfig.params[key] });
    }

    for (let key in taskConfig.variables) {
      environment.push({ name: key, value: taskConfig.variables[key] });
    }

    for (let key in taskConfig.mounts) {
      mountPoints.push({
        sourceVolume: key,
        containerPath: taskConfig.mounts[key]
      });
    }

    // Our configItem. We use nginx:alpine to start. This is to provide a simple mechanism
    // for returning a 200 code, until we can deploy our actual container to this taskthrough a pipeline.
    const task = new CfnTaskDefinition(
      this,
      `baws-ecs-definition-${taskConfig.name}`,
      {
        family: taskConfig.name,
        containerDefinitions: [
          {
            name: taskConfig.ecrRepoName,
            image: "nginx:alpine",
            portMappings: [
              {
                hostPort: taskConfig.hostPort,
                containerPort: taskConfig.containerPort
              }
            ],
            cpu: taskConfig.cpuUnits,
            memoryReservation: taskConfig.softMemoryLimit,
            memory: taskConfig.hardMemoryLimit,
            environment,
            secrets,
            mountPoints,
            logConfiguration: {
              logDriver: "awslogs",
              options: {
                "awslogs-region": taskConfig.logRegion,
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
    this.taskMap.set(taskConfig.name, {
      containerName: taskConfig.ecrRepoName,
      containerPort: taskConfig.containerPort,
      taskRef: task.ref
    });

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
  taskRef: string;
}
