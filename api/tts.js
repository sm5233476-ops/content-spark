const MODEL = 'gemini-3.1-flash-tts-preview';
const MAX_ATTEMPTS = 3;

const ALLOWED_VOICES = ['Kore', 'Charon', 'Algenib', 'Fenrir', 'Sulafat', 'Achernar', 'Puck', 'Gacrux'];

async function callTTS(text, apiKey, voiceName) {
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
            contents: [{ parts: [{ text: text }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
              },
            },
          }),
        }
      );

      if (response.ok) {
        return response;
      }

      const errText = await response.text();
      console.error('Gemini TTS error (attempt ' + attempt + '):', errText);
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

// Gemini TTS returns raw PCM audio (16-bit, mono, 24kHz). Browsers can't play
// raw PCM directly, so we wrap it in a standard WAV header here on the server.
function pcmToWav(pcmBuffer, sampleRate, numChannels, bitsPerSample) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(buffer, 44);

  return buffer;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { text, voice } = req.body || {};

  if (!text || typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'Please paste some text to convert to voice.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: 'Server is missing an API key. Add GEMINI_API_KEY in your Vercel project settings.',
    });
    return;
  }

  const chosenVoice = ALLOWED_VOICES.includes(voice) ? voice : 'Kore';

  try {
    const response = await callTTS(text.trim(), apiKey, chosenVoice);
    const data = await response.json();
    const part =
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0];

    const base64Pcm = part && part.inlineData && part.inlineData.data;

    if (!base64Pcm) {
      res.status(502).json({ error: 'The voice service returned no audio. Please try again.' });
      return;
    }

    const pcmBuffer = Buffer.from(base64Pcm, 'base64');
    const wavBuffer = pcmToWav(pcmBuffer, 24000, 1, 16);

    res.status(200).json({ audio: 'data:audio/wav;base64,' + wavBuffer.toString('base64') });
  } catch (err) {
    console.error('Unexpected TTS error after retries:', err);
    res.status(502).json({
      error: 'The voice service could not generate audio right now. Please try again in a moment.',
    });
  }
};
