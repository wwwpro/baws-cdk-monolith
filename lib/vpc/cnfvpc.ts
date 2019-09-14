import { Construct, Stack, StackProps, Duration, CfnTag, Lazy, IStringProducer } from "@aws-cdk/core";
import netparser = require("netparser");
import {
  CfnVPC,
  CfnInternetGateway,
  CfnSubnet,
  CfnVPCGatewayAttachment,
} from "@aws-cdk/aws-ec2";
import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import { CustomResource, CustomResourceProvider } from '@aws-cdk/aws-cloudformation';
import { InlineCode, SingletonFunction, Runtime, Function, Code } from "@aws-cdk/aws-lambda";

import * as fs from "fs";
import * as path from "path";


export class BawsVPC extends Stack {
  //Options
  numzones: number = 3;
  baseAddress: string = "10.0.0.0";
  baseCidrSize: string = "24";

  vpc: CfnVPC;
  vpcId:string;
  subnets:string[]  = [];
  publicSubnets: CfnSubnet[] = [];

  gateway: CfnInternetGateway;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    // Get VPC will create one of it doesn't exist.
    this.vpc = this.createVPC();
  }

  private createVPC = (): CfnVPC => {
    // Create our VPC.
    this.vpc = new CfnVPC(this, "baws-vpc", {
      // Always the largest number of addresses.
      cidrBlock: this.baseAddress + "/16",
      enableDnsHostnames: true,
      enableDnsSupport: true,
      instanceTenancy: "default",
      tags: [
        {
          key: "bawsVpc",
          value: "cfn"
        },
        {
          key: "Name",
          value: "bawsVpc"
        }
      ]
    });

    this.vpcId = this.vpc.ref;

    this.createSubnets();
    this.createIGateway();
    // this.createOpenRouteTable();

    return this.vpc;
  };

  private createSubnets = (): void => {
    // Get the zones from our context.
    const zones: string[] = this.availabilityZones;

    // We don't want the number of available zones to be smaller thant the number of
    // zone we're trying to set.
    this.numzones = zones.length > this.numzones ? this.numzones : zones.length;

    const startAddress: string | null = netparser.nextNetwork(
      this.baseAddress + "/" + this.baseCidrSize
    );

    // Create the zones in our VPC.
    if (startAddress != null) {
      let nextAddress = startAddress;

      // Create our subnets, one in each zone.
      for (let i = 0; i <= this.numzones; i++) {
        const subnet = new CfnSubnet(this, "baws-subnet" + i, {
          cidrBlock: nextAddress,
          mapPublicIpOnLaunch: true,
          vpcId: this.vpc.ref,
          availabilityZone: zones[i],
          tags: [{ key: "Name", value: "BAWS app " + i }]
        });

        // Wait for it.
        subnet.addDependsOn(this.vpc);

        this.publicSubnets.push(subnet);

        // Check for null value and break if we don't have a next address.
        const tempAddress = netparser.nextNetwork(nextAddress);
        if (tempAddress != null) {
          nextAddress = tempAddress;
        } else {
          break;
        }
      }
    }
  };

  private createIGateway = (): void => {
    this.gateway = new CfnInternetGateway(this, "baws-igateway", {
      tags: [
        {
          key: "Name",
          value: "Baws Internet Gateway"
        }
      ]
    });
    // Wait for it.
    this.gateway.addDependsOn(this.vpc);

    const attach = new CfnVPCGatewayAttachment(this, "baws-igateway-attach", {
      vpcId: this.vpc.ref,
      internetGatewayId: this.gateway.ref
    });

    // Wait for it.
    attach.addDependsOn(this.vpc);
    attach.addDependsOn(this.gateway);
  };
  
  
  private createOpenRouteTable = () :void  => {

    /*
    const routeFunction = new Function(this, 'baws-route-function', {
      functionName: 'baws-main-route-table-modifier',
      description: 'Created by baws CDK to allow internet traffic into the main route table.',
      runtime: Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: Code.fromAsset(path.join(__dirname, './routeTableFunction'))
  });
  */

  const filename = path.join(__dirname, './routeTableFunction/index.js');
  const routeFunction = new SingletonFunction(this, 'baws-singleton-function', {
    uuid: '5ec278dc-d41a-11e9-bb65-2a2ae2dbcce4',
    code: new InlineCode(fs.readFileSync(filename, {encoding: 'utf-8'})),
    handler: 'index.main',
    timeout: Duration.seconds(300),
    runtime: Runtime.NODEJS_10_X,
})

  const routeFunctionPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: ['*'],
      actions: [
          "ec2:CreateRoute",
          "ec2:DescribeAccountAttributes",
          "ec2:DescribeInternetGateways",
          "ec2:DescribeRouteTables",
          "ec2:DescribeSubnets",
          "ec2:DescribeTags",
          "ec2:DescribeVpcs",
      ]
  });

  routeFunction.addToRolePolicy(routeFunctionPolicy);

  const resource = new CustomResource(this, 'baws-route-resource', {
      provider: CustomResourceProvider.lambda(routeFunction),
      properties: {
          vpcid: this.vpcId
      }
  });

  const response = resource.getAtt('Response').toString();
  }  
}


// So we can easily pass the VPC created here to other processes.
export interface BawsVPCProps extends StackProps {
  vpcId: string;
  publicSubnets?: CfnSubnet[];
}
