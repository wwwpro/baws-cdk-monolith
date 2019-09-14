import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { CfnLogGroup } from '@aws-cdk/aws-logs';

export class BawsLogs extends Stack {
    
    constructor (scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

    }
}