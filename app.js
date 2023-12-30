/*
 * Starter Project for WhatsApp Echo Bot Tutorial
 *
 * Remix this as the starting point for following the WhatsApp Echo Bot tutorial
 *
 */

"use strict";

// Access token for your app
// (copy token from DevX getting started page
// and save it as environment variable into the .env file)
// Imports dependencies and set up http server
const request = require("request"),
  express = require("express"),
  body_parser = require("body-parser"),
  axios = require("axios").default,
  app = express().use(body_parser.json()), // creates express http server
  OPENAI_API_URL = "https://api.openai.com/v1/chat/completions",
  OPENAI_API_KEY = process.env.OPENAI_API_KEY,
  token = process.env.WHATSAPP_TOKEN,
  verify_token = process.env.VERIFY_TOKEN,
  sqlite3 = require("sqlite3").verbose(),
  db = new sqlite3.Database("chat.db"),
  fs = require("fs").promises;
let phone_number_id;

console.log("Checkpoint 1");
// axios.defaults.timeout = 1000;
// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log("webhook is listening"));

const client = axios.create({
  headers: {
    Authorization: "Bearer " + OPENAI_API_KEY,
  },
});

// Create a table to store chat messages
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number_id TEXT,
      sender TEXT,  -- Change "from" to "sender" or another suitable name
      message TEXT,
      gpt_response TEXT,
      time TEXT
    )
  `);
});

function normalize(vector) {
  // console.log(vector);
  let sum = 0;
  for (let i = 0; i < vector.length; i++) {
    sum += vector[i] * vector[i];
  }
  let magnitude = Math.sqrt(sum);
  return vector.map((x) => x / magnitude);
}

function dotProduct(a, b) {
  let sum = 0;
  if (a.length != b.length) {
    console.log("Error, length of embedded vectors don't match");
    return 0;
  }
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

function to_db(from, msg_body, gpt_response) {
  let d = new Date();
  db.run(
    "INSERT INTO chat_messages (phone_number_id, sender, message, gpt_response, time) VALUES (?, ?, ?, ?, ?)",
    [phone_number_id, from, msg_body, gpt_response, d.getTime()],
    (err) => {
      if (err) {
        console.error("Error inserting message into the database:", err);
      } else {
        console.log("Message inserted into the database");
      }
    }
  );
}

async function sendWhatsAppTemplate(phone_number_id, from) {
  let id;
  await axios({
    method: "POST",
    url:
      "https://graph.facebook.com/v18.0/" +
      phone_number_id +
      "/messages?access_token=" +
      token,
    data: {
      messaging_product: "whatsapp",
      to: from,
      type: "template",
      template: {
        name: "hello_world",
        language: {
          code: "en_US"
        },
        components: [
          // Add your template components here
        ]
      }
    },
    headers: { "Content-Type": "application/json" },
  })
    .then((response) => {
      id = response.data.messages[0].id;
    })
    .catch((error) => {
      console.error(error);
    });
  return id;
}


// Function to send messages to WhatsApp
async function sendWhatsAppMessage(phone_number_id, from, msg_body) {
  console.log("checkpoint_8_11_1");
  axios({
    method: "POST", // Required, HTTP method, a string, e.g. POST, GET
    url:
      "https://graph.facebook.com/v12.0/" +
      phone_number_id +
      "/messages?access_token=" +
      token,
    data: {
      messaging_product: "whatsapp",
      to: from,
      text: { body: msg_body },
    },
    headers: { "Content-Type": "application/json" },
  });
  console.log("checkpoint_8_11_2");
}

function getUserHistory(userId) {
  if (!userHistories[userId]) {
    userHistories[userId] = [
      [1],
      [
        {
          role: "system",
          content: "You are a helpful assistant.",
        },
      ],
    ];
  }
  return userHistories[userId];
}

async function getAdaResponse(prompt) {
  const jsonString = await fs.readFile("./embedded_data.json", "utf8");
  const data = JSON.parse(jsonString);
  // console.log(data);
  const response = await axios.post(
    "https://api.openai.com/v1/embeddings",
    {
      model: "text-embedding-ada-002",
      input: String(prompt),
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
  }
  let embedded_prompt = response.data.data[0].embedding;
  console.log(embedded_prompt.length);

  let similarities = [];
  let possible_answers = [];
  data.forEach((element) => {
    let pattern = element.pattern;
    let responses = element.responses;
    let embedding = element.embedding;
    let similarity = dotProduct(
      normalize(embedded_prompt),
      normalize(embedding)
    );
    // console.log(embedding);
    // console.log(dotProduct(normalize(embedded_prompt), normalize(embedding)));
    similarities.push(similarity);
    if (similarity > 0.85) {
      possible_answers.push(...responses);
    }
  });
  console.log("s:: " + similarities);
  console.log("s:: " + possible_answers);
  console.log(possible_answers.length);
  if (possible_answers.length > 0) {
    let randomElement =
      possible_answers[Math.floor(Math.random() * possible_answers.length)];
    console.log(randomElement); // Output: a random element from the array
    return randomElement;
  }
  // let randomElement = possible_answers[Math.floor(Math.random() * possible_answers.length)];
  // console.log(randomElement); // Output: a random element from the array
  await console.log("Prompt is not close enough to any of the datapoints.");
  return null;
}

async function getChatGptResponse(prompt) {
  console.log(prompt);
  const model = "gpt-3.5-turbo";
  const timeout = 180 * 1000; // 300 seconds in milliseconds
  let response = "Temporary variable";
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    timeout: timeout,
  };

  const data = {
    model: model,
    messages: prompt,
    // max_tokens: 400,
  };
  console.log("func checkpoint 1");
  try {
    console.log("func checkpoint 2");
    response = await axios.post(OPENAI_API_URL, data, config);
    // console.log(response.data);
    console.log(response.data.choices[0].message.content);
    return response.data.choices[0].message.content;
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      console.log("Sorry we are currently unavailable");
      return "Sorry we are currently unavailable";
    } else {
      throw error;
    }
  }
}

let userHistories = {};
let idHistory = {};
// Accepts POST requests at /webhook endpoint
app.post("/webhook", async (req, res) => {
  try {
    //     // Parse the request body from the POST
    //     let body = req.body;

    //     if (body.type === 'text') {
    //     // This is a text message
    //     let text = body.text.body;
    //     // Now you can process the text message
    //   } else if (body.type === 'audio') {
    //     // This is an audio message
    //     let audioUrl = body.audio.mediaUrl;

    //     // Now you can download or process the audio file
    //   }

    // Check the Incoming webhook message
    // console.log(JSON.stringify(req.body, null, 2));

    // info on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
    if (req.body.object) {
      if (
        req.body.entry &&
        req.body.entry[0].changes &&
        req.body.entry[0].changes[0] &&
        req.body.entry[0].changes[0].value.messages &&
        req.body.entry[0].changes[0].value.messages[0]
      ) {
        phone_number_id =
          req.body.entry[0].changes[0].value.metadata.phone_number_id;
        let from = req.body.entry[0].changes[0].value.messages[0].from; // extract the phone number from the webhook payload
        let msg_body = req.body.entry[0].changes[0].value.messages[0].text.body; // extract the message text from the webhook payload
        
        // await sendWhatsAppTemplate(phone_number_id, from);
        
        let context = req.body.entry[0].changes[0].value.messages[0].context;
        console.log(context);
        if (context) {
          console.log("There's context");
        }
        if (!context) {
          console.log("There's no context");
        }
        let message_id = req.body.entry[0].changes[0].value.messages[0].id;
        console.log("id: " + message_id);
        let msg_timestamp =
          req.body.entry[0].changes[0].value.messages[0].timestamp + "000";
        let response = "Sorry we are currently unavailable";
        var timestamp = new Date().getTime();
        const maxHistory = 25;
        const maxUsers = 100;
        console.log(msg_body);
        console.log(msg_timestamp);
        console.log(timestamp);
        console.log(timestamp - msg_timestamp);

        if (timestamp - msg_timestamp < 2500) {
          console.log("fast");
        } else {
          console.log("slow");
        }
        let conversationHistory = getUserHistory(from)[1];
        if (getUserHistory(from)[0] == 1) {
          if (timestamp - msg_timestamp < 2500) {
            conversationHistory.push({
              role: "user",
              content:
                msg_body +
                " (Please provide information on it. If possible provide some links.)",
            });
            while (conversationHistory.length > maxHistory) {
              conversationHistory.shift();
            }

            if (Object.keys(userHistories).length > maxUsers) {
              delete userHistories[Object.keys(userHistories)[0]];
            }

            console.log(conversationHistory);
            response = await getAdaResponse(msg_body);
            if (response == null) {
              response = await getChatGptResponse(conversationHistory);
            }
            await sendWhatsAppMessage(phone_number_id, from, response);
            to_db(from, msg_body, response);
            await new Promise((r) => setTimeout(r, 2000));
            sendWhatsAppMessage(
              phone_number_id,
              from,
              "Was this information useful? Yes or no"
            );

            getUserHistory(from)[0] = 2;
          } else {
            console.log("Too much time has passed");
          }
        } else if (getUserHistory(from)[0] == 2) {
          console.log("in res mode");
          if (msg_body.toLowerCase() == "yes") {
            console.log("in yes");

            conversationHistory.push({
              role: "user",
              content: "Thanks, the information is useful.",
            });
            getUserHistory(from)[0] = 3;
            response =
              "Thank you for your feedback. Do you want to close this conversation?";
            // await sendWhatsAppMessage(phone_number_id, from, response);
          } else if (msg_body.toLowerCase() == "no") {
            console.log("in no");

            conversationHistory.push({
              role: "user",
              content: "Sorry, the information is not useful.",
            });
            getUserHistory(from)[0] = 1;
            response =
              "We apologise for the confusion. Can you please reframe the question.";
          } else {
            console.log("error");

            response = "The input is invalid. Kindly re-enter the input.";
          }
          await sendWhatsAppMessage(phone_number_id, from, response);
          to_db(from, msg_body, response);
        } else if (getUserHistory(from)[0] == 3) {
          console.log("in res mode 2");
          if (msg_body.toLowerCase() == "yes") {
            console.log("in yes 2");
            delete userHistories[from];

            response = "Thank you.";
            // await sendWhatsAppMessage(phone_number_id, from, response);
          } else if (msg_body.toLowerCase() == "no") {
            console.log("in no 2");

            getUserHistory(from)[0] = 1;
            response = null;
          } else {
            console.log("error");

            response = "The input is invalid. Kindly re-enter the input.";
          }
          await sendWhatsAppMessage(phone_number_id, from, response);
          to_db(from, msg_body, response);
        } else {
          console.log("Error, check the user history.");
        }
      }
      res.sendStatus(200);
    } else {
      // Return a '404 Not Found' if event is not from a WhatsApp API
      res.sendStatus(404);
    }
  } catch (error) {
    console.error("An error occurred:", error.response.data);

    //     let keys = Object.keys(userHistories);

    //     for (let key of keys) {
    //       let from = key;
    //       let conversationHistory = getUserHistory(from)[1];
    //       let response = "Sorry we are currently unavailable";
    //       let new_response;
    //       console.log(conversationHistory);
    //       response = await getChatGptResponse(conversationHistory);
    //       new_response =
    //         "Due to a server side error we are sending you the response of your last prompt. If you have already received the \
    //                                       required information, we apologise for the inconvenience. Please ignore otherwise.\n\n" +
    //         response;
    //       await sendWhatsAppMessage(phone_number_id, from, new_response);
    //       to_db(from, "SENT DUE TO ERROR: " + conversationHistory, new_response);

    //       await new Promise((r) => setTimeout(r, 2000));
    //       sendWhatsAppMessage(
    //         phone_number_id,
    //         from,
    //         "Was this information useful? Yes or no"
    //       );

    //       getUserHistory(from)[0] = 2;
    //     }

    res.sendStatus(500); // Send a 500 Internal Server Error response if something goes wrong
  }
});

// Accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
// info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
app.get("/webhook", (req, res) => {
  /**
   * UPDATE YOUR VERIFY TOKEN
   *This will be the Verify Token value when you set up webhook
   **/
  const verify_token = process.env.VERIFY_TOKEN;

  // Parse params from the webhook verification request
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  // Check if a token and mode were sent
  if (mode && token) {
    console.log("Available");
    if (mode === "subscribe") {
      console.log("mode is ok");
    } else {
      console.log("mode error");
    }
    if (token === verify_token) {
      console.log("token is ok");
    } else {
      console.log("token error");
    }
    // Check the mode and token sent are correct
    if (mode === "subscribe" && token === verify_token) {
      // Respond with 200 OK and challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});
