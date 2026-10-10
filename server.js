const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const Database = require("better-sqlite3");
const nodemailer = require("nodemailer");
const path = require("path");

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve portfolio website files
app.use(express.static(__dirname));

// Connect to SQLite database
const db = new Database(path.join(__dirname, "portfolio.db"));

// Create the messages table if it does not exist
db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        createdAt TEXT NOT NULL
    )
`);

console.log("SQLite database connected successfully!");

// Configure Gmail using your Google App Password
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Backend status route
app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        message: "Thiranex Portfolio Backend is running!",
        database: "Connected (SQLite)"
    });
});

// Contact form route
app.post("/api/contact", async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Validate form fields
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

        // Save message in SQLite
        const saveMessage = db.prepare(`
            INSERT INTO messages
            (name, email, subject, message, createdAt)
            VALUES (?, ?, ?, ?, ?)
        `);

        saveMessage.run(
            name.trim(),
            email.trim(),
            subject.trim(),
            message.trim(),
            new Date().toISOString()
        );

        // Send message to your Gmail inbox
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            replyTo: email.trim(),
            subject: `Portfolio Contact: ${subject.trim()}`,
            text: `
You have received a new message through your portfolio website.

Name: ${name.trim()}
Email: ${email.trim()}
Subject: ${subject.trim()}

Message:
${message.trim()}
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
            message: "The message could not be emailed. Please try again."
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

// Close database connection when the server exits
process.on("SIGINT", () => {
    db.close();
    process.exit(0);
});