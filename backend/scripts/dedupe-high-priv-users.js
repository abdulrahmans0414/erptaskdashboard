import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskdb';

const keepOneDeleteRest = async (query, sort = { createdAt: 1 }) => {
  const list = await User.find(query).sort(sort).select('_id email name role branch department createdAt');
  if (list.length <= 1) return { kept: list[0]?._id || null, deleted: 0 };
  const kept = list[0];
  const toDelete = list.slice(1).map((u) => u._id);
  await User.deleteMany({ _id: { $in: toDelete } });
  return { kept: kept._id, deleted: toDelete.length };
};

const run = async () => {
  await mongoose.connect(uri);

  let deletedTotal = 0;

  // One branch-head per branch
  const branches = await User.distinct('branch', { role: 'branch-head' });
  for (const branch of branches) {
    const r = await keepOneDeleteRest({ role: 'branch-head', branch });
    deletedTotal += r.deleted;
  }

  // One department-head per department+branch
  const deptHeads = await User.find({ role: 'department-head' }).select('department branch');
  const keys = new Set(deptHeads.map((u) => `${u.department}__${u.branch}`));
  for (const key of keys) {
    const [department, branch] = key.split('__');
    const r = await keepOneDeleteRest({ role: 'department-head', department, branch });
    deletedTotal += r.deleted;
  }

  console.log(`✅ Dedupe complete. Deleted ${deletedTotal} duplicate high-privilege user(s).`);
  await mongoose.disconnect();
};

run().catch(async (e) => {
  console.error('❌ Dedupe failed:', e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});

