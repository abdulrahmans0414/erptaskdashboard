import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import dns from 'dns'; 
import User from './models/User.js';
import Task from './models/Task.js';
import Department from './models/Department.js';
import Branch from './models/Branch.js';
import Employee from './models/Employee.js';
import Settings from './models/Settings.js';

// ✅ DNS Configuration - Fix for MongoDB Atlas SRV lookup (same as server.js)
dns.setServers(['1.1.1.1', '8.8.8.8']);

dotenv.config();

// 8 Branch names with exact names, heads, and departments
const BRANCHES = [
    { 
        name: 'Central Gaurabagh', 
        code: 'GB', 
        city: 'Lucknow', 
        headName: 'Abdul Samad Kavi', 
        headEmail: 'samad.kavi@company.com', 
        departments: ['IT', 'HR', 'Graphic', 'Academic', 'Finance', 'Marketing', 'Legal', 'Transport', 'Operations', 'Admin'] 
    },
    { 
        name: 'Vikas Nagar', 
        code: 'VN', 
        city: 'Lucknow', 
        headName: 'Aman', 
        headEmail: 'aman@company.com', 
        departments: ['Admin', 'Academic'] 
    },
    { 
        name: 'Hive', 
        code: 'SH', 
        city: 'Lucknow', 
        headName: 'Zeeshan', 
        headEmail: 'zeeshan@company.com', 
        departments: ['Admin', 'Academic'] 
    },
    { 
        name: 'Hifz Academy', 
        code: 'SHA', 
        city: 'Lucknow', 
        headName: 'Shan', 
        headEmail: 'shan@company.com', 
        departments: ['Admin', 'Academic'] 
    },
    { 
        name: 'Kursi Road', 
        code: 'KR', 
        city: 'Lucknow', 
        headName: 'Amir', 
        headEmail: 'amir@company.com', 
        departments: ['Admin', 'Academic'] 
    },
    { 
        name: 'Muazzam Nagar', 
        code: 'MN', 
        city: 'Lucknow', 
        headName: 'Adil', 
        headEmail: 'adil@company.com', 
        departments: ['Admin', 'Academic'] 
    },
    { 
        name: 'Aziz Nagar', 
        code: 'AN', 
        city: 'Lucknow', 
        headName: 'Taj', 
        headEmail: 'taj@company.com', 
        departments: ['Admin', 'Academic'] 
    },
    { 
        name: 'Mailaraiganj', 
        code: 'MG', 
        city: 'Lucknow', 
        headName: 'Zakaria', 
        headEmail: 'zakaria@company.com', 
        departments: ['Admin', 'Academic'] 
    }
];

const DEPARTMENTS = [
    { name: 'IT', code: 'IT', icon: '💻', color: 'blue', isActive: true },
    { name: 'HR', code: 'HR', icon: '👥', color: 'purple', isActive: true },
    { name: 'Graphic', code: 'GR', icon: '🎨', color: 'green', isActive: true },
    { name: 'Academic', code: 'AC', icon: '📚', color: 'indigo', isActive: true },
    { name: 'Finance', code: 'FN', icon: '💰', color: 'emerald', isActive: true },
    { name: 'Marketing', code: 'MK', icon: '📢', color: 'pink', isActive: true },
    { name: 'Legal', code: 'LG', icon: '⚖️', color: 'slate', isActive: true },
    { name: 'Transport', code: 'TR', icon: '🚚', color: 'amber', isActive: true },
    { name: 'Operations', code: 'OP', icon: '⚙️', color: 'slate', isActive: true },
    { name: 'Admin', code: 'AD', icon: '💼', color: 'indigo', isActive: true }
];

// Branch Code Mapping
const BRANCH_MAPPING = {
    'VN': 'Vikas Nagar',
    'GB': 'Central Gaurabagh',
    'MN': 'Muazzam Nagar',
    'KR': 'Kursi Road',
    'SH': 'Hive',
    'SHA': 'Hifz Academy',
    'AN': 'Aziz Nagar',
    'CN': 'Central Gaurabagh',
    'SOPL': 'Central Gaurabagh',
    'KP': 'Central Gaurabagh',
    'RR': 'Central Gaurabagh',
    'MG': 'Mailaraiganj'
};

// Mapping of branch head employee codes to their branches/emails
const BRANCH_HEADS_MAP = {
    '190014': { branch: 'Central Gaurabagh', email: 'samad.kavi@company.com', headName: 'Abdul Samad Kavi' },
    '230028': { branch: 'Vikas Nagar', email: 'aman@company.com', headName: 'Aman' },
    '170009': { branch: 'Hive', email: 'zeeshan@company.com', headName: 'Zeeshan' },
    '230032': { branch: 'Hifz Academy', email: 'shan@company.com', headName: 'Shan' },
    '170005': { branch: 'Kursi Road', email: 'amir@company.com', headName: 'Amir' },
    '210017': { branch: 'Muazzam Nagar', email: 'adil@company.com', headName: 'Adil' },
    '260002': { branch: 'Aziz Nagar', email: 'taj@company.com', headName: 'Taj' },
    '250168': { branch: 'Mailaraiganj', email: 'zakaria@company.com', headName: 'Zakaria' }
};

