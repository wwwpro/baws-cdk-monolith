import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { Role, CfnRole, CfnInstanceProfile } from "@aws-cdk/aws-iam";

export class BawsRoles extends Stack {
  public readonly ec2: CfnRole;
  public readonly pipeline: CfnRole;
  public readonly build:Role;
  public readonly ecsTask: CfnRole;
  public readonly ecsExecution: CfnRole;
  public readonly deploy: CfnRole;

  ec2InstanceRef: string;
  ecsExecutionRef: string;
  ecsTaskRef: string;


  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.ec2 = this.createEc2Role();
    this.pipeline = this.createCodePipelineRole();

    this.deploy = this.createDeployRole();
    this.ecsExecution = this.createEcsExecutionRole();
    this.ecsTask = this.createEcsTaskRole();

  }

  // Ec2 roles provide a server with access to other resources,
  // such as S3, EFS and Dynamodb.
  private createEc2Role = (): CfnRole => {

    const roleName = 'baws-ec2-profile';
    const role = new CfnRole(this, "baws-ec2-role", {
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
      ]
    });

    const instanceProfile = new CfnInstanceProfile(this, 'baws-ec2-instance-profile', {
      instanceProfileName: 'baws-instance-profile',
      roles: [roleName],
    });
    instanceProfile.addDependsOn(role);

    // The ref from instance profile doesn't give us a full arn, so we create it.
    this.ec2InstanceRef = instanceProfile.attrArn;
    //this.ec2InstanceRef = `arn:aws:iam::${this.account}:instance-profile/${instanceProfile.ref}`;

    return role;
  };

  // Allows pipeline to access resources such as codecommit and ERC
  private createCodePipelineRole = (): CfnRole => {
    const role = new CfnRole(this, "baws-role-code-pipeline", {
      roleName: "bawsCodePipeline",
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

    return role;
  };

  // Allows codedeploy to... deploy.
  private createDeployRole = ():  CfnRole => {

    const role = new CfnRole(this, 'baws-role-ec2-deploy', {
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

    /*
    const role = new Role(this, "baws-deploy-role", {
      assumedBy: new ServicePrincipal(`codedeploy.${this.region}.amazonaws.com`)
    });

    role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSCodeDeployRole"
      )
    );
        */
    return role;
  };

  // Allows codebuild to... build.
  private createBuildRole = (): CfnRole => {
    const role = new CfnRole(this, 'baws-role-code-build',{
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
    /*
    const role = new Role(this, "baws-build-role", {
      assumedBy: new ServicePrincipal('codebuild.amazonaws.com')
    });

    role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        "AWSCodePipelineFullAccess"
      )
    );
    role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        "CloudWatchLogsFullAccess"
      )
    );
    */
    return role;
  };

  private createEcsExecutionRole = (): CfnRole => {
    const role = new CfnRole(this, "baws-role-ecs-execution", {
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

    return role;
  }

  private createEcsTaskRole = (): CfnRole => {
    const role = new CfnRole(this, "baws-role-ecs-task", {
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

    return role;
  }

}

