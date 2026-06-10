const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const nodemailer = require('nodemailer');
require('dotenv').config();

const GEMINI_MODEL_PRIMARY =
  (process.env.GEMINI_MODEL_PRIMARY || '3.1-Flash-lite').trim().replace(/^models\//, '');
const GEMINI_MODEL_FALLBACK =
  (process.env.GEMINI_MODEL_FALLBACK || '3.1-Flash-lite').trim().replace(/^models\//, '');
const FEEDBACK_EMAIL = process.env.FEEDBACK_EMAIL || '';

const CRITICAL_ENVS = ['GEMINI_API_KEY'];
CRITICAL_ENVS.forEach(env => {
  if (!process.env[env]) {
    console.warn(`[WARNING] Missing critical environment variable: ${env}`);
  }
});

// Create Express App
const app = express();
app.use(cors());
app.use(express.json());

/**
 * Normalizes input URL.
 * Converts handles like @username to Twitter/X URLs, and adds https:// if missing.
 */
function normalizeUrl(input) {
  let trimmed = input.trim();
  if (trimmed.startsWith('@')) {
    return `https://x.com/${trimmed.slice(1)}`;
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed;
}

/**
 * Scrapes content using Jina Reader (Primary) with fallbacks.
 * Returns text content, or a special message instructing Gemini to run Heuristics Mode if all scraping fails.
 */
async function scrapeUrlContent(targetUrl) {
  console.log(`Scraping URL: ${targetUrl}`);
  
  // 1. Try Jina Reader
  try {
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(targetUrl)}`;
    console.log(`Attempting Jina Reader: ${jinaUrl}`);
    const response = await axios.get(jinaUrl, {
      timeout: 10000,
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (response.data && response.data.length > 100) {
      console.log('Jina Reader scraping successful.');
      return response.data.slice(0, 15000); // Limit content sent to AI
    }
  } catch (error) {
    console.warn('Jina Reader failed or timed out. Trying fallbacks...', error.message);
  }

  // 2. Fallback: Check if it's an X/Twitter URL and try Nitter RSS
  const xMatch = targetUrl.match(/(?:x|twitter)\.com\/([a-zA-Z0-9_]{1,15})/i);
  if (xMatch) {
    const handle = xMatch[1];
    const nitterInstances = [
      'https://nitter.privacydev.net',
      'https://nitter.net',
      'https://nitter.cz'
    ];

    for (const instance of nitterInstances) {
      try {
        const rssUrl = `${instance}/${handle}/rss`;
        console.log(`Attempting Nitter RSS: ${rssUrl}`);
        const rssResponse = await axios.get(rssUrl, { timeout: 6000 });
        if (rssResponse.data && rssResponse.data.includes('<rss')) {
          console.log(`Successfully scraped Twitter profile via Nitter RSS.`);
          const $ = cheerio.load(rssResponse.data, { xmlMode: true });
          const title = $('channel > title').text() || '';
          const description = $('channel > description').text() || '';
          let itemsText = '';
          $('item > title').slice(0, 5).each((i, el) => {
            itemsText += `\n- Tweet: ${$(el).text()}`;
          });
          return `Twitter Handle: @${handle}\nName/Title: ${title}\nBio: ${description}\nRecent Tweets:${itemsText}`;
        }
      } catch (err) {
        console.warn(`Nitter instance ${instance} failed:`, err.message);
      }
    }
  }

  // 3. Fallback: Generic Website Axios + Cheerio scraper
  try {
    // Check if the URL belongs to a known blocked social network (like Instagram)
    const isSocialMedia = /(instagram|facebook|linkedin|tiktok)\.com/i.test(targetUrl);
    if (isSocialMedia) {
      throw new Error('Direct scrape skipped for protected social network.');
    }

    console.log(`Attempting direct HTTP Cheerio scrape: ${targetUrl}`);
    const response = await axios.get(targetUrl, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Clean unnecessary tags
    $('script, style, iframe, noscript, svg').remove();
    
    const pageTitle = $('title').text().trim();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const h1s = [];
    const h2s = [];
    $('h1').slice(0, 5).each((i, el) => h1s.push($(el).text().trim()));
    $('h2').slice(0, 10).each((i, el) => h2s.push($(el).text().trim()));
    
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 15000);

    console.log('Direct HTML scrape completed.');
    return `Page Title: ${pageTitle}\nDescription: ${metaDescription}\nHeadings 1: ${h1s.join(', ')}\nHeadings 2: ${h2s.join(', ')}\nBody Snippet: ${bodyText}`;
  } catch (error) {
    console.warn('All active scrapers failed. Activating AI Heuristics Mode fallback. Reason:', error.message);
    
    // Return instructions to trigger Heuristics mode in Gemini
    return `__SCRAPE_FAILED__: The target page is protected by a login screen (e.g. Instagram, LinkedIn) or security blocks. You must perform analysis using HEURISTIC ESTIMATIONS based solely on the domain name, handle details, and your pre-trained knowledge of common profiles for this handle.`;
  }
}

function getGeminiEndpoint(model, apiKey) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

function normalizeGeminiErrorMessage(error) {
  const message = error?.response?.data?.error?.message || error?.message || '';
  return message.toString().toLowerCase();
}

function isGeminiQuotaError(error) {
  const status = error?.response?.status;
  if (status === 429) {
    return true;
  }

  const message = normalizeGeminiErrorMessage(error);
  return /quota|rate limit|limit exceeded|resource_exhausted|too many requests|429|exhausted/.test(message);
}

function extractJSON(text) {
  // 1. Try to extract between ```json and ```
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch (e) {
      // fallback to other methods
    }
  }
  
  // 2. Try to find the first {...}
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
  } catch (e) {
    // fallback
  }

  // 3. Try to parse the whole string
  try {
    return JSON.parse(text.trim());
  } catch (e) {
    console.error("Gemini returned unparseable response:", text);
    throw new Error("Gemini returned unparseable response");
  }
}

async function callGemini(model, prompt, apiKey) {
  const apiEndpoint = getGeminiEndpoint(model, apiKey);
  const response = await axios.post(apiEndpoint, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7
    }
  }, {
    headers: { 'Content-Type': 'application/json' }
  });

  let candidateText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidateText) {
    throw new Error('Invalid or empty response from Gemini API.');
  }

  return extractJSON(candidateText);
}

/**
 * Calls Gemini API using standard REST call with prompt instructions.
 */
async function analyzeWithGemini(url, content) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please add your key to the environment.');
  }

  const isHeuristicMode = content.includes('__SCRAPE_FAILED__');

  // Define structured prompt
  let prompt = `You are a brand strategist and prospect researcher analyzing a potential client for creative/design service outreach.
  
Analyzing URL: ${url}

`;

  if (isHeuristicMode) {
    prompt += `WARNING: The target page could not be scraped directly (likely a login-walled platform like Instagram or LinkedIn, or a protected server).
    
Your task: Execute "AI HEURISTICS MODE". Based ONLY on the URL domain name/handle structure and your comprehensive pre-existing knowledge of typical companies or creators in this category:
1. Estimate a logical Brand Health Score and Outreach Readiness Score based on patterns of similar businesses.
2. Provide a 1-2 sentence evaluation highlighting potential design points (e.g. layout updates, bio consistency, positioning).
3. Draft a tailored, casual outreach pitch suitable for this brand category. Reference their profile context.
`;
  } else {
    prompt += `Below is the text/markdown content scraped from the prospect's page:
---
${content}
---

Your task: Provide a comprehensive and professional qualification analysis of this prospect based on the text.
`;
  }

  prompt += `
You MUST respond with a single, valid JSON object ONLY. Do NOT include any preamble, explanations, or conversational text. No markdown wrapper (do NOT start with \`\`\`json), no trailing text.

Return exactly this JSON format:
{
  "brand_health_score": <number between 0 and 100 representing visual identity and brand structure quality>,
  "brand_health_insight": "<1-2 sentences highlighting design inconsistencies, layout strength, or visual presentation notes>",
  "outreach_readiness_score": <number between 0 and 100 indicating target needs and growth signals>,
  "outreach_readiness_insight": "<1-2 sentences on whether active channels or updates indicate potential design requirements>",
  "dm_suggestion": "<A highly tailored, casual, 1-2 sentence B2B cold outreach message. Reference a specific piece of information from the profile/URL context to prove this is not automated. Make it friendly, brief, and ending with a low-friction question. No placeholders like [brackets] or names. Keep under 280 characters.>"
}

SCORING GUIDELINES:
Brand Health Score:
- 0-30: Very poor visual identity, clear layouts errors, outdated look.
- 31-60: functional but bland, typography or brand elements lack consistency.
- 61-80: Solid brand design but needs updates, minor alignment or image refinement potential.
- 81-100: Top-tier modern design.

Outreach Readiness Score:
- 0-30: Inactive, no updates, low chance of needing external services.
- 31-60: Stable, no immediate triggers, standard prospect.
- 61-80: Active product launching, hiring, or updating sites - high probability of design needs.
- 81-100: Massive growth signals or major brand re-alignment in progress.`;

  try {
    const result = await callGemini(GEMINI_MODEL_PRIMARY, prompt, apiKey);
    return { ...result, model_used: GEMINI_MODEL_PRIMARY };
  } catch (error) {
    if (isGeminiQuotaError(error) && GEMINI_MODEL_FALLBACK !== GEMINI_MODEL_PRIMARY) {
      console.warn('Gemini primary model quota hit. Falling back to', GEMINI_MODEL_FALLBACK);
      try {
        const fallbackResult = await callGemini(GEMINI_MODEL_FALLBACK, prompt, apiKey);
        return {
          ...fallbackResult,
          model_used: GEMINI_MODEL_FALLBACK,
          fallback_from: GEMINI_MODEL_PRIMARY,
        };
      } catch (fallbackError) {
        console.error('Fallback Gemini model also failed:', fallbackError.message);
        throw new Error('AI analysis failed on fallback model. Please check your Gemini configuration.');
      }
    }
    const actualError = error?.response?.data?.error?.message || error.message;
    console.error('Error during Gemini analysis:', actualError);
    throw new Error(`AI Analysis failed: ${actualError}`);
  }
}

// ROUTE: Server health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Server running',
    timestamp: new Date().toISOString()
  });
});

