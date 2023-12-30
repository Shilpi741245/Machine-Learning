const axios = require("axios");
const fs = require("fs").promises;
const Bottleneck = require("bottleneck"); // Install this library
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("Please set the OPENAI_API_KEY environment variable.");
  process.exit(1);
}

// Create a new limiter that allows 3 requests per minute
const limiter = new Bottleneck({
  minTime: 60000 / 3,
});

async function getEmbeddings() {
  const jsonString = await fs.readFile("./intents.json", "utf8");
  const data = JSON.parse(jsonString);

  let result = [];

  for (let intent of data.intents) {
    for (let pattern of intent.patterns) {
      try {
        const response = await limiter.schedule(() =>
          axios.post(
            "https://api.openai.com/v1/embeddings",
            {
              model: "text-embedding-ada-002",
              input: String(pattern),
              encoding_format: "float",
            },
            {
              headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
              },
            }
          )
        );

        if (!response.data.data || !response.data.data[0].embedding) {
          console.error("Unexpected response format:", response.data);
          continue;
        }

        result.push({
          pattern: pattern,
          responses: intent.responses,
          embedding: response.data.data[0].embedding,
        });
      } catch (err) {
        console.error("API request failed:", err);
        // Stop execution if an API request fails
        process.exit(1);
      }
    }
  }

  // Write the result to a file after all API requests have completed
  await fs.writeFile("./embedded_data.json", JSON.stringify(result, null, 2));
}

getEmbeddings().catch(console.error);
