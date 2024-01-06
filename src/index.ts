import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";

import { router as github } from "./routes/github";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3002;

app.use(cors())
app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))

app.use('/github', github)

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});