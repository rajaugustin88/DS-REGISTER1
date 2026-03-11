import express from "express";
import { createServer as createViteServer } from "vite";
import Razorpay from "razorpay";
import crypto from "crypto";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_SPw86guEugvv7B',
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  // API routes
  app.get("/createSubscription", async (req, res) => {
    try {
      const subscription = await razorpay.subscriptions.create({
        plan_id: 'plan_SPwAWZhJVvGXFI',
        customer_notify: 1,
        total_count: 12, // 1 year
      });
      res.json(subscription);
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ error: "Failed to create subscription" });
    }
  });

  app.post("/verifySubscription", async (req, res) => {
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;
    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      console.warn("RAZORPAY_KEY_SECRET not set, skipping signature verification");
      return res.json({ status: "ok", message: "Signature verification skipped" });
    }

    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(razorpay_payment_id + "|" + razorpay_subscription_id)
      .digest("hex");

    if (generated_signature === razorpay_signature) {
      console.log("Payment verified successfully");
      res.json({ status: "ok" });
    } else {
      console.error("Invalid signature");
      res.status(400).json({ status: "error", message: "Invalid signature" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
