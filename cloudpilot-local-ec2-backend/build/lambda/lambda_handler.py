
import json
import os

import boto3
from botocore.exceptions import ClientError

REGION = os.environ.get("AWS_REGION", "ap-south-1")
AWS_READS_ENABLED = (
    os.environ.get("ENABLE_AWS_READS", "false").lower() == "true"
)


def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "http://localhost:5173",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,OPTIONS",
        },
        "body": json.dumps(body, default=str),
    }


def get_method(event):
    return (
        event.get("httpMethod")
        or event.get("requestContext", {}).get("http", {}).get("method")
        or ""
    ).upper()


def get_path(event):
    return (
        event.get("rawPath")
        or event.get("path")
        or event.get("resource")
        or ""
    ).rstrip("/")


def handler(event, context):
    method = get_method(event)
    path = get_path(event)

    # API Gateway CORS preflight: no AWS request.
    if method == "OPTIONS":
        return response(200, {"ok": True})

    # Fail closed before creating any AWS client.
    if not AWS_READS_ENABLED:
        return response(503, {
            "connected": False,
            "message": "AWS reads are disabled. No AWS API request was made.",
            "region": REGION,
            "instances": [],
            "buckets": [],
        })

    try:
        # GET /api/s3/buckets
        if path.endswith("/s3/buckets"):
            s3 = boto3.client("s3", region_name=REGION)
            result = s3.list_buckets()

            buckets = [
                {
                    "name": bucket.get("Name", ""),
                    "creationDate": bucket.get("CreationDate"),
                }
                for bucket in result.get("Buckets", [])
            ]

            return response(200, {
                "connected": True,
                "region": REGION,
                "count": len(buckets),
                "buckets": buckets,
            })

        # GET /api/ec2/instances
        if path.endswith("/ec2/instances"):
            ec2 = boto3.client("ec2", region_name=REGION)
            paginator = ec2.get_paginator("describe_instances")

            instances = []

            for page in paginator.paginate():
                for reservation in page.get("Reservations", []):
                    for instance in reservation.get("Instances", []):
                        name = next(
                            (
                                tag["Value"]
                                for tag in instance.get("Tags", [])
                                if tag.get("Key") == "Name"
                            ),
                            "(unnamed instance)",
                        )

                        instances.append({
                            "instanceId": instance.get("InstanceId", ""),
                            "name": name,
                            "state": instance.get("State", {}).get(
                                "Name", "unknown"
                            ),
                            "instanceType": instance.get(
                                "InstanceType", "unknown"
                            ),
                            "availabilityZone": instance.get(
                                "Placement", {}
                            ).get("AvailabilityZone", ""),
                            "launchTime": instance.get("LaunchTime"),
                            "privateIpAddress": instance.get(
                                "PrivateIpAddress"
                            ),
                            "publicIpAddress": instance.get(
                                "PublicIpAddress"
                            ),
                        })

            return response(200, {
                "connected": True,
                "region": REGION,
                "count": len(instances),
                "instances": instances,
            })

        return response(404, {
            "error": "NotFound",
            "message": "Route not found.",
        })

    except ClientError as error:
        error_code = error.response.get("Error", {}).get(
            "Code", "UnknownError"
        )
        denied = error_code in {
            "UnauthorizedOperation",
            "AccessDenied",
            "AccessDeniedException",
        }

        return response(403 if denied else 502, {
            "connected": False,
            "message": (
                "AWS denied the request. Check IAM permissions."
                if denied
                else "Unable to retrieve AWS resource data."
            ),
            "errorCode": error_code,
            "region": REGION,
            "instances": [],
            "buckets": [],
        })

    except Exception:
        # Avoid returning internal exception details to the client.
        return response(500, {
            "connected": False,
            "message": "An unexpected server error occurred.",
            "region": REGION,
        })
