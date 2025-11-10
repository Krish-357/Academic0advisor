import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, BookOpen, Target, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Analytics page:
 * - Tries to fetch courses from Supabase 'courses' table (preferred).
 * - Falls back to 'performance_data' or localStorage 'advisor_data' if needed.
 * - Computes weighted GPA, trends, strengths, weaknesses, and a simple predictive insight.
 */

const Analytics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string>("");
  const [courses, setCourses] = useState<any[]>([]);
  const [interests, setInterests] = useState<any[]>([]);

  useEffect(() => {
    // Load data (prefer Supabase, fallback to localStorage)
    (async () => {
      // Try supabase session -> if no session still try public tables if allowed
      try {
        // Attempt multiple tables for compatibility
        const [
          coursesRes,
          perfRes,
          intRes
        ] = await Promise.allSettled([
          supabase.from("courses").select("*"),
          supabase.from("performance_data").select("*"),
          supabase.from("student_interests").select("*"),
        ]);

        // Prefer courses table
        if (coursesRes.status === "fulfilled" && Array.isArray((coursesRes.value as any).data) && (coursesRes.value as any).data.length > 0) {
          setCourses((coursesRes.value as any).data);
        } else if (perfRes.status === "fulfilled" && Array.isArray((perfRes.value as any).data) && (perfRes.value as any).data.length > 0) {
          // support older performance_data schema
          setCourses((perfRes.value as any).data.map((r: any) => ({
            id: r.id,
            name: r.course_name || r.name || `Course ${r.id}`,
            credits: r.credits ?? r.credit_hours ?? 3,
            grade: r.grade,
            term: r.term,
          })));
        } else {
          // localStorage fallback
          const saved = localStorage.getItem("advisor_data");
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed.courses)) setCourses(parsed.courses);
              if (Array.isArray(parsed.performance)) setCourses(parsed.performance); // sometimes stored as performance
            } catch {}
          }
        }

        // interests: try student_interests then localStorage
        if (intRes.status === "fulfilled" && Array.isArray((intRes.value as any).data) && (intRes.value as any).data.length > 0) {
          setInterests((intRes.value as any).data);
        } else {
          const saved = localStorage.getItem("advisor_data");
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed.interests)) setInterests(parsed.interests);
            } catch {}
          }
        }
      } catch (err) {
        // any unexpected error: fallback to localStorage only
        const saved = localStorage.getItem("advisor_data");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed.courses)) setCourses(parsed.courses);
            if (Array.isArray(parsed.interests)) setInterests(parsed.interests);
          } catch {}
        }
      }
    })();
  }, []);

  // ----- Helpers: grade normalization and weighted GPA -----
  // Two common grade formats handled:
  // 1) numeric 0..10 or 0..4 (we try to detect by scale)
  // 2) letter grades "A, A+, B, C"
  const parseGradeValue = (raw: any): number => {
    if (raw === null || raw === undefined || raw === "") return 0;
    if (typeof raw === "number") {
      return raw;
    }
    const s = String(raw).trim();
    // letter grades
    const L = s.toUpperCase();
    if (["A+", "A"].includes(L)) return 4;
    if (L === "A-") return 3.7;
    if (L === "B+") return 3.3;
    if (L === "B") return 3.0;
    if (L === "B-") return 2.7;
    if (L === "C+") return 2.3;
    if (L === "C") return 2.0;
    if (L === "D") return 1.0;
    if (L === "F") return 0;
    // numeric string. detect scale: if > 4 (likely 10-scale), convert to 4-scale
    const num = Number(s.replace(",", "."));
    if (Number.isNaN(num)) return 0;
    if (num > 4.5) {
      // assume 10-scale (or 100-scale). Normalize to 4.0: if max 10 -> /10*4
      if (num <= 10) return Number(((num / 10) * 4).toFixed(3));
      if (num <= 100) return Number(((num / 100) * 4).toFixed(3));
      // otherwise clamp
      return Math.min(4, num / 25); // fallback
    }
    return Math.min(4, num); // 0..4
  };

  const computeWeightedGPA = (courseList: any[]) => {
    if (!courseList || courseList.length === 0) return 0;
    let totalPoints = 0;
    let totalCredits = 0;
    for (const c of courseList) {
      const credits = Number(c.credits ?? c.credit ?? c.credit_hours ?? 0) || 0;
      const gradeVal = parseGradeValue(c.grade ?? c.gpa ?? c.score);
      // if credits missing, assume 3 credits (safe default)
      const cr = credits > 0 ? credits : 3;
      totalPoints += gradeVal * cr;
      totalCredits += cr;
    }
    if (totalCredits === 0) return 0;
    return Number((totalPoints / totalCredits).toFixed(2));
  };

  // simple linear slope predictive : predict next GPA by slope of course grades (by insertion order)
  const predictNextGPA = (courseList: any[]) => {
    if (!courseList || courseList.length < 2) return null;
    // map index -> gradeVal
    const points = courseList.map((c, i) => ({ x: i, y: parseGradeValue(c.grade ?? c.gpa ?? c.score) }));
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return null;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    const nextX = n;
    const predicted = intercept + slope * nextX;
    // clamp
    return Number(Math.max(0, Math.min(4, predicted)).toFixed(2));
  };

  // ----- UI actions: generate insights (local) -----
  const generateInsights = async (analysisType: string) => {
    setInsights("");
    setLoading(true);

    try {
      // make sure we have latest courses / interests (they were loaded on mount)
      const currentCourses = courses;
      const currentInterests = interests;

      if (!currentCourses || currentCourses.length === 0) {
        // try localStorage quick fallback
        const saved = localStorage.getItem("advisor_data");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed.courses)) {
              setCourses(parsed.courses);
            }
          } catch {}
        }
      }

      const gpa = computeWeightedGPA(currentCourses);
      const high = currentCourses.filter(c => parseGradeValue(c.grade) >= 3.5).map(c => `${c.name} (${c.grade})`);
      const low = currentCourses.filter(c => parseGradeValue(c.grade) < 2.5).map(c => `${c.name} (${c.grade})`);
      const predictedNext = predictNextGPA(currentCourses);

      let text = "";

      switch (analysisType) {
        case "performance_trends":
          text = `Performance Trends\n\nWeighted Average GPA: ${gpa}\n\nTop recent courses:\n${currentCourses.slice(-5).map(c => `- ${c.name}: ${c.grade}`).join("\n") || "No courses"}\n\nPredicted next GPA (simple trend): ${predictedNext ?? "N/A"}`;
          break;

        case "strength_analysis":
          text = `Strength Analysis\n\nTop performing subjects:\n${high.length ? high.join("\n") : "No strong areas identified yet."}\n\nRecommendation: Continue advanced work in these areas and apply to internships/projects.`;
          break;

        case "improvement_areas":
          text = `Improvement Areas\n\nLower performing subjects:\n${low.length ? low.join("\n") : "No significant weak areas detected."}\n\nRecommendation: Review fundamentals, seek tutoring/mentorship, or repeat tricky modules.`;
          break;

        case "predictive_insights":
          text = `Predictive Insights\n\nCurrent weighted GPA: ${gpa}\n${predictedNext ? `Estimated next GPA (trend): ${predictedNext}\n` : ""}\n${gpa >= 3.5 ? "You're on track for strong academic outcomes." : gpa >= 3.0 ? "Solid performance; improving key courses will help." : "Work on core fundamentals to improve GPA."}\n\nInterests: ${currentInterests && currentInterests.length ? currentInterests.map(i => i.topic || i).join(", ") : "None specified."}`;
          break;

        default:
          text = "No analysis selected.";
      }

      setInsights(text);
      toast({ title: "Analysis complete", description: "Insights generated from available data." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Analysis failed", description: err?.message || String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Performance Analytics</h1>
          <p className="text-muted-foreground">Insights computed from your saved courses and interests (Supabase → fallback local).</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => generateInsights('performance_trends')}>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Performance Trends</CardTitle></CardHeader>
            <CardContent><TrendingUp className="w-8 h-8 text-primary mb-2" /><p className="text-xs text-muted-foreground">Analyze grade patterns over time</p></CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => generateInsights('strength_analysis')}>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Strength Analysis</CardTitle></CardHeader>
            <CardContent><Target className="w-8 h-8 text-secondary mb-2" /><p className="text-xs text-muted-foreground">Discover your academic strengths</p></CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => generateInsights('improvement_areas')}>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Improvement Areas</CardTitle></CardHeader>
            <CardContent><BookOpen className="w-8 h-8 text-accent mb-2" /><p className="text-xs text-muted-foreground">Identify growth opportunities</p></CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => generateInsights('predictive_insights')}>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Predictive Insights</CardTitle></CardHeader>
            <CardContent><Sparkles className="w-8 h-8 text-primary mb-2" /><p className="text-xs text-muted-foreground">Forecast likely outcomes</p></CardContent>
          </Card>
        </div>

        {/* No Data */}
        {(!courses || courses.length === 0) && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No performance data yet</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">Add courses with credits and grades in the dashboard to generate analytics.</p>
              <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
            </CardContent>
          </Card>
        )}

        {insights && (
          <Card>
            <CardHeader><CardTitle>Your Personalized Insights</CardTitle><CardDescription>Computed from your courses & interests.</CardDescription></CardHeader>
            <CardContent><pre className="whitespace-pre-wrap text-sm">{insights}</pre></CardContent>
          </Card>
        )}

        {loading && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Sparkles className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Analyzing...</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
