import { CfnRule, CfnRuleProps } from "@aws-cdk/aws-events";
import { CfnPermissionProps } from "@aws-cdk/aws-lambda";
export class Events {
  constructor() {}

  public static getCommitRuleProps(lambdaArn:string, id:string ): CfnRuleProps {
    return {
      name: `baws-commit-watcher-${id}`,
      description: "Created by baws CDK to watch code commit actions.",
      eventPattern: {
        source: ["aws.codecommit"],
      },
      targets: [
        {
          arn: lambdaArn,
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
    };
  }

  public static getBuildRuleProps(lambdaArn: string, id:string): CfnRuleProps {
    return {
      name: `baws-build-watcher-${id}`,
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
          arn: lambdaArn,
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
    };
  }

  public static getEcsRuleProps(lambdaArn: string, id:string): CfnRuleProps {
    return {
      name: `baws-ecs-watcher-${id}`,
      description: "Created by baws CDK to watch build events.",
      eventPattern: {
        source: ["aws.ecs"],
        "detail-type": ["ECS Task State Change"]
      },
      targets: [
        {
          arn: lambdaArn,
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
    };
  }

  public static getPipelineWatcherProps (props: PipelineWatcherProps):CfnRuleProps {
    return ({
      name: `baws-repo-watchter-${props.id}`,
      targets: [
        {
          arn: props.pipelineArn,
          id: "CodePipeline",
          roleArn: props.roleArn
        }
      ],
      eventPattern: {
        source: ["aws.codecommit"],
        "detail-type": ["CodeCommit Repository State Change"],
        resources: [`${props.repoArn}`],
        detail: {
          event: ["referenceCreated", "referenceUpdated"],
          referenceType: ["branch"],
          referenceName: [props.branchToWatch]
        }
      }
    });
  }

  public static getNotifyPermission(
    lambdaArn: string,
    rule: CfnRule
  ): CfnPermissionProps {
    return {
      action: "lambda:InvokeFunction",
      functionName: lambdaArn,
      principal: "events.amazonaws.com",
      sourceArn: rule.attrArn
    };
  }

}

interface PipelineWatcherProps {
  id: string;
  pipelineArn: string;
  roleArn: string;
  repoArn: string;
  branchToWatch: string;
}