export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin && host && new URL(origin).host !== host) {
    return res.status(403).json({ error: 'Request origin not allowed.' });
  }
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid request.' }); }
  }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Invalid request.' });
  if (String(body.website || '').trim()) return res.status(200).json({ ok: true });
  const name = String(body.game_name || '').trim().slice(0, 100);
  const useCase = String(body.use_case || '').trim().slice(0, 100);
  const description = String(body.description || '').trim().slice(0, 2000);
  if (name.length < 2 || !useCase || description.length < 10) {
    return res.status(400).json({ error: 'Please add a game name, occasion and a little more detail about how to play.' });
  }
  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(503).json({ error: 'Suggestions are temporarily unavailable. Please try again later.' });
  const owner = process.env.GITHUB_OWNER || 'Mogaji-Bolaji-Abdullah';
  const repo = process.env.GITHUB_REPO || 'Community-Games-Bank';
  const slug = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'game-idea';
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const path = `suggestions/inbox/${now.toISOString().slice(0,10)}-${slug}-${stamp}.md`;
  const content = [
    `# Game suggestion: ${name}`, '',
    `- **Submitted:** ${now.toISOString()}`,
    '- **Source:** Community Games Bank website', '',
    '## Best for', useCase, '',
    '## How to play', description, '',
    '## Review checklist',
    '- [ ] Review the game concept',
    '- [ ] Confirm attribution / permission where relevant',
    '- [ ] Decide whether to add it to the library', ''
  ].join('\n');
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Add community game suggestion: ${name}`,
        content: Buffer.from(content, 'utf8').toString('base64')
      })
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      console.error('GitHub suggestion write failed', response.status, detail.message);
      return res.status(502).json({ error: 'We couldn’t save your suggestion right now. Please try again later.' });
    }
    const result = await response.json();
    return res.status(201).json({ ok: true, url: result.content?.html_url || null });
  } catch (error) {
    console.error('Suggestion submission failed', error);
    return res.status(500).json({ error: 'Something went wrong while saving your suggestion.' });
  }
}