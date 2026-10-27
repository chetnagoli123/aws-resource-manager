# CloudPilot local EC2 backend

This local backend creates no AWS resources. Real AWS reads are disabled by default.

## Setup
1. Extract this folder.
2. In Terminal, `cd` into `cloudpilot-local-ec2-backend`.
3. Run `npm install`.
4. Copy `.env.example` to `.env`.
5. Run `npm run dev`.
6. Open `http://localhost:3001/api/health`.

The EC2 endpoint is `http://localhost:3001/api/ec2/instances`. With `ENABLE_AWS_READS=false`,
it deliberately makes no AWS API calls.

## Later, only if you explicitly decide to connect
Configure local AWS credentials with a supported credential provider and restrict permissions
to `ec2:DescribeInstances`. Then change `ENABLE_AWS_READS=false` to `true` in `.env` and
restart the backend. That change enables a real AWS API request. Do not put AWS credentials
in React or commit `.env`. Do not deploy this backend to AWS as part of local setup.

Keep existing frontend mock data until you intentionally integrate and review the response.
