import express from "express";
import cors from "cors";
import { OpenAI } from "openai";
import { McpHttpClient } from "./mcpHttpClient.js";

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// MCP HTTP client
const mcp = new McpHttpClient("http://localhost:3000/mcp");

console.log("Connecting to MCP server…");
const tools = await mcp.listTools();
console.log("Registered MCP tools:", tools.map(t => t.name));

const openAiTools = tools.map(t => ({
  type: "function",
  function: {
    name: t.name,
    description: t.description ?? "MCP tool",
    parameters: t.inputSchema ?? { type: "object", properties: {} }
  }
}));

// --------------------
// Chat endpoint
// --------------------
app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message;
  console.log("User:", userMessage);

  try {
    let response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: userMessage }],
      tools: openAiTools,
      tool_choice: "auto"
    });

    const msg = response.choices[0].message;

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      const t = msg.tool_calls[0];
      const args = JSON.parse(t.function.arguments || "{}");

      console.log("LLM requested MCP tool:", t.function.name, args);
      const result = await mcp.runTool(t.function.name, args);
      console.log("MCP result:", result);

      response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          { role: "user", content: userMessage },
          msg,
          { role: "tool", tool_call_id: t.id, content: JSON.stringify(result) }
        ]
      });
    }

    console.log("Assistant:", response.choices[0].message.content);
    res.json({ reply: response.choices[0].message.content });
  } catch (e) {
    console.error("Error:", e.toString());
    res.status(500).json({ error: e.toString() });
  }
});

app.listen(4000, () => console.log("Backend running at http://localhost:4000"));
