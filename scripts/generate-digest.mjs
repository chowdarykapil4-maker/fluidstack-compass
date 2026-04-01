/**
 * Weekly FluidStack Digest Generator
 * 
 * Calls Claude API with web search to find FluidStack news from the past week,
 * then appends a structured digest entry to public/news.json.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY environment variable');
  process.exit(1);
}

const today = new Date();
const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
const formatDate = (d) => d.toISOString().split('T')[0];

const weekLabel = `Week of ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;

async function generateDigest() {
  console.log(`Generating digest for ${weekLabel}...`);
  console.log(`Searching for news from ${formatDate(weekAgo)} to ${formatDate(today)}`);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Search for any news, announcements, funding, partnerships, deals, customer wins, executive hires, or notable mentions of FluidStack (the GPU neocloud / cloud infrastructure company founded by Gary Wu and Cesar Maklary) from the past 7 days (${formatDate(weekAgo)} to ${formatDate(today)}).

Also search for news about FluidStack's key relationships: TeraWulf JV, Anthropic data center partnership, and any GPU cloud market developments that directly mention FluidStack.

Respond ONLY with a JSON object in this exact format, no markdown fences, no preamble:

{
  "items": [
    {
      "headline": "Short headline (max 80 chars)",
      "summary": "One sentence summary of what happened and why it matters",
      "source": "Publication name",
      "url": "https://...",
      "category": "funding|partnership|product|hiring|market|other"
    }
  ],
  "quiet": false
}

If nothing notable happened this week, return:
{
  "items": [],
  "quiet": true
}

Only include items that are genuinely from the past 7 days. Do not include old news or speculation. Be selective — only notable items, not routine mentions.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('API error:', response.status, err);
    process.exit(1);
  }

  const data = await response.json();

  // Extract text content from response (may have tool use blocks mixed in)
  const textBlocks = data.content.filter((b) => b.type === 'text');
  const rawText = textBlocks.map((b) => b.text).join('\n');

  // Parse JSON from response, stripping any markdown fences
  const cleaned = rawText.replace(/```json\s*|```\s*/g, '').trim();

  let digest;
  try {
    digest = JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse digest JSON:', e.message);
    console.error('Raw response:', rawText);
    // Default to quiet week if parsing fails
    digest = { items: [], quiet: true };
  }

  // Build the weekly entry
  const entry = {
    week: formatDate(today),
    label: weekLabel,
    generatedAt: today.toISOString(),
    quiet: digest.quiet || digest.items.length === 0,
    summary: digest.quiet || digest.items.length === 0
      ? 'Quiet week — no major FluidStack news.'
      : `${digest.items.length} item${digest.items.length > 1 ? 's' : ''} this week.`,
    items: digest.items || [],
  };

  // Load existing news.json or create new
  const newsPath = 'public/news.json';
  let newsData = { digests: [] };
  if (existsSync(newsPath)) {
    try {
      newsData = JSON.parse(readFileSync(newsPath, 'utf-8'));
    } catch {
      newsData = { digests: [] };
    }
  }

  // Don't duplicate if already ran this week
  const existingIndex = newsData.digests.findIndex((d) => d.week === entry.week);
  if (existingIndex >= 0) {
    newsData.digests[existingIndex] = entry;
    console.log('Updated existing digest for', entry.week);
  } else {
    newsData.digests.unshift(entry); // newest first
    console.log('Added new digest for', entry.week);
  }

  // Keep only last 12 weeks
  newsData.digests = newsData.digests.slice(0, 12);

  writeFileSync(newsPath, JSON.stringify(newsData, null, 2));
  console.log('Wrote', newsPath);
  console.log(`Digest: ${entry.quiet ? 'Quiet week' : entry.items.length + ' items'}`);
}

generateDigest().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
