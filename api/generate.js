const MODEL = 'gemini-3.5-flash-lite';
const MAX_ATTEMPTS = 3;

async function callGemini(prompt, apiKey) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );

      if (response.ok) {
        return response;
      }

      const errText = await response.text();
      console.error('Gemini API error (attempt ' + attempt + '):', errText);
      lastError = new Error(errText);
    } catch (err) {
      console.error('Network error (attempt ' + attempt + '):', err);
      lastError = err;
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise(function (resolve) { setTimeout(resolve, 800); });
    }
  }

  throw lastError;
}

function languageInstruction(language) {
  if (language === 'hindi') {
    return 'Write the "title", "hook", "script", and "caption" fields in Hindi, using Devanagari script. Keep "hashtags" in English (for reach).';
  }
  if (language === 'hinglish') {
    return 'Write the "title", "hook", "script", and "caption" fields in Hinglish — casual conversational Hindi written in Roman/English letters, the way Indian creators actually talk (e.g. "yeh case aaj tak solve nahi hua"). Keep "hashtags" in English (for reach).';
  }
  return 'Write the "title", "hook", "script", and "caption" fields in English.';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { niche, count, language } = req.body || {};

  if (!niche || typeof niche !== 'string' || !niche.trim()) {
    res.status(400).json({ error: 'Please enter a niche.' });
    return;
  }

  const ideaCount = [5, 10, 15].includes(Number(count)) ? Number(count) : 5;
  const chosenLanguage = ['english', 'hindi', 'hinglish'].includes(language) ? language : 'english';
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    res.status(500).json({
      error: 'Server is missing an API key. Add GEMINI_API_KEY in your Vercel project settings.',
    });
    return;
  }

  const prompt =
    'You are helping a faceless short-form video creator (YouTube Shorts, Instagram Reels, TikTok).\n' +
    'Niche: "' + niche.trim() + '"\n\n' +
    'Generate ' + ideaCount + ' fresh, specific video ideas for this niche. Avoid generic ideas that sound ' +
    'like every other channel — go specific, surprising, or under-covered within the niche.\n\n' +
    'For each idea, provide:\n' +
    '- "title": a short, scroll-stopping video title (under 60 characters)\n' +
    '- "hook": one punchy sentence for the first 3 seconds on-screen\n' +
    '- "script": a complete 30-45 second narration script, broken into short sentences on separate lines, ' +
    "starting with a strong hook line and ending with a natural call-to-action matching the niche's tone\n" +
    '- "caption": a short caption for the post (under 100 characters)\n' +
    '- "hashtags": an array of 8-10 relevant hashtags (without the # symbol)\n\n' +
    languageInstruction(chosenLanguage) + '\n\n' +
    'Return ONLY a JSON array of ' + ideaCount + ' objects with exactly these fields: title, hook, script, ' +
    'caption, hashtags. No other text.';

  try {
    const response = await callGemini(prompt, apiKey);
    const data = await response.json();
    const rawText =
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text;

    if (!rawText) {
      res.status(502).json({ error: 'The AI service returned an empty response. Please try again.' });
      return;
    }

    let cleanText = rawText.trim();
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(json)?\n?/, '').replace(/```$/, '').trim();
    }

    let ideas;
    try {
      ideas = JSON.parse(cleanText);
    } catch (parseErr) {
      console.error('Failed to parse AI response:', rawText);
      res.status(502).json({ error: 'The AI service returned an unexpected format. Please try again.' });
      return;
    }

    res.status(200).json({ ideas });
  } catch (err) {
    console.error('Unexpected error after retries:', err);
    res.status(502).json({
      error: 'The AI service could not generate ideas after a few tries. Please try again in a moment.',
    });
  }
};
