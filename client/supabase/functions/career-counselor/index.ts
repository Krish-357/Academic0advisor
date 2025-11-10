import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  studentProfile: {
    interests: string[];
    skills: string[];
    academicLevel: string;
    currentMajor?: string;
  };
  requestType: 'career_pathways' | 'internships' | 'job_market_insights' | 'skill_gaps';
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
    console.log('Career Counselor Agent - Request Type:', requestType);

    const systemPrompt = `You are an expert Career Counselor AI agent with deep knowledge of job markets, industry trends, and professional development.

Your expertise includes:
- Career pathway mapping and planning
- Internship and job opportunity identification
- Industry trend analysis and market insights
- Skill gap analysis and upskilling recommendations
- Resume building and interview preparation strategies

Student Context:
- Academic Level: ${studentProfile.academicLevel}
- Current Major: ${studentProfile.currentMajor || 'Exploring'}
- Interests: ${studentProfile.interests.join(', ')}
- Current Skills: ${studentProfile.skills.join(', ')}

Provide specific, actionable career guidance with concrete next steps. Include real-world examples and current market data when possible.`;

    const userPrompt = requestType === 'career_pathways'
      ? `Map out 3-4 potential career pathways aligned with their profile. For each, include typical job titles, salary ranges, and growth prospects.`
      : requestType === 'internships'
      ? `Recommend specific types of internships they should pursue. Include company types, roles, and what to highlight in applications.`
      : requestType === 'job_market_insights'
      ? `Analyze current job market trends relevant to their interests and major. Highlight emerging opportunities and skills in demand.`
      : `Identify skill gaps between their current abilities and their career goals. Provide a prioritized learning roadmap.`;

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
    const guidance = data.choices[0].message.content;

    return new Response(
      JSON.stringify({
        agent: 'career_counselor',
        requestType,
        guidance,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Career Counselor Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
