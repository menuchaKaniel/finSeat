// Test script for Bedrock integration
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

async function testBedrockConnection() {
  console.log("🧪 Testing Bedrock Connection...");
  
  try {
    const client = new BedrockRuntimeClient({ 
      region: process.env.AWS_DEFAULT_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        sessionToken: process.env.AWS_SESSION_TOKEN
      }
    });

    const modelId = "anthropic.claude-sonnet-4-5-20250929-v1:0";
    
    const body = JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 100,
      messages: [
        { role: "user", content: "Say 'Bedrock connection test successful' with a 95% confidence rating." },
      ],
    });

    const command = new InvokeModelCommand({ modelId, body });
    const response = await client.send(command);
    
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    console.log("✅ Bedrock Response:", responseBody.content[0].text);
    
    return true;
  } catch (error) {
    console.error("❌ Bedrock Test Failed:", error);
    return false;
  }
}

// Run test if this file is executed directly
if (typeof window === 'undefined') {
  testBedrockConnection();
}

export { testBedrockConnection };