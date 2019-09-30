import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";

export class RouteResource {
  constructor() {}

  public static getRoutePolicyStatement():PolicyStatement {
    return(
      new PolicyStatement ({
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
      })
    );
  }
}