import { Request, Response, Router } from "express";

const router = Router();

const THEME_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 30; // 30 days
const TURNSTILE_COOKIE_MAX_AGE = 1000 * 60 * 60; // 1 hour
const ALLOWED_THEMES = new Set(["system", "light", "dark"]);

const sanitizeRedirect = (redirect?: string): string => {
  if (!redirect) {
    return "/";
  }

  try {
    const decoded = decodeURIComponent(redirect);
    if (!decoded.startsWith("/")) {
      return "/";
    }

    if (decoded.startsWith("//")) {
      return "/";
    }

    // Prevent open-redirect attempts containing protocol
    if (decoded.includes("://")) {
      return "/";
    }

    return decoded;
  } catch {
    return "/";
  }
};

router.get("/", (req: Request, res: Response) => {
  if (!res.locals.turnstileVerified) {
    const redirectUrl = encodeURIComponent(req.originalUrl || "/");
    return res.redirect(`/security?redirect=${redirectUrl}`);
  }

  res.render("pages/home", {
    title: "SubTranslate | Otomatik altyazi cevirici",
    description:
      "SubTranslate ile altyazilarinizi saniyeler icinde farkli dillere cevirin ve cam efektli arayuzle calisma akisinizi hizlandirin.",
    theme: res.locals.theme,
    activePath: "/",
    turnstileVerified: true,
    featureHighlights: [
      {
        title: "Gercek zamanli ceviri",
        description:
          "Altyazi dosyalarinizi yukleyin, 40+ dilde sonucu hizlica alin. Zaman kodlariniz otomatik korunur.",
        icon: "zap",
      },
      {
        title: "Cam efektli tasarim",
        description:
          "Modern cam efektli arayuz, sistem temasi ile senkron gece/gunduz modlari sunar.",
        icon: "panels-top-left",
      },
      {
        title: "Guvenli altyapi",
        description:
          "Cloudflare Turnstile, hiz sinirlama ve oturum parmak izi ile isteklere ekstra koruma ekler.",
        icon: "shield-check",
      },
    ],
    workflowSteps: [
      {
        step: "Kaynak sec",
        description:
          "Video baglantisini birakin veya altyazi dosyanizi (.srt, .vtt) cam etkili yukleyicide secin.",
        icon: "file-text",
      },
      {
        step: "Dil ve kurallari ayarla",
        description:
          "Hedef dilinizi belirleyin, teknik terimleri koruyacak akilli filtreleri devreye alin.",
        icon: "sliders-horizontal",
      },
      {
        step: "Kontrol et ve yayinla",
        description:
          "AI onerileri ile ceviriyi inceleyin, tek tikla yayina hazir cam paketler olusturun.",
        icon: "sparkles",
      },
    ],
  });
});

router.get("/security", (req: Request, res: Response) => {
  const rawRedirect =
    typeof req.query.redirect === "string" ? req.query.redirect : "/";
  const redirectPath = sanitizeRedirect(rawRedirect);

  const requestFingerprint = res.locals.requestFingerprint as {
    ip: string;
    userAgent: string;
    languages: string[];
  };

  res.render("pages/security", {
    title: "Guvenlik dogrulamasi",
    description:
      "Turnstile dogrulamasi ile SubTranslate oturumunuzu guvende tutun.",
    theme: res.locals.theme,
    activePath: "/security",
    turnstileVerified: res.locals.turnstileVerified as boolean,
    requestFingerprint,
    turnstileSiteKey: res.locals.turnstileSiteKey as string,
    redirectPath,
    rayId: res.locals.rayId as string,
    securityChecks: [
      {
        title: "Cloudflare Turnstile",
        status: res.locals.turnstileVerified ? "Gecildi" : "Bekliyor",
        detail: res.locals.turnstileVerified
          ? "Bu oturum son 1 saat icinde dogrulamayi tamamladi."
          : "Devam etmek icin once Turnstile dogrulamasini tamamlamaniz gerekir.",
      },
      {
        title: "Oturum parmak izi",
        status: requestFingerprint.ip,
        detail: `Tarayici: ${requestFingerprint.userAgent}`,
      },
      {
        title: "Hiz sinirlama",
        status: "Dakika basina kullanici limitleri",
        detail:
          "Arka planda calisan hiz sinirlama katmani API pozisyonunu korur.",
      },
      {
        title: "Veri saklama",
        status: "24 saat gecici depolama",
        detail:
          "Yuklenen altyazilar sifrelenir ve 24 saat sonunda otomatik olarak silinir.",
      },
    ],
  });
});

router.post("/api/theme", (req: Request, res: Response) => {
  const { theme } = req.body as { theme?: string };

  if (!theme || !ALLOWED_THEMES.has(theme)) {
    return res.status(400).json({
      success: false,
      message: "Gecersiz tema secimi.",
    });
  }

  res.cookie("theme", theme, {
    maxAge: THEME_COOKIE_MAX_AGE,
    httpOnly: false,
    sameSite: "lax",
    secure: req.app.get("env") === "production",
  });

  return res.json({
    success: true,
    theme,
  });
});

router.post("/verify-turnstile", async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const responseToken =
      typeof body.token === "string"
        ? body.token
        : typeof body["cf-turnstile-response"] === "string"
        ? body["cf-turnstile-response"]
        : undefined;

    const redirectTarget =
      typeof body.redirect === "string"
        ? sanitizeRedirect(body.redirect)
        : "/";

    if (!responseToken) {
      return res.status(400).json({
        success: false,
        message: "Turnstile yaniti alinmadi.",
      });
    }

    const secretKey = req.app.locals.turnstileSecretKey as string;
    const formData = new URLSearchParams();

    formData.append("secret", secretKey);
    formData.append("response", responseToken);
    formData.append("remoteip", req.ip ?? "");

    const verificationResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
      }
    );

    if (!verificationResponse.ok) {
      throw new Error(
        `Turnstile dogrulamasi basarisiz. HTTP ${verificationResponse.status}`
      );
    }

    const verificationPayload = (await verificationResponse.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };

    if (!verificationPayload.success) {
      return res.status(400).json({
        success: false,
        message: "Turnstile dogrulamasi basarisiz.",
        errors: verificationPayload["error-codes"] ?? [],
      });
    }

    res.cookie("turnstile_verified", "true", {
      maxAge: TURNSTILE_COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      secure: req.app.get("env") === "production",
    });

    return res.json({
      success: true,
      expiresIn: TURNSTILE_COOKIE_MAX_AGE,
      redirect: redirectTarget,
    });
  } catch (error) {
    console.error("Turnstile dogrulama hatasi:", error);
    return res.status(500).json({
      success: false,
      message:
        "Cloudflare Turnstile dogrulamasinda beklenmeyen bir hata olustu.",
    });
  }
});

export default router;

