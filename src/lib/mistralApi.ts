import { AGENT_PROFILE, TASK_PROMPT } from './permanentAgentReference';

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MODEL = 'mistral-large-latest';

export interface AgentAction {
  type: 'click' | 'type' | 'select' | 'scroll' | 'wait' | 'navigate';
  target?: string;
  grid_id?: string;
  value?: string;
  reason: string;
}

export interface StrategistResponse {
  analysis: string;
  actions: AgentAction[];
  attention_check_detected: boolean;
  confidence: number;
}

export interface ExecutorResponse {
  status: 'success' | 'error' | 'needs_retry';
  action_taken: string;
  next_step: string;
}

function buildProfileContext(): string {
  return Object.entries(AGENT_PROFILE)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

async function callMistral(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  jsonMode = true
): Promise<string> {
  const body: Record<string, unknown> = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.1,
    max_tokens: 2048,
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(MISTRAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Mistral API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

const STRATEGIST_SYSTEM = `You are the STRATEGIST agent in a dual-agent survey automation system.
${TASK_PROMPT}

AGENT PROFILE (use these answers for ALL demographic/behavioral questions):
${buildProfileContext()}

Your job:
1. Analyze the page content (HTML or text) provided by the user
2. Identify all questions, options, and navigation elements
3. Detect attention-check / trap questions — follow their EXACT instructions
4. Determine the correct answer for each question based on the profile
5. Output a JSON plan for the Executor agent

ALWAYS respond with valid JSON in this exact format:
{
  "analysis": "Brief description of what you see on the page",
  "actions": [
    {
      "type": "click|type|select|scroll|wait|navigate",
      "target": "CSS selector or text description of the element",
      "grid_id": "Grid coordinate like D4 if applicable",
      "value": "Text to type if type action",
      "reason": "Why this action"
    }
  ],
  "attention_check_detected": true/false,
  "confidence": 0.0-1.0
}`;

const EXECUTOR_SYSTEM = `You are the EXECUTOR agent in a dual-agent survey automation system.
You receive action plans from the Strategist and execute them on the page.

Your job:
1. Take each action from the plan
2. Determine the best DOM interaction method
3. Report results

ALWAYS respond with valid JSON:
{
  "status": "success|error|needs_retry",
  "action_taken": "Description of what was done",
  "next_step": "What should happen next"
}`;

export async function runStrategist(
  apiKey: string,
  pageContent: string,
  task: string
): Promise<StrategistResponse> {
  const userMsg = `TASK: ${task}\n\nPAGE CONTENT:\n${pageContent}`;
  const raw = await callMistral(apiKey, STRATEGIST_SYSTEM, userMsg, true);

  try {
    return JSON.parse(raw) as StrategistResponse;
  } catch {
    return {
      analysis: raw,
      actions: [],
      attention_check_detected: false,
      confidence: 0,
    };
  }
}

export async function runExecutor(
  apiKey: string,
  actionPlan: AgentAction[],
  pageContext: string
): Promise<ExecutorResponse> {
  const userMsg = `ACTION PLAN:\n${JSON.stringify(actionPlan, null, 2)}\n\nCURRENT PAGE:\n${pageContext}`;
  const raw = await callMistral(apiKey, EXECUTOR_SYSTEM, userMsg, true);

  try {
    return JSON.parse(raw) as ExecutorResponse;
  } catch {
    return {
      status: 'error',
      action_taken: raw,
      next_step: 'Retry with better context',
    };
  }
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
