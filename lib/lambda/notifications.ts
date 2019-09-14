import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { Code, Function, Runtime } from "@aws-cdk/aws-lambda";
import * as path from "path";
import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";

export class BawsNotifyFunction extends Stack {
  function: Function;

  constructor(scope: Construct, id: string, props: NotifyProps) {
    super(scope, id, props);

    if (typeof props.config.pipeline.slackChannel !== "undefined") {
      const slackChannel = props.config.pipeline.slackChannel;
      const slackURL = props.config.pipeline.slackURL;

      this.function = new Function(this, `baws-notify`, {
        functionName: props.config.pipeline.functionName,
        description:
          "Created by baws cdk to notify approprriate channels, -slack, email or text- when events pipeline or scaling event occur.",
        runtime: Runtime.NODEJS_10_X,
        handler: "index.handler",
        code: Code.fromAsset(path.join(__dirname, "./notify")),
        environment: {
          slackChannel,
          slackURL
        }
      });

      const codeCommitPolicy = new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [`arn:aws:codecommit:${this.region}*`],
        actions: [
          "codecommit:BatchGet*",
          "codecommit:BatchDescribe*",
          "codecommit:Get*",
          "codecommit:Describe*",
          "codecommit:List*",
          "codecommit:GitPull"
        ]
      });

      this.function.addToRolePolicy(codeCommitPolicy);
    }
  }
}

interface NotifyProps extends StackProps {
  config: any;
}
