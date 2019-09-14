import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { CfnRepository } from "@aws-cdk/aws-ecr";
import {
  ContainerDefinition,
  CfnTaskDefinition,
  CfnService
} from "@aws-cdk/aws-ecs";
import { CfnRole, AnyPrincipal } from "@aws-cdk/aws-iam";
import {
  CfnTargetGroup,
  CfnListenerRule
} from "@aws-cdk/aws-elasticloadbalancingv2";
import { CfnLogGroup } from "@aws-cdk/aws-logs";
import { TaskInfo } from "./tasks";

export class BawsServices extends Stack {
  repo: CfnRepository;
  task: CfnTaskDefinition;
  target: CfnTargetGroup;
  service: CfnService;
  logGroup: CfnLogGroup;

  container: ContainerDefinition;

  props: ServicesProps;

  constructor(scope: Construct, id: string, props: ServicesProps) {
    super(scope, id, props);

    /** Tasks have a few working parts
     *  A repo to store the container
     *  Roles for execution and the task.
     *  The task definition.
     *  And then, finally, the service, which needs a load balancer and coressponding target group.
     */

    this.props = props;

    // Welcome to the circus, ladies and gentlemen.
    for (let i = 0; i < props.config.length; i++) {
      // For simplified reading.
      const configItem = props.config[i];
      const listeners = props.config[i].listeners.map((x: any) => x.host);

      const task = props.tasks.get(configItem.taskNameReference);
      let taskRef:string = '';
      let containerPort: number = 0;
      let containerName:string  = '';

      if (typeof task === "undefined") {
        this.node.addError(
          "Task definition could not be found. Please check the taskNameReference in your config file to ensure it has a matching task under ecs.tasks.name"
        );
      }else {
        taskRef = task.taskRef;
        containerPort = task.containerPort;
        containerName = task.containerName;
      }

      const target = new CfnTargetGroup(this, `baws-target-${configItem.name}`, {
        name: `${configItem.name}-target`,
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
        vpcId: props.vpcId
      });

      const listenerRule = new CfnListenerRule(
        this,
        `baws-listener-${configItem.name}`,
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
          listenerArn: props.listenerArn,
          priority: i + 1
        }
      );
      listenerRule.addDependsOn(target);

      this.service = new CfnService(this, `baws-service-${configItem.name}`, {
        taskDefinition: taskRef,
        healthCheckGracePeriodSeconds: 60,
        loadBalancers: [
          {
            containerPort,
            containerName,
            targetGroupArn: target.ref
          }
        ],
        cluster: props.clusterName,
        serviceName: configItem.name,
        desiredCount: configItem.desiredCount
      });
      this.service.addDependsOn(listenerRule);
    }
  }
}

interface ServicesProps extends StackProps {
  config: any[];
  tasks: Map<string, TaskInfo>;
  albName: string;
  listenerArn: string;
  clusterName: string;
  vpcId: string;
}
