import express from "express";
import cors from "cors";
import { OpenAI } from "openai";
import { McpHttpClient } from "./mcpHttpClient.js";

const app = express();
app.use(cors());
app.use(express.json());

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// MCP client over HTTP
const mcp = new McpHttpClient("http://localhost:3000/mcp");

// Tools ophalen van MCP server
const tools = await mcp.listTools();

// Omzetten naar OpenAI format
const openAiTools = tools.map(t => ({
  type: "function",
  function: {
    name: t.name,
    description: t.description ?? "MCP tool",
    parameters: t.inputSchema ?? { type: "object", properties: {} }
  }
}));

console.log("Registered MCP tools:", openAiTools);

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    let response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: userMessage }],
      tools: openAiTools,
      tool_choice: "auto"
    });

    const msg = response.choices[0].message;

    // LLM wil tool aanroepen
    if (msg.tool_calls) {
      const t = msg.tool_calls[0];
      const args = JSON.parse(t.function.arguments || "{}");

      const result = await mcp.runTool(t.function.name, args);

      // Final answer
      response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          { role: "user", content: userMessage },
          msg,
          {
            role: "tool",
            tool_call_id: t.id,
            content: JSON.stringify(result)
          }
        ]
      });
    }

    res.json({ reply: response.choices[0].message.content });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.toString() });
  }
});

app.listen(4000, () =>
  console.log("Backend running at http://localhost:4000")
);
