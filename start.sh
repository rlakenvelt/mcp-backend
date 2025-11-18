# export OPENAI_API_KEY="sk-xxxxxx" 

#!/bin/bash
# start MCP + OpenAI backend

echo "--------------------------------------"
echo "Starting MCP + OpenAI backend..."
echo "--------------------------------------"

# Check OpenAI API key
if [ -z "$OPENAI_API_KEY" ]; then
  echo "Error: OPENAI_API_KEY is not set!"
  exit 1
fi

# Start backend
node index.js
