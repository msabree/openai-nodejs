import express from "express";
import OpenAI from "openai";
import { Octokit } from "octokit";

const router = express.Router();

router.get('/repos', async (req, res) => {
    const { token = '' } = req.query;

    if (!token) {
        res.send({ success: false, message: 'No token provided' });
        return;
    }

    // open ai test
    const openai = new OpenAI();

    // github integration test
    const octokit = new Octokit({ auth: token ?? '' });

    const {
        data: { login },
      } = await octokit.rest.users.getAuthenticated();
      
    const response = await octokit.rest.repos.listForAuthenticatedUser({
        username: login,
        visibility: 'all',
        affiliation: 'owner',
    })

    res.send(response);
})

router.get('/commits', async (req, res) => {
    const { token } = req.query;

    if (!token) {
        res.send({ success: false, message: 'No token provided' });
        return;
    }

    // open ai test
    const openai = new OpenAI();

    // github integration test
    const octokit = new Octokit({ auth: token ?? '' });

    const {
        data: { login },
      } = await octokit.rest.users.getAuthenticated();
      console.log("Hello, %s", login);
      
      // the token doesn't have access to private repos...
      const response = await octokit.rest.repos.listCommits({
        owner: login,
        repo: "standup-gpt"
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
            "content": " Summarize work in 2-3 bullet points. Make it sound like a human wrote it."
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

    res.send(openAIResponse);
})

export { router };