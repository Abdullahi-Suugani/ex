import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("Missing GEMINI_API_KEY in your .env file.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const rl = readline.createInterface({ input, output });

const model = "gemini-2.5-flash";
let topic = "";
let outline = "";
let history = [];

async function askGemini(prompt, temperature = 0.7) {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { temperature },
  });

  return response.text ?? "";
}

async function main() {
  try {
    console.log("\n=== Smart Content Assistant ===\n");

    topic = (await rl.question("Enter your blog topic: ")).trim();

    if (!topic) {
      console.log("Please enter a topic.");
      return;
    }

    const temperatureInput = await rl.question(
      "Creativity level, 0 for factual to 1 for creative (default 0.7): ",
    );

    const temperature =
      temperatureInput.trim() === "" ? 0.7 : Number(temperatureInput);

    if (!Number.isFinite(temperature) || temperature < 0 || temperature > 1) {
      console.log("Temperature must be between 0 and 1.");
      return;
    }

    console.log("\nGenerating your blog outline...\n");

    outline = await askGemini(
      `Create a clear, structured blog outline about "${topic}".
Include a title, introduction, main headings with subtopics, and conclusion.`,
      temperature,
    );

    console.log("=== BLOG OUTLINE ===\n");
    console.log(outline);

    console.log("\nGenerating a two-sentence summary...\n");

    const summary = await askGemini(
      `Summarize the following blog outline in exactly two sentences:\n\n${outline}`,
      temperature,
    );

    console.log("=== TWO-SENTENCE SUMMARY ===\n");
    console.log(summary);

    console.log("\nYou can now ask follow-up questions about your topic.");
    console.log("Type 'exit' to quit.\n");

    while (true) {
      const question = (await rl.question("Your question: ")).trim();

      if (question.toLowerCase() === "exit") {
        break;
      }

      if (!question) {
        continue;
      }

      const context = history
        .map((item) => `${item.role}: ${item.text}`)
        .join("\n");

      console.log("\nGemini is thinking...\n");

      const answer = await askGemini(
        `Topic: ${topic}\nBlog outline:\n${outline}\n\n` +
          `Previous conversation:\n${context || "None"}\n\n` +
          `User question: ${question}\nAnswer clearly and accurately.`,
        temperature,
      );

      console.log(`Gemini: ${answer}\n`);

      history.push(
        { role: "user", text: question },
        { role: "assistant", text: answer },
      );

      history = history.slice(-12);
    }
  } catch (error) {
    console.error("\nError:", error.message);
  } finally {
    rl.close();
  }
}

main();
