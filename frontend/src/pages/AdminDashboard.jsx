import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plane, LogOut, Users, Briefcase, IndianRupee, Loader2, ShieldCheck, Search, FlaskConical, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../lib/api";

export default function AdminDashboard() {
  const nav = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [apps, setApps] = useState([]);
  const [abStats, setAbStats] = useState(null);
  const [tab, setTab] = useState("overview");
  const [q, setQ] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("jp_admin_token");
    if (!t) { nav("/admin/login"); return; }
    Promise.all([
      adminApi.get("/admin/stats"),
      adminApi.get("/admin/users"),
      adminApi.get("/admin/orders"),
      adminApi.get("/admin/applications"),
      adminApi.get("/ab/stats"),
    ]).then(([a, b, c, d, e]) => {
      setStats(a.data);
      setUsers(b.data.users);
      setOrders(c.data.orders);
      setApps(d.data.applications);
      setAbStats(e.data);
    }).catch(() => {
      toast.error("Session expired");
      localStorage.removeItem("jp_admin_token");
      nav("/admin/login");
    });
  }, [nav]);

  const changePlan = async (uid, plan) => {
    try {
      await adminApi.put(`/admin/users/${uid}/plan`, { plan });
      toast.success("Plan updated");
      const { data } = await adminApi.get("/admin/users");
      setUsers(data.users);
    } catch {
      toast.error("Update failed");
    }
  };

  if (!stats) return <div className="min-h-screen flex items-center justify-center bg-zinc-50"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;

  const filteredUsers = users.filter((u) => !q || (u.email || "").toLowerCase().includes(q.toLowerCase()) || (u.full_name || "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen bg-zinc-50/60" data-testid="admin-dashboard-page">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full jp-conic p-[1.5px]">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <Plane className="w-4 h-4 -rotate-12 text-zinc-900" />
              </div>
            </div>
            <span className="font-display font-bold tracking-tight">JobPilot</span>
            <span className="ml-3 text-xs uppercase tracking-[0.18em] px-2 py-0.5 rounded-full bg-zinc-900 text-white font-semibold">Admin</span>
          </Link>
          <button onClick={() => { localStorage.removeItem("jp_admin_token"); nav("/admin/login"); }} className="text-sm text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1.5" data-testid="admin-signout">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 md:px-8 py-10">
        <h1 className="font-display text-4xl tracking-[-0.03em] font-medium">Operations</h1>
        <p className="text-zinc-500 mt-1">All-time view across users, revenue, and applications.</p>

        {/* KPI cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <KPI icon={Users} label="Total users" value={stats.total_users} sub={`${stats.free_users} free · ${stats.paid_users} paid`} testid="admin-kpi-users" />
          <KPI icon={IndianRupee} label="Revenue" value={`₹${stats.revenue_inr.toLocaleString()}`} sub={`${stats.paid_orders} paid orders`} testid="admin-kpi-revenue" />
          <KPI icon={Briefcase} label="Applications" value={stats.total_applications} sub="across all users" testid="admin-kpi-apps" />
          <KPI icon={ShieldCheck} label="Total orders" value={stats.total_orders} sub={`${stats.paid_orders} paid`} testid="admin-kpi-orders" />
        </div>

        {/* Tabs */}
        <div className="mt-10 flex items-center gap-3 flex-wrap">
          {[
            { k: "overview", l: "Overview" },
            { k: "users", l: "Users" },
            { k: "orders", l: "Orders" },
            { k: "apps", l: "Applications" },
            { k: "experiments", l: "Experiments" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`px-4 py-2 rounded-full text-sm transition-all ${tab === t.k ? "bg-zinc-900 text-white" : "bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-400"}`}
              data-testid={`admin-tab-${t.k}`}
            >
              {t.l}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="mt-6 grid lg:grid-cols-2 gap-5">
            <Panel title="Recent users">
              <Table cols={["Name", "Email", "Plan", ""]}>
                {users.slice(0, 6).map((u) => (
                  <tr key={u.supabase_user_id}>
                    <td className="py-2.5 text-sm">{u.full_name || "—"}</td>
                    <td className="py-2.5 text-sm text-zinc-500">{u.email}</td>
                    <td className="py-2.5 text-xs"><PlanPill plan={u.plan} /></td>
                    <td />
                  </tr>
                ))}
              </Table>
            </Panel>
            <Panel title="Recent orders">
              <Table cols={["User", "Plan", "Amount", "Status"]}>
                {orders.slice(0, 6).map((o) => (
                  <tr key={o.razorpay_order_id}>
                    <td className="py-2.5 text-xs font-mono">{o.supabase_user_id?.slice(0, 8)}</td>
                    <td className="py-2.5 text-sm"><PlanPill plan={o.plan} /></td>
                    <td className="py-2.5 text-sm">₹{(o.amount / 100).toLocaleString()}</td>
                    <td className="py-2.5 text-xs"><span className={`px-2 py-0.5 rounded-full ${o.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}>{o.status}</span></td>
                  </tr>
                ))}
              </Table>
            </Panel>
          </div>
        )}

        {tab === "users" && (
          <Panel
            title={`Users (${filteredUsers.length})`}
            right={(
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-8 pr-3 py-1.5 rounded-full text-sm border border-zinc-200 outline-none" data-testid="admin-user-search" />
              </div>
            )}
          >
            <Table cols={["Name", "Email", "Plan", "Applications", "Change plan"]}>
              {filteredUsers.map((u) => (
                <tr key={u.supabase_user_id} data-testid={`admin-user-row-${u.supabase_user_id}`}>
                  <td className="py-2.5 text-sm">{u.full_name || "—"}</td>
                  <td className="py-2.5 text-sm text-zinc-500">{u.email}</td>
                  <td className="py-2.5"><PlanPill plan={u.plan} /></td>
                  <td className="py-2.5 text-sm">{u.applications_count || 0}</td>
                  <td className="py-2.5">
                    <select value={u.plan} onChange={(e) => changePlan(u.supabase_user_id, e.target.value)} className="text-sm px-3 py-1.5 rounded-full border border-zinc-200 bg-white" data-testid={`admin-plan-select-${u.supabase_user_id}`}>
                      <option value="free">free</option>
                      <option value="starter">starter</option>
                      <option value="pro">pro</option>
                    </select>
                  </td>
                </tr>
              ))}
            </Table>
          </Panel>
        )}

        {tab === "orders" && (
          <Panel title={`Orders (${orders.length})`}>
            <Table cols={["Order ID", "User", "Plan", "Amount", "Status", "Created"]}>
              {orders.map((o) => (
                <tr key={o.razorpay_order_id}>
                  <td className="py-2.5 text-xs font-mono">{o.razorpay_order_id?.slice(0, 16)}</td>
                  <td className="py-2.5 text-xs font-mono">{o.supabase_user_id?.slice(0, 8)}</td>
                  <td className="py-2.5"><PlanPill plan={o.plan} /></td>
                  <td className="py-2.5 text-sm">₹{(o.amount / 100).toLocaleString()}</td>
                  <td className="py-2.5 text-xs"><span className={`px-2 py-0.5 rounded-full ${o.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}>{o.status}</span></td>
                  <td className="py-2.5 text-xs text-zinc-400">{new Date(o.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </Table>
          </Panel>
        )}

        {tab === "apps" && (
          <Panel title={`Applications (${apps.length})`}>
            <Table cols={["Company", "Role", "Platform", "Status", "Submitted"]}>
              {apps.map((a) => (
                <tr key={a.id}>
                  <td className="py-2.5 text-sm font-semibold">{a.company}</td>
                  <td className="py-2.5 text-sm text-zinc-600">{a.role}</td>
                  <td className="py-2.5 text-xs text-zinc-500">{a.platform}</td>
                  <td className="py-2.5 text-xs"><span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{a.status}</span></td>
                  <td className="py-2.5 text-xs text-zinc-400">{new Date(a.submitted_at).toLocaleString()}</td>
                </tr>
              ))}
            </Table>
          </Panel>
        )}

        {tab === "experiments" && (
          <div className="mt-6 space-y-5" data-testid="admin-experiments">
            {abStats && Object.entries(abStats).map(([exp, breakdown]) => (
              <Panel key={exp} title={`${exp} · A/B`} right={<FlaskConical className="w-4 h-4 text-zinc-400" />}>
                <Table cols={["Variant", "Views", "Clicks", "Conversions", "CTR", "Conv. rate"]}>
                  {Object.entries(breakdown).map(([variant, counts]) => (
                    <tr key={variant} data-testid={`ab-row-${exp}-${variant}`}>
                      <td className="py-2.5 text-sm font-semibold">
                        <span className={`inline-flex items-center gap-2`}>
                          <span className={`w-2 h-2 rounded-full ${variant === "A" ? "bg-blue-500" : "bg-violet-500"}`} />
                          Variant {variant}
                        </span>
                      </td>
                      <td className="py-2.5 text-sm">{counts.view || 0}</td>
                      <td className="py-2.5 text-sm">{counts.click || 0}</td>
                      <td className="py-2.5 text-sm">{counts.convert || 0}</td>
                      <td className="py-2.5 text-sm flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-emerald-500" />{counts.click_rate || 0}%</td>
                      <td className="py-2.5 text-sm">{counts.convert_rate || 0}%</td>
                    </tr>
                  ))}
                  {Object.keys(breakdown).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-sm text-zinc-400">No events yet — visit /#pricing to log views.</td>
                    </tr>
                  )}
                </Table>
              </Panel>
            ))}
            {!abStats && <div className="text-sm text-zinc-500">Loading…</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, sub, testid }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="jp-card rounded-2xl p-5" data-testid={testid}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-zinc-400 font-semibold">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="font-display text-3xl mt-2 font-medium tracking-[-0.02em]">{value}</div>
      <div className="text-xs text-zinc-500 mt-0.5">{sub}</div>
    </motion.div>
  );
}

function Panel({ title, right, children }) {
  return (
    <div className="jp-card rounded-2xl p-5 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-zinc-900">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function Table({ cols, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.16em] text-zinc-400 font-semibold border-b border-zinc-100">
            {cols.map((c) => <th key={c} className="py-2 pr-4">{c}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">{children}</tbody>
      </table>
    </div>
  );
}

function PlanPill({ plan }) {
  const styles = {
    free: "bg-zinc-100 text-zinc-600",
    starter: "bg-blue-100 text-blue-700",
    pro: "bg-gradient-to-r from-amber-400 to-orange-500 text-zinc-900",
  };
  return <span className={`text-[11px] uppercase tracking-[0.16em] font-semibold px-2 py-0.5 rounded-full ${styles[plan] || styles.free}`}>{plan || "free"}</span>;
}
