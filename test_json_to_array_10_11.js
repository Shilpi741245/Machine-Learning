const axios = require("axios");
const fs = require("fs").promises;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function getEmbeddings() {
  const jsonString = await fs.readFile("./intents.json", "utf8");
  const data = JSON.parse(jsonString);

  let result = [];

  for (let intent of data.intents) {
    for (let pattern of intent.patterns) {
      console.log(typeof pattern);
      try {
        const response = await axios.post(
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
        );

        if (!response.data.data || !response.data.data[0].embedding) {
          console.error("Unexpected response format:", response.data);
          return;
        }

        result.push({
          pattern: pattern,
          responses: intent.responses,
          embedding: response.data.data[0].embedding,
        });

        await fs.writeFile(
          "./embedded_data.json",
          JSON.stringify(result, null, 2)
        );
      } catch (err) {
        console.error("API request failed:", err);
      }

      //       const response = await axios.post(
      //         "https://api.openai.com/v1/embeddings",
      //         {
      //           model: "text-embedding-ada-002",
      //           input: pattern,
      //           encoding_format: "float",
      //         },
      //         {
      //           headers: {
      //             Authorization: `Bearer ${OPENAI_API_KEY}`,
      //             "Content-Type": "application/json",
      //           },
      //         }
      //       );

      //       result.push({
      //         pattern: pattern,
      //         responses: intent.responses,
      //         embedding: response.data.embeddings[0],
      //       });
    }
  }
}

getEmbeddings().catch(console.error);
