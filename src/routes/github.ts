import express from "express";
import OpenAI from "openai";
import { Octokit } from "octokit";
import { decodeBase64, getStringSizeInBytes } from "../utils/strings";
import { MAX_OPEN_AI_TOKEN_LENGTH } from "../constants";

const router = express.Router();

router.get('/user', async (req, res) => {
  const { username = '' } = req.query;

  if (!username) {
      res.send({ success: false, message: 'No username provided' });
      return;
  }

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN ?? ''});

  const response = await octokit.rest.users.getByUsername({
    username: username as string,
  });

  res.send(response);
})

router.get('/repos', async (req, res) => {
    const { username = '' } = req.query;

    if (!username) {
      res.send({ success: false, message: 'No username provided' });
      return;
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN ?? ''});      
    const reposResponse = await octokit.rest.repos.listForUser({
      username: username as string,
      type: 'owner',
    })

    // Now that we have the repos, we need to fetch additional data for each repo that is not provided in base call.
    for(let i = 0; i < reposResponse.data.length; i++){

      // contributor stats
      const contributorStatsResponse = await octokit.rest.repos.getContributorsStats({
        owner: username as string,
        repo: reposResponse.data[i].name,
      });

      // full language details
      const languagesResponse = await octokit.rest.repos.listLanguages({
        owner: username as string,
        repo: reposResponse.data[i].name,
      });

      (reposResponse.data[i] as any)._contributorStats = contributorStatsResponse.data;
      (reposResponse.data[i] as any)._languages = languagesResponse.data;
    }

    res.send(reposResponse);
})

router.get('/repos/:name', async (req, res) => {
  const { username = '', default_branch = 'main' } = req.query;
  const repo = req.params.name;

  if (!username || !repo) {
    res.send({ success: false, message: 'No repo or username provided.' });
    return;
  }

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN ?? '' });
  
  const response = await octokit.request('GET /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=true', {
    owner: username as string,
    repo,
    tree_sha: 'master', // pass from UI
  })

  interface CodeScore {
    openAI: {
      quality: number; // 0 - 10
      explanation: string;
      suggestions: string;
    } | null,
    details?: string;
  }

  const codeScore:Record<string, CodeScore> = {};

  for(let i = 0; i < response.data.tree.length; i++) {
    const file = response.data.tree[i];
    const fileResponse = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner: username as string,
      repo,
      path: file.path,
    })

    const fileData = fileResponse.data as any;

    if(fileData.type === 'file'){
      const plainText = decodeBase64(fileData.content);
      const fileSizeInBytes = getStringSizeInBytes(plainText);
  
      if(fileSizeInBytes < MAX_OPEN_AI_TOKEN_LENGTH){
        const openai = new OpenAI();
        const openAIResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              "role": "system",
              "content": "Score code using this pattern: {quality: 1-10, explanation: 'Explain why the code received this score.', suggestions: 'Explain how to get a 10/10.'}. Return valid json."
            },
            {
              "role": "user",
              "content": plainText
            },
          ],
          temperature: 1,
          max_tokens: 256,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
        })

        const openAIContent = openAIResponse.choices[0].message.content;
        if(openAIContent !== null){
          let openAIContentJSON = null;
          try {
            openAIContentJSON = JSON.parse(openAIContent);
            codeScore[fileData.name] = {
              openAI: openAIContentJSON,
            }
          } catch(e){
            codeScore[fileData.name] = {
              openAI: null,
              details: 'Invalid JSON returned from OpenAI.'
            }
          }
        }
      }
      else{
        codeScore[fileData.name] = {
          openAI: null,
          details: 'File is too large to analyze.'
        }
      }
    }
  }

  console.log(codeScore);

  res.send({
    success: true,
    data: {
      codeScore,
      repo,
    },
  });
})

export { router };