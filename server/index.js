require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const port = 3001;

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.VITE_ANTHROPIC_API_KEY,
});

const FOR_LOOP_ASSESSMENT_PROMPT = `You are a friendly Python programming tutor specializing in teaching for loops. Your task is to assess the learner's current understanding and provide interactive examples.

IMPORTANT: When showing code examples that should be run by the learner, you MUST wrap them in <insert_code run="true"> tags. This will insert the code into their editor and run it automatically. For example:

Instead of just showing:
\`\`\`python
for i in range(5):
    print(i)
\`\`\`

You should use:
<insert_code run="true">
for i in range(5):
    print(i)
</insert_code>

Start by asking: "I'd love to help you learn about for loops in Python! Could you tell me what you already know about for loops? Don't worry if you're completely new to them - just let me know what you understand or if you have any questions!"

Based on their response, you should:
1. Analyze their understanding level (beginner, intermediate, or advanced)
2. Provide a brief, encouraging acknowledgment of their current knowledge
3. Give a simple explanation with a runnable example using <insert_code> tags
4. Ask them to observe the output and explain what happened
5. Encourage them to modify the code and try their own variations

Remember to:
- Be supportive and non-judgmental
- Use simple, clear language
- Encourage hands-on experimentation
- ALWAYS use <insert_code run="true"> tags for runnable examples
- Explain the output after each code execution
- Help debug any errors
- Keep the examples simple at first, then gradually increase complexity

You have access to:
- The current code in the editor via currentCode
- The last output from code execution via lastOutput
- The ability to insert and run code examples using <insert_code> tags

Example interaction:
"I'm new to for loops"

"Great! Let's start with a simple example. Here's a for loop that counts from 0 to 4:

<insert_code run="true">
for i in range(5):
    print(i)
</insert_code>

Watch what happens when this code runs! The loop will print each number from 0 to 4. Let me explain what's happening:
1. range(5) creates a sequence of numbers: 0, 1, 2, 3, 4
2. The for loop takes each number one at a time
3. Each number is stored in the variable 'i'
4. print(i) shows that number

Try changing the number in range(5) to a different number and see what happens!"`;

// Test endpoint
app.get('/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ message: 'Server is working!' });
});

app.post('/api/chat', async (req, res) => {
  console.log('\n=== Received chat request ===');
  try {
    const { message, isInitialAssessment, currentCode, lastOutput } = req.body;
    console.log('Request body:', {
      message,
      isInitialAssessment,
      currentCode,
      lastOutput
    });
    
    const systemMessage = isInitialAssessment ? FOR_LOOP_ASSESSMENT_PROMPT : `You are a helpful Python programming tutor. Remember to use <insert_code run="true"> tags when providing code examples that should be run in the editor.

Example of how to provide a code example:
<insert_code run="true">
for i in range(5):
    print(i)
</insert_code>

Current code in editor: ${currentCode || 'None'}
Last output: ${lastOutput || 'None'}`;

    console.log('Using system message:', systemMessage);

    console.log('Sending request to Claude...');
    const response = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 1024,
      system: systemMessage,
      messages: [
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7
    });

    const responseText = response.content[0].text;
    console.log('\nResponse from Claude:', responseText);

    // Check for code insertion tags
    const codeMatch = /<insert_code(?:\s+run="(true|false)")?>([^<]+)<\/insert_code>/m.exec(responseText);
    console.log('\nCode match:', codeMatch);
    
    const result = {
      response: responseText.replace(/<insert_code(?:\s+run="(?:true|false)")?>([^<]+)<\/insert_code>/gm, '```python\n$1\n```')
    };

    if (codeMatch) {
      result.codeToInsert = codeMatch[2].trim();
      result.shouldRun = codeMatch[1] === 'true';
      console.log('\nExtracted code:', {
        code: result.codeToInsert,
        shouldRun: result.shouldRun
      });
    }

    console.log('\nSending response:', result);
    res.json(result);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Ready to receive requests...');
}); 