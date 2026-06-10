import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const PARAGRAPHS = [
  "Finding a new job feels like a full-time job. Recruiters flood your inbox with irrelevant roles and by the time a job hits LinkedIn, 400 people have already applied.",
  "ApplyAgent works differently. He's an AI agent who gets to know you and scans every job on earth, every day. When he finds an unmissable opportunity, he helps you land it.",
];

const ALL_WORDS = PARAGRAPHS.flatMap((p, pi) =>
  p.split(" ").map((word, wi, arr) => ({
    word,
    isParagraphEnd: pi === 0 && wi === arr.length - 1,
  }))
);

function AnimatedWord({ word, progress, start, end }) {
  const opacity = useTransform(progress, [start, end], [0.12, 1]);
  const y = useTransform(progress, [start, Math.min(start + 0.04, end)], [6, 0]);
  return (
    <motion.span
      style={{ opacity, y }}
      className="inline-block"
    >
      {word}
    </motion.span>
  );
}

export default function TextReveal() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.35"],
  });

  const n = ALL_WORDS.length;

  return (
    <section
      ref={ref}
      className="relative py-24 md:py-36 overflow-hidden"
      data-testid="text-reveal-section"
    >
      <div className="absolute inset-0 jp-dot-grid opacity-15 pointer-events-none" aria-hidden />

      <div className="relative max-w-4xl mx-auto px-6 md:px-8">
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="block text-xs uppercase tracking-[0.24em] text-zinc-400 font-semibold mb-8"
        >
          Why we exist
        </motion.span>

        <p className="font-display text-[1.55rem] sm:text-3xl md:text-4xl lg:text-[2.9rem] leading-[1.3] sm:leading-[1.25] tracking-[-0.02em] text-zinc-900 font-medium">
          {ALL_WORDS.map(({ word, isParagraphEnd }, i) => {
            const band = 0.9 / n;
            const start = (i / n) * 0.9;
            const end = start + band * 1.4;
            return (
              <span key={i}>
                <AnimatedWord
                  word={word}
                  progress={scrollYProgress}
                  start={start}
                  end={Math.min(end, 1)}
                />
                {isParagraphEnd ? (
                  <span className="block mt-[0.8em]" />
                ) : (
                  <span> </span>
                )}
              </span>
            );
          })}
        </p>
      </div>
    </section>
  );
}