// ROUTE: Primary Hunt Endpoint (Database Free)
app.post('/api/hunt', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  const normalized = normalizeUrl(url);

  try {
    // Step 1: Attempt Scrape
    const content = await scrapeUrlContent(normalized);

    // Step 2: Analyze using Gemini
    const analysis = await analyzeWithGemini(normalized, content);

    // Step 3: Return details directly (Database-Free)
    res.json({
      success: true,
      hunt_id: Date.now(), // Generate a unique identifier on the fly
      url: normalized,
      model_used: analysis.model_used || GEMINI_MODEL_PRIMARY,
      fallback_from: analysis.fallback_from || null,
      brand_health: {
        score: analysis.brand_health_score || 50,
        insight: analysis.brand_health_insight || 'Brand analysis complete.'
      },
      outreach_readiness: {
        score: analysis.outreach_readiness_score || 50,
        insight: analysis.outreach_readiness_insight || 'Readiness analysis complete.'
      },
      dm_suggestion: analysis.dm_suggestion || 'Hey! Love your work. Let\'s connect!'
    });

  } catch (error) {
    console.error('Error during hunt process:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

async function sendNotificationEmail(toEmail, subject, htmlContent) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.SENDER_EMAIL || smtpUser || 'no-reply@signalhunt.app';

  const hasResend = !!resendApiKey;
  const hasSmtp = !!(smtpUser && smtpPass && smtpHost);

  if (!hasResend && !hasSmtp) {
    console.log(`[EMAIL SIMULATED] Notification to ${toEmail}:`, { subject, htmlContent });
    return { simulated: true, message: 'Email credentials not configured. Email simulated locally.' };
  }

  const sendWithResend = async () => {
    await axios.post('https://api.resend.com/emails', {
      from: `"Signal Hunt" <${fromEmail}>`,
      to: toEmail,
      subject,
      html: htmlContent
    }, {
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      }
    });
  };

  const sendWithSmtp = async () => {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass }
    });

    await transporter.sendMail({
      from: `"Signal Hunt" <${fromEmail}>`,
      to: toEmail,
      subject,
      html: htmlContent
    });
  };

  if (hasResend) {
    try {
      await sendWithResend();
      return { simulated: false, provider: 'resend' };
    } catch (resendError) {
      console.warn('[Resend] failed, falling back to SMTP:', resendError.message);
    }
  }

  if (hasSmtp) {
    await sendWithSmtp();
    return { simulated: false, provider: 'smtp' };
  }

  console.log(`[EMAIL SIMULATED] Notification to ${toEmail}:`, { subject, htmlContent });
  return { simulated: true, message: 'Email credentials not configured. Email simulated locally.' };
}

