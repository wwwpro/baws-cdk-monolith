import { StackProps } from "@aws-cdk/core";
import {
  CfnPipeline,
  ActionCategory,
  CfnPipelineProps,
  StageProps
} from "@aws-cdk/aws-codepipeline";
import { CfnBucket } from "@aws-cdk/aws-s3";
import { Role, CfnRole, CfnRoleProps } from "@aws-cdk/aws-iam";
import { CfnProject, CfnProjectProps } from "@aws-cdk/aws-codebuild";
import { TaskInfo } from "../ecs/tasks";

export class CodePipeline {
  private bucket: CfnBucket;

  id: string;
  pipelineName: string;
  pipelines: CfnPipeline[];
  bucketName: string;

  // @todo strongly type config to match config.yml
  config: any;
  props: pipelineConfig;

  constructor() {}

  public getCodePipelineProps = (
    configItem: any,
    props: PipelineProps
  ): CfnPipelineProps => {
    const projectName = `${configItem.name}-build`;

    let stages: CfnPipeline.StageDeclarationProperty[] = [
      this.getCodeCommitSource(
        configItem.repoNameReference,
        configItem.branchToWatch
      )
    ];

    // Build stage is added if the config if available, but set to true,
    // or if it's undefined. ECS pipelines will be undefined, but are required.
    if (
      (typeof configItem.createBuildStage !== "undefined" &&
        configItem.createBuildStage === true) ||
      typeof configItem.createBuildStage === "undefined"
    ) {
      stages.push(this.getBuildStage(projectName));
    }

    // ECS builds have a taskNameReference, while S3 deployment
    // will have a bucketNameReference
    if (typeof configItem.taskNameReference !== "undefined") {
      stages.push(
        this.getECSDeploy(
          configItem.clusterNameReference,
          configItem.taskNameReference
        )
      );
    } else if (typeof configItem.bucketNameReference !== "undefined") {
      const deploymentPath =
        typeof configItem.deploymentPath !== "undefined"
          ? configItem.deploymentPath
          : "";

      stages.push(
        this.getS3Deploy(
          configItem.bucketNameReference,
          configItem.createBuildStage,
          deploymentPath
        )
      );
    }

    let pipelineProps: CfnPipelineProps = {
      roleArn: props.pipelineRole.attrArn,
      name: configItem.name,
      artifactStore: {
        type: "S3",
        location: props.bucketName
      },
      stages
    };

    return pipelineProps;
  };

  public getBuildProps = (props: BuildProps): CfnProjectProps => {
    let environmentVariables: CfnProject.EnvironmentVariableProperty[] = [];
    if (
      typeof props.taskName !== "undefined" &&
      typeof props.taskURI !== "undefined"
    ) {
      environmentVariables = [
        {
          name: "CONTAINER_NAME",
          value: props.taskName
        },
        {
          name: "REPOSITORY_URI",
          value: props.taskURI
        }
      ];
    }

    return {
      name: props.name,
      artifacts: {
        type: "CODEPIPELINE"
      },
      source: {
        type: "CODEPIPELINE"
      },
      logsConfig: {
        cloudWatchLogs: {
          status: "ENABLED",
          groupName: `codebuild/${props.name}`
        }
      },
      environment: {
        computeType: "BUILD_GENERAL1_SMALL",
        image: "aws/codebuild/standard:2.0",
        privilegedMode: true,
        type: "LINUX_CONTAINER",
        environmentVariables
      },
      serviceRole: props.buildRoleArn
    };
  };

  private getCodeCommitSource = (
    repoName: string,
    branch: string
  ): CfnPipeline.StageDeclarationProperty => {
    return {
      name: "source-pull",
      actions: [
        {
          name: "sourcepull-action",
          outputArtifacts: [
            {
              name: "app-source"
            }
          ],
          actionTypeId: {
            category: ActionCategory.SOURCE,
            owner: "AWS",
            provider: "CodeCommit",
            version: "1"
          },
          configuration: {
            RepositoryName: repoName,
            BranchName: branch
          }
        }
      ]
    };
  };

  private getBuildStage = (
    projectName: string
  ): CfnPipeline.StageDeclarationProperty => {
    return {
      name: "build",
      actions: [
        {
          name: "build-action",
          inputArtifacts: [
            {
              name: "app-source"
            }
          ],
          outputArtifacts: [
            {
              name: "app-build"
            }
          ],
          actionTypeId: {
            category: ActionCategory.BUILD,
            owner: "AWS",
            provider: "CodeBuild",
            version: "1"
          },
          configuration: {
            ProjectName: projectName
          }
        }
      ]
    };
  };

  private getECSDeploy = (
    clusterName: string,
    serviceName: string
  ): CfnPipeline.StageDeclarationProperty => {
    return {
      name: "ecs-deploy",
      actions: [
        {
          name: "ecs-deploy-action",
          inputArtifacts: [
            {
              name: "app-build"
            }
          ],
          actionTypeId: {
            category: ActionCategory.DEPLOY,
            owner: "AWS",
            provider: "ECS",
            version: "1"
          },
          configuration: {
            ClusterName: clusterName,
            ServiceName: serviceName,
            FileName: "imagedefinitions.json"
          }
        }
      ]
    };
  };

