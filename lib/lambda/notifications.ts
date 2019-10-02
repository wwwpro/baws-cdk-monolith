
import { Code, Function, Runtime, FunctionProps } from "@aws-cdk/aws-lambda";
import * as path from "path";
import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";

export class NotifyFunction {
  function: Function;

  constructor() {}

  public static getFunctionProps(config: any, id:string): FunctionProps {
    return {
      functionName: `${config.functionName}-${id}`,
      description:
        "Created by baws cdk to notify approprriate channels, -slack, email or text- when events pipeline or scaling event occur.",
      runtime: Runtime.NODEJS_10_X,
      handler: "index.handler",
      code: Code.fromAsset(path.join(__dirname, "./notify")),
      environment: {
        slackChannel: config.slackChannel,
        slackURL: config.slackURL
      }
    };
  }

  public static getNotificationPolicy(region: string):PolicyStatement {
    return new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [`arn:aws:codecommit:${region}*`],
      actions: [
        "codecommit:BatchGet*",
        "codecommit:BatchDescribe*",
        "codecommit:Get*",
        "codecommit:Describe*",
        "codecommit:List*",
        "codecommit:GitPull"
      ]
    });
  }
}