import {
  CfnVPCProps,
  CfnSubnet,
  CfnSubnetProps,
  CfnVPC
} from "@aws-cdk/aws-ec2";
import netparser = require("netparser");

export class VPC {

  constructor() {}

  public static getVpcProps (config:VPCConfig): CfnVPCProps {
    return {
      // Always the largest number of addresses.
      cidrBlock: config.baseAddress + "/16",
      enableDnsHostnames: true,
      enableDnsSupport: true,
      instanceTenancy: "default",
      tags: [
        {
          key: "Name",
          value: config.name
        }
      ]
    };
  };

  public static getSubnetProps (
    vpc: CfnVPC,
    azs: string[],
    config: VPCConfig
  ): CfnSubnetProps[] {

    const numzones =
      config.numPublicSubnets > azs.length ? azs.length : config.numPublicSubnets;
    let subnets: CfnSubnetProps[] = [];

    const startAddress: string | null = netparser.nextNetwork(
     config.baseAddress + "/" + config.baseCidrSize
    );

    // Create the zones in our VPC.
    if (startAddress != null) {
      let nextAddress = startAddress;

      // Create our subnets, one in each zone.
      for (let i = 0; i < numzones; i++) {
        subnets.push({
          cidrBlock: nextAddress,
          mapPublicIpOnLaunch: true,
          vpcId: vpc.ref,
          availabilityZone: azs[i],
          tags: [{ key: "Name", value: `${config.name}-subnet-${i}` }]
        });

        // Check for null value and break if we don't have a next address.
        const tempAddress = netparser.nextNetwork(nextAddress);
        if (tempAddress != null) {
          nextAddress = tempAddress;
        } else {
          break;
        }
      }
    }
    return subnets;
  };

}

interface VPCConfig {
    name: string;
    numPublicSubnets: number;
    baseAddress: string;
    baseCidrSize: string;
}