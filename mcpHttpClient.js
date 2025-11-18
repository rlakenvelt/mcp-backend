import axios from "axios";

export class McpHttpClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.nextId = 1;
  }

  async call(method, params = {}) {
    const id = this.nextId++;

    const body = {
      jsonrpc: "2.0",
      id,
      method,
      params
    };

    const res = await axios.post(this.baseUrl, body, {
      headers: { "Content-Type": "application/json" }
    });

    if (res.data.error) {
      throw new Error(JSON.stringify(res.data.error));
    }

    return res.data.result;
  }

  async listTools() {
    const result = await this.call("tools/list");
    return result.tools;
  }

  // MCP tool aanroepen
  async runTool(name, args = {}) {
    const result = await this.call("tools/call", {
      name,
      arguments: args
    });
    return result.output;
  }
}
