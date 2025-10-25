import cookieParser from "cookie-parser";
import crypto from "node:crypto";
import express, { NextFunction, Request, Response } from "express";
import path from "node:path";

import indexRouter from "./routes";

const app = express();

const viewsPath = path.join(__dirname, "..", "views");
const publicPath = path.join(__dirname, "..", "public");

const isProduction = process.env.NODE_ENV === "production";
const TURNSTILE_SITE_KEY =
  process.env.TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA";
const TURNSTILE_SECRET_KEY =
  process.env.TURNSTILE_SECRET_KEY ??
  "1x0000000000000000000000000000000AA";

app.locals.turnstileSecretKey = TURNSTILE_SECRET_KEY;

app.set("views", viewsPath);
app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(publicPath));

app.use((req: Request, res: Response, next: NextFunction) => {
  const allowedThemes = new Set(["system", "light", "dark"]);
  const requestedTheme =
    typeof req.cookies?.theme === "string" ? req.cookies.theme : "system";

  res.locals.theme = allowedThemes.has(requestedTheme)
    ? requestedTheme
    : "system";

  res.locals.turnstileVerified = req.cookies?.turnstile_verified === "true";
  res.locals.turnstileSiteKey = TURNSTILE_SITE_KEY;
  res.locals.requestFingerprint = {
    ip: req.ip,
    userAgent: req.get("user-agent") ?? "Unknown",
    languages: req.acceptsLanguages() ?? [],
  };
  res.locals.rayId = crypto.randomUUID();
  res.locals.isProduction = isProduction;

  next();
});

app.use("/", indexRouter);

app.use((req: Request, res: Response) => {
  res.status(404).render("errors/404", {
    title: "Sayfa bulunamadi",
    description: "Istediginiz sayfa tasinmis ya da hic var olmamis olabilir.",
    theme: res.locals.theme,
    activePath: req.path,
    turnstileVerified: res.locals.turnstileVerified,
  });
});

app.use(
  (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
  ): Response | void => {
    console.error(err);
    if (res.headersSent) {
      return;
    }

    return res.status(500).render("errors/500", {
      title: "Beklenmeyen bir hata olustu",
      description:
        "Teknik ekibimiz bilgilendirildi. Lutfen kisa bir sure sonra tekrar deneyin.",
      theme: res.locals.theme,
      activePath: req.path,
      turnstileVerified: res.locals.turnstileVerified,
    });
  }
);

export default app;
