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

  var response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: 'You are a research assistant. Your job is to find ALL news about FluidStack from ' + monthLabel + ' (' + formatDate(lastMonth) + ' to ' + formatDate(lastMonthEnd) + '). You MUST perform multiple separate web searches to be thorough. Do at least 5 different searches using these queries one by one: 1) "FluidStack ' + monthLabel + '" 2) "FluidStack GPU cloud" 3) "FluidStack TeraWulf" 4) "FluidStack Anthropic data center" 5) "FluidStack Series B 2026" 6) Also try: "FluidStack" news. After completing ALL searches, compile every unique FluidStack mention you found from ' + monthLabel + ' into a JSON response. Include news about: funding, partnerships, deals, infrastructure buildouts, customer wins, executive changes, market analysis that names FluidStack, or any other mentions. Even minor mentions count. Respond ONLY with a JSON object, no markdown fences, no preamble: {"items":[{"headline":"Short headline max 80 chars","summary":"One sentence summary","source":"Publication name","url":"https://...","category":"funding|partnership|product|hiring|market|other"}],"quiet":false} If after all searches you genuinely found zero FluidStack mentions from ' + monthLabel + ', return: {"items":[],"quiet":true} Do not fabricate or hallucinate any news items. Only include real articles you found via search.'
      }],
    }),
  });

  if (!response.ok) {
    var err = await response.text();
    console.error('API error:', response.status, err);
    process.exit(1);
  }

  var data = await response.json();
  var textBlocks = data.content.filter(function(b) { return b.type === 'text'; });
  var rawText = textBlocks.map(function(b) { return b.text; }).join('\n');
  var cleaned = rawText.replace(/```json\s*|```\s*/g, '').trim();

  console.log('Raw response length: ' + rawText.length);
  console.log('First 500 chars: ' + rawText.substring(0, 500));

  var digest;
  try {
    digest = JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse digest JSON:', e.message);
    console.error('Raw response:', rawText);
    digest = { items: [], quiet: true };
  }

  console.log('Found ' + (digest.items ? digest.items.length : 0) + ' items');

  var entry = {
    week: formatDate(today),
    label: monthLabel,
    generatedAt: today.toISOString(),
    quiet: digest.quiet || !digest.items || digest.items.length === 0,
    summary: (digest.quiet || !digest.items || digest.items.length === 0) ? 'Quiet month — no major FluidStack news.' : digest.items.length + ' item' + (digest.items.length > 1 ? 's' : '') + ' this month.',
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
});  };

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
