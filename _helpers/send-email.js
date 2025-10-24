const config = require('../config.json');
const nodemailer = require('nodemailer');

module.exports = sendEmail;

async function sendEmail({ to, subject, html, from = config.emailFrom }) {
    // 🔑 FIX: Create the SMTP options object, prioritizing environment variables
    // This allows credentials to be securely set on Render (prod)
    // while falling back to config.json (or empty strings) locally.
    const smtpOptions = {
        host: process.env.EMAIL_HOST || config.smtpOptions.host,
        port: process.env.EMAIL_PORT || config.smtpOptions.port,
        auth: {
            user: process.env.EMAIL_USER || config.smtpOptions.auth.user,
            pass: process.env.EMAIL_PASSWORD || config.smtpOptions.auth.pass
        }
    };

    // Nodemailer typically requires explicit setting of 'secure: false' when using port 587
    if (smtpOptions.port === 587) {
        smtpOptions.secure = false;
    }

    const transporter = nodemailer.createTransport(smtpOptions);
    await transporter.sendMail({ from, to, subject, html });
}


// const config = require('../config.json');
// const nodemailer = require('nodemailer');

// module.exports = sendEmail;

// async function sendEmail({ to, subject, html, from = config.emailFrom }) {
//     const transporter = nodemailer.createTransport(config.smtpOptions);
//     await transporter.sendMail({ from, to, subject, html });
// }
