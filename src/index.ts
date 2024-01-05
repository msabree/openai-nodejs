import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import { Octokit } from "octokit";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3003;

// open ai test
const openai = new OpenAI();

// github integration test
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN ?? '' });

async function main() {
  const {
    data: { login },
  } = await octokit.rest.users.getAuthenticated();
  console.log("Hello, %s", login);

  const response = await octokit.rest.repos.listCommits({
    owner: login,
    repo: "chess-app"
  })

  const commits = [];
  for(let i = 0; i < response.data.length; i++) {
    const message = response.data[i].commit.message;
    const timestamp = response?.data[i]?.commit?.author?.date ?? new Date().toString();
    commits.push({ message, timestamp });
  }

  const openAIResponse = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        "role": "system",
        "content": " Summarize work in 2-3 bullet points\n\n"
      },
      {
        "role": "user",
        "content": JSON.stringify(commits)
      },
    ],
    temperature: 1,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  })

  console.log(JSON.stringify(openAIResponse));
}

main();

app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server');
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});