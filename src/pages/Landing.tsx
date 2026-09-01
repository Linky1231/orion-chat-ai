import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { MessageCircle, Sparkles, Zap, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const STAR_COUNT = 60;
const stars = Array.from({ length: STAR_COUNT }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2 + 0.5,
  delay: Math.random() * 4,
  duration: Math.random() * 3 + 2,
}));

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Starfield */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {stars.map((s) => (
          <motion.div
            key={s.id}
            className="absolute rounded-full bg-white"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size }}
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Glow orb */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2" aria-hidden>
        <div className="h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
        {/* Logo mark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8 flex items-center gap-3"
        >
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
            <Sparkles className="size-7 text-primary" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="text-center text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl"
        >
          <span className="bg-gradient-to-b from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent">
            Orión
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-5 max-w-md text-center text-lg leading-relaxed text-muted-foreground"
        >
          Tu asistente inteligente sin límites. Pregunta lo que quieras, cuando quieras.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="mt-10"
        >
          <Button
            size="lg"
            className="cursor-pointer gap-2 rounded-full bg-primary px-8 py-6 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
            onClick={() => navigate("/chat")}
          >
            <MessageCircle className="size-5" />
            Empezar a chatear
          </Button>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mt-14 flex flex-wrap items-center justify-center gap-4"
        >
          {[
            { icon: Zap, text: "Sin límites" },
            { icon: Globe, text: "Sin registro" },
            { icon: Sparkles, text: "IA avanzada" },
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-2 text-sm text-muted-foreground backdrop-blur-sm"
            >
              <Icon className="size-4 text-primary/70" />
              {text}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
