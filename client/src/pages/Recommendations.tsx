import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Briefcase, GraduationCap, Award, Sparkles, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Recommendations = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate("/auth");
          return;
        }

        const userId = session.user.id;

        // Fetch recommendations table if it exists
        const { data: recsData } = await supabase
          .from("recommendations")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "active")
          .order("priority", { ascending: false });

        if (recsData && recsData.length > 0) {
          setRecommendations(recsData);
          setLoading(false);
          return;
        }

        // Otherwise, generate recommendations from courses & interests
        const [coursesRes, interestsRes] = await Promise.allSettled([
          supabase.from("courses").select("*").eq("user_id", userId),
          supabase.from("student_interests").select("*").eq("user_id", userId),
        ]);

        let courses: any[] = [];
        let interests: any[] = [];

        if (coursesRes.status === "fulfilled" && Array.isArray((coursesRes.value as any).data)) {
          courses = (coursesRes.value as any).data;
        }
        if (interestsRes.status === "fulfilled" && Array.isArray((interestsRes.value as any).data)) {
          interests = (interestsRes.value as any).data;
        }

        if (courses.length === 0 && interests.length === 0) {
          const saved = localStorage.getItem("advisor_data");
          if (saved) {
            const parsed = JSON.parse(saved);
            courses = parsed.courses || parsed.performance || [];
            interests = parsed.interests || [];
          }
        }

        const generated = generateFromData(courses, interests);
        setRecommendations(generated);
      } catch (err) {
        console.error("Recommendation load error:", err);
        const saved = localStorage.getItem("advisor_data");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const generated = generateFromData(parsed.courses || [], parsed.interests || []);
            setRecommendations(generated);
          } catch {
            setRecommendations([]);
          }
        } else {
          setRecommendations([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  function generateFromData(courses: any[], interests: any[]) {
    const recs: any[] = [];
    const interestKeywords = (interests || []).map((i: any) => (i.topic || i).toString().toLowerCase());

    // === Course-based recommendations ===
    (courses || []).forEach((c: any, idx: number) => {
      const name = c.name || c.course_name || `Course ${idx + 1}`;
      const grade = parseFloat(c.grade) || 0;
      const isStrong = grade >= 3.5;
      const isWeak = grade > 0 && grade < 2.5;

      if (isStrong) {
        recs.push({
          id: `course-strong-${idx}`,
          title: `Advanced: ${name}`,
          description: `Consider taking higher-level or research-oriented subjects related to ${name}.`,
          recommendation_type: "course",
          confidence_score: 0.9,
          priority: 9,
          reasoning: `You performed strongly in ${name}.`,
        });
      } else if (isWeak) {
        recs.push({
          id: `course-improve-${idx}`,
          title: `Improve in ${name}`,
          description: `Reinforce core concepts of ${name} before moving ahead.`,
          recommendation_type: "course",
          confidence_score: 0.7,
          priority: 6,
          reasoning: `Your grade in ${name} suggests room for improvement.`,
        });
      } else {
        recs.push({
          id: `course-${idx}`,
          title: `Explore more in ${name}`,
          description: `Take advanced electives or labs related to ${name}.`,
          recommendation_type: "course",
          confidence_score: 0.8,
          priority: 7,
          reasoning: `Based on your course selection of ${name}.`,
        });
      }
    });

    // === Interest-driven recommendations ===
    interestKeywords.forEach((k: string, i: number) => {
      if (!k) return;
      const cap = k.charAt(0).toUpperCase() + k.slice(1);
      recs.push({
        id: `major-${i}`,
        title: `${cap} Major`,
        description: `Consider a major focusing on ${k}.`,
        recommendation_type: "major",
        confidence_score: 0.85,
        priority: 8,
        reasoning: `Matches your interest in ${k}.`,
      });
      recs.push({
        id: `career-${i}`,
        title: `${cap} Career Path`,
        description: `Explore professional opportunities in ${k}.`,
        recommendation_type: "career",
        confidence_score: 0.8,
        priority: 7,
        reasoning: `Aligns with your interests and market trends.`,
      });
      recs.push({
        id: `intern-${i}`,
        title: `${cap} Internship`,
        description: `Apply for internships focused on ${k}.`,
        recommendation_type: "internship",
        confidence_score: 0.75,
        priority: 6,
        reasoning: `Real-world exposure will boost your skills in ${k}.`,
      });
      recs.push({
        id: `cert-${i}`,
        title: `${cap} Certification`,
        description: `Earn a short certification to validate ${k} skills.`,
        recommendation_type: "certification",
        confidence_score: 0.7,
        priority: 5,
        reasoning: `Certifications help in placements and internships.`,
      });
    });

    if (recs.length === 0) {
      recs.push({
        id: "default",
        title: "Add Courses & Interests",
        description: "Add data in your dashboard to receive personalized recommendations.",
        recommendation_type: "course",
        confidence_score: 0.5,
        priority: 3,
        reasoning: "No data available to generate recommendations.",
      });
    }

    recs.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    return recs;
  }

  const updateRecommendationStatus = async (id: string, status: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;

      const { error } = await supabase
        .from("recommendations")
        .update({ status })
        .eq("id", id)
        .eq("user_id", userId);

      setRecommendations(prev => prev.filter(rec => rec.id !== id));

      if (error) throw error;

      toast({
        title: status === "completed" ? "Marked complete" : "Dismissed",
      });
    } catch (err: any) {
      console.error("Failed to update recommendation:", err);
      setRecommendations(prev => prev.filter(rec => rec.id !== id));
      toast({
        variant: "destructive",
        title: "Update failed",
        description: err?.message || "Could not update recommendation status.",
      });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "course": return BookOpen;
      case "major": return GraduationCap;
      case "career": return Briefcase;
      case "internship": return Briefcase;
      case "certification": return Award;
      default: return Sparkles;
    }
  };

  const filteredRecommendations =
    filter === "all"
      ? recommendations
      : recommendations.filter(r => r.recommendation_type === filter);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Sparkles className="w-8 h-8 animate-pulse text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Your Recommendations</h1>
          <p className="text-muted-foreground">
            Automatically generated from your courses and interests (real-time Supabase sync).
          </p>
        </div>

        <Tabs defaultValue="all" onValueChange={setFilter}>
          <TabsList className="grid w-full grid-cols-6 lg:w-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="course">Courses</TabsTrigger>
            <TabsTrigger value="major">Majors</TabsTrigger>
            <TabsTrigger value="career">Careers</TabsTrigger>
            <TabsTrigger value="internship">Internships</TabsTrigger>
            <TabsTrigger value="certification">Certs</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="space-y-4 mt-6">
            {filteredRecommendations.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No recommendations yet</h3>
                  <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                    Add interests and courses to generate personalized insights.
                  </p>
                  <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
                </CardContent>
              </Card>
            ) : (
              filteredRecommendations.map((rec) => {
                const Icon = getIcon(rec.recommendation_type);
                return (
                  <Card key={rec.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-xl mb-1">{rec.title}</CardTitle>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary">{rec.recommendation_type}</Badge>
                              {rec.priority && <span className="text-xs text-muted-foreground">Priority: {rec.priority}/10</span>}
                              {rec.confidence_score && <span className="text-xs text-muted-foreground">Confidence: {(rec.confidence_score * 100).toFixed(0)}%</span>}
                            </div>
                            <CardDescription className="text-sm">{rec.description}</CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {rec.reasoning && (
                        <div className="bg-muted/50 rounded-lg p-4 mb-4">
                          <p className="text-sm font-medium mb-1">Why this recommendation?</p>
                          <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateRecommendationStatus(rec.id, "completed")}>
                          <Check className="w-4 h-4 mr-1" /> Mark Complete
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateRecommendationStatus(rec.id, "dismissed")}>
                          <X className="w-4 h-4 mr-1" /> Dismiss
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Recommendations;
