const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const { Pool } = require("pg");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve portfolio website files locally
app.use(express.static(__dirname));

// Connect to Neon PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Create the messages table in PostgreSQL
const createTable = pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
`);

createTable
    .then(() => {
        console.log("Neon PostgreSQL connected successfully!");
    })
    .catch((error) => {
        console.error("Database initialization error:", error.message);
    });

// Configure Gmail
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Backend status route
app.get("/api/status", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.json({
            success: true,
            message: "Thiranex Portfolio Backend is running!",
            database: "Connected (Neon PostgreSQL)"
        });
    } catch (error) {
        console.error("Status error:", error.message);

        res.status(500).json({
            success: false,
            message: "Database connection failed."
        });
    }
});

// Contact form route
app.post("/api/contact", async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Validate the form fields
        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof subject !== "string" ||
            typeof message !== "string" ||
            !name.trim() ||
            !email.trim() ||
            !subject.trim() ||
            !message.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all fields."
            });
        }

        const cleanName = name.trim();
        const cleanEmail = email.trim();
        const cleanSubject = subject.trim();
        const cleanMessage = message.trim();

        // Save the contact message in Neon PostgreSQL
        await pool.query(
            `INSERT INTO messages (name, email, subject, message)
             VALUES ($1, $2, $3, $4)`,
            [cleanName, cleanEmail, cleanSubject, cleanMessage]
        );

        // Send the message to your Gmail inbox
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            replyTo: cleanEmail,
            subject: `Portfolio Contact: ${cleanSubject}`,
            text: `
You have received a new message through your portfolio website.

Name: ${cleanName}
Email: ${cleanEmail}
Subject: ${cleanSubject}

Message:
${cleanMessage}
            `
        });

        console.log("Contact message saved and email sent successfully!");

        return res.status(200).json({
            success: true,
            message: "Your message has been saved and emailed successfully!"
        });

    } catch (error) {
        console.error("Contact form error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });
    }
});

// Start the server locally.
// Vercel will import the app as a serverless function.
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

// Export the app for Vercel
module.exports = app;