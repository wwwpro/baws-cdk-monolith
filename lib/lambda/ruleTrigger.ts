import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { Function } from '@aws-cdk/aws-lambda'

export class BawsEventTrigger extends Stack {
    constructor(scope: Construct, id:string, props: EventTriggerProps) {
        super(scope, id, props);


        const lambda = Function.fromFunctionArn(this, 'baws-event-trigger-function', props.lambdaFunctionArn);

        lambda.addEventSourceMapping('baws-commit', {
            eventSourceArn: props.ruleArn
        });
    }
}

interface EventTriggerProps extends StackProps{
    lambdaFunctionArn: string;
    ruleArn: string;
}