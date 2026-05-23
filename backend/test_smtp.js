const nodemailer = require('nodemailer');
const dns = require('dns');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    lookup: (hostname, options, callback) => {
        dns.lookup(hostname, { family: 4 }, callback);
    },
    family: 4
});

transporter.verify(function(error, success) {
    if (error) {
        console.log("Error from .env credentials:", error);
    } else {
        console.log("Server is ready to take our messages (.env credentials are valid)");
    }
    
    // Also try checking DB credentials
    const mongoose = require('mongoose');
    mongoose.connect(process.env.MONGODB_URI).then(async () => {
        const Settings = require('./models/Settings.js').default;
        const s = await Settings.findOne({ singleton: 'SYSTEM_SETTINGS' });
        
        if (s && s.emailConfig && s.emailConfig.user && s.emailConfig.pass) {
            const dbTransporter = nodemailer.createTransport({
                host: s.emailConfig.host || 'smtp.gmail.com',
                port: s.emailConfig.port || 587,
                secure: false,
                auth: {
                    user: s.emailConfig.user,
                    pass: s.emailConfig.pass
                },
                lookup: (hostname, options, callback) => {
                    dns.lookup(hostname, { family: 4 }, callback);
                },
                family: 4
            });
            dbTransporter.verify(function(err, succ) {
                if (err) console.log("Error from DB credentials:", err);
                else console.log("DB credentials are valid");
                process.exit(0);
            });
        } else {
            console.log("No DB email credentials found");
            process.exit(0);
        }
    }).catch(e => {
        console.log("MongoDB connection error:", e);
        process.exit(1);
    });
});