// Complete Employee Data
const EMPLOYEES = [
    { empCode: '190012', name: 'Shabeena Usmani', branchCode: 'VN', doj: '2019-04-04', department: 'Academic' },
    { empCode: '210021', name: 'Shama Parveen', branchCode: 'VN', doj: '2021-08-11', department: 'Academic' },
    { empCode: '230028', name: 'Mohammad Aman', branchCode: 'VN', doj: '2023-02-27', department: 'IT' },
    { empCode: '240048', name: 'Aisha Shuaib', branchCode: 'VN', doj: '2024-03-27', department: 'Academic' },
    { empCode: '240047', name: 'Shabana', branchCode: 'VN', doj: '2024-03-21', department: 'Academic' },
    { empCode: '220028', name: 'Aarifa Ansari', branchCode: 'VN', doj: '2022-11-24', department: 'HR' },
    { empCode: '240078', name: 'Sumbul Zafar', branchCode: 'VN', doj: '2024-09-26', department: 'Academic' },
    { empCode: '230036', name: 'Mohammad Muzammil', branchCode: 'VN', doj: '2023-10-03', department: 'Academic' },
    { empCode: '260004', name: 'Mohd Taufeeq', branchCode: 'VN', doj: '2026-02-17', department: 'IT' },
    { empCode: '260017', name: 'Shehnvaj Alam', branchCode: 'GB', doj: '2026-03-06', department: 'Academic' },
    { empCode: '260020', name: 'Samiya Bano', branchCode: 'VN', doj: '2026-03-12', department: 'Academic' },
    { empCode: '260029', name: 'Ramsha Zaheen', branchCode: 'VN', doj: '2026-04-01', department: 'Academic' },
    { empCode: '260030', name: 'Sabnam', branchCode: 'VN', doj: '2026-04-04', department: 'Academic' },
    { empCode: '260034', name: 'Rohma Ali', branchCode: 'VN', doj: '2026-04-22', department: 'Academic' },
    { empCode: '180011', name: 'Mohammad Adil Ekrami', branchCode: 'SHA', doj: '2018-08-07', department: 'IT' },
    { empCode: '210018', name: 'Syed Sadiq Ali', branchCode: 'SHA', doj: '2021-08-13', department: 'Academic' },
    { empCode: '230032', name: 'Shan Ahmad', branchCode: 'SHA', doj: '2023-03-03', department: 'IT' },
    { empCode: '230034', name: 'Mohd Abdullah Haris', branchCode: 'SHA', doj: '2023-04-03', department: 'Academic' },
    { empCode: '240063', name: 'Mohd Ghufran', branchCode: 'SHA', doj: '2024-07-25', department: 'Academic' },
    { empCode: '240089', name: 'Faheemuddin Malik', branchCode: 'SHA', doj: '2024-08-27', department: 'Academic' },
    { empCode: '250093', name: 'Insha Khan', branchCode: 'SHA', doj: '2025-03-01', department: 'Academic' },
    { empCode: '250121', name: 'Tamish Hasan', branchCode: 'SHA', doj: '2025-04-04', department: 'Academic' },
    { empCode: '240090', name: 'Imamuddin', branchCode: 'SHA', doj: '2024-07-25', department: 'Academic' },
    { empCode: '250122', name: 'Hira Mariyam', branchCode: 'SHA', doj: '2025-04-28', department: 'Academic' },
    { empCode: '260027', name: 'Habibullah Khan', branchCode: 'SHA', doj: '2026-04-08', department: 'Academic' },
    { empCode: '260049', name: 'Mohd Saad', branchCode: 'SHA', doj: '2026-04-27', department: 'Academic' },
    { empCode: '160003', name: 'Anjum', branchCode: 'SH', doj: '2016-01-03', department: 'Academic' },
    { empCode: '170009', name: 'Zeeshan Ahamad', branchCode: 'SH', doj: '2017-12-27', department: 'IT' },
    { empCode: '220027', name: 'Aisha Ansari', branchCode: 'SH', doj: '2022-08-08', department: 'Academic' },
    { empCode: '250145', name: 'Bushra Quraishi', branchCode: 'SH', doj: '2025-07-25', department: 'Academic' },
    { empCode: '250154', name: 'Seema Ishaque', branchCode: 'SH', doj: '2025-09-17', department: 'Academic' },
    { empCode: '260019', name: 'Saltanat Naaz', branchCode: 'SH', doj: '2026-03-09', department: 'Academic' },
    { empCode: '260025', name: 'Arifa Khatoon', branchCode: 'SH', doj: '2026-03-26', department: 'Academic' },
    { empCode: '260036', name: 'Shaziya Siddiqui', branchCode: 'SH', doj: '2026-04-21', department: 'Academic' },
    { empCode: '260038', name: 'Aliya Bano', branchCode: 'SH', doj: '2026-04-21', department: 'Academic' },
    { empCode: '190015', name: 'Nida Javed', branchCode: 'MN', doj: '2019-06-19', department: 'Academic' },
    { empCode: '210017', name: 'Mohammad Adil', branchCode: 'MN', doj: '2021-01-04', department: 'IT' },
    { empCode: '220029', name: 'Rais Ahmad', branchCode: 'MN', doj: '2022-01-07', department: 'IT' },
    { empCode: '230029', name: 'Mohammad Ubaid', branchCode: 'MN', doj: '2023-01-02', department: 'IT' },
    { empCode: '230043', name: 'Fariya Saif', branchCode: 'MN', doj: '2023-05-15', department: 'Academic' },
    { empCode: '230040', name: 'Shazia Raza', branchCode: 'MN', doj: '2023-09-20', department: 'Academic' },
    { empCode: '240043', name: 'Mariyam Haneef', branchCode: 'MN', doj: '2024-02-01', department: 'Academic' },
    { empCode: '240045', name: 'Shua Saher', branchCode: 'MN', doj: '2024-03-01', department: 'Academic' },
    { empCode: '240049', name: 'Varisha', branchCode: 'MN', doj: '2024-03-18', department: 'Academic' },
    { empCode: '240051', name: 'Aasiya Adil', branchCode: 'MN', doj: '2024-04-26', department: 'Academic' },
    { empCode: '240050', name: 'Zainab Khan', branchCode: 'MN', doj: '2024-04-23', department: 'Academic' },
    { empCode: '240055', name: 'Arba Kulsum', branchCode: 'MN', doj: '2024-05-15', department: 'Academic' },
    { empCode: '240057', name: 'Insha Siddiqui', branchCode: 'MN', doj: '2024-06-29', department: 'Academic' },
    { empCode: '240091', name: 'Mariya Quraishi', branchCode: 'MN', doj: '2024-11-08', department: 'Academic' },
    { empCode: '240076', name: 'Mohd Zaid', branchCode: 'MN', doj: '2024-09-24', department: 'IT' },
    { empCode: '240077', name: 'Anam Akhtar', branchCode: 'MN', doj: '2024-09-24', department: 'Academic' },
    { empCode: '250103', name: 'Asma Bano', branchCode: 'MN', doj: '2025-03-01', department: 'Academic' },
    { empCode: '250124', name: 'Ruba', branchCode: 'MN', doj: '2025-04-10', department: 'Academic' },
    { empCode: '250126', name: 'Zeba Bano', branchCode: 'MN', doj: '2025-05-10', department: 'Academic' },
    { empCode: '250135', name: 'Yusra Naaz Qidwai', branchCode: 'MN', doj: '2025-06-30', department: 'Academic' },
    { empCode: '250151', name: 'Aqsa Hareem', branchCode: 'MN', doj: '2025-08-26', department: 'Academic' },
    { empCode: '250153', name: 'Sabiya', branchCode: 'MN', doj: '2025-09-10', department: 'Academic' },
    { empCode: '250152', name: 'Asma Hafeez', branchCode: 'MN', doj: '2025-08-30', department: 'Academic' },
    { empCode: '250161', name: 'Laiba Noor', branchCode: 'MN', doj: '2025-11-10', department: 'Academic' },
    { empCode: '250163', name: 'Laiba Izhar', branchCode: 'MN', doj: '2025-11-21', department: 'Academic' },
    { empCode: '260005', name: 'Rizwana Nihal', branchCode: 'MN', doj: '2026-02-26', department: 'Academic' },
    { empCode: '260006', name: 'Armana', branchCode: 'MN', doj: '2026-02-26', department: 'Academic' },
    { empCode: '260021', name: 'Ikram Ul Aziz', branchCode: 'MN', doj: '2026-03-16', department: 'IT' },
    { empCode: '260022', name: 'Md. Shanu Rahman', branchCode: 'MN', doj: '2026-03-16', department: 'IT' },
    { empCode: '260023', name: 'Muhammad Hammad Rashid', branchCode: 'MN', doj: '2026-03-24', department: 'IT' },
    { empCode: '260035', name: 'Farheen Hafeez', branchCode: 'MN', doj: '2026-03-24', department: 'Academic' },
    { empCode: '260054', name: 'Benazeer Nadeem', branchCode: 'MN', doj: '2026-05-09', department: 'Academic' },
    { empCode: '170005', name: 'Mohammad Amir Ali', branchCode: 'KR', doj: '2017-02-15', department: 'IT' },
    { empCode: '230033', name: 'Mantasha Fatima', branchCode: 'KR', doj: '2023-03-03', department: 'Academic' },
    { empCode: '230038', name: 'Farida', branchCode: 'KR', doj: '2023-05-11', department: 'Academic' },
    { empCode: '240093', name: 'Farheen Arshad', branchCode: 'KR', doj: '2024-06-28', department: 'Academic' },
    { empCode: '240062', name: 'Tabassum Bano', branchCode: 'KR', doj: '2024-07-16', department: 'Academic' },
    { empCode: '240083', name: 'Huzaifa Ahmad', branchCode: 'KR', doj: '2024-11-25', department: 'IT' },
    { empCode: '240085', name: 'Sana Bano', branchCode: 'KR', doj: '2024-12-02', department: 'Academic' },
    { empCode: '240088', name: 'Umra Bano', branchCode: 'KR', doj: '2025-01-06', department: 'Academic' },
    { empCode: '250090', name: 'Mohd Saleem', branchCode: 'KR', doj: '2025-02-03', department: 'IT' },
    { empCode: '250119', name: 'Sakeena Khan', branchCode: 'KR', doj: '2025-05-03', department: 'Academic' },
    { empCode: '250118', name: 'Khushnuma', branchCode: 'KR', doj: '2025-04-26', department: 'Academic' },
    { empCode: '250127', name: 'Saddam Husain', branchCode: 'KR', doj: '2025-05-16', department: 'IT' },
    { empCode: '260012', name: 'Asiya Khatoon', branchCode: 'KR', doj: '2026-03-02', department: 'Academic' },
    { empCode: '260014', name: 'Bushra Khalid Umar', branchCode: 'KR', doj: '2026-03-02', department: 'Academic' },
    { empCode: '260050', name: 'Sabreen Bano', branchCode: 'KR', doj: '2026-04-18', department: 'Academic' },
    { empCode: '180012', name: 'Sana Mohd Danish', branchCode: 'GB', doj: '2018-07-13', department: 'Academic' },
    { empCode: '160004', name: 'Abu Amir', branchCode: 'GB', doj: '2016-07-10', department: 'IT' },
    { empCode: '170007', name: 'Asiya Saeed', branchCode: 'GB', doj: '2017-07-07', department: 'HR' },
    { empCode: '170006', name: 'Beenish Farheen', branchCode: 'GB', doj: '2017-05-05', department: 'Academic' },
    { empCode: '170008', name: 'Nazish Khan', branchCode: 'GB', doj: '2017-10-24', department: 'Academic' },
    { empCode: '190014', name: 'Samad Qavi Khan', branchCode: 'GB', doj: '2019-06-10', department: 'IT' },
    { empCode: '190013', name: 'Nikhat Mohammad Shahid', branchCode: 'GB', doj: '2019-06-08', department: 'Academic' },
    { empCode: '210016', name: 'Shameen Bano', branchCode: 'GB', doj: '2021-03-30', department: 'HR' },
    { empCode: '210020', name: 'Bushra Khatoon', branchCode: 'GB', doj: '2021-10-27', department: 'Academic' },
    { empCode: '210015', name: 'Ahsanullah Siddiqui', branchCode: 'GB', doj: '2021-11-01', department: 'IT' },
    { empCode: '220023', name: 'Ranno Siddiqui', branchCode: 'GB', doj: '2022-03-01', department: 'Academic' },
    { empCode: '220024', name: 'Ahmad Zia Danish', branchCode: 'GB', doj: '2022-03-10', department: 'IT' },
    { empCode: '220026', name: 'Aqib Khan', branchCode: 'GB', doj: '2022-06-22', department: 'IT' },
    { empCode: '220050', name: 'Afsar Ali', branchCode: 'GB', doj: '2022-01-11', department: 'Finance' },
    { empCode: '230041', name: 'Amra Fatima', branchCode: 'GB', doj: '2023-10-03', department: 'Academic' },
    { empCode: '240046', name: 'Eram Irfan', branchCode: 'GB', doj: '2024-03-07', department: 'Academic' },
    { empCode: '240053', name: 'Zainab Hashmi', branchCode: 'GB', doj: '2024-04-29', department: 'Academic' },
    { empCode: '240065', name: 'Fiza Naaz', branchCode: 'GB', doj: '2024-07-26', department: 'Academic' },
    { empCode: '240066', name: 'Taliba Rizwan', branchCode: 'GB', doj: '2024-07-27', department: 'Academic' },
    { empCode: '240064', name: 'Fahmeeda Bano', branchCode: 'GB', doj: '2024-07-26', department: 'Academic' },
    { empCode: '240080', name: 'Nadeem Ur Rahman', branchCode: 'CN', doj: '2024-10-02', department: 'IT' },
    { empCode: '240096', name: 'Mohd Aslam', branchCode: 'CN', doj: '2024-11-01', department: 'IT' },
    { empCode: '240084', name: 'Adeeba Aleem', branchCode: 'GB', doj: '2024-12-02', department: 'Academic' },
    { empCode: '250089', name: 'Muzalfa Fareed Ansari', branchCode: 'CN', doj: '2025-02-03', department: 'Academic' },
    { empCode: '250105', name: 'Alvira Naim Ansari', branchCode: 'GB', doj: '2025-03-06', department: 'Academic' },
    { empCode: '250096', name: 'Shaziya Parveen', branchCode: 'GB', doj: '2025-03-01', department: 'Academic' },
    { empCode: '220022', name: 'Ayesha Khatoon', branchCode: 'VN', doj: '2022-02-26', department: 'Academic' },
    { empCode: '250095', name: 'Sana Ehtisham', branchCode: 'GB', doj: '2025-03-01', department: 'Academic' },
    { empCode: '250107', name: 'Darakshan Faiz Khan', branchCode: 'GB', doj: '2025-03-11', department: 'Academic' },
    { empCode: '250100', name: 'Sadiya Yunus', branchCode: 'GB', doj: '2025-03-01', department: 'Academic' },
    { empCode: '250117', name: 'Abdul Hafeez', branchCode: 'GB', doj: '2025-04-14', department: 'IT' },
    { empCode: '250114', name: 'Ayesha Jalil Siddiqui', branchCode: 'GB', doj: '2025-04-28', department: 'Academic' },
    { empCode: '250113', name: 'Anamta Khan', branchCode: 'GB', doj: '2025-04-23', department: 'Academic' },
    { empCode: '250110', name: 'Parveen Jaheer', branchCode: 'GB', doj: '2025-04-23', department: 'Academic' },
    { empCode: '250112', name: 'Sagufa', branchCode: 'GB', doj: '2025-05-01', department: 'Academic' },
    { empCode: '250129', name: 'Imran Ahmad', branchCode: 'CN', doj: '2025-05-19', department: 'Academic' },
    { empCode: '250130', name: 'Mohd Adeel Alam', branchCode: 'GB', doj: '2025-06-16', department: 'IT' },
    { empCode: '250134', name: 'Rabab Naqvi', branchCode: 'GB', doj: '2025-07-09', department: 'Academic' },
    { empCode: '200080', name: 'Salman Khan', branchCode: 'GB', doj: '2020-01-01', department: 'IT' },
    { empCode: '250136', name: 'Haris Zahidi', branchCode: 'GB', doj: '2025-07-22', department: 'IT' },
    { empCode: '250137', name: 'Zainab Khan', branchCode: 'GB', doj: '2025-07-22', department: 'Academic' },
    { empCode: '250142', name: 'Khaliqul Rahman Ansari', branchCode: 'GB', doj: '2025-07-28', department: 'Academic' },
    { empCode: '250146', name: 'Ehtishamul Hak', branchCode: 'GB', doj: '2025-08-25', department: 'IT' },
    { empCode: '250147', name: 'Sana Aisha', branchCode: 'GB', doj: '2025-08-25', department: 'Academic' },
    { empCode: '250158', name: 'Mohd Akmal', branchCode: 'CN', doj: '2025-10-09', department: 'IT' },
    { empCode: '250160', name: 'Mohd Bilal', branchCode: 'GB', doj: '2025-10-27', department: 'IT' },
    { empCode: '250162', name: 'Kahkasha Siddiqui', branchCode: 'GB', doj: '2025-11-22', department: 'Academic' },
    { empCode: '260007', name: 'Sameena Parveen', branchCode: 'GB', doj: '2026-03-02', department: 'Academic' },
    { empCode: '260009', name: 'Amreen Farooqui', branchCode: 'GB', doj: '2026-03-02', department: 'Academic' },
    { empCode: '260010', name: 'Bisma Ashraf', branchCode: 'GB', doj: '2026-03-02', department: 'Academic' },
    { empCode: '260011', name: 'Kumari Hena Fatma', branchCode: 'GB', doj: '2026-03-02', department: 'Academic' },
    { empCode: '260013', name: 'Zaib Khan', branchCode: 'GB', doj: '2026-03-02', department: 'Academic' },
    { empCode: '260015', name: 'Rizwan Ahmad Ansari', branchCode: 'GB', doj: '2026-03-02', department: 'IT' },
    { empCode: '260028', name: 'Rooma Aman', branchCode: 'GB', doj: '2026-04-02', department: 'Academic' },
    { empCode: '260031', name: 'Rooshna Ashraf', branchCode: 'GB', doj: '2026-04-08', department: 'Academic' },
    { empCode: '260043', name: 'Subiya khatoon', branchCode: 'GB', doj: '2026-04-17', department: 'Academic' },
    { empCode: '260045', name: 'Anvarul Haq', branchCode: 'SHA', doj: '2026-04-23', department: 'Academic' },
    { empCode: '260046', name: 'Mohd Tayyab Khan', branchCode: 'GB', doj: '2026-04-24', department: 'IT' },
    { empCode: '260048', name: 'Abdul Rahman', branchCode: 'GB', doj: '2026-04-27', department: 'Academic' },
    { empCode: '260053', name: 'Hamza Khan', branchCode: 'GB', doj: '2026-05-09', department: 'Academic' },
    { empCode: '260057', name: 'Mohammad Shiraj', branchCode: 'GB', doj: '2026-05-14', department: 'Academic' },
    { empCode: '180014', name: 'Mohd Amin', branchCode: 'SOPL', doj: '2018-07-18', department: 'Operations' },
    { empCode: '250138', name: 'Mohd Faiz Khan', branchCode: 'SOPL', doj: '2025-03-16', department: 'Academic' },
    { empCode: '240095', name: 'Tabish', branchCode: 'SOPL', doj: '2024-12-12', department: 'Academic' },
    { empCode: '260002', name: 'Taj Ahmad', branchCode: 'AN', doj: '2026-02-02', department: 'IT' },
    { empCode: '260003', name: 'Sidra Khan', branchCode: 'AN', doj: '2026-02-17', department: 'Academic' },
    { empCode: '260008', name: 'Noorussabah', branchCode: 'AN', doj: '2026-03-02', department: 'Academic' },
    { empCode: '260026', name: 'Shereen Abrar', branchCode: 'AN', doj: '2026-03-26', department: 'Academic' },
    { empCode: '260044', name: 'Afreen', branchCode: 'AN', doj: '2026-04-17', department: 'Academic' },
    { empCode: '260055', name: 'Khadeeja Ilma', branchCode: 'AN', doj: '2026-05-11', department: 'Academic' },
    { empCode: '260056', name: 'Yasha Zaheen', branchCode: 'AN', doj: '2026-05-12', department: 'Academic' },
    { empCode: '250168', name: 'Mohd Zakariya', branchCode: 'MG', doj: '2025-12-03', department: 'IT' },
    { empCode: '250169', name: 'Abu Shahma', branchCode: 'MG', doj: '2025-12-03', department: 'IT' },
    { empCode: '800001', name: 'Afreen Khatoon', branchCode: 'MG', doj: '2025-12-03', department: 'Academic' },
    { empCode: '260032', name: 'Asfiya Qadir', branchCode: 'MG', doj: '2026-04-13', department: 'Academic' },
    { empCode: '260033', name: 'Naziya Parveen', branchCode: 'MG', doj: '2026-04-13', department: 'Academic' },
    { empCode: '260039', name: 'Shahna Khatoon', branchCode: 'MG', doj: '2026-04-22', department: 'Academic' },
    { empCode: '260040', name: 'Shabeena Parveen', branchCode: 'MG', doj: '2026-04-22', department: 'Academic' },
    { empCode: '260041', name: 'Zainab Mushtaque', branchCode: 'MG', doj: '2026-04-22', department: 'Academic' },
    { empCode: '260042', name: 'Noor Ahmad', branchCode: 'MG', doj: '2026-04-08', department: 'Academic' },
    { empCode: '260047', name: 'Safiya Anees', branchCode: 'MG', doj: '2026-04-11', department: 'Academic' },
    { empCode: '260051', name: 'Shameem Bano', branchCode: 'MG', doj: '2026-05-06', department: 'Academic' },
    { empCode: '260052', name: 'Nlikhat Fatima', branchCode: 'MG', doj: '2026-05-08', department: 'Academic' },
    { empCode: '260063', name: 'Mohd Adil', branchCode: 'MG', doj: '2026-04-08', department: 'Academic' }
];

