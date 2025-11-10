import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, BookOpen, Target, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Analytics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string>("");
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [interests, setInterests] = useState<any[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      fetchData(session.user.id);
    };
    checkAuth();
  }, [navigate]);

  const fetchData = async (userId: string) => {
    try {
      const [perfRes, intRes] = await Promise.all([
        supabase.from('performance_data').select('*').eq('user_id', userId),
        supabase.from('student_interests').select('*').eq('user_id', userId),
      ]);

      setPerformanceData(perfRes.data || []);
      setInterests(intRes.data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading data",
        description: error.message,
      });
    }
  };

  const generateInsights = async (analysisType: string) => {
    setLoading(true);
    setInsights("");

    try {
      const { data, error } = await supabase.functions.invoke('data-insights', {
        body: {
          performanceData,
          interests,
          analysisType,
        },
      });

      if (error) throw error;

      setInsights(data.insights);
      
      toast({
        title: "Analysis complete!",
        description: "Your personalized insights are ready.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: error.message || "Failed to generate insights",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Performance Analytics</h1>
          <p className="text-muted-foreground">
            AI-powered insights into your academic performance and potential
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => generateInsights('performance_trends')}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendingUp className="w-8 h-8 text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Analyze your grade patterns over time</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => generateInsights('strength_analysis')}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Strength Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <Target className="w-8 h-8 text-secondary mb-2" />
              <p className="text-xs text-muted-foreground">Discover your academic strengths</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => generateInsights('improvement_areas')}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Improvement Areas</CardTitle>
            </CardHeader>
            <CardContent>
              <BookOpen className="w-8 h-8 text-accent mb-2" />
              <p className="text-xs text-muted-foreground">Identify growth opportunities</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => generateInsights('predictive_insights')}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Predictive Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <Sparkles className="w-8 h-8 text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Forecast your success areas</p>
            </CardContent>
          </Card>
        </div>

        {performanceData.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No performance data yet</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                Add your course grades and academic history to get personalized analytics
              </p>
              <Button onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {insights && (
          <Card>
            <CardHeader>
              <CardTitle>Your Personalized Insights</CardTitle>
              <CardDescription>
                AI-generated analysis based on your data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{insights}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Sparkles className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Analyzing your data...</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
