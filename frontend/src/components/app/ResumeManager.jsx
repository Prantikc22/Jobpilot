import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Loader2, Eye, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";

export default function ResumeManager({ profile, onUpdated }) {
  const fileInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [parsing, setParsing] = useState(false);

  const hasResume = !!profile?.resume_filename;

  const onPick = () => fileInputRef.current?.click();

  const onChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      toast.error("Only PDF or DOCX accepted");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5 MB");
      return;
    }
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api.post("/resumes/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Resume updated ✓");
      onUpdated?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const viewResume = async () => {
    try {
      const { data } = await api.get("/resumes/signed-url");
      window.open(data.signed_url, "_blank");
    } catch (err) {
      toast.error("Couldn't generate preview link");
    }
  };

  const parseAgain = async () => {
    setParsing(true);
    try {
      await api.post("/resumes/parse");
      toast.success("Re-parsed with AI ✨");
      onUpdated?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Parse failed");
    } finally {
      setParsing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="jp-card rounded-2xl p-5 overflow-hidden relative"
      data-testid="resume-manager"
    >
      <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-gradient-to-br from-rose-400 to-orange-400 opacity-10 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-400 font-semibold">
          <FileText className="w-3.5 h-3.5" /> Your resume
        </div>

        {hasResume ? (
          <div className="mt-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-12 rounded-md bg-gradient-to-br from-rose-100 to-rose-200 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-zinc-900 truncate" data-testid="resume-filename">{profile.resume_filename}</div>
                <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  {profile.resume_parsed ? "Parsed by AI" : "Uploaded · not yet parsed"}
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={viewResume} className="jp-btn-secondary text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1.5" data-testid="resume-view">
                <Eye className="w-3.5 h-3.5" /> View
              </button>
              <button onClick={onPick} disabled={busy} className="jp-btn-secondary text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 disabled:opacity-50" data-testid="resume-replace">
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Replace
              </button>
              <button onClick={parseAgain} disabled={parsing} className="jp-btn-primary text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 disabled:opacity-50" data-testid="resume-parse-again">
                {parsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Re-parse with AI"}
              </button>
            </div>
            {profile.resume_parsed?.skills?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-zinc-100">
                <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-400 font-semibold mb-2">Detected skills</div>
                <div className="flex flex-wrap gap-1.5" data-testid="resume-parsed-skills">
                  {profile.resume_parsed.skills.slice(0, 12).map((s) => (
                    <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 text-center">
            <div className="border-2 border-dashed border-zinc-200 rounded-2xl p-6 hover:border-zinc-400 transition-colors cursor-pointer" onClick={onPick} data-testid="resume-dropzone">
              <div className="mx-auto w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center mb-2">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              </div>
              <div className="text-sm font-medium text-zinc-900">Upload your resume</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">PDF or DOCX · up to 5 MB</div>
            </div>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={onChange} data-testid="resume-file-input" />
      </div>
    </motion.div>
  );
}
