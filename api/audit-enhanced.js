// Enhanced AI Audit System with Structured Output
// This demonstrates proper prompt engineering and API integration

const OpenAI = require('openai');

const AUDIT_SYSTEM_PROMPT = `You are an AI business automation consultant specializing in education businesses.

Your task is to analyze the business and provide a structured audit with:
1. Automation readiness score (0-100)
2. Top 3-5 specific automation opportunities
3. Estimated time savings per week
4. Priority ranking (High/Medium/Low)
5. Clear next steps

Be honest and specific. Focus on realistic, implementable automations.
Acknowledge that this is an AI-generated assessment, not a guarantee.

Return your response as valid JSON with this structure:
{
  "readinessScore": 75,
  "summary": "Brief 2-sentence summary",
  "opportunities": [
    {
      "title": "Automation name",
      "description": "What it does",
      "timeSavings": "5-8 hours/week",
      "priority": "High",
      "difficulty": "Medium",
      "estimatedROI": "3-5x in 6 months"
    }
  ],
  "nextSteps": ["Step 1", "Step 2", "Step 3"],
  "bottlenecks": ["Main bottleneck 1", "Main bottleneck 2"]
}`;

async function generateEnhancedAudit(businessData) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const {
    businessType,
    currentTools,
    teamSize,
    primaryBottleneck,
    monthlyLeads,
    automationLevel,
    businessDescription,
    currentRevenue
  } = businessData;

  const userPrompt = `
Business Type: ${businessType || 'Not specified'}
Current Tools: ${currentTools || 'Not specified'}
Team Size: ${teamSize || 'Not specified'}
Primary Bottleneck: ${primaryBottleneck || 'Not specified'}
Monthly Leads/Students: ${monthlyLeads || 'Not specified'}
Current Automation Level: ${automationLevel || 'Not specified'}
Business Description: ${businessDescription || 'Not provided'}
Current Revenue: ${currentRevenue || 'Not specified'}

Analyze this education business and provide a detailed automation audit.
`.trim();

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: AUDIT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1500
    });

    const result = JSON.parse(completion.choices[0].message.content);

    return {
      success: true,
      audit: result,
      rawText: formatAuditForDisplay(result)
    };
  } catch (error) {
    console.error('AI Audit Generation Error:', error);
    throw new Error('Failed to generate audit: ' + error.message);
  }
}

function formatAuditForDisplay(audit) {
  return `
# Automation Readiness Assessment

## Overall Score: ${audit.readinessScore}/100

${audit.summary}

## 🎯 Key Automation Opportunities

${audit.opportunities.map((opp, idx) => `
### ${idx + 1}. ${opp.title} [${opp.priority} Priority]

${opp.description}

- **Time Savings:** ${opp.timeSavings}
- **Difficulty:** ${opp.difficulty}
- **Estimated ROI:** ${opp.estimatedROI}
`).join('\n')}

## 🚧 Current Bottlenecks

${audit.bottlenecks.map(b => `- ${b}`).join('\n')}

## 📋 Recommended Next Steps

${audit.nextSteps.map((step, idx) => `${idx + 1}. ${step}`).join('\n')}

---

*⚠️ This is an AI-generated assessment based on the information provided. Actual results may vary. This is a demonstration of AI audit capabilities for portfolio purposes.*
`.trim();
}

module.exports = { generateEnhancedAudit, AUDIT_SYSTEM_PROMPT };
