import { Construct, Stack, StackProps } from "@aws-cdk/core";
import {
  CfnDistribution,
  CfnCloudFrontOriginAccessIdentity,
  CfnDistributionProps
} from "@aws-cdk/aws-cloudfront";
import { CfnBucket } from "@aws-cdk/aws-s3";
import { ApplicationLoadBalancer } from "@aws-cdk/aws-elasticloadbalancingv2";
import { YamlConfig } from "../baws/yaml-dir";
import * as path from "path";

export class CDN {

  public static getDistributionConfig(
    config: any,
    originAccessIdentity: CfnCloudFrontOriginAccessIdentity,
    props: OriginProps
  ): CfnDistributionProps {

    const origins: CfnDistribution.OriginProperty[] = [
      {
        domainName: props.albDomain,
        id: props.targetOriginId,
        customOriginConfig: {
          originProtocolPolicy: "match-viewer",
          httpPort: 80,
          httpsPort: 443
        }
      },
      {
        domainName: props.bucketDNS,
        id: "baws-s3-asset-bucket",
        s3OriginConfig: {
          originAccessIdentity: `origin-access-identity/cloudfront/${originAccessIdentity.ref}`
        }
      }
    ];

    const viewerProtocolPolicy =
      typeof config.certificateArn !== "undefined"
        ? "redirect-to-https"
        : "allow-all";

    let allowedMethods = ["GET", "HEAD"];
    if (config.enablePostRequests === true) {
      allowedMethods = [
        ...allowedMethods,
        "OPTIONS",
        "PUT",
        "POST",
        "PATCH",
        "DELETE"
      ];
    }

    let distributionConfig: CfnDistribution.DistributionConfigProperty = {
      comment: "Created by Baws CDK",
      enabled: true,
      aliases: config.cnames,
      httpVersion: "http2",
      origins,
      priceClass: config.priceClass,
      defaultCacheBehavior: {
        targetOriginId: props.targetOriginId,
        allowedMethods,
        viewerProtocolPolicy,
        minTtl: 600,
        maxTtl: 31536000,
        defaultTtl: 86400,
        compress: true,
        forwardedValues: {
          cookies: {
            forward: "all"
          },
          headers: ["Accept", "Host", "Origin", "Referer"],
          queryString: true
        }
      }
    };

    // We can't modify the distribution property, but we need to alter it according to the
    // config.
    
    const addSSLArn = (
      originalProperty: CfnDistribution.DistributionConfigProperty,
      configItem: any
    ): CfnDistribution.DistributionConfigProperty => {
      const certArn = configItem.certificateArn;

      const viewerCertificate: CfnDistribution.ViewerCertificateProperty = {
        acmCertificateArn: certArn,
        sslSupportMethod: "sni-only"
      };

      const newProperty: CfnDistribution.DistributionConfigProperty = {
        ...originalProperty,
        viewerCertificate
      };
      return newProperty;
    };
    

    if (typeof config.certificateArn !== "undefined") {
      distributionConfig = addSSLArn(distributionConfig, config);
    }
    

    const distConfig: CfnDistributionProps = {
      distributionConfig
    };


    return distConfig;
  }

  private addSSLArn = (
    originalProperty: CfnDistribution.DistributionConfigProperty,
    configItem: any
  ): CfnDistribution.DistributionConfigProperty => {
    const certArn = configItem.certificateArn;

    const viewerCertificate: CfnDistribution.ViewerCertificateProperty = {
      acmCertificateArn: certArn,
      sslSupportMethod: "sni-only"
    };

    const newProperty: CfnDistribution.DistributionConfigProperty = {
      ...originalProperty,
      viewerCertificate
    };

    return newProperty;
  };
}

interface CDNProps extends StackProps {
  config: any[];
  albDns: string;
  assetBucket: CfnBucket;
}

interface DistributionProps {
  origins: CfnDistribution.OriginProperty[];
  targetOriginId: string;
}

interface OriginProps {
  albDomain: string;
  targetOriginId: string;
  bucketDNS: string;
}
