import express from "express";
import path from "node:path";

import indexRouter from "./routes";

const app = express();

const viewsPath = path.join(__dirname, "..", "views");
const publicPath = path.join(__dirname, "..", "public");

app.set("views", viewsPath);
app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(publicPath));

app.use("/", indexRouter);

export default app;
