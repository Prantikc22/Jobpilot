import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Loader2, Upload, CheckCircle2, Sparkles, Plane, Mail, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { Field } from "./SignIn";

const ROLE_PRESETS = ["QA Engineer", "Software Engineer", "SDET", "Product Manager", "Designer", "Data Analyst", "ML Engineer", "Frontend Engineer", "Backend Engineer", "Full Stack"];
const COUNTRY_PRESETS = ["India", "United States", "United Kingdom", "Canada", "Germany", "Singapore", "Australia", "Netherlands", "Remote (Global)"];

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("free");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [roles, setRoles] = useState([]);
  const [customRole, setCustomRole] = useState("");
  const [countries, setCountries] = useState([]);
  const [salary, setSalary] = useState("");
  const [jobEmail, setJobEmail] = useState("");
  const [jobEmailPwd, setJobEmailPwd] = useState("");
  const [useApplyagentEmail, setUseApplyagentEmail] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeName, setResumeName] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { nav("/signin"); return; }
    api.get("/users/me").then(({ data }) => {
      setProfile(data);
      setFullName(data.full_name || user.user_metadata?.full_name || "");
      setPhone(data.phone || "");
      setLinkedin(data.linkedin_url || "");
      setRoles(data.target_roles || []);
      setCountries(data.target_countries || []);
      setSalary(data.preferred_salary || "");
      setJobEmail(data.job_search_email || "");
      setUseApplyagentEmail(data.use_applyagent_email || false);
      setResumeName(data.resume_filename || null);
      if (data.onboarding_step && !data.onboarding_completed) setStep(data.onboarding_step);
    }).catch(() => {});
  }, [user, authLoading, nav]);

  const saveStep = async (next) => {
    setSaving(true);
    try {
      await api.put("/users/me", {
        full_name: fullName || undefined,
        phone: phone || undefined,
        linkedin_url: linkedin || undefined,
        target_roles: roles,
        target_countries: countries,
        preferred_salary: salary || undefined,
        use_applyagent_email: useApplyagentEmail,
        job_search_email: (!useApplyagentEmail && jobEmail) ? jobEmail : undefined,
        job_search_email_password: (!useApplyagentEmail && jobEmailPwd) ? jobEmailPwd : undefined,
        onboarding_step: next,
        onboarding_completed: next > 8,
      });
      setStep(next);
      if (next > 8) {
        if (selectedPlan === "free") {
          toast.success("Welcome! You're on the free plan. Explore your dashboard.");
          nav("/dashboard");
        } else {
          toast.success("Let's set up your plan.");
          nav("/pricing-checkout");
        }
      }
    } catch (e) {
      toast.error("Couldn't save — try again");
    } finally {
      setSaving(false);
    }
  };

  const uploadResume = async () => {
    if (!resumeFile) return;
    setSaving(true);
    const fd = new FormData();
    fd.append("file", resumeFile);
    try {
      await api.post("/resumes/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setResumeName(resumeFile.name);
      toast.success("Resume uploaded ✓");
      saveStep(3);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const toggle = (arr, setArr, v) => setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-white" data-testid="onboarding-page">
      <div className="jp-mesh" aria-hidden />
      <div className="absolute inset-0 jp-dot-grid opacity-20" />
      <a href="/" className="absolute top-6 left-6 flex items-center gap-2 z-10">
        <div className="w-8 h-8 rounded-full jp-conic p-[1.5px]">
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
            <Plane className="w-4 h-4 -rotate-12 text-zinc-900" />
          </div>
        </div>
        <span className="font-display font-bold tracking-tight">ApplyAgent</span>
      </a>

      <div className="relative max-w-2xl mx-auto pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6">
        <div className="flex items-center gap-1 sm:gap-2 mb-5 sm:mb-7">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? "bg-zinc-900" : "bg-zinc-200"}`}
              data-testid={`onb-progress-${i}`}
            />
          ))}
        </div>
        <div className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-zinc-400 font-semibold mb-2">Step {step} of 8</div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            className="jp-glass rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8"
          >
            {step === 1 && (
              <Step title="Tell us who you are" sub="Just the essentials. We'll fill in the rest from your resume.">
                <div className="space-y-3">
                  <Field label="Full name" value={fullName} onChange={setFullName} required testid="onb-fullname" />
                  <Field label="Phone" value={phone} onChange={setPhone} testid="onb-phone" placeholder="+91 …" />
                </div>
                <Footer onNext={() => saveStep(2)} saving={saving} disabled={!fullName} />
              </Step>
            )}

            {step === 2 && (
              <Step title="Upload your resume" sub="PDF or DOCX. We'll parse it and start matching jobs.">
                <label className="block">
                  <div className="border-2 border-dashed border-zinc-200 rounded-2xl p-8 text-center bg-white/70 hover:border-zinc-400 transition-colors cursor-pointer" data-testid="onb-dropzone">
                    <input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setResumeFile(e.target.files?.[0])} className="hidden" data-testid="onb-file-input" />
                    <div className="flex justify-center mb-2">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="font-medium text-zinc-900">{resumeFile?.name || resumeName || "Click to upload"}</div>
                    <div className="text-xs text-zinc-400 mt-1">PDF or DOCX · up to 5 MB</div>
                  </div>
                </label>
                <Footer onBack={() => setStep(1)} onNext={resumeFile ? uploadResume : () => resumeName && saveStep(3)} saving={saving} disabled={!resumeFile && !resumeName} nextLabel={resumeFile ? "Upload & continue" : "Continue"} />
              </Step>
            )}

            {step === 3 && (
              <Step title="LinkedIn URL" sub="Optional — helps us calibrate recommendations.">
                <Field label="LinkedIn profile URL" value={linkedin} onChange={setLinkedin} testid="onb-linkedin" placeholder="https://linkedin.com/in/…" />
                <Footer onBack={() => setStep(2)} onNext={() => saveStep(4)} saving={saving} nextLabel="Continue" />
              </Step>
            )}

            {step === 4 && (
              <Step title="Target roles" sub="Pick all that apply. Or add your own.">
                <div className="flex flex-wrap gap-2 mb-4">
                  {ROLE_PRESETS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => toggle(roles, setRoles, r)}
                      className={`px-3.5 py-1.5 rounded-full border text-sm transition-all ${roles.includes(r) ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400"}`}
                      data-testid={`onb-role-${r.replace(/\s+/g, "-").toLowerCase()}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={customRole} onChange={(e) => setCustomRole(e.target.value)} placeholder="Add a custom role…" className="flex-1 px-4 py-2.5 rounded-full border border-zinc-200 outline-none text-sm" data-testid="onb-role-custom" />
                  <button
                    type="button"
                    onClick={() => { if (customRole.trim()) { setRoles([...roles, customRole.trim()]); setCustomRole(""); } }}
                    className="jp-btn-secondary px-4 py-2.5 rounded-full text-sm"
                    data-testid="onb-role-add"
                  >Add</button>
                </div>
                <Footer onBack={() => setStep(3)} onNext={() => saveStep(5)} saving={saving} disabled={roles.length === 0} />
              </Step>
            )}

            {step === 5 && (
              <Step title="Target countries" sub="Where you can legally work (or want to).">
                <div className="flex flex-wrap gap-2">
                  {COUNTRY_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggle(countries, setCountries, c)}
                      className={`px-3.5 py-1.5 rounded-full border text-sm transition-all ${countries.includes(c) ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400"}`}
                      data-testid={`onb-country-${c.replace(/\s+/g, "-").toLowerCase()}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <Footer onBack={() => setStep(4)} onNext={() => saveStep(6)} saving={saving} disabled={countries.length === 0} />
              </Step>
            )}

            {step === 6 && (
              <Step title="Preferred salary" sub="Optional. Helps us filter out low-fit roles.">
                <Field label="Preferred salary" value={salary} onChange={setSalary} testid="onb-salary" placeholder="e.g. ₹30 LPA or $140k" />
                <Footer onBack={() => setStep(5)} onNext={() => saveStep(7)} saving={saving} nextLabel="Continue" />
              </Step>
            )}

            {step === 7 && (
              <Step title="Dedicated job-search email" sub="We recommend a separate inbox so recruiter communication stays organized. Stored encrypted, never shared.">
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setUseApplyagentEmail(!useApplyagentEmail)}
                    className={`w-full flex items-start gap-3 p-4 rounded-2xl border-2 transition-all text-left ${useApplyagentEmail ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white/80 text-zinc-700 hover:border-zinc-400"}`}
                    data-testid="onb-use-applyagent-email"
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${useApplyagentEmail ? "border-white bg-white" : "border-zinc-300"}`}>
                      {useApplyagentEmail && <CheckCircle2 className="w-3 h-3 text-zinc-900" />}
                    </div>
                    <div>
                      <div className="font-semibold text-sm flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Create a new ApplyAgent email for me
                      </div>
                      <div className={`text-xs mt-1 leading-relaxed ${useApplyagentEmail ? "text-white/70" : "text-zinc-400"}`}>
                        Don't want to share your personal inbox? We'll assign you a dedicated job-search email.
                        Your email ID and password will be visible in your dashboard after your first batch of applications.
                      </div>
                    </div>
                  </button>

                  {!useApplyagentEmail && (
                    <div className="space-y-3">
                      <Field label="Job search email" type="email" value={jobEmail} onChange={setJobEmail} required testid="onb-jobemail" />
                      <Field label="Email password" type="password" value={jobEmailPwd} onChange={setJobEmailPwd} testid="onb-jobemail-pwd" placeholder={profile.job_search_email ? "Saved · type to update" : ""} />
                    </div>
                  )}
                </div>
                <Footer onBack={() => setStep(6)} onNext={() => saveStep(8)} saving={saving} disabled={!useApplyagentEmail && !jobEmail && !profile.job_search_email} />
              </Step>
            )}

            {step === 8 && (
              <Step
                title="Choose your pilot tier"
                sub="Start free to explore, or unlock auto-apply immediately."
                icon={<Sparkles className="w-5 h-5 text-amber-500" />}
              >
                <div className="space-y-3">
                  <PlanRow
                    id="free"
                    name="Free"
                    price="₹0"
                    badge="No card needed"
                    desc="AI resume tools + 10 matched jobs/month · no auto-apply"
                    selected={selectedPlan === "free"}
                    onSelect={() => setSelectedPlan("free")}
                  />
                  <PlanRow
                    id="starter"
                    name="Starter"
                    price="₹499/mo"
                    badge="Most popular"
                    desc="100 targeted auto-applications per month"
                    selected={selectedPlan === "starter"}
                    onSelect={() => setSelectedPlan("starter")}
                  />
                  <PlanRow
                    id="pro"
                    name="Pro"
                    price="₹999/mo"
                    badge="Best value"
                    desc="300 apps + Career Shield + priority processing"
                    highlight
                    selected={selectedPlan === "pro"}
                    onSelect={() => setSelectedPlan("pro")}
                  />
                </div>

                <div className="mt-4 p-3 rounded-xl bg-zinc-50 border border-zinc-100 text-xs text-zinc-500">
                  {selectedPlan === "free"
                    ? "You'll land on your dashboard right away. Upgrade anytime from settings."
                    : "You'll be taken to checkout. You can cancel anytime — no lock-in."}
                </div>

                <Footer
                  onBack={() => setStep(7)}
                  onNext={() => saveStep(9)}
                  saving={saving}
                  nextLabel={selectedPlan === "free" ? "Start for free" : "Continue to checkout"}
                />
              </Step>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Step({ title, sub, icon, children }) {
  return (
    <div data-testid="onboarding-step">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-display text-xl sm:text-2xl md:text-3xl tracking-[-0.02em] text-zinc-900 font-medium">{title}</h2>
      </div>
      <p className="text-sm sm:text-base text-zinc-500 mt-1">{sub}</p>
      <div className="mt-5 sm:mt-6">{children}</div>
    </div>
  );
}

function Footer({ onBack, onNext, saving, disabled, nextLabel = "Continue" }) {
  return (
    <div className="mt-7 flex items-center justify-between">
      {onBack ? (
        <button onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1.5" data-testid="onb-back">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      ) : <span />}
      <button
        disabled={disabled || saving}
        onClick={onNext}
        className="jp-btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium disabled:opacity-50 whitespace-nowrap"
        data-testid="onb-next"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{nextLabel} <ArrowRight className="w-4 h-4" /></>}
      </button>
    </div>
  );
}

function PlanRow({ id, name, price, desc, badge, highlight, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`onb-plan-${id}`}
      className={`w-full text-left rounded-2xl border-2 p-4 transition-all focus:outline-none ${
        selected
          ? highlight
            ? "border-zinc-900 bg-zinc-900 text-white shadow-lg"
            : "border-zinc-900 bg-white shadow-md"
          : highlight
            ? "border-zinc-200 bg-white/60 text-zinc-800 hover:border-zinc-400"
            : "border-zinc-200 bg-white hover:border-zinc-400"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
            selected
              ? "border-current bg-current"
              : "border-zinc-300"
          }`}>
            {selected && <Check className={`w-3 h-3 ${highlight && selected ? "text-zinc-900" : "text-white"}`} strokeWidth={3} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{name}</span>
              {badge && (
                <span className={`text-[10px] uppercase tracking-[0.14em] rounded-full px-2 py-0.5 font-semibold ${
                  selected && highlight
                    ? "bg-amber-400 text-zinc-900"
                    : selected
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-zinc-100 text-zinc-500"
                }`}>
                  {badge}
                </span>
              )}
            </div>
            <div className={`text-xs mt-0.5 leading-relaxed ${selected && highlight ? "text-white/70" : "text-zinc-500"}`}>{desc}</div>
          </div>
        </div>
        <div className={`font-display text-xl font-medium shrink-0 ${selected && highlight ? "text-white" : "text-zinc-900"}`}>{price}</div>
      </div>
    </button>
  );
}
