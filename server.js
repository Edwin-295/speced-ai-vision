const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));
app.use(express.static('public'));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const analyses = [];
const childProfiles = [];

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

app.post('/api/analyze', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { childName, childAge, condition } = req.body;
    const base64 = req.file.buffer.toString('base64');
    let mediaType = 'image/jpeg';
    if (req.file.mimetype.includes('png')) mediaType = 'image/png';

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [{
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 }
        }, {
          type: 'text',
          text: `Analyze ${childName} (${childAge}y, ${condition}). Look for behaviors, patterns, strengths, interventions.`
        }]
      }]
    });

    const text = response.content[0].text;
    const analysis = { childName, childAge, condition, timestamp: new Date(), rawAnalysis: text };
    analyses.push(analysis);

    let profile = childProfiles.find(c => c.name === childName);
    if (!profile) {
      profile = { name: childName, age: childAge, condition, analyses: [] };
      childProfiles.push(profile);
    }
    profile.analyses.push(analysis);
    res.json({ success: true, analysis });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/children', (req, res) => res.json(childProfiles));

app.post('/api/generate-report', async (req, res) => {
  try {
    const child = childProfiles.find(c => c.name === req.body.childName);
    if (!child) return res.status(404).json({ error: 'Not found' });

    const texts = child.analyses.map((a, i) => `${i+1}. ${a.rawAnalysis}`).join('\n\n');
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Generate parent report for ${child.name} (${child.age}y, ${child.condition}): ${texts}`
      }]
    });

    res.json({ childName: child.name, report: response.content[0].text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n✓ SpecEd AI Vision running on port ${PORT}\n`);
});
