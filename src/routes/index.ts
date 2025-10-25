import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.render("home", {
    title: "ananı sikim",
    message: "merhaba bu proje ananı sikmek için yapıldı.",
  });
});

export default router;
