const Razorpay = require("razorpay");
const db = require("../db");
const nodemailer = require("nodemailer");
require("dotenv").config();

const razorpay = new Razorpay({ key_id:process.env.RAZORPAY_KEY, key_secret:process.env.RAZORPAY_SECRET });

exports.createOrder = async (req,res)=>{
  const {amount} = req.body;
  const options = { amount: amount*100, currency:"INR" };
  const order = await razorpay.orders.create(options);
  res.json(order);
};

exports.verifyPayment = async (req,res)=>{
  const {user_id,event_id,amount,email} = req.body;
  db.query("INSERT INTO payments (user_id,event_id,amount,status) VALUES (?,?,?,'SUCCESS')",
    [user_id,event_id,amount]);

  const transporter = nodemailer.createTransport({
    service:"gmail",
    auth:{ user:process.env.EMAIL_USER, pass:process.env.EMAIL_PASS }
  });

  await transporter.sendMail({
    from:process.env.EMAIL_USER,
    to:email,
    subject:"Payment Successful",
    text:`Your payment of ₹${amount} was successful!`
  });

  res.json({message:"Payment verified & email sent"});
};
