import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const syncIndexes = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not set in environment variables');
      process.exit(1);
    }

    console.log('🔄 Connecting to MongoDB...');
    // Connect with options matching db.js but simplified for a quick script
    await mongoose.connect(process.env.MONGODB_URI, {
      ssl: true,
      tls: true,
      serverSelectionTimeoutMS: 15000,
    });
    console.log('✅ MongoDB Connected.');

    const usersCollection = mongoose.connection.collection('users');

    console.log('🔄 Dropping obsolete unique indexes on users collection...');

    try {
      await usersCollection.dropIndex('role_1_branch_1');
      console.log('✅ Successfully dropped index: role_1_branch_1');
    } catch (e) {
      if (e.code === 27 || e.message.includes('index not found')) {
        console.log('ℹ️ Index role_1_branch_1 was not found or already dropped.');
      } else {
        console.warn('⚠️ Warning dropping role_1_branch_1:', e.message);
      }
    }

    try {
      await usersCollection.dropIndex('role_1_department_1_branch_1');
      console.log('✅ Successfully dropped index: role_1_department_1_branch_1');
    } catch (e) {
      if (e.code === 27 || e.message.includes('index not found')) {
        console.log('ℹ️ Index role_1_department_1_branch_1 was not found or already dropped.');
      } else {
        console.warn('⚠️ Warning dropping role_1_department_1_branch_1:', e.message);
      }
    }

    console.log('🔄 Synchronizing models and recreating indexes...');
    await User.syncIndexes();
    console.log('✅ Indexes synchronized and rebuilt successfully.');

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Index synchronization failed:', error);
    process.exit(1);
  }
};

syncIndexes();
