import { Stack, Construct, StackProps } from "@aws-cdk/core";
import { CfnPipeline, ActionCategory } from "@aws-cdk/aws-codepipeline";
import { CfnBucket } from "@aws-cdk/aws-s3";
import { Role, CfnRole } from "@aws-cdk/aws-iam";
import { CfnProject } from "@aws-cdk/aws-codebuild";
import { CfnRule } from "@aws-cdk/aws-events";
import { CfnLogGroup } from "@aws-cdk/aws-logs";

export class BawsPipelines extends Stack {
  private bucket: CfnBucket;

  id: string;
  pipelineName: string;
  pipelines: CfnPipeline[];
  bucketName: string;

  // @todo strongly type config to match config.yml
  config: any;
  props: pipelineConfig;

  // And here we... go...
  constructor(scope: Construct, id: string, props: pipelineConfig) {
    super(scope, id, props);

    this.props = props;
    this.config = props.config;
    this.id = id;

    // Create all of our pipelines.
    for (let i = 0; i < this.config.pipelines.length; i++) {
      const pipelineConfig = this.config.pipelines[i];

      // Maybe we've been passed custom names. If so, use them.
      this.pipelineName =
        typeof pipelineConfig.pipelineName !== "undefined"
          ? pipelineConfig.pipelineName
          : `baws-pipeline-${id}`;

      const projectName =
        typeof pipelineConfig.projectName !== "undefined"
          ? `${pipelineConfig.projectName}`
          : `baws-project-${id}`;

      this.bucketName = (typeof props.bucket.bucketName !== 'undefined') ? props.bucket.bucketName: ''
      const codeBuildRole = this.createCodeBuildRole();

      const logGroup = new CfnLogGroup(this, `baws-pipeline-log-group-${this.pipelineName}`, {
        logGroupName: `/codebuild/${this.pipelineName}`
      });

      const cfnProject = new CfnProject(
        this,
        `baws-build-project-${this.pipelineName}`,
        {
          name: projectName,
          artifacts: {
            type: "CODEPIPELINE"
          },
          source: {
            type: "CODEPIPELINE"
          },
          logsConfig: {
            cloudWatchLogs: {
              status: "ENABLED",
              groupName: `codebuild/${this.pipelineName}`
            }
          },
          environment: {
            computeType: "BUILD_GENERAL1_SMALL",
            image: "aws/codebuild/standard:2.0",
            privilegedMode: true,
            type: "LINUX_CONTAINER"
          },
          serviceRole: codeBuildRole.attrArn
        }
      );

      cfnProject.addDependsOn(codeBuildRole);
      cfnProject.addDependsOn(logGroup);

      const pipelineRole = this.createPipelineRole();

      // Create our pipelines
      const pipeline = new CfnPipeline(
        this,
        `baws-pipeline-${this.pipelineName}`,
        {
          roleArn: pipelineRole.attrArn,
          name: this.pipelineName,
          artifactStore: {
            type: "S3",
            location: this.bucketName
          },
          stages: [
            this.getCodeCommitSource(
              pipelineConfig.repoNameReference,
              pipelineConfig.branchToWatch
            ),
            this.getBuildStage(projectName),
            this.getECSDeploy(pipelineConfig.clusterNameReference, pipelineConfig.serviceNameReference)
          ]
        }
      );

      pipeline.addDependsOn(pipelineRole);
      pipeline.addDependsOn(cfnProject);

      const pipelineArn = `arn:aws:codepipeline:${this.region}:${this.account}:${this.pipelineName}`;
      const repoArn = `arn:aws:codecommit:${this.region}:${this.account}:${pipelineConfig.repoNameReference}`;

      this.createRepoEvent(pipelineArn, repoArn, pipelineConfig.branchToWatch);
    }
  }

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

  private createPipelineRole = (): CfnRole => {
    const role = new CfnRole(this, `baws-role-pipeline-${this.pipelineName}`, {
      roleName: `baws-pipeline-${this.pipelineName}`,
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
          policyName: `baws-policy-pipeline-${this.pipelineName}`,
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
    });

    return role;
  };

  private createCodeBuildRole = (): CfnRole => {
    const role = new CfnRole(
      this,
      `baws-role-code-build-${this.pipelineName}`,
      {
        roleName: `baws-codebuild-${this.pipelineName}`,
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
                    `arn:aws:logs:${this.region}:${this.account}:log-group:codebuild/${this.pipelineName}`,
                    `arn:aws:logs:${this.region}:${this.account}:log-group:codebuild/${this.pipelineName}:*`
                  ],
                  Action: [
                    "logs:CreateLogGroup",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents"
                  ]
                },
                {
                  Effect: "Allow",
                  Resource: [`${this.props.bucket.attrArn}*`],
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
      }
    );

    return role;
  };

  private createRepoEvent = (
    pipelineArn: string,
    repoArn: string,
    branchToWatch: string
  ): void => {
    //Our rule needs a role
    const role = new CfnRole(this, `baws-rule-role-${this.pipelineName}`, {
      roleName: `baws-codecommit-watcher-${this.pipelineName}`,
      assumeRolePolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Service: "events.amazonaws.com"
            },
            Action: "sts:AssumeRole"
          }
        ]
      },
      policies: [
        {
          policyName: `baws-codecommit-watcher-policy-${this.pipelineName}`,
          policyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Action: ["codepipeline:StartPipelineExecution"],
                Resource: [pipelineArn]
              }
            ]
          }
        }
      ]
    });

    // And finally, create our rule.
    const rule = new CfnRule(this, `baws-repo-rule-${this.pipelineName}`, {
      name: `baws-repo-watchter-${this.pipelineName}`,
      targets: [
        {
          arn: pipelineArn,
          id: "CodePipeline",
          roleArn: role.attrArn
        }
      ],
      eventPattern: {
        source: ["aws.codecommit"],
        "detail-type": ["CodeCommit Repository State Change"],
        resources: [`${repoArn}`],
        detail: {
          event: ["referenceCreated", "referenceUpdated"],
          referenceType: ["branch"],
          referenceName: [branchToWatch]
        }
      }
    });
    rule.addDependsOn(role);
  };
}

interface pipelineConfig extends StackProps {
  bucket: CfnBucket;
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
