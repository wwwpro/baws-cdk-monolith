import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { Rule, RuleTargetInput, CfnRule } from "@aws-cdk/aws-events";
import { Function, IFunction, CfnPermission } from "@aws-cdk/aws-lambda";
import { LambdaFunction } from "@aws-cdk/aws-events-targets";

export class BawsEvents extends Stack {
  private props: EventProps;

  constructor(scope: Construct, id: string, props: EventProps) {
    super(scope, id, props);

    this.props = props;

    this.createCommitRule();
    this.createBuildRule();
    this.createECSRule();
  }

  private createCommitRule = (): CfnRule => {
    const rule = new CfnRule(this, "baws-rules-commit", {
      name: "baws-commit-watcher",
      description: "Created by baws CDK to watch code commit actions.",
      eventPattern: {
        source: ["aws.codecommit"],
        "detail-type": ["CodeCommit Repository State Change"]
      },
      targets: [
        {
          arn: this.props.lambdaTargetArn,
          id: "baws-commit-notify",
          inputTransformer: {
            inputPathsMap: {
              name: "$.detail.repositoryName",
              commitId: "$.detail.commitId",
              event: "$.detail.event",
              region: "$.region",
              branch: "$.detail.referenceName"
            },
            inputTemplate:
              '"{\\"message\\": \\"CodeCommit\\", \\"status\\": \\"<name> : <branch>\\", \\"details\\": \\"https://console.aws.amazon.com/codesuite/codecommit/repositories/<name>/commit/<commitId>?region=<region>\\", \\"name\\": \\"<name>\\", \\"commitId\\": \\"<commitId>\\"}"'
          }
        }
      ]
    });

    const permission = new CfnPermission(
      this,
      "baws-rules-commit-function-permission",
      {
        action: "lambda:InvokeFunction",
        functionName: this.props.lambdaTargetArn,
        principal: "events.amazonaws.com",
        sourceArn: rule.attrArn
      }
    );
    permission.addDependsOn(rule);

    return rule;
  };

  private createBuildRule = (): CfnRule => {
    const rule = new CfnRule(this, "baws-rules-build", {
      name: "baws-build-watcher",
      description: "Created by baws CDK to watch build events.",
      eventPattern: {
        source: ["aws.codebuild"],
        "detail-type": ["CodeBuild Build State Change"],
        detail: {
          "build-status": ["IN_PROGRESS", "FAILED", "SUCCEEDED"]
        }
      },
      targets: [
        {
          arn: this.props.lambdaTargetArn,
          id: "baws-build-notify",
          inputTransformer: {
            inputPathsMap: {
              project: "$.detail.project-name",
              buildId: "$.detail.build-id",
              region: "$.region",
              status: "$.detail.build-status"
            },
            inputTemplate:
              '"{\\"message\\": \\"CodeBuild\\", \\"status\\": \\"<project> - <status>\\", \\"details\\": \\"https://console.aws.amazon.com/codesuite/codebuild/projects/<project>/history?region=<region>\\"}"'
          }
        }
      ]
    });

    const permission = new CfnPermission(
      this,
      "baws-rules-build-function-permission",
      {
        action: "lambda:InvokeFunction",
        functionName: this.props.lambdaTargetArn,
        principal: "events.amazonaws.com",
        sourceArn: rule.attrArn
      }
    );
    permission.addDependsOn(rule);

    return rule;
  };

  private createECSRule = (): CfnRule => {
    const rule = new CfnRule(this, "baws-rules-ecs", {
      name: "baws-build-watcher",
      description: "Created by baws CDK to watch build events.",
      eventPattern: {
        source: ["aws.ecs"],
        "detail-type": ["ECS Task State Change"]
      },
      targets: [
        {
          arn: this.props.lambdaTargetArn,
          id: "baws-build-notify",
          inputTransformer: {
            inputPathsMap: {
              name: "$.detail.containers[0].name",
              region: "$.region",
              desiredStatus: "$.detail.desiredStatus",
              lastStatus: "$.detail.lastStatus",
              clusterArn: "$.detail.clusterArn"
            },
            inputTemplate:
              '"{\\"message\\": \\"ECS: <name>\\", \\"status\\": \\"Last: <lastStatus> - Desired: <desiredStatus>\\", \\"details\\": \\"https://<region>.console.aws.amazon.com/ecs/home?region=<region>#/clusters\\"}"'
          }
        }
      ]
    });

    const permission = new CfnPermission(
      this,
      "baws-rules-ecs-function-permission",
      {
        action: "lambda:InvokeFunction",
        functionName: this.props.lambdaTargetArn,
        principal: "events.amazonaws.com",
        sourceArn: rule.attrArn
      }
    );
    permission.addDependsOn(rule);

    return rule;
  };
}

interface EventProps extends StackProps {
  lambdaTargetArn: string;
}
