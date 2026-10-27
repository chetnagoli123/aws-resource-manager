
import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Square,
  Play,
  Server,
  X,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Cloud,
} from "lucide-react";

// LIVE AWS API
// Change this back to localhost only if you intentionally use your local backend.
const API_URL =
  "https://76z84ommj0.execute-api.ap-south-1.amazonaws.com/dev/api/ec2/instances";

// Set to true to force demo mode when presenting the dashboard.
// Set to false to try the live AWS API first.
const USE_DEMO_DATA = false;

// DEMO DATA — KEEP THIS SECTION for use after AWS resources are deleted.
const DEMO_INSTANCES = [
  {
    id: "i-0a12bc34de56f7890",
    name: "cloudpilot-web-server",
    type: "t2.micro",
    region: "ap-south-1",
    status: "Running",
    availabilityZone: "ap-south-1a",
    privateIpAddress: "10.0.1.10",
    publicIpAddress: null,
    launchTime: "2026-09-15T08:30:00.000Z",
  },
  {
    id: "i-0b23cd45ef67a8901",
    name: "cloudpilot-api-server",
    type: "t2.micro",
    region: "ap-south-1",
    status: "Running",
    availabilityZone: "ap-south-1b",
    privateIpAddress: "10.0.2.15",
    publicIpAddress: null,
    launchTime: "2026-09-18T10:15:00.000Z",
  },
  {
    id: "i-0c34de56fa78b9012",
    name: "development-instance",
    type: "t3.micro",
    region: "ap-south-1",
    status: "Stopped",
    availabilityZone: "ap-south-1a",
    privateIpAddress: null,
    publicIpAddress: null,
    launchTime: "2026-09-20T12:00:00.000Z",
  },
  {
    id: "i-0d45ef67ab89c0123",
    name: "test-worker",
    type: "t2.small",
    region: "ap-south-1",
    status: "Stopped",
    availabilityZone: "ap-south-1b",
    privateIpAddress: null,
    publicIpAddress: null,
    launchTime: "2026-09-22T14:45:00.000Z",
  },
];

function normalizeStatus(status = "unknown") {
  const value = String(status).toLowerCase();

  if (value === "running") return "Running";
  if (value === "stopped") return "Stopped";
  if (value === "pending") return "Pending";
  if (value === "stopping") return "Stopping";
  if (value === "shutting-down") return "Shutting-down";
  if (value === "terminated") return "Terminated";

  return status;
}

function normalizeInstance(instance) {
  return {
    id: instance.instanceId ?? instance.id ?? "",
    name: instance.name ?? "(unnamed instance)",
    type: instance.instanceType ?? instance.type ?? "unknown",
    region:
      instance.region ??
      instance.availabilityZone?.replace(/[a-z]$/, "") ??
      "ap-south-1",
    status: normalizeStatus(instance.state ?? instance.status),
    availabilityZone: instance.availabilityZone ?? "",
    privateIpAddress: instance.privateIpAddress ?? null,
    publicIpAddress: instance.publicIpAddress ?? null,
    launchTime: instance.launchTime ?? null,
  };
}

