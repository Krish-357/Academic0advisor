import { ReactNode, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GraduationCap, LayoutDashboard, MessageSquare, Target, TrendingUp, LogOut, Menu, X } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState("Student");

  useEffect(() => {
    const hasSupabase = Boolean(import.meta.env.VITE_SUPABASE_URL);
    if (!hasSupabase) {
      // Use mock user when Supabase is not configured
      setUserName(localStorage.getItem("demo_user_name") || "Demo Student");
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (!session) {
        // Not logged in
        navigate("/auth");
        return;
      }
      // Try to get profile data
      supabase.from("profiles").select("full_name").eq("id", session.user.id).maybeSingle()
        .then(({ data }) => {
          if (data && data.full_name) setUserName(data.full_name);
          else setUserName(session.user.email || "Student");
        })
        .catch(() => setUserName(session.user.email || "Student"));
    }).catch(() => {
      // Supabase client failed; fall back
      setUserName(localStorage.getItem("demo_user_name") || "Demo Student");
    });

    return () => { mounted = false; };
  }, [navigate]);

  const navItems = [
    { title: "Overview", path: "/dashboard", icon: <LayoutDashboard /> },
    { title: "Recommendations", path: "/recommendations", icon: <TrendingUp /> },
    { title: "Chat", path: "/chat", icon: <MessageSquare /> },
    { title: "Analytics", path: "/analytics", icon: <GraduationCap /> },
  ];

  return (
    <div className="min-h-screen bg-muted-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 shadow">
        <div className="container mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 rounded" onClick={() => setMobileMenuOpen(v => !v)}>
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/dashboard")}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white">
                <GraduationCap />
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-semibold">{userName}</div>
                <div className="text-xs text-muted-foreground">Student</div>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {navItems.map((item) => (
              <button key={item.path} onClick={() => navigate(item.path)} className="text-sm px-3 py-2 rounded hover:bg-muted-100">
                <div className="flex items-center gap-2">{item.icon}<span>{item.title}</span></div>
              </button>
            ))}
            <Button variant="ghost" onClick={() => {
              const hasSupabase = Boolean(import.meta.env.VITE_SUPABASE_URL);
              if (!hasSupabase) {
                // clear demo and redirect
                localStorage.removeItem("demo_user_name");
                navigate("/");
                return;
              }
              supabase.auth.signOut().then(() => navigate("/"));
            }}>
              <LogOut className="mr-2" /> Logout
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white p-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full p-2 text-sm font-medium text-muted-foreground hover:bg-muted-100 rounded"
              >
                {item.icon} <span>{item.title}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
