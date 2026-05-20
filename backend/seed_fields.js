import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import User from './models/User.js';

// ✅ DNS Configuration - Fix for MongoDB Atlas SRV lookup
dns.setServers(['1.1.1.1', '8.8.8.8']);

// Load env variables
dotenv.config();

if (!process.env.MONGODB_URI) {
    console.error("Error: MONGODB_URI is not set in backend/.env");
    process.exit(1);
}

const generateRandomPhone = () => {
    const prefixes = ['98', '99', '97', '96', '88', '87', '76', '70', '63'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.floor(10000000 + Math.random() * 90000000).toString();
    return prefix + suffix;
};

const generateRandomEmployeeId = (index) => {
    return `EMP${10000 + index + Math.floor(Math.random() * 1000)}`;
};

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log("Connected to MongoDB successfully.");
        const users = await User.find({});
        console.log(`Found ${users.length} total users in database.`);

        let updatedCount = 0;
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            let needsUpdate = false;

            // Seed phone if missing or null or empty string
            if (!user.phone || user.phone.trim() === '' || user.phone === 'Not Provided') {
                user.phone = generateRandomPhone();
                needsUpdate = true;
            }

            // Seed employeeId if missing or empty string
            if (!user.employeeId || user.employeeId.trim() === '') {
                user.employeeId = generateRandomEmployeeId(i);
                needsUpdate = true;
            }

            if (needsUpdate) {
                await user.save();
                updatedCount++;
                console.log(`Updated user: ${user.name} (${user.email}) -> Phone: ${user.phone}, ID: ${user.employeeId}`);
            }
        }

        console.log(`\nMigration completed! Successfully updated ${updatedCount} users.`);
        await mongoose.disconnect();
        process.exit(0);
    })
    .catch(err => {
        console.error("Database connection/migration failed:", err);
        process.exit(1);
    });
