import { useEffect, useMemo, useState } from "react";

import {

  Cloud,

  LayoutDashboard,

  Server,

  Database,

  Activity,

  Settings,

  Search,

  Bell,

  Plus,

  ArrowUpRight,

  ArrowDownRight,

  CircleCheck,

  Clock,

  Sun,

  Moon,

  ShieldCheck,

  RefreshCw,

  Filter,

  Info,

} from "lucide-react";

import "./App.css";

import EC2Instances from "./components/EC2Instances";





const demoInstances = [

  { id: "i-0a12bc34", name: "frontend-server", type: "t2.micro", region: "ap-south-1", status: "Running" },

  { id: "i-0d56ef78", name: "backend-api", type: "t2.small", region: "ap-south-1", status: "Running" },

  { id: "i-0f90ab12", name: "test-instance", type: "t2.micro", region: "us-east-1", status: "Stopped" },

  { id: "i-0c34de56", name: "dev-server", type: "t2.micro", region: "ap-south-1", status: "Running" },

];



const demoBuckets = [

  { name: "project-assets-demo", region: "ap-south-1", objects: 128, size: "246 MB", access: "Private" },

  { name: "cloud-backups-demo", region: "us-east-1", objects: 42, size: "1.2 GB", access: "Private" },

  { name: "static-site-demo", region: "ap-south-1", objects: 76, size: "84 MB", access: "Private" },

  { name: "logs-archive-demo", region: "us-east-1", objects: 310, size: "2.4 GB", access: "Private" },

];



const initialActivity = [

  { id: 1, title: "Dashboard initialized", detail: "Local demo environment ready", time: "On page load", category: "System", icon: CircleCheck },

  { id: 2, title: "Sample instances loaded", detail: "4 example EC2 records displayed", time: "On page load", category: "EC2", icon: Server },

  { id: 3, title: "Sample buckets loaded", detail: "4 example S3 records available", time: "On page load", category: "S3", icon: Database },

  { id: 4, title: "AWS access remains disabled", detail: "No AWS API calls are made by these demo pages", time: "Current session", category: "Security", icon: ShieldCheck },

];



