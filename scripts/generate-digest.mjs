import { readFileSync, writeFileSync, existsSync } from 'fs';

var KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error('Missing ANTHROPIC_API_KEY'); process.exit(1); }

var today = new Date();
var lm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
var lmEnd = new Date(today.getFullYear(), today.getMonth(), 0);
function fd(d) { return d.toISOString().split('T')[0]; }
var ml = lm.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

async function run() {
  console.log('Digest for ' + ml + ' (' + fd(lm) + ' to ' + fd(lmEnd) + ')');

  var p = 'You are a research assistant finding ALL news about FluidStack from ' + ml + ' (' + fd(lm) + ' to ' + fd(lmEnd) + '). ';
  p += 'Do at least 5 separate web searches: 1) FluidStack ' + ml + ' 2) FluidStack GPU cloud 3) FluidStack TeraWulf 4) FluidStack Anthropic 5) FluidStack Series B 2026 6) FluidStack news. ';
  p += 'Compile every unique mention into JSON. Include funding, partnerships, deals, infrastructure, customers, hiring, market analysis. Even minor mentions count. ';
  p += 'Respond ONLY with JSON, no markdown: {"items":[{"headline":"max 80 chars","summary":"one sentence","source":"name","url":"https://...","category":"funding|partnership|product|hiring|market|other"}],"quiet":false} ';
  p += 'If zero mentions found return {"items":[],"quiet":true}. Do not fabricate news.';

  var r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: p }]
    })
  });

  if (!r.ok) { console.error('API error: ' + r.status + ' ' + (await r.text())); process.exit(1); }

  var data = await r.json();
  var txt = data.content.filter(function(b){return b.type==='text';}).map(function(b){return b.text;}).join('\n');
  var clean = txt.replace(/```json\s*|```\s*/g, '').trim();
  console.log('Response length: ' + txt.length);
  console.log('Preview: ' + txt.substring(0, 300));

  var dig;
  try { dig = JSON.parse(clean); } catch(e) { console.error('Parse fail: ' + e.message); dig = {items:[],quiet:true}; }

  var n = dig.items ? dig.items.length : 0;
  console.log('Items found: ' + n);

  var entry = { week: fd(today), label: ml, generatedAt: today.toISOString(), quiet: n===0, summary: n===0 ? 'Quiet month — no major FluidStack news.' : n + (n>1?' items':' item') + ' this month.', items: dig.items||[] };

  var path = 'public/news.json';
  var nd = {digests:[]};
  if (existsSync(path)) { try { nd = JSON.parse(readFileSync(path,'utf-8')); } catch(e2) { nd = {digests:[]}; } }

  var found = false;
  for (var i=0; i<nd.digests.length; i++) { if (nd.digests[i].week===entry.week) { nd.digests[i]=entry; found=true; break; } }
  if (!found) { nd.digests.unshift(entry); }
  nd.digests = nd.digests.slice(0,12);

  writeFileSync(path, JSON.stringify(nd, null, 2));
  console.log('Done: ' + (n===0 ? 'Quiet month' : n + ' items'));
}

run().then(function(){process.exit(0);}).catch(function(e){console.error(e);process.exit(1);});
