import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { CfnBucket } from "@aws-cdk/aws-s3";
import uuid from 'uuidv4';

export class BawsS3 extends Stack {

  assets: CfnBucket;
  artifacts: CfnBucket;
  logs: CfnBucket;

  constructor(scope: Construct, id: string, props: S3Props) {
    super(scope, id, props);

    for (let i = 0; i < props.config.length; i++) {
      const configItem = props.config[i];
      const bucketUUID = uuid();
      let bucketName = (configItem.addUniquId === true)?`configItem.name-${bucketUUID.toLowerCase()}`: configItem.name.toLowerCase() ;

      const bucket = new CfnBucket(this, `baws-bucket-${configItem.name}`, {
        bucketName
      });

      if (configItem.type == "assets" && this.assets !== null) {
        this.assets = bucket;
      }
      if (configItem.type == "artifacts" && this.artifacts !== null) {
        this.artifacts = bucket;
      }
      if (configItem.type == "logs" && this.logs !== null) {
        this.logs = bucket;
      }
    }

    if (this.assets === null || this.artifacts === null || this.logs === null) {
      this.node.addError(
        "One of each bucket type must be created: assets, artifacts and logs."
      );
    }
  }
}

interface S3Props extends StackProps {
  config: any[];
}