// Helper functions for tasks
const getRandomWorkTime = (date) => {
    const hour = 9 + Math.floor(Math.random() * 9);
    const minute = Math.floor(Math.random() * 60);
    const second = Math.floor(Math.random() * 60);
    date.setHours(hour, minute, second, 0);
    return date;
};

const getRandomTimeSpent = () => {
    return Math.floor(Math.random() * 450) + 30;
};

const formatTimeForLog = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
};

// Generate tasks for user
const generateTasksForUser = (user, admin, branchName, department) => {
    const tasks = [];
    const statuses = ['pending', 'in-progress', 'submitted', 'approved', 'completed'];
    const priorities = ['low', 'medium', 'high', 'urgent'];
    
    const taskTitles = [
        'Complete monthly report', 'Fix authentication bug', 'Design new website banner',
        'Review employee attendance', 'Prepare Q3 presentation', 'Client meeting documentation',
        'Database backup test', 'Security audit', 'Employee training session',
        'Fix responsive design', 'Develop new feature', 'Code review'
    ];
    
    const taskDescriptions = [
        'Need to compile all data and create comprehensive report',
        'Investigate and fix the login issue affecting users',
        'Create eye-catching banner for upcoming campaign',
        'Verify attendance records and prepare summary',
        'Create detailed presentation for stakeholders',
        'Document all client requirements and feedback'
    ];
    
    const numTasks = Math.floor(Math.random() * 2) + 1;
    
    for (let i = 0; i < numTasks; i++) {
        const daysAgo = Math.floor(Math.random() * 60);
        const createdDate = new Date();
        createdDate.setDate(createdDate.getDate() - daysAgo);
        
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        const randomPriority = priorities[Math.floor(Math.random() * priorities.length)];
        const titleIndex = Math.floor(Math.random() * taskTitles.length);
        
        const dueDate = new Date(createdDate);
        dueDate.setDate(createdDate.getDate() + Math.floor(Math.random() * 11) + 3);
        
        let startedAt = null;
        let submittedAt = null;
        let completedAt = null;
        let totalTimeSpent = 0;
        let attempts = [];
        let currentAttempt = 0;
        let submissionNote = null;
        let adminComments = null;
        
        const estimatedHours = Math.floor(Math.random() * 4) + 1;
        const estimatedMinutes = Math.floor(Math.random() * 60);
        
        if (randomStatus === 'completed' || randomStatus === 'approved') {
            startedAt = getRandomWorkTime(new Date(createdDate));
            const timeSpent = getRandomTimeSpent();
            totalTimeSpent = timeSpent;
            submittedAt = new Date(startedAt);
            submittedAt.setMinutes(startedAt.getMinutes() + timeSpent);
            completedAt = submittedAt;
            submissionNote = `Task completed successfully. Took ${formatTimeForLog(timeSpent)}.`;
            adminComments = 'Good work, keep it up!';
            
            attempts = [{
                attemptNumber: 1,
                startedAt: startedAt,
                submittedAt: submittedAt,
                timeSpent: timeSpent,
                submissionNote: submissionNote,
                adminFeedback: adminComments,
                status: 'submitted'
            }];
            currentAttempt = 1;
            
        } else if (randomStatus === 'submitted') {
            startedAt = getRandomWorkTime(new Date(createdDate));
            const timeSpent = getRandomTimeSpent();
            totalTimeSpent = timeSpent;
            submittedAt = new Date(startedAt);
            submittedAt.setMinutes(startedAt.getMinutes() + timeSpent);
            submissionNote = `Ready for review. Took ${formatTimeForLog(timeSpent)}.`;
            
            attempts = [{
                attemptNumber: 1,
                startedAt: startedAt,
                submittedAt: submittedAt,
                timeSpent: timeSpent,
                submissionNote: submissionNote,
                status: 'submitted'
            }];
            currentAttempt = 1;
            
        } else if (randomStatus === 'in-progress') {
            startedAt = getRandomWorkTime(new Date(createdDate));
            const timeSpentSoFar = Math.floor(Math.random() * 180) + 15;
            totalTimeSpent = timeSpentSoFar;
            
            attempts = [{
                attemptNumber: 1,
                startedAt: startedAt,
                timeSpent: timeSpentSoFar,
                status: 'in-progress'
            }];
            currentAttempt = 1;
        }
        
        tasks.push({
            title: `${taskTitles[titleIndex]} (Task ${Math.floor(Math.random() * 10000)})`,
            description: taskDescriptions[titleIndex],
            department: department,
            branch: branchName,
            assignedBy: admin._id,
            assignedTo: user._id,
            isTeamTask: false,
            estimatedHours,
            estimatedMinutes,
            startedAt,
            submittedAt,
            totalTimeSpent,
            dueDate,
            priority: randomPriority,
            status: randomStatus,
            attempts,
            currentAttempt,
            submissionNote,
            adminComments,
            completedAt,
            approvedAt: randomStatus === 'approved' || randomStatus === 'completed' ? completedAt : null,
            approvedBy: randomStatus === 'approved' || randomStatus === 'completed' ? admin._id : null,
            createdAt: createdDate,
            timeLogs: []
        });
    }
    
    return tasks;
};

