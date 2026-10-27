import {
  EC2Client,
  DescribeInstancesCommand,
} from "@aws-sdk/client-ec2";

const region = process.env.AWS_REGION || "ap-south-1";

function response(statusCode, body) {
return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

export const handler = async (event = {}) => {
// Handle API Gateway CORS preflight without contacting AWS.
  if (event.httpMethod === "OPTIONS") {
return response(200, { ok: true });
  }

// Fail closed unless explicitly enabled in the Lambda environment.
  if (process.env.ENABLE_AWS_READS !== "true") {
return response(503, {
      connected: false,
      message: "AWS reads are disabled. No AWS API request was made.",
      region,
      instances: [],
    });
  }

let client;

  try {
    client = new EC2Client({ region });

const result = await client.send(
      new DescribeInstancesCommand({})
    );

const instances = (result.Reservations ?? []).flatMap(
      (reservation) =>
        (reservation.Instances ?? []).map((instance) => {
const nameTag = (instance.Tags ?? []).find(
            (tag) => tag.Key === "Name"
          );

return {
            instanceId: instance.InstanceId ?? "",
            name: nameTag?.Value ?? "(unnamed instance)",
            state: instance.State?.Name ?? "unknown",
            instanceType: instance.InstanceType ?? "unknown",
            availabilityZone:
              instance.Placement?.AvailabilityZone ?? "",
            launchTime: instance.LaunchTime?.toISOString() ?? null,
            privateIpAddress: instance.PrivateIpAddress ?? null,
            publicIpAddress: instance.PublicIpAddress ?? null,
          };
        })
    );

return response(200, {
      connected: true,
      region,
      count: instances.length,
      instances,
    });
  } catch (error) {
const statusCode = [
      "UnauthorizedOperation",
      "AccessDenied",
      "AccessDeniedException",
    ].includes(error?.name)
      ? 403
      : 502;

return response(statusCode, {
      connected: false,
      message:
        statusCode === 403
          ? "AWS denied this read request. Check IAM permissions."
          : "Unable to retrieve EC2 data.",
      errorCode: error?.name ?? "UnknownError",
      region,
      instances: [],
    });
  } finally {
    client?.destroy();
  }
};