import * as fs from 'fs';
import * as path from 'path';
import { getInput, setOutput, info } from '@actions/core';

interface LocalBackendConfiguration {
    backendType : 'local';
    path : string;
}

type BackendConfiguration = LocalBackendConfiguration;

function getOutputFromLocal(stateFilePath: string): Record<string, any>{
    const result: Record<string, any> = {};
    const contents = fs.readFileSync(path.resolve(stateFilePath));
    const outputs = JSON.parse(contents.toString()).outputs;
    const includeSensitive = getInput('include-sensitive') === 'true';
    for (var key in outputs) {
        if (outputs.hasOwnProperty(key)) {
            if (outputs[key].sensitive && !includeSensitive) {
                info(`Skipping sensitive output: ${key}`);
                continue;
            }
            result[key] = outputs[key].value;
        }
    }
    return result;
}



function main() {
    const backendConfiguration: BackendConfiguration = JSON.parse(getInput('backend-configuration'));
    let stateFilePath: string;
    switch (backendConfiguration.backendType) {
        case 'local':
            stateFilePath = (backendConfiguration as LocalBackendConfiguration).path;
            break;
        default:
            throw new Error('Unsupported backend type: ' + backendConfiguration.backendType);
    }
    const result = getOutputFromLocal(stateFilePath);
    setOutput('outputs', result);
}

main();
