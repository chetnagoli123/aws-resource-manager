import "dotenv/config";
import express from "express";
import cors from "cors";
import { EC2Client, DescribeInstancesCommand } from "@aws-sdk/client-ec2";

const app = express();
const port = Number(process.env.PORT || 3001);
const region = process.env.AWS_REGION || "ap-south-1";
const awsReadsEnabled = process.env.ENABLE_AWS_READS === "true";

app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  methods: ["GET"],
}));
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    service: "CloudPilot Local Backend",
    status: "running",
    health: "/api/health",
    ec2Instances: "/api/ec2/instances",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "CloudPilot local backend", awsRegion: region, awsReadsEnabled });
});

app.get("/api/ec2/instances", async (_req, res) => {
  if (!awsReadsEnabled) {
    return res.status(503).json({
      connected: false,
      message: "AWS reads are disabled. No AWS API request was made. Review requirements before explicitly enabling real reads.",
      region,
      instances: [],
    });
  }

  const client = new EC2Client({ region });
  try {
    const response = await client.send(new DescribeInstancesCommand({}));
    const instances = (response.Reservations ?? []).flatMap((reservation) =>
      (reservation.Instances ?? []).map((instance) => {
        const nameTag = (instance.Tags ?? []).find((tag) => tag.Key === "Name");
        return {
          instanceId: instance.InstanceId ?? "",
          name: nameTag?.Value ?? "(unnamed instance)",
          state: instance.State?.Name ?? "unknown",
          instanceType: instance.InstanceType ?? "unknown",
          availabilityZone: instance.Placement?.AvailabilityZone ?? "",
          launchTime: instance.LaunchTime?.toISOString() ?? null,
          privateIpAddress: instance.PrivateIpAddress ?? null,
          publicIpAddress: instance.PublicIpAddress ?? null
        };
      })
    );
    res.json({ connected: true, region, count: instances.length, instances });
  } catch (error) {
    const status = ["UnauthorizedOperation", "AccessDenied", "AccessDeniedException"].includes(error?.name) ? 403 : 502;
    res.status(status).json({
      connected: false,
      message: status === 403
        ? "AWS denied this read request. Check the IAM permission ec2:DescribeInstances."
        : "Unable to retrieve EC2 data. Check local AWS CLI credentials, region, and network access.",
      errorCode: error?.name ?? "UnknownError",
      region,
      instances: []
    });
  } finally {
    client.destroy();
  }
});


app.get("/api/s3/buckets", (_req, res) => {
  if (!awsReadsEnabled) {
    return res.status(503).json({
      connected: false,
      message: "AWS reads are disabled. No AWS API request was made.",
      region,
      buckets: [],
    });
  }

  // Do not make AWS calls until live S3 integration is implemented.
  return res.status(501).json({
    connected: false,
    message: "Live S3 integration is not implemented yet.",
    region,
    buckets: [],
  });
});

app.listen(port, () => {
  console.log(`CloudPilot local backend: http://localhost:${port}`);
  console.log(`Region: ${region}`);
  console.log(`AWS reads enabled: ${awsReadsEnabled}`);
});
