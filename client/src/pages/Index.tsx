import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, Target, TrendingUp, MessageSquare, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const hasSupabase = Boolean(import.meta.env.VITE_SUPABASE_URL);
    if (!hasSupabase) {
      // If Supabase not configured, do not attempt to call auth; just proceed.
      const demoName = localStorage.getItem("demo_user_name") || "Demo Student";
      localStorage.setItem("demo_user_name", demoName);
      return;
    }
    // If Supabase configured, check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    }).catch(() => {
      // ignore errors and stay on landing page
    });
  }, [navigate]);

  return (
    <div className="py-16">
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
          Your Academic Compass
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          AI-powered personalized guidance for your academic journey and career success
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-elegant"
          >
            Get Started
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
