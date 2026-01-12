const express=require('express');
const dotenv = require("dotenv");
const cors = require("cors");
const OpenAI = require("openai");
const { v4: uuidv4 } = require("uuid");

const connectDB = require("./db");
const Chat = require("./models/chat");

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});



/**
 * POST /chat
 * body: { message, sessionId? }
 */
app.post("/chat", async (req, res) => {
  try {
    let { message, sessionId } = req.body;

    // Create new session if not provided
    if (!sessionId) {
      sessionId = uuidv4();
    }

    // Store user message
    await Chat.create({
      sessionId,
      role: "user",
      message
    });

    // Get previous messages for context
    const history = await Chat.find({ sessionId })
      .sort({ createdAt: 1 })
      .limit(10);

    const messages = history.map(chat => ({
      role: chat.role,
      content: chat.message
    }));

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages
    });

    const reply = response.choices[0].message.content;

    // Store assistant reply
    await Chat.create({
      sessionId,
      role: "assistant",
      message: reply
    });

    res.json({
      sessionId,
      reply
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});
