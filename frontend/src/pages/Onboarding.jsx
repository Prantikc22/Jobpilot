import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Loader2, Upload, CheckCircle2, Sparkles, Plane } from "lucide-react";
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

  // form
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [roles, setRoles] = useState([]);
  const [customRole, setCustomRole] = useState("");
  const [countries, setCountries] = useState([]);
  const [salary, setSalary] = useState("");
  const [jobEmail, setJobEmail] = useState("");
  const [jobEmailPwd, setJobEmailPwd] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeName, setResumeName] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      nav("/signin");
      return;
    }
    api.get("/users/me").then(({ data }) => {
      setProfile(data);
      setFullName(data.full_name || user.user_metadata?.full_name || "");
      setPhone(data.phone || "");
      setLinkedin(data.linkedin_url || "");
      setRoles(data.target_roles || []);
      setCountries(data.target_countries || []);
      setSalary(data.preferred_salary || "");
      setJobEmail(data.job_search_email || "");
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
        job_search_email: jobEmail || undefined,
        job_search_email_password: jobEmailPwd || undefined,
        onboarding_step: next,
        onboarding_completed: next > 8,
      });
      setStep(next);
      if (next > 8) {
        toast.success("All set! Let's go pick a plan.");
        nav("/pricing-checkout");
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
      const { data } = await api.post("/resumes/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
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
        <span className="font-display font-bold tracking-tight">JobPilot</span>
      </a>

      <div className="relative max-w-2xl mx-auto pt-24 pb-16 px-6">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-7">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? "bg-zinc-900" : "bg-zinc-200"}`}
              data-testid={`onb-progress-${i}`}
            />
          ))}
        </div>
        <div className="text-xs uppercase tracking-[0.2em] text-zinc-400 font-semibold mb-2">Step {step} of 8</div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            className="jp-glass rounded-3xl p-7 md:p-8"
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
              <Step title="Dedicated job-search email" sub="We recommend a separate inbox so recruiter communication stays organized. Stored encrypted, never exposed.">
                <div className="space-y-3">
                  <Field label="Job search email" type="email" value={jobEmail} onChange={setJobEmail} required testid="onb-jobemail" />
                  <Field label="Email password" type="password" value={jobEmailPwd} onChange={setJobEmailPwd} testid="onb-jobemail-pwd" placeholder={profile.job_search_email ? "Saved · type to update" : ""} />
                </div>
                <Footer onBack={() => setStep(6)} onNext={() => saveStep(8)} saving={saving} disabled={!jobEmail} />
              </Step>
            )}

            {step === 8 && (
              <Step title="Choose your pilot tier" sub="Start free, or get auto-apply with Starter / Pro." icon={<Sparkles className="w-5 h-5 text-amber-500" />}>
                <div className="space-y-3">
                  <PlanRow id="free" name="Free" price="₹0" desc="AI resume update + 10 matched jobs/month · no auto-apply" current={profile.plan} />
                  <PlanRow id="starter" name="Starter" price="₹499/mo" desc="100 targeted auto-applications/mo" current={profile.plan} />
                  <PlanRow id="pro" name="Pro" price="₹999/mo" desc="300 + Career Shield + priority" highlight current={profile.plan} />
                </div>
                <Footer
                  onBack={() => setStep(7)}
                  onNext={() => saveStep(9)}
                  saving={saving}
                  nextLabel="Continue to checkout"
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
        <h2 className="font-display text-2xl md:text-3xl tracking-[-0.02em] text-zinc-900 font-medium">{title}</h2>
      </div>
      <p className="text-zinc-500 mt-1">{sub}</p>
      <div className="mt-6">{children}</div>
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
        className="jp-btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium disabled:opacity-50"
        data-testid="onb-next"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{nextLabel} <ArrowRight className="w-4 h-4" /></>}
      </button>
    </div>
  );
}

function PlanRow({ id, name, price, desc, highlight, current }) {
  const isCurrent = current === id;
  return (
    <div className={`rounded-2xl border p-4 flex items-center justify-between ${highlight ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white"}`}>
      <div>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{name}</span>
          {isCurrent && <span className="text-[10px] uppercase tracking-[0.16em] bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">Current</span>}
        </div>
        <div className={`text-xs mt-0.5 ${highlight ? "text-white/70" : "text-zinc-500"}`}>{desc}</div>
      </div>
      <div className="text-right">
        <div className={`font-display text-xl font-medium ${highlight ? "" : "text-zinc-900"}`}>{price}</div>
      </div>
    </div>
  );
}
