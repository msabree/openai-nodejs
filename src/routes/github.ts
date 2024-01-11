import express from "express";
import OpenAI from "openai";
import { Octokit } from "octokit";

const router = express.Router();

router.get('/user', async (req, res) => {
  const { token = '', username = '' } = req.query;

  if (!username) {
      res.send({ success: false, message: 'No username provided' });
      return;
  }

  // open ai test
  const openai = new OpenAI();

  // fallback to our token... 
  // later we can allow users to auth to get private repos and originazation data
  const octokit = new Octokit({ auth: token ?? process.env.GITHUB_TOKEN });

  const response = await octokit.rest.users.getByUsername({
      username: username as string,
  });

  res.send(response);
})

router.get('/repos', async (req, res) => {
    const { token = '', username = '' } = req.query;

    if (!token && !username) {
        res.send({ success: false, message: 'No token or username provided' });
        return;
    }

    // fallback to our token... 
    // later we can allow users to auth to get private repos and originazation data
    const octokit = new Octokit({ auth: token ?? process.env.GITHUB_TOKEN });
      
    if(token){
      const {
        data: { login },
      } = await octokit.rest.users.getAuthenticated();
      const response = await octokit.rest.repos.listForAuthenticatedUser({
        username: login,
        visibility: 'all',
        affiliation: 'owner',
      })

      res.send(response);
    }
    else{
      const response = await octokit.rest.repos.listForUser({
        username: username as string,
        type: 'owner',
      })

      res.send(response);
    }
})

router.get('/commits', async (req, res) => {
    const { token, repo } = req.query;

    if (!token || !repo) {
        res.send({ success: false, message: 'No token and/or repo provided' });
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
        repo: repo as string,
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
            "content": "Summarize work in 2-3 sentences. Make it sound like i am very smart."
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