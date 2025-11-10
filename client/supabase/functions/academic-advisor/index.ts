import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  studentProfile: {
    interests: string[];
    performanceData: any[];
    currentMajor?: string;
    academicLevel: string;
  };
  requestType: 'course_recommendation' | 'study_plan' | 'major_guidance';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { studentProfile, requestType }: RequestBody = await req.json();
    console.log('Academic Advisor Agent - Request Type:', requestType);

    // Build context-aware system prompt
    const systemPrompt = `You are an expert Academic Advisor AI agent specialized in personalized education guidance.

Your expertise includes:
- Course recommendations based on student interests and performance
- Major selection and career pathway alignment
- Study plan optimization and academic scheduling
- Learning strategies tailored to individual strengths

Student Context:
- Academic Level: ${studentProfile.academicLevel}
- Current Major: ${studentProfile.currentMajor || 'Undecided'}
- Interests: ${studentProfile.interests.join(', ')}
- Performance History: ${studentProfile.performanceData.length} courses completed

Provide actionable, specific recommendations with clear reasoning. Focus on practical next steps.`;

    const userPrompt = requestType === 'course_recommendation'
      ? `Based on the student's profile, recommend 5 specific courses they should take next. For each course, explain why it aligns with their interests and goals.`
      : requestType === 'study_plan'
      ? `Create a semester study plan that balances their interests with academic requirements. Include time management strategies.`
      : `Analyze their interests and performance to suggest potential majors. Explain career prospects for each suggestion.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway Error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const advice = data.choices[0].message.content;

    return new Response(
      JSON.stringify({
        agent: 'academic_advisor',
        requestType,
        advice,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Academic Advisor Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
