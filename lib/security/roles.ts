import { CfnRoleProps } from "@aws-cdk/aws-iam";

export class Roles {  
  
  constructor() {}

  // Ec2 roles provide a server with access to other resources,
  // such as S3, EFS and Dynamodb.
  public static getEc2RoleProps (roleName: string): CfnRoleProps {
    return ({
      roleName,
      assumeRolePolicyDocument: {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Principal": {
              "Service": "ec2.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
          }
        ]
      },
      managedPolicyArns: [
        "arn:aws:iam::aws:policy/AmazonElasticFileSystemFullAccess",
        "arn:aws:iam::aws:policy/service-role/AmazonEC2RoleforAWSCodeDeploy",
        'arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role',
        'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore',
      ]
    });
    
  };

  // Allows pipeline to access resources such as codecommit and ERC
  public static getCodePipelineRoleProps (): CfnRoleProps {
    return ({
      assumeRolePolicyDocument:{
        "Version": "2012-10-17",
        "Statement": [
          {
            "Sid": "",
            "Effect": "Allow",
            "Principal": {
              "Service": "codepipeline.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
          }
        ]
      },
      managedPolicyArns: [
        "arn:aws:iam::aws:policy/AWSCodePipelineFullAccess",
      ]
    });

  };

  // Allows codedeploy to... deploy.
  public static getDeployRoleProps (): CfnRoleProps {
    return ({
      assumeRolePolicyDocument: 
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Sid": "",
            "Effect": "Allow",
            "Principal": {
              "Service": "codepipeline.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
          }
        ]
      },
      managedPolicyArns:[

      ],
    });
  };

  // Allows codebuild to... build.
  public static getBuildRoleProps (): CfnRoleProps {
    return ({
      assumeRolePolicyDocument: {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Principal": {
              "Service": "codebuild.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
          }
        ]
      },
      managedPolicyArns: [
        ''
      ]
    });
  };

  public static geteEcsExecutionRoleProps (): CfnRoleProps {
    return ({
      roleName: "bawsEcsExecutionRole",
      assumeRolePolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "",
            Effect: "Allow",
            Principal: {
              Service: "ecs-tasks.amazonaws.com"
            },
            Action: "sts:AssumeRole"
          }
        ]
      },
      managedPolicyArns: [
        "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
        "arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess"
      ]
    });
  }

  public static getEcsTaskRoleProps (): CfnRoleProps  {
    return  ({
      roleName: "bawsEcsTaskRole",
      assumeRolePolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "",
            Effect: "Allow",
            Principal: {
              Service: "ecs-tasks.amazonaws.com"
            },
            Action: "sts:AssumeRole"
          }
        ]
      }
    });
  }

  public static getRepoWatchRoleProps (pipelineArn:string, id:string): CfnRoleProps {
    return ({
      roleName: `baws-codecommit-watcher-${id}`,
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
          policyName: `baws-codecommit-watcher-policy-${id}`,
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

  }

}

