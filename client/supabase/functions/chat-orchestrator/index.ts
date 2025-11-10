import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message, chatHistory } = await req.json();
    console.log('Chat Orchestrator - User:', user.id, 'Message:', message);

    // Fetch user context
    const [profileRes, interestsRes, performanceRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('student_interests').select('*').eq('user_id', user.id),
      supabase.from('performance_data').select('*').eq('user_id', user.id).limit(10),
    ]);

    const profile = profileRes.data;
    const interests = interestsRes.data || [];
    const performance = performanceRes.data || [];

    // Build context-aware system prompt
    const systemPrompt = `You are a multi-agent AI guidance system with three specialized agents:

1. **Academic Advisor**: Course recommendations, study plans, major guidance
2. **Career Counselor**: Career pathways, internships, job market insights
3. **Data Insights**: Performance analysis, strength identification, predictive insights

Student Profile:
- Name: ${profile?.full_name}
- Level: ${profile?.academic_level || 'Not specified'}
- Major: ${profile?.current_major || 'Undecided'}
- Interests: ${interests.map(i => i.interest_name).join(', ') || 'None specified'}
- GPA History: ${performance.length} courses tracked

You coordinate responses from these agents to provide comprehensive, personalized guidance. When a question spans multiple domains, synthesize insights from relevant agents. Always be supportive, specific, and actionable.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(chatHistory || []),
      { role: 'user', content: message },
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
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
    const assistantMessage = data.choices[0].message.content;

    // Store messages in database
    await supabase.from('chat_messages').insert([
      {
        user_id: user.id,
        role: 'user',
        content: message,
        agent_type: 'general',
      },
      {
        user_id: user.id,
        role: 'assistant',
        content: assistantMessage,
        agent_type: 'general',
      },
    ]);

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Chat Orchestrator Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
