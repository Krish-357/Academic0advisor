import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, TrendingUp, Target, MessageSquare, Plus, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Fallback mock mode when Supabase env not configured (helps dashboard render without auth)
const MOCK_MODE = !import.meta.env.VITE_SUPABASE_URL;

const getMockData = (userId = 'student1') => ({
  profile: { id: userId, full_name: "Demo Student", email: "student@example.com", program: "BSc Computer Science" },
  interests: [{ id: 1, topic: "Artificial Intelligence" }, { id: 2, topic: "Data Science" }],
  performance: [{ term: "Sem1", gpa: 8.5 }, { term: "Sem2", gpa: 8.7 }],
  recommendations: [
    { id: 1, title: "AI Fundamentals", description: "Intro to AI", recommendation_type: "Course", confidence_score: 0.92 }
  ]
});

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [interests, setInterests] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      fetchDashboardData(session.user.id);
    };
    checkAuth();
  }, [navigate]);

  const fetchDashboardData = async (userId: string) => {
    if (MOCK_MODE) {
      const mock = getMockData(userId);
      setProfile(mock.profile);
      setInterests(mock.interests);
      setPerformance(mock.performance);
      setRecs(mock.recommendations);
      setLoading(false);
      return;
    }

    try {
      const [profileRes, interestsRes, performanceRes, recsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('student_interests').select('*').eq('user_id', userId).limit(5),
        supabase.from('performance_data').select('*').eq('user_id', userId).limit(5),
        supabase.from('recommendations').select('*').eq('user_id', userId).eq('status', 'active').limit(3),
      ]);

      setProfile(profileRes.data);
      setInterests(interestsRes.data || []);
      setPerformance(performanceRes.data || []);
      setRecommendations(recsRes.data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading dashboard",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAverageGPA = () => {
    if (performance.length === 0) return 0;
    const total = performance.reduce((sum, p) => sum + (p.gpa || 0), 0);
    return (total / performance.length).toFixed(2);
  };

  const getProgressPercentage = () => {
    const profileComplete = profile?.academic_level && profile?.current_major ? 50 : 25;
    const interestsComplete = interests.length > 0 ? 25 : 0;
    const performanceComplete = performance.length > 0 ? 25 : 0;
    return profileComplete + interestsComplete + performanceComplete;
  };

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
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent p-8 text-white shadow-elegant">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2">
              Welcome back, {profile?.full_name || 'Student'}!
            </h2>
            <p className="text-white/90 mb-6">
              Your personalized academic and career guidance awaits
            </p>
            <div className="flex flex-wrap gap-4">
              <Button 
                onClick={() => navigate("/chat")}
                className="bg-white text-primary hover:bg-white/90"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat with AI Advisor
              </Button>
              <Button 
                onClick={() => navigate("/recommendations")}
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Target className="w-4 h-4 mr-2" />
                View Recommendations
              </Button>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average GPA</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{calculateAverageGPA()}</div>
              <p className="text-xs text-muted-foreground">
                Based on {performance.length} courses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Interests</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{interests.length}</div>
              <p className="text-xs text-muted-foreground">
                Tracked areas of study
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recommendations.length}</div>
              <p className="text-xs text-muted-foreground">
                Personalized suggestions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Profile Completion */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Completion</CardTitle>
            <CardDescription>
              Complete your profile to get better recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Overall Progress</span>
                <span className="font-medium">{getProgressPercentage()}%</span>
              </div>
              <Progress value={getProgressPercentage()} className="h-2" />
              <div className="flex flex-wrap gap-2 mt-4">
                {!profile?.academic_level && (
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Academic Level
                  </Button>
                )}
                {interests.length === 0 && (
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Interests
                  </Button>
                )}
                {performance.length === 0 && (
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Performance Data
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Recommendations */}
        {recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Recommendations</CardTitle>
                  <CardDescription>AI-generated suggestions for you</CardDescription>
                </div>
                <Button variant="ghost" onClick={() => navigate("/recommendations")}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recommendations.map((rec) => (
                <div key={rec.id} className="flex items-start gap-4 p-4 rounded-lg border">
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{rec.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {rec.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                        {rec.recommendation_type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Confidence: {(rec.confidence_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
