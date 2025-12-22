const Razorpay = require("razorpay");
const db = require("../db");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
require("dotenv").config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET,
});

// 1️⃣ Create Razorpay order & save payment as PENDING
exports.createOrder = async (req, res) => {
    try {
        const { user_id, event_id, amount } = req.body;

        if (!user_id || !event_id || !amount) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Create Razorpay order
        const order = await razorpay.orders.create({
            amount: amount * 100, // in paise
            currency: "INR",
            receipt: `rcpt_${Date.now()}`,
            payment_capture: 1,
        });

        // Save order in DB with PENDING status
        db.query(
            "INSERT INTO payments (user_id, event_id, amount, status, razorpay_order_id) VALUES (?,?,?,?,?)",
            [user_id, event_id, amount, "PENDING", order.id],
            (err, result) => {
                if (err) return res.status(500).json({ error: err.message });

                // Send Razorpay order details and DB payment ID to frontend
                res.json({ ...order, db_payment_id: result.insertId });
            }
        );
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ---------------------------
// 2️⃣ Verify Razorpay Payment
// ---------------------------
exports.verifyPayment = (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, email } = req.body;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !email) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  if (generated_signature !== razorpay_signature) {
    db.query(
      "UPDATE payments SET status='FAILED' WHERE razorpay_order_id=?",
      [razorpay_order_id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.status(400).json({ success: false, message: "Payment verification failed" });
      }
    );
    return;
  }

  // Mark SUCCESS and save razorpay_payment_id
  db.query(
    "UPDATE payments SET status='SUCCESS', razorpay_payment_id=? WHERE razorpay_order_id=?",
    [razorpay_payment_id, razorpay_order_id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      // Fetch event details for email
      const query = `
        SELECT p.amount, e.title AS event_name, e.event_date, e.location
        FROM payments p
        JOIN events e ON p.event_id = e.event_id
        WHERE p.razorpay_order_id=?
      `;
      db.query(query, [razorpay_order_id], async (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!rows.length) return res.status(404).json({ error: "Payment not found" });

        const { amount, event_name, event_date, location } = rows[0];

        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: `Payment Successful for ${event_name}`,
          text: `Hello Dear Participant,

Your payment of ₹${amount} for the event "${event_name}" was successful!

Event Details:
- Date: ${new Date(event_date).toLocaleDateString("en-GB")}
- Location: ${location}

Thank you for registering! We look forward to seeing you at the event.

Best regards,
Event Management Team`,
        });

        res.json({ success: true, message: "Payment verified & email sent successfully" });
      });
    }
  );
};
