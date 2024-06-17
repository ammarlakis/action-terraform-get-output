import * as fs from "fs";
import * as path from "path";
import { getInput, setOutput, info } from "@actions/core";
import * as tmp from "tmp";
import * as S3 from "aws-sdk/clients/s3";
import * as k8s from "@kubernetes/client-node";

interface LocalBackendConfiguration {
  backendType: "local";
  path: string;
}

interface S3BackendConfiguration {
  backendType: "s3";
  bucket: string;
  key: string;
  region: string;
}

interface KubernetesBackendConfiguration {
  backendType: "kubernetes";
  secretSuffix: string;
  configPath: string;
}

interface BaseBackendConfiguration {
  backendType: string;
}

type BackendConfiguration =
  | BaseBackendConfiguration
  | LocalBackendConfiguration
  | S3BackendConfiguration
  | KubernetesBackendConfiguration;

function getOutputFromLocal(stateFilePath: string): Record<string, any> {
  const result: Record<string, any> = {};
  const contents = fs.readFileSync(path.resolve(stateFilePath));
  const outputs = JSON.parse(contents.toString()).outputs;
  const includeSensitive = getInput("include-sensitive") === "true";
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
  const terraformWorkspace = "default";
  const backendConfiguration: BackendConfiguration = JSON.parse(
    getInput("backend-configuration")
  );
  let stateFilePath: string = tmp.fileSync().name;
  switch (backendConfiguration.backendType) {
    case "local":
      stateFilePath = (backendConfiguration as LocalBackendConfiguration).path;
      break;
    case "s3":
      const config = backendConfiguration as S3BackendConfiguration;
      const s3 = new S3({
        region: config.region,
      });
      let err,
        file = await s3
          .getObject({
            Bucket: config.bucket,
            Key: config.key,
          })
          .promise();
      if (!err) {
        if (file.Body) {
          fs.writeFileSync(stateFilePath, file.Body.toString());
        }
      } else {
        throw new Error("Failed to download state file from S3: " + err);
      }
    case "kubernetes":
      const k8sConfig = backendConfiguration as KubernetesBackendConfiguration;
      const secretName =
        "tfstate-" + terraformWorkspace + "-" + k8sConfig.secretSuffix;
      const configPath = k8sConfig.configPath;
      const kubeConfig = new k8s.KubeConfig();
      kubeConfig.loadFromFile(configPath);
      const core = kubeConfig.makeApiClient(k8s.CoreV1Api);
      const secret = await core.readNamespacedSecret(secretName, "default");
      const data = secret.body.data;
      if (data == null) {
        throw new Error("Failed to read secret from Kubernetes: " + secret);
      }
      const state = data["state"];
      fs.writeFileSync(stateFilePath, Buffer.from(state, "base64").toString());
      break;
    default:
      throw new Error(
        "Unsupported backend type: " + backendConfiguration.backendType
      );
  }

  const result = getOutputFromLocal(stateFilePath);
  setOutput("outputs", result);
}

main();
