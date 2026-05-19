import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Settings from './backend/models/Settings.js';

dotenv.config({ path: './backend/.env' });

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        const settings = await Settings.findOne({ singleton: 'SYSTEM_SETTINGS' }).lean();
        console.log("DATABASE SETTINGS:");
        console.log(JSON.stringify(settings, null, 2));
        await mongoose.disconnect();
    })
    .catch(err => {
        console.error("DB Connection Error:", err);
    });
