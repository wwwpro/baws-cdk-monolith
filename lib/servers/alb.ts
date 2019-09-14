import { Construct, Stack, StackProps } from "@aws-cdk/core";
import {
  CfnLoadBalancer,
  CfnListener,
  CfnTargetGroup,
  Protocol
} from "@aws-cdk/aws-elasticloadbalancingv2";
import { CfnSubnet, CfnSecurityGroup } from "@aws-cdk/aws-ec2";

export class BawsALB extends Stack {

  alb: CfnLoadBalancer;
  albName: string;
  albId: string;
  target: CfnTargetGroup;
  listener: CfnListener;
  dnsName: string;

  constructor(scope: Construct, id: string, props: ALBProps) {
    super(scope, id, props);

    this.albName = props.albName;    

    const group: string | null =
      props.securityGroup !== null ? props.securityGroup.ref : null;

    const sslArn = this.node.tryGetContext('SSLCertArn');

    if (group !== null && typeof props.publicSubnets !== "undefined") {
  
      this.alb = new CfnLoadBalancer(this, "baws-alb", {
        subnets: props.publicSubnets.map(x => x.ref),
        ipAddressType: "ipv4",
        name: "baws-alb",
        scheme: "internet-facing",
        type: "application",
        securityGroups: [group]
      });

      
      const target = new CfnTargetGroup(this, "baws-base-target", {
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
        vpcId: props.vpcId
      });

      // Create our port 80 listener.
      // This listener forwards all requests to 443 to make sure they're secure.
      const listener80 = new CfnListener(this, "baws-port-80", {
        loadBalancerArn: this.alb.ref,
        port: 80,
        protocol: Protocol.HTTP,
        defaultActions: [
          {
            type: "redirect",
            redirectConfig:{
              statusCode: 'HTTP_301',
              host: '#{host}',
              path: '/#{path}',
              port: '443',
              protocol: 'HTTPS',
            }
          }
        ]
      });
      listener80.addDependsOn(this.alb);
      listener80.addDependsOn(target);


      const listener443 = new CfnListener(this, 'baws-port-443', {
        loadBalancerArn: this.alb.ref,
        port: 443,
        protocol: Protocol.HTTPS,
        certificates:[{
          certificateArn: sslArn
        }],
        defaultActions: [
          {
            type: "forward",
            targetGroupArn: target.ref
          }
        ]
      });
      listener443.addDependsOn(this.alb);
      listener443.addDependsOn(target);

      this.listener = listener443;

      this.dnsName = this.alb.attrDnsName;

    } else {
      this.node.addError(`We're missing a variable. ALB not created.`);
    }
  }
}

interface ALBProps extends StackProps {
  securityGroup: CfnSecurityGroup;
  publicSubnets: CfnSubnet[];
  albName: string;
  vpcId: string;
}
