const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const children = [
  { 
    id: 'arjun', 
    name: 'Arjun Kumar', 
    age: 6, 
    disability: 'Autism Spectrum Disorder',
    parent: 'Ramesh Kumar',
    triggers: { 'Sudden Change': 40, 'Loud Noise': 30 },
    strategies: { 'Music': 85, 'Quiet Room': 60, 'Firm Hugs': 50 },
    observations: [
      { activity: 'Transition', behavior: 'Meltdown', trigger: 'Sudden Change', strategy: 'Music' },
      { activity: 'Lunch', behavior: 'Happy', trigger: 'Hunger', strategy: 'Snack' },
      { activity: 'Group Activity', behavior: 'Withdrawn', trigger: 'Loud Noise', strategy: 'Quiet Room' }
    ]
  },
  { 
    id: 'priya', 
    name: 'Priya Sharma', 
    age: 5, 
    disability: 'Speech Delay',
    parent: 'Amit Sharma',
    triggers: { 'Transition': 50, 'Loud Noise': 40 },
    strategies: { 'Firm Hugs': 90, 'Music': 70 },
    observations: [
      { activity: 'Therapy', behavior: 'Engaged', trigger: 'none', strategy: 'One-on-one' },
      { activity: 'Lunch', behavior: 'Anxious', trigger: 'Transition', strategy: 'Hugs' }
    ]
  },
  { 
    id: 'rohan', 
    name: 'Rohan Singh', 
    age: 7, 
    disability: 'ADHD',
    parent: 'Vikram Singh',
    triggers: { 'Sudden Change': 60 },
    strategies: { 'Visual Timer': 95, 'Music': 80 },
    observations: [
      { activity: 'Free Play', behavior: 'Calm', trigger: 'none', strategy: 'Structured' },
      { activity: 'Activity', behavior: 'Restless', trigger: 'Unstructured', strategy: 'Timer' }
    ]
  }
];

const chatSessions = {};

app.get('/api/children', (req, res) => {
  res.json(children);
});

app.get('/api/children/:id', (req, res) => {
  const child = children.find(c => c.id === req.params.id);
  if (!child) return res.status(404).json({ error: 'Child not found' });
  res.json(child);
});

app.post('/api/chat', async (req, res) => {
  try {
    const { childId, message, sessionId } = req.body;
    const child = children.find(c => c.id === childId);
    
    if (!child) return res.status(404).json({ error: 'Child not found' });

    if (!chatSessions[sessionId]) {
      chatSessions[sessionId] = [];
    }

    const childContext = `You are a special education AI assistant helping parents of ${child.name}, a ${child.age}-year-old with ${child.disability}.

CHILD'S PROFILE:
- Triggers: ${Object.entries(child.triggers).map(([k, v]) => `${k} (${v}%)`).join(', ')}
- Effective Strategies: ${Object.entries(child.strategies).map(([k, v]) => `${k} (${v}%)`).join(', ')}

Provide personalized, compassionate advice based on this child's specific profile.`;

    chatSessions[sessionId].push({ role: 'user', content: message });

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      system: childContext,
      messages: chatSessions[sessionId]
    });

    const assistantMessage = response.content[0].text;
    chatSessions[sessionId].push({ role: 'assistant', content: assistantMessage });

    res.json({ message: assistantMessage, childName: child.name });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Error: ' + error.message });
  }
});

app.get('/api/therapy', (req, res) => {
  res.json([
    { id: 1, title: 'Speech Development', duration: '8 min', category: 'Speech' },
    { id: 2, title: 'Fine Motor Skills', duration: '10 min', category: 'OT' },
    { id: 3, title: 'Managing Meltdowns', duration: '12 min', category: 'Behavioral' }
  ]);
});

app.get('/api/courses', (req, res) => {
  res.json([
    { id: 1, title: 'Autism Basics', tier: 'Tier 1', duration: '4 weeks', price: 2500 },
    { id: 2, title: 'ABA Techniques', tier: 'Tier 2', duration: '8 weeks', price: 7500 }
  ]);
});

app.get('/api/vocational', (req, res) => {
  res.json([
    { id: 1, title: 'Retail Skills', age: '14+', modules: 5 },
    { id: 2, title: 'Food Service', age: '14+', modules: 5 }
  ]);
});

app.post('/api/assessment', (req, res) => {
  const score = Math.floor(Math.random() * 50) + 40;
  res.json({ score, result: 'Assessment results: See a specialist for full evaluation' });
});

app.listen(PORT, () => {
  console.log(`\n✓ SpecEd AI running on http://localhost:${PORT}`);
  console.log('✓ Claude API connected\n');
});
