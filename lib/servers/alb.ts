import { Construct, StackProps } from "@aws-cdk/core";
import {
  Protocol,
  CfnTargetGroupProps,
  CfnListenerProps
} from "@aws-cdk/aws-elasticloadbalancingv2";
import { CfnSubnet, CfnSecurityGroup } from "@aws-cdk/aws-ec2";

export class ALB {
  app: Construct;

  public static getAlbTargetProps(vpcId: string): CfnTargetGroupProps {
    return {
      healthCheckEnabled: true,
      healthCheckIntervalSeconds: 30,
      healthCheckPath: "/",
      healthCheckProtocol: "HTTP",
      healthCheckTimeoutSeconds: 15,
      healthyThresholdCount: 2,
      matcher: { httpCode: "200,302" },
      port: 80,
      protocol: "HTTP",
      unhealthyThresholdCount: 5,
      vpcId
    };
  }

  public static getPortRedirectListenerProps(albRef: string): CfnListenerProps {
    return {
      loadBalancerArn: albRef,
      port: 80,
      protocol: Protocol.HTTP,
      defaultActions: [
        {
          type: "redirect",
          redirectConfig: {
            statusCode: "HTTP_301",
            host: "#{host}",
            path: "/#{path}",
            port: "443",
            protocol: "HTTPS"
          }
        }
      ]
    };
  }

  public static getListenerProps(config: ListenerConfig): CfnListenerProps {
    const port = typeof config.port !== "undefined" ? config.port : 443;
    return {
      loadBalancerArn: config.albArn,
      port,
      protocol: Protocol.HTTPS,
      certificates: [
        {
          certificateArn: config.sslArn
        }
      ],
      defaultActions: [
        {
          type: "forward",
          targetGroupArn: config.targetRef
        }
      ]
    };
  }
}

interface ALBProps extends StackProps {
  securityGroup: CfnSecurityGroup;
  publicSubnets: CfnSubnet[];
  albName: string;
  vpcId: string;
}

export interface ListenerConfig {
  albArn: string;
  sslArn: string;
  targetRef: string;
  port?: number;
}
