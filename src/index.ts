import * as fs from 'fs';
import * as path from 'path';
import { getInput, setOutput, info } from '@actions/core';
import * as tmp from 'tmp';
import * as S3 from 'aws-sdk/clients/s3';

interface LocalBackendConfiguration {
    backendType : 'local';
    path : string;
}

interface S3BackendConfiguration {
    backendType : 's3';
    bucket: string;
    key: string;
    region: string;
}

type BackendConfiguration = LocalBackendConfiguration | S3BackendConfiguration;

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



async function main() {
    const backendConfiguration: BackendConfiguration = JSON.parse(getInput('backend-configuration'));
    let stateFilePath: string = tmp.fileSync().name;
    switch (backendConfiguration.backendType) {
        case 'local':
            stateFilePath = (backendConfiguration as LocalBackendConfiguration).path;
            break;
        case 's3':
            const config = (backendConfiguration as S3BackendConfiguration);
            const s3 = new S3({
                region: config.region,
            });
            let err, file = await s3.getObject({
                Bucket: config.bucket,
                Key: config.key
            }).promise();
            if (!err) {
                if (file.Body) {
                    fs.writeFileSync(stateFilePath, file.Body.toString());
                }
            } else {
                throw new Error('Failed to download state file from S3: ' + err);
            }
        default:
            throw new Error('Unsupported backend type: ' + backendConfiguration.backendType);
    }

    const result = getOutputFromLocal(stateFilePath);
    setOutput('outputs', result);
}

main();
