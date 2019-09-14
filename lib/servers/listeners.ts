import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { CfnListener } from '@aws-cdk/aws-elasticloadbalancingv2';

export class BawsListeners extends Stack {
    
    listener:CfnListener

    constructor (scope: Construct, id: string, props?: StackProps ) {
        super(scope, id, props);
        
        const arn = `arn:`;

        /*
        this.listener = new CfnListener(this, `baws-listen-${}`, {

        }); */
    }
}

interface ListenerProps extends StackProps {

}