// ROUTE: Feedback submission route (sends or simulates feedback email)
app.post('/api/feedback', async (req, res) => {
  const { email, message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Feedback message is required.' });
  }

  const feedbackReceiver = FEEDBACK_EMAIL;
  const fromUserEmail = email && email.trim() ? email.trim() : 'Anonymous';
  const subject = `Signal Hunt Feedback from ${fromUserEmail}`;
  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #6366f1;">📬 New Feedback Submission</h2>
      <p><strong>From:</strong> ${fromUserEmail}</p>
      <p><strong>Message:</strong></p>
      <p style="white-space: pre-wrap;">${message}</p>
    </div>
  `;

  if (!feedbackReceiver) {
    console.log('[FEEDBACK SIMULATED] Feedback received:', {
      from: fromUserEmail,
      message,
    });
    return res.json({
      success: true,
      simulated: true,
      message: 'Feedback submitted successfully. Configure FEEDBACK_EMAIL to receive it by email.',
    });
  }

  try {
    await sendNotificationEmail(feedbackReceiver, subject, htmlContent);
    console.log(`[FEEDBACK] Sent to ${feedbackReceiver} from ${fromUserEmail}`);
    return res.json({ success: true, message: 'Feedback submitted successfully.' });
  } catch (error) {
    console.error('Feedback delivery error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Could not submit feedback. Please verify email configuration.',
    });
  }
});

// ROUTE: Save Prospect Email Route (Database Free - Sends Email Copy)
app.post('/api/save-prospect', async (req, res) => {
  const { email, prospect } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }
  if (!prospect) {
    return res.status(400).json({ success: false, error: 'Prospect data is required' });
  }

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }

  const subject = `🎯 Prospect Audit Report: ${prospect.url.replace(/^https?:\/\/(www\.)?/, '')}`;

  const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #6366f1; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">🎯 Signal Hunt Audit Report</h2>
        <p>Here is your prospect qualification report for:</p>
        <p style="font-weight: bold; font-size: 1.1em; color: #1e293b;">${prospect.url}</p>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #f8fafc; border-radius: 6px;">
          <h3 style="margin-top: 0; color: #475569;">Brand Health Score: <span style="color: #6366f1;">${prospect.brand_health.score}/100</span></h3>
          <p style="color: #334155; margin-bottom: 0;">${prospect.brand_health.insight}</p>
        </div>

        <div style="margin: 20px 0; padding: 15px; background-color: #f8fafc; border-radius: 6px;">
          <h3 style="margin-top: 0; color: #475569;">Outreach Readiness Score: <span style="color: #6366f1;">${prospect.outreach_readiness.score}/100</span></h3>
          <p style="color: #334155; margin-bottom: 0;">${prospect.outreach_readiness.insight}</p>
        </div>

        <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #6366f1; background-color: #eef2ff;">
          <h3 style="margin-top: 0; color: #4f46e5;">Suggested Outreach Pitch</h3>
          <p style="font-style: italic; color: #1e1b4b; font-size: 1.05em;">"${prospect.dm_suggestion}"</p>
        </div>

        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="font-size: 0.85em; color: #94a3b8; text-align: center;">Signal Hunt - Prospect Intelligence for Designers</p>
      </div>
    `;

  try {
    await sendNotificationEmail(email, subject, htmlContent);
    return res.json({ success: true, message: 'Audit report emailed successfully.' });
  } catch (error) {
    console.error('Email delivery error:', error.message);
    res.status(500).json({ success: false, error: 'Email delivery failed. Please verify Resend or SMTP configuration.' });
  }
});

// Global 404 handler to ensure unknown routes return JSON, not HTML
// This prevents "Unexpected token <" errors on the frontend
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `API Route ${req.method} ${req.originalUrl} not found. Verify your backend URL and HTTP method.`
  });
});

// Export app for serverless deployments
module.exports = app;

// Start Server locally if run directly
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running locally on port ${PORT}`);
  });
}
