// _helpers/send-email.js
const config = require('../config.json');
const nodemailer = require('nodemailer');

// Define transporter outside the function or use a connection pool
const transporter = nodemailer.createTransport({
    // 🛑 USE ENVIRONMENT VARIABLES FOR PRODUCTION 🛑
    // Render will provide these if you set them in the dashboard
    host: process.env.EMAIL_HOST || config.smtpOptions.host, 
    port: process.env.EMAIL_PORT || config.smtpOptions.port,
    secure: process.env.EMAIL_SECURE === 'true' || config.smtpOptions.secure,
    auth: {
        user: process.env.EMAIL_USER || config.smtpOptions.auth.user, 
        pass: process.env.EMAIL_PASSWORD || config.smtpOptions.auth.pass 
    }
});


module.exports = sendEmail;

async function sendEmail({ to, subject, html, from = process.env.EMAIL_FROM || config.emailFrom }) {
    // Check if running on Ethereal/testing environment
    // This logs the URL so you can view the email in the Render console
    let etherealUrl = null;

    try {
        const info = await transporter.sendMail({ from, to, subject, html });
        console.log("Email sent. Message ID: %s", info.messageId);

        // If using Ethereal/a test server, log the URL
        if (process.env.EMAIL_HOST && process.env.EMAIL_HOST.includes('ethereal')) {
             etherealUrl = nodemailer.getTestMessageUrl(info);
             console.log("Ethereal Preview URL: %s", etherealUrl);
        }
        
    } catch (error) {
        console.error("Error sending email:", error);
        // You can choose to re-throw the error or just log it
        throw error;
    }
}

// const config = require('../config.json');
// const nodemailer = require('nodemailer');

// module.exports = sendEmail;

// async function sendEmail({ to, subject, html, from = config.emailFrom }) {
//     const transporter = nodemailer.createTransport(config.smtpOptions);
//     await transporter.sendMail({ from, to, subject, html });
// }
