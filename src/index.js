const core = require('@actions/core');
const pulumi = require('@pulumi/pulumi');
const tf = require('@pulumi/terraform');
const Ajv = require('ajv');

const ajv = new Ajv();

// Define the schema for the backend configuration
const backendConfigSchema = {
  type: "object",
  properties: {
    type: { type: "string" },
    bucket: { type: "string" },
    key: { type: "string" },
    region: { type: "string" },
  },
  required: ["type"],
  additionalProperties: true,
};

async function run() {
  try {
    const outputName = core.getInput('output-name');
    const backendConfigJson = core.getInput('backend-configuration');

    let backendConfig;
    try {
      backendConfig = JSON.parse(backendConfigJson);
    } catch (jsonError) {
      throw new Error(`Invalid JSON format for backend configuration: ${jsonError.message}`);
    }

    const validate = ajv.compile(backendConfigSchema);
    const valid = validate(backendConfig);
    if (!valid) {
      throw new Error(`Backend configuration is invalid: ${ajv.errorsText(validate.errors)}`);
    }

    let backendType = backendConfig.type;
    delete backendConfig.type;

    const state = new tf.state.RemoteStateReference('state', {
      backendType: backendType,
      ...backendConfig
    });

    const outputValue = state.getOutput(outputName);

    core.setOutput('value', outputValue);
  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

run();
