import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  performanceData: any[];
  interests: any[];
  analysisType: 'performance_trends' | 'strength_analysis' | 'improvement_areas' | 'predictive_insights';
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

    const { performanceData, interests, analysisType }: RequestBody = await req.json();
    console.log('Data Insights Agent - Analysis Type:', analysisType);

    const systemPrompt = `You are an expert Data Insights AI agent specialized in educational analytics and predictive modeling.

Your expertise includes:
- Academic performance trend analysis
- Strength and weakness identification
- Learning pattern recognition
- Predictive modeling for student success
- Data-driven recommendation generation

Analysis Context:
- Performance Records: ${performanceData.length} entries
- Interest Areas: ${interests.length} tracked interests
- Data Points Available: GPA trends, course grades, engagement metrics

Provide insights backed by the data provided. Use statistical reasoning and highlight actionable patterns.`;

    const performanceSummary = performanceData.map(p => 
      `${p.course_name}: ${p.grade || p.gpa || 'In Progress'}`
    ).join(', ');

    const userPrompt = analysisType === 'performance_trends'
      ? `Analyze performance trends from this data: ${performanceSummary}. Identify patterns in grades, subject preferences, and academic progression.`
      : analysisType === 'strength_analysis'
      ? `Based on performance data (${performanceSummary}), identify academic strengths and natural aptitudes. What subjects show consistent excellence?`
      : analysisType === 'improvement_areas'
      ? `Analyze where improvement is needed: ${performanceSummary}. Provide specific, actionable strategies for each area.`
      : `Predict future academic success areas based on current data. Recommend courses and majors with high success probability.`;

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
        temperature: 0.5,
        max_tokens: 1500,
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
    const insights = data.choices[0].message.content;

    return new Response(
      JSON.stringify({
        agent: 'data_insights',
        analysisType,
        insights,
        dataPointsAnalyzed: performanceData.length,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Data Insights Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
