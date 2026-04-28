import { Router } from "express";
import express from "express";
import Stripe from "stripe";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ||"");
const router = Router();



router.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Test Product",
            },
            unit_amount: 5000, // $50
          },
          quantity: 1,
        },
      ],
      success_url: "http://localhost:3000/dashboard",
      cancel_url: "http://localhost:3000/cancel",
    });

    res.json({ id: session.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      console.log("Payment successful:", session.id);
      // 👉 update DB (order paid)
    }

    res.json({ received: true });
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});




const paymentRoutes=router;
export default paymentRoutes;