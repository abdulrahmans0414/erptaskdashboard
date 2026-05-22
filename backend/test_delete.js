import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Task from './models/Task.js';
import Employee from './models/Employee.js';

dotenv.config();

const uri = process.env.MONGODB_URI;

async function test() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected!');

  const users = await User.find({ isDeleted: { $ne: true } }).select('_id name email role isActive');
  console.log('Active users count:', users.length);
  console.log('Active users list:', users.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role, isActive: u.isActive })));

  const deletedUsers = await User.find({ isDeleted: true }).select('_id name email role isActive isDeleted');
  console.log('Deleted users count:', deletedUsers.length);
  console.log('Deleted users list:', deletedUsers.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role, isDeleted: u.isDeleted })));

  await mongoose.disconnect();
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
