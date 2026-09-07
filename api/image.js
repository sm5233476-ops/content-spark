const MODEL = 'gemini-2.5-flash-image';
const MAX_ATTEMPTS = 3;

async function callImage(prompt, apiKey) {
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
            generationConfig: { responseModalities: ['IMAGE'] },
          }),
        }
      );

      if (response.ok) {
        return response;
      }

      const errText = await response.text();
      console.error('Gemini Image error (attempt ' + attempt + '):', errText);
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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { prompt } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({ error: 'Please describe the image you want.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: 'Server is missing an API key. Add GEMINI_API_KEY in your Vercel project settings.',
    });
    return;
  }

  try {
    const response = await callImage(prompt.trim(), apiKey);
    const data = await response.json();
    const part =
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0];

    const base64Image = part && part.inlineData && part.inlineData.data;
    const mimeType = (part && part.inlineData && part.inlineData.mimeType) || 'image/png';

    if (!base64Image) {
      res.status(502).json({ error: 'The image service returned no image. Please try again.' });
      return;
    }

    res.status(200).json({ image: 'data:' + mimeType + ';base64,' + base64Image });
  } catch (err) {
    console.error('Unexpected image error after retries:', err);
    res.status(502).json({
      error: 'The image service could not generate an image right now. Please try again in a moment.',
    });
  }
};
