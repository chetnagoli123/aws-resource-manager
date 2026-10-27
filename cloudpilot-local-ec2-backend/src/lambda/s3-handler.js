
import {
  S3Client,
  ListBucketsCommand,
} from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION || "ap-south-1";

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "http://localhost:5173",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

export const handler = async (event = {}) => {
  const method =
    event.httpMethod || event.requestContext?.http?.method;

  if (method === "OPTIONS") {
    return response(200, { ok: true });
  }

  // Fail closed: no AWS request unless explicitly enabled.
  if (process.env.ENABLE_AWS_READS !== "true") {
    return response(503, {
      connected: false,
      message: "AWS reads are disabled. No AWS API request was made.",
      region,
      buckets: [],
    });
  }

  let client;

  try {
    client = new S3Client({ region });

    const result = await client.send(new ListBucketsCommand({}));

    const buckets = (result.Buckets ?? []).map((bucket) => ({
      name: bucket.Name ?? "",
      creationDate: bucket.CreationDate?.toISOString() ?? null,
    }));

    return response(200, {
      connected: true,
      region,
      count: buckets.length,
      buckets,
    });
  } catch (error) {
    const statusCode = [
      "AccessDenied",
      "AccessDeniedException",
    ].includes(error?.name)
      ? 403
      : 502;

    return response(statusCode, {
      connected: false,
      message:
        statusCode === 403
          ? "AWS denied this request. Check IAM permissions."
          : "Unable to retrieve S3 bucket data.",
      errorCode: error?.name ?? "UnknownError",
      region,
      buckets: [],
    });
  } finally {
    client?.destroy();
  }
};
