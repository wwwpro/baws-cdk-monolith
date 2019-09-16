import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { CfnRepository } from "@aws-cdk/aws-ecr";
import {
  ContainerDefinition,
  CfnTaskDefinition,
  CfnService
} from "@aws-cdk/aws-ecs";
import {
  CfnTargetGroup,
  CfnListenerRule
} from "@aws-cdk/aws-elasticloadbalancingv2";
import { CfnLogGroup } from "@aws-cdk/aws-logs";
import { TaskInfo } from "./tasks";
import { YamlConfig } from "../baws/yaml-dir";

export class BawsServices extends Stack {
  repo: CfnRepository;
  task: CfnTaskDefinition;
  target: CfnTargetGroup;
  service: CfnService;
  logGroup: CfnLogGroup;
  container: ContainerDefinition;
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
        this.createService(props.config[i]);
      }
    }
  }

  private createService = (serviceConfig: any) => {
    // For simplified reading.
    const listeners = serviceConfig.listeners.map((x: any) => x.host);

    const task = this.props.tasks.get(serviceConfig.taskNameReference);
    let taskRef: string = "";
    let containerPort: number = 0;
    let containerName: string = "";

    if (typeof task === "undefined") {
      this.node.addError(
        "Task definition could not be found. Please check the taskNameReference in your config file to ensure it has a matching task."
      );
    } else {
      taskRef = task.taskRef;
      containerPort = task.containerPort;
      containerName = task.containerName;
    }

    const target = new CfnTargetGroup(
      this,
      `baws-target-${serviceConfig.name}`,
      {
        name: `${serviceConfig.name}-target`,
        healthCheckEnabled: true,
        healthCheckIntervalSeconds: 30,
        healthCheckPath: "/",
        healthCheckProtocol: "HTTP",
        healthCheckTimeoutSeconds: 15,
        healthyThresholdCount: 2,
        matcher: { httpCode: "200,302" },
        port: 80,
        protocol: "HTTP",
        unhealthyThresholdCount: 5,
        vpcId: this.props.vpcId
      }
    );

    const listenerRule = new CfnListenerRule(
      this,
      `baws-listener-${serviceConfig.name}`,
      {
        actions: [
          {
            type: "forward",
            targetGroupArn: target.ref
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
        listenerArn: this.props.listenerArn,
        priority: this.counter
      }
    );
    listenerRule.addDependsOn(target);

    this.service = new CfnService(this, `baws-service-${serviceConfig.name}`, {
      taskDefinition: taskRef,
      healthCheckGracePeriodSeconds: 60,
      loadBalancers: [
        {
          containerPort,
          containerName,
          targetGroupArn: target.ref
        }
      ],
      cluster: this.props.clusterName,
      serviceName: serviceConfig.name,
      desiredCount: serviceConfig.desiredCount
    });
    this.service.addDependsOn(listenerRule);
    this.counter++;
  };
}

interface ServicesProps extends StackProps {
  config: any[];
  tasks: Map<string, TaskInfo>;
  configDir?: string;
  albName: string;
  listenerArn: string;
  clusterName: string;
  vpcId: string;
}
