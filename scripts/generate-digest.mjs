import { readFileSync, writeFileSync, existsSync } from 'fs';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY environment variable');
  process.exit(1);
}

const today = new Date();
const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
const formatDate = (d) => d.toISOString().split('T')[0];
const monthLabel = lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

async function generateDigest() {
  console.log('Generating digest for ' + monthLabel);

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
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: 'Search for any news, announcements, funding, partnerships, deals, customer wins, executive hires, or notable mentions of FluidStack (the GPU neocloud company founded by Gary Wu and Cesar Maklary) from ' + monthLabel + ' (' + formatDate(lastMonth) + ' to ' + formatDate(lastMonthEnd) + '). Also search for news about FluidStack TeraWulf JV, Anthropic data center partnership, and GPU cloud market developments that mention FluidStack. Respond ONLY with a JSON object, no markdown fences, no preamble: {"items":[{"headline":"Short headline max 80 chars","summary":"One sentence summary","source":"Publication name","url":"https://...","category":"funding|partnership|product|hiring|market|other"}],"quiet":false} If nothing notable happened return: {"items":[],"quiet":true} Only include items genuinely from ' + monthLabel + '. No old news or speculation.'
      }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('API error:', response.status, err);
    process.exit(1);
  }

  const data = await response.json();
  const textBlocks = data.content.filter(function(b) { return b.type === 'text'; });
  const rawText = textBlocks.map(function(b) { return b.text; }).join('\n');
  const cleaned = rawText.replace(/```json\s*|```\s*/g, '').trim();

  var digest;
  try {
    digest = JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse digest JSON:', e.message);
    console.error('Raw response:', rawText);
    digest = { items: [], quiet: true };
  }

  var entry = {
    week: formatDate(today),
    label: monthLabel,
    generatedAt: today.toISOString(),
    quiet: digest.quiet || digest.items.length === 0,
    summary: (digest.quiet || digest.items.length === 0) ? 'Quiet month — no major FluidStack news.' : digest.items.length + ' item' + (digest.items.length > 1 ? 's' : '') + ' this month.',
    items: digest.items || [],
  };

  var newsPath = 'public/news.json';
  var newsData = { digests: [] };
  if (existsSync(newsPath)) {
    try {
      newsData = JSON.parse(readFileSync(newsPath, 'utf-8'));
    } catch (e2) {
      newsData = { digests: [] };
    }
  }

  var existingIndex = newsData.digests.findIndex(function(d) { return d.week === entry.week; });
  if (existingIndex >= 0) {
    newsData.digests[existingIndex] = entry;
    console.log('Updated existing digest for ' + entry.week);
  } else {
    newsData.digests.unshift(entry);
    console.log('Added new digest for ' + entry.week);
  }

  newsData.digests = newsData.digests.slice(0, 12);
  writeFileSync(newsPath, JSON.stringify(newsData, null, 2));
  console.log('Wrote ' + newsPath);
  console.log('Digest: ' + (entry.quiet ? 'Quiet month' : entry.items.length + ' items'));
}

generateDigest().catch(function(err) {
  console.error('Fatal error:', err);
  process.exit(1);
});