  private getS3Deploy = (
    bucketName: string,
    createBuildStage: boolean = true,
    deploymentPath: string = ""
  ): CfnPipeline.StageDeclarationProperty => {
    const inputArtifactName = createBuildStage ? "app-build" : "app-source";

    return {
      name: "ecs-deploy",
      actions: [
        {
          name: "ecs-deploy-action",
          inputArtifacts: [
            {
              name: inputArtifactName
            }
          ],
          actionTypeId: {
            category: ActionCategory.DEPLOY,
            owner: "AWS",
            provider: "S3",
            version: "1"
          },
          configuration: {
            Bucketname: bucketName,
            Extract: true,
            ObjectKey: deploymentPath
          }
        }
      ]
    };
  };

  public getPipelineRoleProps = (name: string): CfnRoleProps => {
    return {
      roleName: `baws-pipeline-${name}`,
      assumeRolePolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Service: "codepipeline.amazonaws.com"
            },
            Action: "sts:AssumeRole"
          }
        ]
      },
      policies: [
        {
          policyName: `baws-policy-pipeline-${name}`,
          policyDocument: {
            Statement: [
              {
                Action: ["iam:PassRole"],
                Resource: "*",
                Effect: "Allow",
                Condition: {
                  StringEqualsIfExists: {
                    "iam:PassedToService": [
                      "ec2.amazonaws.com",
                      "ecs-tasks.amazonaws.com"
                    ]
                  }
                }
              },
              {
                Action: [
                  "codecommit:CancelUploadArchive",
                  "codecommit:GetBranch",
                  "codecommit:GetCommit",
                  "codecommit:GetUploadArchiveStatus",
                  "codecommit:UploadArchive"
                ],
                Resource: "*",
                Effect: "Allow"
              },
              {
                Action: [
                  "codedeploy:CreateDeployment",
                  "codedeploy:GetApplication",
                  "codedeploy:GetApplicationRevision",
                  "codedeploy:GetDeployment",
                  "codedeploy:GetDeploymentConfig",
                  "codedeploy:RegisterApplicationRevision"
                ],
                Resource: "*",
                Effect: "Allow"
              },
              {
                Action: [
                  "ec2:*",
                  "elasticloadbalancing:*",
                  "autoscaling:*",
                  "cloudwatch:*",
                  "s3:*",
                  "sns:*",
                  "sqs:*",
                  "ecs:*"
                ],
                Resource: "*",
                Effect: "Allow"
              },
              {
                Action: ["codebuild:BatchGetBuilds", "codebuild:StartBuild"],
                Resource: "*",
                Effect: "Allow"
              },
              {
                Effect: "Allow",
                Action: ["ecr:DescribeImages"],
                Resource: "*"
              }
            ],
            Version: "2012-10-17"
          }
        }
      ]
    };
  };

  public getBuildRoleProps = (props: BuildRoleProps): CfnRoleProps => {
    return {
      roleName: `baws-codebuild-${props.name}`,
      assumeRolePolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Service: "codebuild.amazonaws.com"
            },
            Action: "sts:AssumeRole"
          }
        ]
      },
      managedPolicyArns: [
        "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess"
      ],
      policies: [
        {
          policyName: `baws-codebuild-${this.id}`,
          policyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Resource: [
                  `arn:aws:logs:${props.region}:${props.account}:log-group:codebuild/${props.name}`,
                  `arn:aws:logs:${props.region}:${props.account}:log-group:codebuild/${props.name}:*`
                ],
                Action: [
                  "logs:CreateLogGroup",
                  "logs:CreateLogStream",
                  "logs:PutLogEvents"
                ]
              },
              {
                Effect: "Allow",
                Resource: [`${props.bucketArn}*`],
                Action: [
                  "s3:PutObject",
                  "s3:GetObject",
                  "s3:GetObjectVersion",
                  "s3:GetBucketAcl",
                  "s3:GetBucketLocation"
                ]
              }
            ]
          }
        }
      ]
    };
  };
}

export interface PipelineProps {
  bucketName: string;
  taskName: string;
  pipelineRole: CfnRole;
}

export interface BuildRoleProps {
  name: string;
  region: string;
  account: string;
  bucketArn: string;
}

export interface BuildProps {
  name: string;
  taskName?: string;
  taskURI?: string;
  buildRoleArn: string;
}

interface pipelineConfig extends StackProps {
  bucket: CfnBucket;
  configDir?: string;
  taskMap: Map<string, TaskInfo>;
  pipelineRole: CfnRole;
  buildRole: Role;
  clusterName: string;
  config: any;
}

export interface IPipelineConfig {
  pipeline: {
    type: string;
    clusterRef: string;
    pipelineName: string;
    repoName: string;
    repoDescription: string;
  };
}
