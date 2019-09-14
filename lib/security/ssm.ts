import { Construct, Stack, StackProps } from "@aws-cdk/core";

export class BawsParams extends Stack {

    params: Param[];

    constructor (scope:Construct, id:string, props: ParamProps) {
        super(scope, id, props);

        for (let i = 0; i < props.params.length; i++) {
            const param = props.params[i];
            if (typeof param.secret !== 'undefined' && param.secret) {
                // Create secret here
            }else {
                // Create regular store item.
            }
        }
        
    }

}

interface ParamProps extends StackProps {
    params: Param[];
}

interface Param {
    key: string;
    value: string;
    secret?: boolean;
}