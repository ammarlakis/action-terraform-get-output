"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var core_1 = require("@actions/core");
function getOutputFromLocal(stateFilePath) {
    var result = {};
    var contents = fs.readFileSync(path.resolve(stateFilePath));
    var outputs = JSON.parse(contents.toString()).outputs;
    var includeSensitive = (0, core_1.getInput)('include-sensitive') === 'true';
    for (var key in outputs) {
        if (outputs.hasOwnProperty(key)) {
            if (outputs[key].sensitive && !includeSensitive) {
                (0, core_1.info)("Skipping sensitive output: ".concat(key));
                continue;
            }
            result[key] = outputs[key].value;
        }
    }
    return result;
}
function main() {
    var backendConfiguration = JSON.parse((0, core_1.getInput)('backend-configuration'));
    var stateFilePath;
    switch (backendConfiguration.backendType) {
        case 'local':
            stateFilePath = backendConfiguration.path;
            break;
        default:
            throw new Error('Unsupported backend type: ' + backendConfiguration.backendType);
    }
    var result = getOutputFromLocal(stateFilePath);
    (0, core_1.setOutput)('outputs', result);
}
main();