// Generate unique email
const generateEmail = (name, empCode) => {
    const baseEmail = name.toLowerCase().replace(/\s/g, '.').replace(/[^a-z.]/g, '');
    return `${baseEmail}.${empCode}@company.com`;
};

export const seedDatabase = async (isApi = false) => {
    try {
        // Use the connectDB function from config
        await connectDB();
        
        // Clear existing data
        await User.deleteMany({});
        await Department.deleteMany({});
        await Branch.deleteMany({});
        await Employee.deleteMany({});
        await Task.deleteMany({});
        await Settings.deleteMany({});
        
        console.log('🗑️ Cleared existing data\n');
        
        // Seed Settings Singleton Document
        await Settings.create({
            singleton: 'SYSTEM_SETTINGS',
            departments: ['IT', 'HR', 'Graphic', 'Academic', 'Finance', 'Marketing', 'Legal', 'Transport', 'Operations', 'Admin'],
            branches: ['Central Gaurabagh', 'Vikas Nagar', 'Hive', 'Hifz Academy', 'Kursi Road', 'Muazzam Nagar', 'Aziz Nagar', 'Mailaraiganj']
        });
        console.log('✅ Settings singleton seeded');

        // Create branches
        const createdBranches = await Branch.insertMany(BRANCHES);
        console.log(`✅ ${createdBranches.length} branches created`);
        
        // Create departments
        const createdDepts = await Department.insertMany(DEPARTMENTS);
        console.log(`✅ ${createdDepts.length} departments created`);
        
        // CREATE ADMIN USER (Director)
        const admin = await User.create({
            name: 'Mohammad Seraj-ul-hasan',
            email: 'admin@example.com',
            password: 'admin123',
            role: 'admin',
            department: 'Admin',
            branch: 'Central Gaurabagh',
            isActive: true,
            employeeId: 'DIR001'
        });
        console.log(`✅ Admin user: admin@example.com / admin123`);
        
        // CREATE OVERALL MANAGERS
        await User.create({
            name: 'Abdul Habeeb',
            email: 'abdul.habib@company.com',
            password: 'branch123',
            role: 'admin',
            department: 'Admin',
            branch: 'Central Gaurabagh',
            isActive: true,
            employeeId: 'OM001'
        });
        console.log(`✅ Overall Branch Manager: abdul.habib@company.com / branch123`);

        // Fake Branch Heads, Department Managers, and HR Users removed.
        // We will assign these roles dynamically from the actual EMPLOYEES array data.
        
        // Create Employees and Users
        const users = [];
        const allTasks = [];
        let taskCount = 0;
        const assignedDeptHeads = new Set();
        
        for (let idx = 0; idx < EMPLOYEES.length; idx++) {
            const emp = EMPLOYEES[idx];
            const branchName = BRANCH_MAPPING[emp.branchCode] || 'Central Gaurabagh';
            let department = emp.department || 'Academic';
            
            // Scoped department logic: only Central Gaurabagh gets all depts.
            // All other branches are strictly limited to Admin and Academic.
            if (branchName !== 'Central Gaurabagh') {
                if (department !== 'Academic') {
                    department = 'Admin';
                }
            }

            const branchHeadConfig = BRANCH_HEADS_MAP[emp.empCode];
            let user;
            let email;

            if (branchHeadConfig) {
                // This is a known Branch Head! Create their account from the dataset
                email = branchHeadConfig.email;
                user = await User.create({
                    name: emp.name,
                    email: email,
                    password: 'branch123',
                    role: 'branch-head',
                    department: department,
                    branch: branchName,
                    isActive: true,
                    employeeId: emp.empCode
                });
                
                // Link branch manager
                await Branch.updateOne({ name: branchName }, { manager: user._id });
                console.log(`✅ Created Branch Head: ${emp.empCode} | ${emp.name} | ${branchName}`);
            } else {
                email = generateEmail(emp.name, emp.empCode);
                
                // Randomly promote some normal employees to department-head to fill out the structure
                let role = 'employee';
                const deptBranchKey = `${department}_${branchName}`;
                if (Math.random() > 0.85 && department !== 'Academic' && department !== 'Admin' && !assignedDeptHeads.has(deptBranchKey)) {
                    role = 'department-head';
                    assignedDeptHeads.add(deptBranchKey);
                } else if (Math.random() > 0.95 && department === 'HR') {
                    role = 'hr';
                }

                // CREATE USER (for authentication)
                user = await User.create({
                    name: emp.name,
                    email: email,
                    password: 'employee123',
                    role: role,
                    department: department,
                    branch: branchName,
                    isActive: true,
                    employeeId: emp.empCode
                });
                console.log(`✅ Created ${role}: ${emp.empCode} | ${emp.name} | ${branchName} | ${department}`);
            }

            users.push(user);
            
            // CREATE EMPLOYEE RECORD (for HR details)
            const employee = await Employee.create({
                employeeId: emp.empCode,
                name: emp.name,
                email: email,
                phone: `9${Math.floor(Math.random() * 900000000) + 100000000}`,
                department: department,
                branch: branchName,
                designation: branchHeadConfig ? 'Branch Head' : (department === 'IT' ? 'Technical Staff' : 'Staff'),
                joiningDate: new Date(emp.doj),
                isActive: true,
                salary: {
                    basic: branchHeadConfig ? 25000 : 20000,
                    netSalary: branchHeadConfig ? 35000 : 30000
                },
                leaveBalance: {
                    casualLeave: 12,
                    earnedLeave: 15,
                    sickLeave: 10,
                    paidLeave: 5
                }
            });
            
            // Generate tasks
            const empTasks = generateTasksForUser(user, admin, branchName, department);
            allTasks.push(...empTasks);
            taskCount += empTasks.length;
            console.log(`   📋 Generated ${empTasks.length} tasks`);
        }
        
        // Insert all tasks
        if (allTasks.length > 0) {
            await Task.insertMany(allTasks);
        }

        // Dynamically assign managers to departments from created users
        console.log('\n💼 Assigning Department Managers dynamically...');
        for (const dept of createdDepts) {
            // Find if there is already a department-head for this department name
            let managerUser = users.find(u => u.department === dept.name && u.role === 'department-head');
            
            if (!managerUser) {
                // Find a candidate user from the department (excluding admin, branch-head)
                // who doesn't violate the unique index if promoted to department-head
                const candidates = users.filter(u => 
                    u.department === dept.name && 
                    u.role !== 'admin' && 
                    u.role !== 'branch-head' &&
                    !assignedDeptHeads.has(`${dept.name}_${u.branch}`)
                );
                
                if (candidates.length > 0) {
                    // Pick a candidate, promote them
                    managerUser = candidates[Math.floor(Math.random() * candidates.length)];
                    managerUser.role = 'department-head';
                    await managerUser.save();
                    assignedDeptHeads.add(`${dept.name}_${managerUser.branch}`);
                    console.log(`👑 Promoted ${managerUser.name} to department-head for ${dept.name} (${managerUser.branch})`);
                } else {
                    // If no user exists in that department, or all would violate the index,
                    // let's try any user who doesn't violate the index when promoted
                    const generalCandidates = users.filter(u => 
                        u.role !== 'admin' && 
                        u.role !== 'branch-head' &&
                        !assignedDeptHeads.has(`${dept.name}_${u.branch}`)
                    );
                    if (generalCandidates.length > 0) {
                        managerUser = generalCandidates[Math.floor(Math.random() * generalCandidates.length)];
                        
                        // We must change their department to dept.name first to keep it consistent
                        managerUser.department = dept.name;
                        managerUser.role = 'department-head';
                        await managerUser.save();
                        assignedDeptHeads.add(`${dept.name}_${managerUser.branch}`);
                        
                        // Also update their Employee record to keep it in sync!
                        await Employee.updateOne({ employeeId: managerUser.employeeId }, { department: dept.name });
                        
                        console.log(`👑 Promoted & transferred ${managerUser.name} to department-head for ${dept.name} (${managerUser.branch})`);
                    }
                }
            }
            
            if (managerUser) {
                // Update department manager
                dept.manager = managerUser._id;
                dept.managerEmail = managerUser.email;
                await dept.save();
                console.log(`💼 Assigned Manager for Department ${dept.name}: ${managerUser.name} (${managerUser.email})`);
            } else {
                console.log(`⚠️ Could not assign a manager for department ${dept.name} because no suitable user was found.`);
            }
        }
        
        console.log(`\n✅ Total ${users.length} employees created`);
        console.log(`✅ Total ${taskCount} tasks created`);
        
        // Statistics
        console.log('\n📊 ========== DATABASE STATISTICS ==========');
        console.log(`🏢 Branches: ${BRANCHES.length}`);
        console.log(`🏭 Departments: ${DEPARTMENTS.length}`);
        console.log(`👥 Employees: ${users.length}`);
        console.log(`📋 Tasks: ${taskCount}`);
        
        console.log('\n📍 Branch-wise Employee Count:');
        const branchCount = {};
        users.forEach(u => { branchCount[u.branch] = (branchCount[u.branch] || 0) + 1; });
        for (const [branch, count] of Object.entries(branchCount)) {
            console.log(`   ${branch}: ${count} employees`);
        }
        
        console.log('\n🎉 ========== SEEDING COMPLETE ==========');
        console.log('\n📝 Login Credentials:');
        console.log('   👑 Director (Admin): admin@example.com / admin123');
        console.log('   🏢 Overall Branch Head: abdul.habib@company.com / branch123');
        console.log('   🏢 Branch Heads: password is branch123');
        console.log('   👨‍💼 Employees & Managers: password is employee123');
        
        if (!isApi) {
            // Close the connection
            await mongoose.connection.close();
            console.log('📴 Database connection closed');
        } else {
            console.log('✅ Seeding completed via API/Server');
        }
        
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        if (!isApi) process.exit(1);
        throw error;
    }
};

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    seedDatabase();
}
