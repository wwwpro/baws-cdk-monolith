import { Construct, Stack, StackProps, Duration } from "@aws-cdk/core";
import {
  CustomResource,
  CustomResourceProvider
} from "@aws-cdk/aws-cloudformation";
import {
  InlineCode,
  SingletonFunction,
  Runtime,
  Function,
  Code,
  AssetCode
} from "@aws-cdk/aws-lambda";
import * as fs from "fs";
import * as path from "path";
import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";

export class BawsRouteResource extends Stack {
  constructor(scope: Construct, id: string, props: RouteResourceProps) {
    super(scope, id, props);

    const filePath = path.join(__dirname, "./routeTableFunction");

    const routeFunction = new Function(this, "baws-route-function", {
      functionName: "baws-route-resource",
      description:
        "Created by baws CDK to allow internet traffic into the main route table.",
      runtime: Runtime.NODEJS_10_X,
      handler: "index.handler",
      code: Code.fromAsset(path.join(__dirname, "./routeTableFunction"))
    });

    const routeFunctionPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: ["*"],
      actions: [
        "ec2:CreateRoute",
        "ec2:DescribeAccountAttributes",
        "ec2:DescribeInternetGateways",
        "ec2:DescribeRouteTables",
        "ec2:DescribeSubnets",
        "ec2:DescribeTags",
        "ec2:DescribeVpcs"
      ]
    });

    routeFunction.addToRolePolicy(routeFunctionPolicy);

    new CustomResource(this, "baws-route-resource", {
      provider: CustomResourceProvider.lambda(routeFunction),
      properties: {
        vpcid: props.vpcId
      }
    });
  }
}

interface RouteResourceProps extends StackProps {
  vpcId: string;
}
