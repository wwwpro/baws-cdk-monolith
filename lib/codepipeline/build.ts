import { Construct, Stack, StackProps } from "@aws-cdk/core";
import {
  CfnProject,
  ComputeType,
} from "@aws-cdk/aws-codebuild";

export class BawsBuild extends Stack {
  build: CfnProject;

  constructor(scope: Construct, id: string, props: BuildProps) {
    super(scope, id, props);

    const projectName =
      typeof props.projectName !== "undefined"
        ? props.projectName
        : id;

    this.build = new CfnProject(this, `baws-build-${id}`, {
      artifacts: {
        type: "CODEPIPELINE"
      },
      environment: {
        computeType: ComputeType.SMALL,
        image: "aws/codebuild/amazonlinux2-x86_64-standard:1.0",
        privilegedMode: true,
        type: "LINUX_CONTAINER"
      },
      serviceRole: props.serviceRole,
      source: {
        type: "CODECOMMIT"
      },
      name: projectName
    });
  }
}

interface BuildProps extends StackProps {
  serviceRole: string;
  projectName?: string;
}
