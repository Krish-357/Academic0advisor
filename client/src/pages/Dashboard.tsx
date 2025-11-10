import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ThemeToggle";

const MOCK_MODE = !import.meta.env.VITE_SUPABASE_URL;

const getMockData = (userId = "student1") => ({
  profile: {
    id: userId,
    full_name: "Demo Student",
    email: "student@example.com",
    program: "BSc Computer Science",
    academic_level: "Undergraduate",
  },
  interests: [
    { id: 1, topic: "Artificial Intelligence" },
    { id: 2, topic: "Data Science" },
  ],
  performance: [
    { term: "Sem1", gpa: 8.5 },
    { term: "Sem2", gpa: 8.7 },
  ],
});

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [theme, setTheme] = useState(localStorage.getItem("site-theme") || "light");
  const [profile, setProfile] = useState<any>({ full_name: "Demo Student", academic_level: "" });
  const [interests, setInterests] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [courseInput, setCourseInput] = useState({ name: "", credits: "", grade: "" });
  const [interestsInput, setInterestsInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [averageGPA, setAverageGPA] = useState(0);

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      if (MOCK_MODE) {
        const mock = getMockData();
        setProfile(mock.profile);
        setInterests(mock.interests);
        setCourses(mock.performance);
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      setUserId(session.user.id);
      await fetchDashboardData(session.user.id);
    };

    init();
  }, [navigate]);

  // Load user dashboard data
  const fetchDashboardData = async (uid: string) => {
    try {
      const [profileRes, interestsRes, perfRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).single(),
        supabase.from("student_interests").select("*").eq("user_id", uid),
        supabase.from("performance_data").select("*").eq("user_id", uid),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (interestsRes.data) setInterests(interestsRes.data);
      if (perfRes.data) setCourses(perfRes.data);
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error loading data",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // GPA Auto Calculation
  useEffect(() => {
    if (courses.length === 0) return setAverageGPA(0);
    let totalPoints = 0, totalCredits = 0;
    courses.forEach((c) => {
      totalPoints += (Number(c.grade) || 0) * (Number(c.credits) || 0);
      totalCredits += Number(c.credits) || 0;
    });
    const avg = totalCredits ? totalPoints / totalCredits : 0;
    setAverageGPA(Number(avg.toFixed(2)));
  }, [courses]);

  // Add interest — synced with Supabase
  const addInterests = async () => {
    const list = interestsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((t, i) => ({ id: Date.now() + i, topic: t }));

    const next = [...interests, ...list];
    setInterests(next);
    setInterestsInput("");

    if (userId) {
      try {
        await Promise.all(
          list.map((it) =>
            supabase.from("student_interests").insert({
              user_id: userId,
              topic: it.topic,
            })
          )
        );
        toast({ title: "Interests added successfully" });
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: "Failed to save interests",
          description: err.message,
        });
      }
    }

    localStorage.setItem("advisor_data", JSON.stringify({ profile, interests: next, courses }));
  };

  // Add course — synced with Supabase
  const addCourse = async () => {
    const c = {
      id: Date.now(),
      name: courseInput.name || "Untitled",
      credits: Number(courseInput.credits) || 0,
      grade: Number(courseInput.grade) || 0,
    };

    const next = [...courses, c];
    setCourses(next);
    setCourseInput({ name: "", credits: "", grade: "" });

    if (userId) {
      try {
        await supabase.from("performance_data").insert({
          user_id: userId,
          course_name: c.name,
          credits: c.credits,
          grade: c.grade,
          gpa: averageGPA,
        });
        toast({ title: "Course saved successfully" });
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: "Failed to save course",
          description: err.message,
        });
      }
    }

    localStorage.setItem("advisor_data", JSON.stringify({ profile, interests, courses: next }));
  };

  // Remove course (also from Supabase)
  const removeCourse = async (cid: any, name: string) => {
    const next = courses.filter((x) => x.id !== cid);
    setCourses(next);

    if (userId) {
      try {
        await supabase.from("performance_data").delete().eq("user_id", userId).eq("course_name", name);
      } catch (err) {
        console.error(err);
      }
    }

    localStorage.setItem("advisor_data", JSON.stringify({ profile, interests, courses: next }));
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
        {/* Theme + Reset */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Profile Controls</h3>
            <p className="text-sm text-muted-foreground">
              Edit academic level, interests, and course data.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle theme={theme} setTheme={setTheme} />
            <Button
              variant="secondary"
              onClick={() => {
                localStorage.removeItem("advisor_data");
                setCourses([]);
                setInterests([]);
                setProfile({ full_name: "Demo Student", academic_level: "" });
              }}
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Academic Info Panel */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Interests Section */}
          <div className="col-span-2 rounded-xl p-4 border hover:shadow-glow transition">
            <label className="block text-sm font-medium">Academic Level</label>
            <select
              value={profile.academic_level || ""}
              onChange={(e) => {
                const updated = { ...profile, academic_level: e.target.value };
                setProfile(updated);
                localStorage.setItem(
                  "advisor_data",
                  JSON.stringify({ profile: updated, interests, courses })
                );
              }}
              className="mt-2 w-full p-2 rounded-md border"
            >
              <option value="">Select level</option>
              <option value="Undergraduate">Undergraduate</option>
              <option value="Graduate">Graduate</option>
              <option value="PhD">PhD</option>
            </select>

            <label className="block text-sm font-medium mt-4">
              Interests (comma separated)
            </label>
            <input
              value={interestsInput}
              onChange={(e) => setInterestsInput(e.target.value)}
              placeholder="e.g. AI, Data Science"
              className="mt-2 w-full p-2 rounded-md border"
            />
            <div className="mt-3 flex gap-2">
              <Button onClick={addInterests}>Add Interests</Button>
              <Button variant="ghost" onClick={() => setInterests([])}>
                Clear
              </Button>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-medium">Current Interests</h4>
              <div className="mt-2 flex gap-2 flex-wrap">
                {interests.map((it) => (
                  <span
                    key={it.id}
                    className="px-3 py-1 rounded-full border hover:bg-primary/10 transition"
                  >
                    {it.topic}
                  </span>
                ))}
                {interests.length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    No interests added
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Courses Section */}
          <div className="rounded-xl p-4 border hover:shadow-glow transition">
            <h4 className="text-sm font-medium">Performance & Courses</h4>
            <div className="mt-3 space-y-2">
              <input
                placeholder="Course name"
                value={courseInput.name}
                onChange={(e) =>
                  setCourseInput({ ...courseInput, name: e.target.value })
                }
                className="w-full p-2 rounded-md border"
              />
              <input
                placeholder="Credits"
                value={courseInput.credits}
                onChange={(e) =>
                  setCourseInput({ ...courseInput, credits: e.target.value })
                }
                className="w-full p-2 rounded-md border"
              />
              <input
                placeholder="Grade (0–4 scale)"
                value={courseInput.grade}
                onChange={(e) =>
                  setCourseInput({ ...courseInput, grade: e.target.value })
                }
                className="w-full p-2 rounded-md border"
              />
              <div className="flex gap-2">
                <Button onClick={addCourse}>Add Course</Button>
                <Button variant="ghost" onClick={() => setCourses([])}>
                  Clear
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <h5 className="text-sm font-medium">Courses</h5>
              <div className="mt-2 space-y-2">
                {courses.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2 rounded-md border hover:bg-muted transition"
                  >
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Credits: {c.credits} • Grade: {c.grade}
                      </div>
                    </div>
                    <Button variant="ghost" onClick={() => removeCourse(c.id, c.name)}>
                      Remove
                    </Button>
                  </div>
                ))}
                {courses.length === 0 && (
                  <div className="text-sm text-muted-foreground">No courses added</div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <h5 className="text-sm font-medium">Average GPA</h5>
              <div className="text-lg font-bold">{averageGPA}</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
