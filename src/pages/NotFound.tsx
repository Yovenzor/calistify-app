import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col items-center justify-center border-x border-border/70 bg-background px-6 text-center"
    >
      <Logo size="md" />
      <h1 className="mt-8 text-[56px] leading-none font-bold tracking-tight text-primary">
        404
      </h1>
      <p className="mt-3 text-[15px] font-semibold">Page not found</p>
      <p className="mt-1.5 max-w-[260px] text-[13px] text-muted-foreground">
        The screen you&apos;re looking for doesn&apos;t exist.
      </p>
      <Button
        onClick={() => navigate("/app")}
        className="mt-6 h-11 rounded-xl px-6 font-semibold"
      >
        Back to Calistify
      </Button>
    </motion.div>
  );
}
