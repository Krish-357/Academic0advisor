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
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      fetchRecommendations(session.user.id);
    };
    checkAuth();
  }, [navigate]);

  const fetchRecommendations = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('priority', { ascending: false });

      if (error) throw error;
      setRecommendations(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading recommendations",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRecommendationStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('recommendations')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setRecommendations(prev => prev.filter(rec => rec.id !== id));
      
      toast({
        title: status === 'completed' ? "Marked as completed!" : "Dismissed",
        description: status === 'completed' 
          ? "Great progress! Keep going." 
          : "Recommendation removed from your list.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating recommendation",
        description: error.message,
      });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'course': return BookOpen;
      case 'major': return GraduationCap;
      case 'career': return Briefcase;
      case 'internship': return Briefcase;
      case 'certification': return Award;
      default: return Sparkles;
    }
  };

  const filteredRecommendations = filter === "all" 
    ? recommendations 
    : recommendations.filter(rec => rec.recommendation_type === filter);

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
            AI-powered personalized suggestions based on your profile and goals
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
                    Chat with our AI advisors to get personalized recommendations
                  </p>
                  <Button onClick={() => navigate("/chat")}>
                    Start AI Chat
                  </Button>
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
                              <span className="text-xs text-muted-foreground">
                                Priority: {rec.priority}/10
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Confidence: {(rec.confidence_score * 100).toFixed(0)}%
                              </span>
                            </div>
                            <CardDescription className="text-sm">
                              {rec.description}
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted/50 rounded-lg p-4 mb-4">
                        <p className="text-sm font-medium mb-1">Why this recommendation?</p>
                        <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateRecommendationStatus(rec.id, 'completed')}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Mark Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateRecommendationStatus(rec.id, 'dismissed')}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Dismiss
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