export default function EC2Instances() {
  const [instances, setInstances] = useState(
    USE_DEMO_DATA ? DEMO_INSTANCES : []
  );
  const [connectionMode, setConnectionMode] = useState(
    USE_DEMO_DATA ? "demo" : "live"
  );
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [awsMessage, setAwsMessage] = useState(
    USE_DEMO_DATA
      ? "Showing sample data. Demo mode is enabled."
      : "Connecting to AWS..."
  );
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
async function loadInstances() {
  setLoading(true);
  setError("");

  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`AWS API returned ${response.status}`);
    }

    const data = await response.json();

    if (data.connected !== true || !Array.isArray(data.instances)) {
      throw new Error(data.message || "Invalid AWS response");
    }

    const liveInstances = data.instances.map(normalizeInstance);

    // A successful response with zero instances is still live data.
    setInstances(liveInstances);
    setConnectionMode("live");
    setBackendAvailable(true);
    setAwsMessage("Connected to live AWS EC2 data.");
    setError("");
  } catch (err) {
    setBackendAvailable(false);
    setError(err.message || "Unable to refresh AWS data.");

    // Preserve live data after a successful connection.
    // Only use demo data if live data has never loaded.
    setConnectionMode((currentMode) => {
      if (currentMode !== "live") {
        setInstances(DEMO_INSTANCES);
        setAwsMessage("AWS connection unavailable. Showing sample data.");
        return "demo";
      }

      setAwsMessage("AWS refresh failed. Showing the last loaded live data.");
      return "live";
    });
  } finally {
    setLoading(false);
  }
}

  useEffect(() => {
    loadInstances();
  }, []);

  const filteredInstances = useMemo(() => {
    const query = search.trim().toLowerCase();

    return instances.filter((instance) => {
      const matchesSearch =
        !query ||
        instance.name.toLowerCase().includes(query) ||
        instance.id.toLowerCase().includes(query) ||
        instance.type.toLowerCase().includes(query) ||
        instance.region.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        instance.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [instances, search, statusFilter]);

  const runningCount = instances.filter(
    (instance) => instance.status === "Running"
  ).length;

  const stoppedCount = instances.filter(
    (instance) => instance.status === "Stopped"
  ).length;

  const modeLabel =
    connectionMode === "live" ? "Live AWS data" : "Demo data";

  function toggleStatus(instance) {
    if (connectionMode === "live") {
      setError(
        "Live start/stop operations are not implemented. No AWS action was performed."
      );
      return;
    }

    // Demo only: this changes local UI state, not an actual AWS instance.
    setInstances((current) =>
      current.map((item) =>
        item.id === instance.id
          ? {
              ...item,
              status:
                item.status === "Running" ? "Stopped" : "Running",
            }
          : item
      )
    );

    setSelected((current) =>
      current?.id === instance.id
        ? {
            ...current,
            status:
              current.status === "Running" ? "Stopped" : "Running",
          }
        : current
    );
  }

  return (
    <section className="ec2-page">
      <div className="ec2-page-heading">
        <div>
          <span className="eyebrow">COMPUTE MANAGEMENT</span>
          <h1>EC2 Instances</h1>
          <p className="muted-cell">
            View and monitor your compute instances.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={loadInstances}
          disabled={loading}
        >
          <RefreshCw size={16} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="ec2-connection-banner">
        {connectionMode === "live" ? (
          <CheckCircle2 size={19} />
        ) : (
          <AlertCircle size={19} />
        )}

        <div>
          <strong>
            {connectionMode === "live"
              ? "Live AWS connection"
              : "Demo mode"}
          </strong>
          <p>{awsMessage}</p>
          <small>
            Backend: {backendAvailable ? "Available" : "Unavailable"}
            {" · "}
            AWS reads are controlled by the backend configuration.
          </small>
        </div>
      </div>

      {error && (
        <div className="ec2-error" role="alert">
          <AlertCircle size={17} />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="ec2-stats">
        <div className="ec2-stat-card">
          <div className="ec2-stat-icon">
            <Server size={20} />
          </div>
          <span>Total instances</span>
          <strong>{instances.length}</strong>
          <small>{modeLabel}</small>
        </div>

        <div className="ec2-stat-card">
          <div className="ec2-stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <span>Running</span>
          <strong>{runningCount}</strong>
          <small>Instances reporting running status</small>
        </div>

        <div className="ec2-stat-card">
          <div className="ec2-stat-icon">
            <Square size={20} />
          </div>
          <span>Stopped</span>
          <strong>{stoppedCount}</strong>
          <small>Instances reporting stopped status</small>
        </div>

        <div className="ec2-stat-card">
          <div className="ec2-stat-icon">
            <Cloud size={20} />
          </div>
          <span>Region</span>
          <strong>ap-south-1</strong>
          <small>Mumbai</small>
        </div>
      </div>

      <div className="ec2-table-card">
        <div className="ec2-table-heading">
          <div>
            <h2>All instances</h2>
            <p className="muted-cell">
              Search, filter, and inspect instance details.
            </p>
          </div>
          <span className="ec2-mode-label">{modeLabel}</span>
        </div>

        <div className="ec2-toolbar">
          <label className="ec2-search">
            <Search size={17} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, ID, type or region..."
              aria-label="Search instances"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter instances by status"
          >
            <option value="All">All statuses</option>
            <option value="Running">Running</option>
            <option value="Stopped">Stopped</option>
            <option value="Pending">Pending</option>
            <option value="Stopping">Stopping</option>
            <option value="Terminated">Terminated</option>
          </select>
        </div>

        <div className="ec2-table-scroll">
          <table className="ec2-table">
            <thead>
              <tr>
                <th>INSTANCE</th>
                <th>INSTANCE ID</th>
                <th>TYPE</th>
                <th>REGION</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {filteredInstances.map((instance) => (
                <tr key={instance.id}>
                  <td>
                    <strong>{instance.name}</strong>
                  </td>
                  <td className="muted-cell">{instance.id}</td>
                  <td>{instance.type}</td>
                  <td>{instance.region}</td>
                  <td>
                    <span
                      className={`status ${instance.status.toLowerCase()}`}
                    >
                      <span className="status-dot" />
                      {instance.status}
                    </span>
                  </td>
                  <td>
                    <div className="ec2-actions">
                      <button
                        type="button"
                        className="table-action"
                        onClick={() => setSelected(instance)}
                        title="View details"
                        aria-label={`View ${instance.name}`}
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        type="button"
                        className="table-action"
                        onClick={() => toggleStatus(instance)}
                        title={
                          connectionMode === "live"
                            ? "Live start/stop controls are not implemented"
                            : instance.status === "Running"
                              ? "Mark stopped in demo"
                              : "Mark running in demo"
                        }
                        aria-label={`Change status for ${instance.name}`}
                      >
                        {instance.status === "Running" ? (
                          <Square size={15} />
                        ) : (
                          <Play size={15} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredInstances.length === 0 && (
                <tr>
                  <td colSpan={6} className="ec2-empty">
                    <Server size={24} />
                    <strong>No matching instances</strong>
                    <span>
                      Try changing your search or status filter.
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          Showing {filteredInstances.length} of {instances.length}{" "}
          {connectionMode === "live"
            ? "live instances"
            : "sample instances"}
          <span>{modeLabel}</span>
        </div>
      </div>

      {selected && (
        <div
          className="ec2-modal-backdrop"
          onClick={() => setSelected(null)}
        >
          <section
            className="ec2-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ec2-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ec2-modal-heading">
              <div>
                <span className="eyebrow">INSTANCE DETAILS</span>
                <h2 id="ec2-modal-title">{selected.name}</h2>
              </div>

              <button
                type="button"
                className="table-action"
                onClick={() => setSelected(null)}
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            <dl className="ec2-details">
              <dt>Instance ID</dt>
              <dd>{selected.id}</dd>

              <dt>Instance type</dt>
              <dd>{selected.type}</dd>

              <dt>Region</dt>
              <dd>{selected.region}</dd>

              <dt>Status</dt>
              <dd>{selected.status}</dd>

              {selected.availabilityZone && (
                <>
                  <dt>Availability zone</dt>
                  <dd>{selected.availabilityZone}</dd>
                </>
              )}

              {selected.privateIpAddress && (
                <>
                  <dt>Private IP</dt>
                  <dd>{selected.privateIpAddress}</dd>
                </>
              )}

              {selected.publicIpAddress && (
                <>
                  <dt>Public IP</dt>
                  <dd>{selected.publicIpAddress}</dd>
                </>
              )}

              {selected.launchTime && (
                <>
                  <dt>Launch time</dt>
                  <dd>
                    {new Date(selected.launchTime).toLocaleString()}
                  </dd>
                </>
              )}
            </dl>

            {connectionMode === "demo" && (
              <p className="ec2-demo-warning">
                These are sample details, not live AWS resources.
              </p>
            )}

            <button
              type="button"
              className="primary-button"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </section>
        </div>
      )}
    </section>
  );
}