function App() {

const [activePage, setActivePage] = useState("overview");

const [theme, setTheme] = useState("light");
const [instances, setInstances] = useState(demoInstances);
const [buckets, setBuckets] = useState(demoBuckets);
const [dataMode, setDataMode] = useState("demo");

const [backendStatus, setBackendStatus] = useState("checking");

const [awsReadsEnabled, setAwsReadsEnabled] = useState(false);

const [bucketsSearch, setBucketsSearch] = useState("");

const [bucketRegion, setBucketRegion] = useState("All regions");

const [activityFilter, setActivityFilter] = useState("All activity");

const [activity, setActivity] = useState(initialActivity);

const [lastChecked, setLastChecked] = useState(null);

const [s3BackendStatus, setS3BackendStatus] = useState("checking");

const [s3BackendMessage, setS3BackendMessage] = useState(

    "Checking local S3 endpoint..."

  );



async function checkBackend() {
  setBackendStatus("checking");
  setS3BackendStatus("checking");

  try {
    const [ec2Response, s3Response] = await Promise.all([
      fetch("https://76z84ommj0.execute-api.ap-south-1.amazonaws.com/dev/api/ec2/instances"),
      fetch("https://76z84ommj0.execute-api.ap-south-1.amazonaws.com/dev/api/s3/buckets"),
    ]);

    const [ec2Data, s3Data] = await Promise.all([
      ec2Response.json(),
      s3Response.json(),
    ]);

    const ec2Connected =
      ec2Response.ok && ec2Data.connected === true &&
      Array.isArray(ec2Data.instances);
    const s3Connected =
      s3Response.ok && s3Data.connected === true &&
      Array.isArray(s3Data.buckets);

    if (ec2Connected) {
      setInstances(
        ec2Data.instances.map((instance) => ({
          id: instance.instanceId ?? instance.id ?? "",
          name: instance.name ?? "(unnamed instance)",
          type: instance.instanceType ?? instance.type ?? "unknown",
          region:
            instance.region ??
            instance.availabilityZone?.replace(/[a-z]$/, "") ??
            "ap-south-1",
          status: String(instance.state ?? instance.status ?? "unknown")
            .replace(/^./, (letter) => letter.toUpperCase()),
        }))
      );
    } else {
      setInstances(demoInstances);
    }

    if (s3Connected) {
      // ListBuckets returns names and creation dates only. Do not invent
      // bucket region, object count, size, or access details.
      setBuckets(
        s3Data.buckets.map((bucket) => ({
          name: bucket.name,
          region: "Unknown",
          objects: "—",
          size: "—",
          access: "Unknown",
          creationDate: bucket.creationDate ?? null,
        }))
      );
    } else {
      setBuckets(demoBuckets);
    }

    const anyLiveData = ec2Connected || s3Connected;
    setDataMode(anyLiveData ? "live" : "demo");
    setBackendStatus(anyLiveData ? "online" : "offline");
    setAwsReadsEnabled(anyLiveData);
    setS3BackendStatus(s3Connected ? "connected" : "offline");
    setS3BackendMessage(
      s3Connected
        ? "Live S3 bucket names are loaded from AWS. Additional metadata is not available from this endpoint."
        : "AWS S3 endpoint unavailable. Showing sample buckets."
    );
  } catch {
    setInstances(demoInstances);
    setBuckets(demoBuckets);
    setDataMode("demo");
    setBackendStatus("offline");
    setAwsReadsEnabled(false);
    setS3BackendStatus("offline");
    setS3BackendMessage("AWS API unavailable. Showing sample buckets.");
  }

  setLastChecked(new Date());
}

useEffect(() => {
  checkBackend();
}, []);

const navItems = [

    { id: "overview", label: "Overview", icon: LayoutDashboard },

    { id: "instances", label: "EC2 Instances", icon: Server },

    { id: "buckets", label: "S3 Buckets", icon: Database },

    { id: "activity", label: "Activity", icon: Activity },

  ];



const filteredBuckets = useMemo(() => {

const query = bucketsSearch.trim().toLowerCase();



return buckets.filter((bucket) => {

const matchesText =

        bucket.name.toLowerCase().includes(query) ||

        bucket.region.toLowerCase().includes(query);



const matchesRegion =

        bucketRegion === "All regions" || bucket.region === bucketRegion;



return matchesText && matchesRegion;

    });

  }, [buckets, bucketsSearch, bucketRegion]);



const filteredActivity = useMemo(

    () =>

      activity.filter(

        (event) =>

          activityFilter === "All activity" ||

          event.category === activityFilter

      ),

    [activity, activityFilter]

  );



const runningInstances = instances.filter(
    (instance) => String(instance.status).toLowerCase() === "running"
  ).length;

const stats = [
  {
    title: "EC2 Instances",
    value: String(instances.length),
    detail: `${runningInstances} running · ${instances.length - runningInstances} other`,
    icon: Server,
    trend: dataMode === "live" ? "AWS data" : "Demo data",
    positive: true,
  },
  {
    title: "S3 Buckets",
    value: String(buckets.length),
    detail: dataMode === "live" ? "Live bucket names" : "Sample bucket records",
    icon: Database,
    trend: dataMode === "live" ? "AWS data" : "Demo data",
    positive: true,
  },
  {
    title: "Running Resources",
    value: String(runningInstances),
    detail: dataMode === "live" ? "EC2 instances reporting running" : "Illustrative count",
    icon: Activity,
    trend: dataMode === "live" ? "AWS data" : "Demo data",
    positive: true,
  },
  {
    title: "Estimated Monthly Cost",
    value: "—",
    detail: "Billing data is not available from these endpoints",
    icon: Cloud,
    trend: "Not connected to billing",
    positive: false,
  },
];

const backendLabel =

    backendStatus === "checking"

      ? "Checking backend..."

      : backendStatus === "online"

        ? "Local backend online"

        : "Local backend offline";



const currentPageLabel =

    navItems.find((item) => item.id === activePage)?.label || "Settings";



return (

    <div className={`app-shell ${theme}-theme`}>

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-icon">

            <Cloud size={23} />

          </div>

          <div>

            <h2>CloudPilot</h2>

            <span>RESOURCE MANAGER</span>

          </div>

        </div>



        <div className="nav-label">WORKSPACE</div>



        <nav className="navigation">

          {navItems.map(({ id, label, icon: Icon }) => (

            <button

              key={id}

              type="button"

              className={`nav-item ${activePage === id ? "active" : ""}`}

              onClick={() => setActivePage(id)}

            >

              <Icon size={18} />

              {label}

            </button>

          ))}

        </nav>



        <div className="sidebar-bottom">

          <div className="connection-card">

            <span className="connection-dot" />

            <div>

              <strong>{backendLabel}</strong>

              <p>{awsReadsEnabled ? "AWS reads enabled" : "AWS reads disabled"}</p>

            </div>

          </div>



          <button

            type="button"

            className={`nav-item ${activePage === "settings" ? "active" : ""}`}

            onClick={() => setActivePage("settings")}

          >

            <Settings size={18} />

            Settings

          </button>



          <div className="profile">

            <div className="avatar">CP</div>

            <div>

              <strong>Cloud Admin</strong>

              <p>Local workspace</p>

            </div>

          </div>

        </div>

      </aside>



      <main className="main-content">

        <header className="topbar">

          <div className="breadcrumb">

            Workspace <span>/</span> <strong>{currentPageLabel}</strong>

          </div>



          <div className="topbar-actions">

            <button

              type="button"

              className="icon-button theme-toggle"

              aria-label="Toggle theme"

              onClick={() =>

                setTheme((current) => current === "light" ? "dark" : "light")

              }

            >

              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}

            </button>



            <div className="region-chip">

              <span className="connection-dot" />

              Demo mode

            </div>



            <button

              type="button"

              className="icon-button"

              aria-label="Refresh backend status"

              onClick={checkBackend}

            >

              <RefreshCw size={17} />

            </button>



            <button

              type="button"

              className="icon-button"

              aria-label="View notifications"

              onClick={() => setActivePage("activity")}

            >

              <Bell size={18} />

            </button>

          </div>

        </header>



        {activePage === "instances" ? (

          <EC2Instances />

        ) : activePage === "overview" ? (

          <>

            <section className="welcome-section">

              <div>

                <div className="eyebrow">CLOUD INFRASTRUCTURE</div>

                <h1>Your cloud, at a glance.</h1>

                <p>

                  Prepare to monitor your AWS resources from one central workspace.

                </p>

              </div>



              <button

                type="button"

                className="primary-button"

                onClick={() =>

                  alert(

                    "AWS connection is intentionally disabled in this local prototype. No AWS request was made."

                  )

                }

              >

                <Plus size={17} />

                Connect AWS

              </button>

            </section>



            <div className="demo-notice" role="status">

              {dataMode === "live" ? "Live resource data is shown where available. Billing estimates and unsupported metadata are not provided." : "AWS data is unavailable. Showing sample data for demonstration."}

            </div>



            <section className="stats-grid">

              {stats.map((stat) => {

const Icon = stat.icon;



return (

                  <article className="stat-card" key={stat.title}>

                    <div className="stat-card-top">

                      <div className="stat-icon">

                        <Icon size={19} />

                      </div>

                      <span className="stat-trend">

                        {stat.positive ? (

                          <ArrowUpRight size={15} />

                        ) : (

                          <ArrowDownRight size={15} />

                        )}

                        {stat.trend}

                      </span>

                    </div>

                    <p className="stat-title">{stat.title}</p>

                    <h2>{stat.value}</h2>

                    <p className="stat-detail">{stat.detail}</p>

                  </article>

                );

              })}

            </section>



            <section className="content-card">

              <div className="section-heading">

                <div>

                  <h2>EC2 Instances</h2>

                  <p>{dataMode === "live" ? "Compute resources returned by AWS." : "Sample compute resources for interface demonstration."}</p>

                </div>

                <button

                  type="button"

                  className="secondary-button"

                  onClick={() => setActivePage("instances")}

                >

                  <Plus size={16} />

                  View instances

                </button>

              </div>



              <div className="table-wrapper">

                <table>

                  <thead>

                    <tr>

                      <th>INSTANCE</th>

                      <th>INSTANCE ID</th>

                      <th>TYPE</th>

                      <th>REGION</th>

                      <th>STATUS</th>

                    </tr>

                  </thead>

                  <tbody>

                    {instances.map((instance) => (

                      <tr key={instance.id}>

                        <td><strong>{instance.name}</strong></td>

                        <td className="muted-cell">{instance.id}</td>

                        <td>{instance.type}</td>

                        <td>{instance.region}</td>

                        <td>

                          <span className={`status ${instance.status.toLowerCase()}`}>

                            <span className="status-dot" />

                            {instance.status}

                          </span>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>



              <div className="table-footer">

                Showing 4 sample instances

                <span>Not connected to live AWS</span>

              </div>

            </section>



            <section className="lower-grid">

              <article className="content-card">

                <div className="section-heading">

                  <div>

                    <h2>S3 Buckets</h2>

                    <p>Sample object storage resources.</p>

                  </div>

                  <Database size={20} className="subtle-icon" />

                </div>



                {buckets.slice(0, 2).map((bucket) => (

                  <div className="bucket-row" key={bucket.name}>

                    <div className="bucket-icon"><Database size={18} /></div>

                    <div>

                      <strong>{bucket.name}</strong>

                      <p>{bucket.region} · {dataMode === "live" ? "Live bucket" : "Sample bucket"}</p>

                    </div>

                    <CircleCheck size={17} className="success-icon" />

                  </div>

                ))}



               <div className="bucket-note">
  {dataMode === "live"
    ? "Bucket names are live; object counts, sizes, and access details are not provided by this API."
    : "Sample names only. No real buckets are accessed."}
</div>


                <div className="section-heading">

                  <button

                    type="button"

                    className="secondary-button"

                    onClick={() => setActivePage("buckets")}

                  >

                    {dataMode === "live" ? "View all buckets" : "View all demo buckets"}

                  </button>

                </div>

              </article>



              <article className="content-card">

                <div className="section-heading">

                  <div>

                    <h2>Recent activity</h2>

                    <p>Local demo events.</p>

                  </div>

                  <Clock size={20} className="subtle-icon" />

                </div>



                {initialActivity.slice(0, 3).map((event) => {

const Icon = event.icon;



return (

                    <div className="activity-row" key={event.id}>

                      <span className="activity-icon"><Icon size={17} /></span>

                      <div>

                        <strong>{event.title}</strong>

                        <p>{event.detail}</p>

                      </div>

                      <time>{event.time}</time>

                    </div>

                  );

                })}



                <div className="section-heading">

                  <button

                    type="button"

                    className="secondary-button"

                    onClick={() => setActivePage("activity")}

                  >

                    View activity log

                  </button>

                </div>

              </article>

            </section>



            <footer className="page-footer">

              CloudPilot <span>•</span> AWS Cloud Resource Management Platform

              <span className="footer-right">Local prototype · Demo data only</span>

            </footer>

          </>

        ) : activePage === "buckets" ? (

          <section className="resource-page">

            <div className="resource-page-heading">

              <div>

                <div className="eyebrow">OBJECT STORAGE</div>

                <h1>S3 Buckets</h1>

                <p>{dataMode === "live" ? "Explore bucket names returned by AWS." : "Explore sample bucket metadata in the local prototype."}</p>

              </div>

              <span className="demo-pill">{dataMode === "live" ? "Live AWS data" : "Demo data only"}</span>

            </div>



            <div className="demo-notice" role="status">

              <strong>

                {s3BackendStatus === "connected"

                  ? "S3 endpoint connected"

                  : s3BackendStatus === "checking"

                    ? "Checking S3 endpoint"

                    : s3BackendStatus === "offline"

                      ? "Backend unavailable"

                      : "Demo mode — live AWS access disabled"}

              </strong>

              <p>{s3BackendMessage}</p>

              <p>

                {dataMode === "live" && s3BackendStatus === "connected" ? "Live bucket names are displayed. Region, object count, size, and access details are unavailable from the current API." : "The table below contains fictional sample records. No live S3 data is currently displayed."}

              </p>

            </div>



            <div className="resource-metrics">

              <article className="ec2-summary-card">

                <span>{dataMode === "live" ? "Buckets returned" : "Sample buckets"}</span>

                <strong>{buckets.length}</strong>

              </article>

              <article className="ec2-summary-card">

                <span>Regions represented</span>
                <strong>{new Set(buckets.map((bucket) => bucket.region).filter((region) => region !== "Unknown")).size || "—"}</strong>

              </article>

              <article className="ec2-summary-card">

                <span>Public access</span>
                <strong>{dataMode === "live" ? "—" : "0"}</strong>

              </article>

            </div>



            <section className="content-card">

              <div className="resource-toolbar">

                <label className="ec2-search">

                  <Search size={17} />

                  <input

                    value={bucketsSearch}

                    onChange={(event) => setBucketsSearch(event.target.value)}

                    placeholder="Search bucket name or region..."

                    aria-label="Search buckets"

                  />

                </label>



                <label className="filter-control">

                  <Filter size={15} />

                  <select

                    value={bucketRegion}

                    onChange={(event) => setBucketRegion(event.target.value)}

                    aria-label="Filter buckets by region"

                  >

                    <option>All regions</option>

                    <option value="ap-south-1">ap-south-1</option>

                    <option value="us-east-1">us-east-1</option>

                  </select>

                </label>

              </div>



              <div className="table-wrapper">

                <table>

                  <thead>

                    <tr>

                      <th>BUCKET NAME</th>

                      <th>REGION</th>

                      <th>OBJECTS</th>

                      <th>SIZE</th>

                      <th>ACCESS</th>

                      <th>DATA SOURCE</th>

                    </tr>

                  </thead>

                  <tbody>

                    {filteredBuckets.map((bucket) => (

                      <tr key={bucket.name}>

                        <td><strong>{bucket.name}</strong></td>

                        <td>{bucket.region}</td>

                        <td>{bucket.objects ?? "—"}</td>

                        <td>{bucket.size ?? "—"}</td>

                        <td><span className="access-tag">{bucket.access ?? "Unknown"}</span></td>

                        <td><span className="sample-tag">{dataMode === "live" ? "AWS" : "Sample"}</span></td>

                      </tr>

                    ))}



                    {filteredBuckets.length === 0 && (

                      <tr>

                        <td colSpan={6} className="resource-empty">

                          No sample buckets match your search.

                        </td>

                      </tr>

                    )}

                  </tbody>

                </table>

              </div>



              <div className="table-footer">

                Showing {filteredBuckets.length} of {buckets.length} {dataMode === "live" ? "AWS buckets" : "sample buckets"}

                <span>{dataMode === "live" ? "Live AWS data" : "Not connected to live AWS"}</span>

              </div>

            </section>



            <div className="resource-footnote">

              <Info size={16} />

              Bucket names, object counts, and sizes are illustrative only.

              No actual S3 data is accessed.

            </div>

          </section>

        ) : activePage === "activity" ? (

          <section className="resource-page">

            <div className="resource-page-heading">

              <div>

                <div className="eyebrow">AUDIT TRAIL</div>

                <h1>Activity</h1>

                <p>Review events generated inside this local demo session.</p>

              </div>

              <span className="demo-pill">Local events only</span>

            </div>



            <div className="demo-notice" role="status">

              This is not an AWS CloudTrail log. Events shown here are

              generated by the local UI only.

            </div>



            <div className="activity-toolbar">

              <label className="filter-control">

                <Filter size={15} />

                <select

                  value={activityFilter}

                  onChange={(event) => setActivityFilter(event.target.value)}

                  aria-label="Filter activity"

                >

                  <option>All activity</option>

                  <option>System</option>

                  <option>EC2</option>

                  <option>S3</option>

                  <option>Security</option>

                </select>

              </label>



              <button

                className="secondary-button"

                type="button"

                onClick={() => {

                  setActivity(initialActivity);

                  setActivityFilter("All activity");

                }}

              >

                <RefreshCw size={15} />

                Reset demo log

              </button>

            </div>



            <section className="content-card activity-list">

              {filteredActivity.map((event) => {

const Icon = event.icon || Activity;



return (

                  <article className="activity-row activity-row-large" key={event.id}>

                    <span className="activity-icon"><Icon size={18} /></span>

                    <div>

                      <strong>{event.title}</strong>

                      <p>{event.detail}</p>

                      <span className="activity-category">{event.category}</span>

                    </div>

                    <time>{event.time}</time>

                  </article>

                );

              })}



              {filteredActivity.length === 0 && (

                <div className="resource-empty">No activity for this filter.</div>

              )}

            </section>



            <div className="resource-footnote">

              <ShieldCheck size={16} />

              No AWS resources are changed by this activity page.

            </div>

          </section>

        ) : (

          <section className="resource-page">

            <div className="resource-page-heading">

              <div>

                <div className="eyebrow">WORKSPACE PREFERENCES</div>

                <h1>Settings</h1>

                <p>Review local connection and safety configuration.</p>

              </div>

              <span className="demo-pill">Local prototype</span>

            </div>



            <div className="demo-notice" role="status">

              Live AWS access is not configurable from this screen. The backend

              environment setting controls whether AWS reads are enabled.

            </div>



            <div className="settings-grid">

              <article className="content-card settings-card">

                <div className="settings-card-heading">

                  <span className="settings-icon"><Server size={19} /></span>

                  <div>

                    <h2>Backend connection</h2>

                    <p>Deployed API Gateway endpoints</p>

                  </div>

                  <span className={`settings-status ${backendStatus}`}>

                    {backendStatus === "online"

                      ? "Online"

                      : backendStatus === "checking"

                        ? "Checking"

                        : "Offline"}

                  </span>

                </div>



                <div className="settings-detail">

                  <span>Health endpoint</span>

                  <strong>API Gateway · ap-south-1 · /dev</strong>

                </div>

                <div className="settings-detail">

                  <span>Last checked</span>

                  <strong>

                    {lastChecked ? lastChecked.toLocaleTimeString() : "Not checked yet"}

                  </strong>

                </div>



                <button

                  type="button"

                  className="secondary-button"

                  onClick={checkBackend}

                  disabled={backendStatus === "checking"}

                >

                  <RefreshCw size={15} />

                  Check connection

                </button>

              </article>



              <article className="content-card settings-card">

                <div className="settings-card-heading">

                  <span className="settings-icon"><ShieldCheck size={19} /></span>

                  <div>

                    <h2>AWS access</h2>

                    <p>Read-only access guard</p>

                  </div>

                  <span className="settings-status disabled">Guarded</span>

                </div>



                <div className="settings-detail">

                  <span>AWS reads</span>

                  <strong>{awsReadsEnabled ? "Backend reports enabled" : "Disabled"}</strong>

                </div>

                <div className="settings-detail">

                  <span>Configured region</span>

                  <strong>ap-south-1</strong>

                </div>



                <p className="settings-warning">

                  Keep <code>ENABLE_AWS_READS=false</code> in the backend

                  .env file while working locally.

                </p>

              </article>



              <article className="content-card settings-card">

                <div className="settings-card-heading">

                  <span className="settings-icon"><Moon size={19} /></span>

                  <div>

                    <h2>Appearance</h2>

                    <p>Dashboard theme</p>

                  </div>

                </div>



                <div className="settings-detail">

                  <span>Current theme</span>

                  <strong>{theme === "light" ? "Light" : "Dark"}</strong>

                </div>



                <button

                  type="button"

                  className="secondary-button"

                  onClick={() =>

                    setTheme((current) => current === "light" ? "dark" : "light")

                  }

                >

                  {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}

                  {theme === "light" ? "Switch to dark mode" : "Switch to light mode"}

                </button>

              </article>



              <article className="content-card settings-card">

                <div className="settings-card-heading">

                  <span className="settings-icon"><Info size={19} /></span>

                  <div>

                    <h2>Project status</h2>

                    <p>Current implementation scope</p>

                  </div>

                </div>



                <div className="settings-detail">

                  <span>Frontend</span>

                  <strong>Local React app</strong>

                </div>

                <div className="settings-detail">

                  <span>Backend</span>

                  <strong>AWS Lambda via API Gateway</strong>

                </div>

                <div className="settings-detail">

                  <span>Lambda / API Gateway</span>

                  <strong>Deployed</strong>

                </div>

                <div className="settings-detail">

                  <span>Live resource data</span>

                  <strong>{dataMode === "live" ? "Connected where available" : "Demo fallback active"}</strong>

                </div>

              </article>

            </div>



            <div className="resource-footnote">

              <ShieldCheck size={16} />

              No AWS resources are created or modified by these settings.

            </div>

          </section>

        )}

      </main>

    </div>

  );

}



export default App;