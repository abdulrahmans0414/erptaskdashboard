import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import dns from 'dns'; 
import User from './models/User.js';
import Task from './models/Task.js';
import Department from './models/Department.js';
import Branch from './models/Branch.js';
import Employee from './models/Employee.js';


// ✅ DNS Configuration - Fix for MongoDB Atlas SRV lookup (same as server.js)
dns.setServers(['1.1.1.1', '8.8.8.8']);

dotenv.config();

// 8 Branch names
const BRANCHES = [
    { name: 'Gaurabagh', code: 'GB', city: 'Lucknow', headName: 'Abdul Samad kavi khan', headEmail: 'abdul.habib@company.com' },
    { name: 'Vikas Nagar', code: 'VN', city: 'Lucknow', headName: 'Mohd Aman Idrishi', headEmail: 'rakesh.sharma@company.com' },
    { name: 'Kalyanpur', code: 'KP', city: 'Lucknow', headName: 'Anil Kumar', headEmail: 'anil.kumar@company.com' },
    { name: 'Kursi', code: 'KR', city: 'Lucknow', headName: 'Mohd Irfan', headEmail: 'mohd.irfan@company.com' },
    { name: 'Hive', code: 'HV', city: 'Lucknow', headName: 'Gishan', headEmail: 'sanjay.gupta@company.com' },
    { name: 'Ring Road', code: 'RR', city: 'Lucknow', headName: 'Shan', headEmail: 'rajesh.verma@company.com' },
    { name: 'Muazzam Nagar', code: 'MN', city: 'Lucknow', headName: 'Adil', headEmail: 'imran.khan@company.com' },
    { name: 'Aziz Nagar', code: 'AN', city: 'Lucknow', headName: 'Shahid Ali', headEmail: 'shahid.ali@company.com' }
];

// Departments with managers
const DEPARTMENTS = [
    { name: 'IT', code: 'IT', icon: '💻', color: 'blue', isActive: true, manager: 'Abdul Rahman', managerEmail: 'abdul.rahman@company.com' },
    { name: 'HR', code: 'HR', icon: '👥', color: 'purple', isActive: true, manager: 'Aslam Sir', managerEmail: 'aslam@company.com' },
    { name: 'Graphic', code: 'GR', icon: '🎨', color: 'green', isActive: true, manager: 'Nadeem Sir', managerEmail: 'nadeem@company.com' },
    { name: 'Academic', code: 'AC', icon: '📚', color: 'indigo', isActive: true, manager: 'Prof. Ahmed', managerEmail: 'ahmed@company.com' },
    { name: 'Finance', code: 'FN', icon: '💰', color: 'emerald', isActive: true, manager: 'Irfan Khan', managerEmail: 'irfan.khan@company.com' },
    { name: 'Marketing', code: 'MK', icon: '📢', color: 'pink', isActive: true, manager: 'Salman Ali', managerEmail: 'salman.ali@company.com' },
    { name: 'Legal', code: 'LG', icon: '⚖️', color: 'slate', isActive: true, manager: 'Adv. Sharma', managerEmail: 'sharma@company.com' },
    { name: 'Transport', code: 'TR', icon: '🚚', color: 'amber', isActive: true, manager: 'Rizwan Ahmed', managerEmail: 'rizwan@company.com' }
];

// Branch Code Mapping
const BRANCH_MAPPING = {
    'VN': 'Vikas Nagar',
    'GB': 'Gaurabagh',
    'MN': 'Muazzam Nagar',
    'KR': 'Kursi',
    'SH': 'Hive',
    'SHA': 'Hive',
    'AN': 'Aziz Nagar',
    'CN': 'Ring Road',
    'SOPL': 'Ring Road',
    'MG': 'Kalyanpur'
};

// Complete Employee Data
const EMPLOYEES = [
    // Vikas Nagar (VN) - 14 employees
    { empCode: '190012', name: 'Shabeena Usmani', branchCode: 'VN', doj: '2019-04-04', department: 'Academic' },
    { empCode: '210021', name: 'Shama Parveen', branchCode: 'VN', doj: '2021-08-11', department: 'Academic' },
    { empCode: '230028', name: 'Mohammad Aman', branchCode: 'VN', doj: '2023-02-27', department: 'IT' },
    { empCode: '240048', name: 'Aisha Shuaib', branchCode: 'VN', doj: '2024-03-27', department: 'Academic' },
    { empCode: '240047', name: 'Shabana', branchCode: 'VN', doj: '2024-03-21', department: 'Academic' },
    { empCode: '220028', name: 'Aarifa Ansari', branchCode: 'VN', doj: '2022-11-24', department: 'HR' },
    { empCode: '240078', name: 'Sumbul Zafar', branchCode: 'VN', doj: '2024-09-26', department: 'Academic' },
    { empCode: '230036', name: 'Mohammad Muzan', branchCode: 'VN', doj: '2023-10-03', department: 'IT' },
    { empCode: '260004', name: 'Mohd Taufeeq', branchCode: 'VN', doj: '2026-02-17', department: 'IT' },
    { empCode: '260020', name: 'Samiya Bano', branchCode: 'VN', doj: '2026-03-12', department: 'Academic' },
    { empCode: '260024', name: 'Asma Aziz', branchCode: 'VN', doj: '2026-03-26', department: 'Academic' },
    { empCode: '260029', name: 'Ramsha Zaheen', branchCode: 'VN', doj: '2026-04-01', department: 'Academic' },
    { empCode: '260030', name: 'Sabnam', branchCode: 'VN', doj: '2026-04-04', department: 'Academic' },
    { empCode: '260034', name: 'Rohma Ali', branchCode: 'VN', doj: '2026-04-22', department: 'Academic' },
    
    // Gaurabagh (GB) - 56 employees
    { empCode: '260017', name: 'Shehnaj Alam', branchCode: 'GB', doj: '2026-03-06', department: 'Academic' },
    { empCode: '180012', name: 'Sana Mohd Danish', branchCode: 'GB', doj: '2018-07-13', department: 'Academic' },
    { empCode: '160004', name: 'Abu Amir', branchCode: 'GB', doj: '2016-07-10', department: 'IT' },
    { empCode: '170007', name: 'Asiya Saeed', branchCode: 'GB', doj: '2017-07-07', department: 'HR' },
    { empCode: '170006', name: 'Beenish Farheen', branchCode: 'GB', doj: '2017-05-05', department: 'Academic' },
    { empCode: '170008', name: 'Nazish Khan', branchCode: 'GB', doj: '2017-10-24', department: 'Academic' },
    { empCode: '190014', name: 'Samad Qavi Khan', branchCode: 'GB', doj: '2019-06-10', department: 'IT' },
    { empCode: '190013', name: 'Nikhat Mohammad Sh', branchCode: 'GB', doj: '2019-06-08', department: 'Academic' },
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
    { empCode: '240084', name: 'Adeeba Aleem', branchCode: 'GB', doj: '2024-12-02', department: 'Academic' },
    { empCode: '250089', name: 'Muzalifa Fareed Ansari', branchCode: 'GB', doj: '2025-02-03', department: 'Academic' },
    { empCode: '250105', name: 'Alvira Naim Ansari', branchCode: 'GB', doj: '2025-03-06', department: 'Academic' },
    { empCode: '250096', name: 'Shaziya Parveen', branchCode: 'GB', doj: '2025-03-01', department: 'Academic' },
    { empCode: '250095', name: 'Sana Ehtisham', branchCode: 'GB', doj: '2025-03-01', department: 'Academic' },
    { empCode: '250107', name: 'Darakshan Faiz Khan', branchCode: 'GB', doj: '2025-03-11', department: 'Academic' },
    { empCode: '250110', name: 'Sadiya Yunus', branchCode: 'GB', doj: '2025-03-01', department: 'Academic' },
    { empCode: '250117', name: 'Abdul Hafeez', branchCode: 'GB', doj: '2025-04-14', department: 'IT' },
    { empCode: '250114', name: 'Ayesha Jalil Siddiqui', branchCode: 'GB', doj: '2025-04-28', department: 'Academic' },
    { empCode: '250113', name: 'Anamta Khan', branchCode: 'GB', doj: '2025-04-23', department: 'Academic' },
    { empCode: '250112', name: 'Sagufa', branchCode: 'GB', doj: '2025-05-01', department: 'Academic' },
    { empCode: '250130', name: 'Mohd Adeel Alam', branchCode: 'GB', doj: '2025-06-16', department: 'IT' },
    { empCode: '250134', name: 'Rabab Naqvi', branchCode: 'GB', doj: '2025-07-09', department: 'Academic' },
    { empCode: '200080', name: 'Salman Khan', branchCode: 'GB', doj: '2020-01-01', department: 'IT' },
    { empCode: '250136', name: 'Haris Zahidi', branchCode: 'GB', doj: '2025-07-22', department: 'IT' },
    { empCode: '250137', name: 'Zainab Khan', branchCode: 'GB', doj: '2025-07-22', department: 'Academic' },
    { empCode: '250142', name: 'Khaliqul Rahman Ans', branchCode: 'GB', doj: '2025-07-28', department: 'Academic' },
    { empCode: '250146', name: 'Ehtishamul Hak', branchCode: 'GB', doj: '2025-08-25', department: 'IT' },
    { empCode: '250147', name: 'Sana Aisha', branchCode: 'GB', doj: '2025-08-25', department: 'Academic' },
    { empCode: '250158', name: 'Mohd Akmal', branchCode: 'GB', doj: '2025-10-09', department: 'IT' },
    { empCode: '250160', name: 'Mohd Bilal', branchCode: 'GB', doj: '2025-10-27', department: 'IT' },
    { empCode: '250162', name: 'Kahkasha Siddiqui', branchCode: 'GB', doj: '2025-11-22', department: 'Academic' },
    { empCode: '260001', name: 'Umama Siddiqui', branchCode: 'GB', doj: '2026-01-08', department: 'Academic' },
    { empCode: '260009', name: 'Amreen Farooqui', branchCode: 'GB', doj: '2026-03-02', department: 'Academic' },
    { empCode: '260010', name: 'Bisma Ashraf', branchCode: 'GB', doj: '2026-03-02', department: 'Academic' },
    { empCode: '260011', name: 'Kumari Hena Fatma', branchCode: 'GB', doj: '2026-03-02', department: 'Academic' },
    { empCode: '260013', name: 'Zaib Khan', branchCode: 'GB', doj: '2026-03-02', department: 'Academic' },
    { empCode: '260015', name: 'Rizwan Ahmad Ansar', branchCode: 'GB', doj: '2026-03-02', department: 'IT' },
    { empCode: '260016', name: 'Mohammad Nehal Akhtar', branchCode: 'GB', doj: '2026-03-02', department: 'IT' },
    { empCode: '260028', name: 'Rooma Aman', branchCode: 'GB', doj: '2026-04-02', department: 'Academic' },
    { empCode: '260031', name: 'Rooshna Ashraf', branchCode: 'GB', doj: '2026-04-08', department: 'Academic' },
    { empCode: '260043', name: 'Subiya Khatoon', branchCode: 'GB', doj: '2026-04-17', department: 'Academic' },
    { empCode: '260046', name: 'Mohd Tayyab Khan', branchCode: 'GB', doj: '2026-04-24', department: 'IT' },
    
    // Muazzam Nagar (MN) - 28 employees
    { empCode: '190015', name: 'Nida Javed', branchCode: 'MN', doj: '2019-06-19', department: 'Academic' },
    { empCode: '210017', name: 'Mohammad Adil', branchCode: 'MN', doj: '2021-01-04', department: 'IT' },
    { empCode: '220029', name: 'Rais Ahmad', branchCode: 'MN', doj: '2022-01-07', department: 'IT' },
    { empCode: '230029', name: 'Mohammad Ubaid', branchCode: 'MN', doj: '2023-01-02', department: 'IT' },
    { empCode: '230043', name: 'Fariya Saif', branchCode: 'MN', doj: '2023-05-15', department: 'Academic' },
    { empCode: '230040', name: 'Shazia Raza', branchCode: 'MN', doj: '2023-09-20', department: 'Academic' },
    { empCode: '240043', name: 'Mariyam Haneef', branchCode: 'MN', doj: '2024-02-01', department: 'Academic' },
    { empCode: '240045', name: 'Shua Saher', branchCode: 'MN', doj: '2024-03-18', department: 'Academic' },
    { empCode: '240051', name: 'Aasiya Adil', branchCode: 'MN', doj: '2024-04-26', department: 'Academic' },
    { empCode: '240050', name: 'Zainab Khan', branchCode: 'MN', doj: '2024-04-23', department: 'Academic' },
    { empCode: '240055', name: 'Arba Kulsum', branchCode: 'MN', doj: '2024-05-15', department: 'Academic' },
    { empCode: '240057', name: 'Insha Siddiqui', branchCode: 'MN', doj: '2024-06-29', department: 'Academic' },
    { empCode: '240091', name: 'Mariya Quraishi', branchCode: 'MN', doj: '2024-11-08', department: 'Academic' },
    { empCode: '240076', name: 'Areeb Ahmad', branchCode: 'MN', doj: '2024-09-24', department: 'IT' },
    { empCode: '240077', name: 'Mohd Zaid', branchCode: 'MN', doj: '2024-09-24', department: 'IT' },
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
    { empCode: '260023', name: 'Muhammad Hammad', branchCode: 'MN', doj: '2026-03-24', department: 'IT' },
    { empCode: '260035', name: 'Farheen Hareez', branchCode: 'MN', doj: '2026-03-24', department: 'Academic' },
    
    // Kursi (KR) - 16 employees
    { empCode: '170005', name: 'Mohammad Amir Ali', branchCode: 'KR', doj: '2017-02-15', department: 'IT' },
    { empCode: '220025', name: 'Marium Fatima', branchCode: 'KR', doj: '2022-05-10', department: 'Academic' },
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
    
    // Hive (SH) - 2 employees
    { empCode: '180011', name: 'Mohammad Adil EK', branchCode: 'SH', doj: '2018-08-07', department: 'IT' },
    { empCode: '210018', name: 'Syed Sadiq Ali', branchCode: 'SH', doj: '2021-08-13', department: 'IT' },
    
    // Aziz Nagar (AN) - 5 employees
    { empCode: '260002', name: 'Taj Ahmad', branchCode: 'AN', doj: '2026-02-02', department: 'IT' },
    { empCode: '260003', name: 'Sidra Khan', branchCode: 'AN', doj: '2026-02-17', department: 'Academic' },
    { empCode: '260008', name: 'Noorussabah', branchCode: 'AN', doj: '2026-03-02', department: 'Academic' },
    { empCode: '260026', name: 'Shereen Abrar', branchCode: 'AN', doj: '2026-03-26', department: 'Academic' },
    { empCode: '260044', name: 'Afreen', branchCode: 'AN', doj: '2026-04-17', department: 'Academic' },
    
    // Kalyanpur (MG) - 2 employees
    { empCode: '250168', name: 'Mohd Zakariya', branchCode: 'MG', doj: '2025-12-03', department: 'IT' },
    { empCode: '250169', name: 'Abu Shahma', branchCode: 'MG', doj: '2025-12-03', department: 'IT' },
    
    // Ring Road (CN, SOPL) - 3 employees
    { empCode: '240080', name: 'Nadeem Ur Rahman', branchCode: 'CN', doj: '2024-10-02', department: 'IT' },
    { empCode: '240096', name: 'Mohd Aslam', branchCode: 'CN', doj: '2024-11-01', department: 'IT' },
    { empCode: '180014', name: 'Mohd Amin', branchCode: 'SOPL', doj: '2018-07-18', department: 'Operations' }
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
        
        console.log('🗑️ Cleared existing data\n');
        
        // Create branches
        const createdBranches = await Branch.insertMany(BRANCHES);
        console.log(`✅ ${createdBranches.length} branches created`);
        
        // Create departments
        const createdDepts = await Department.insertMany(DEPARTMENTS);
        console.log(`✅ ${createdDepts.length} departments created`);
        
        // CREATE ADMIN USER
        const admin = await User.create({
            name: 'Admin User',
            email: 'admin@example.com',
            password: 'admin123',
            role: 'admin',
            department: 'IT',
            branch: 'Gaurabagh',
            isActive: true
        });
        console.log(`✅ Admin user: admin@example.com / admin123`);
        
        // CREATE BRANCH HEADS
        for (const branch of BRANCHES) {
            await User.create({
                name: branch.headName,
                email: branch.headEmail,
                password: 'branch123',
                role: 'branch-head',
                department: 'Operations',
                branch: branch.name,
                isActive: true
            });
            console.log(`✅ Branch Head: ${branch.headName} (${branch.name})`);
        }
        
        // CREATE DEPARTMENT MANAGERS
        for (const dept of DEPARTMENTS) {
            await User.create({
                name: dept.manager,
                email: dept.managerEmail,
                password: 'manager123',
                role: 'department-head',
                department: dept.name,
                branch: 'Gaurabagh',
                isActive: true
            });
            console.log(`✅ Department Manager: ${dept.manager} (${dept.name})`);
        }
        
        // Create HR User
        await User.create({
            name: 'HR Manager',
            email: 'hr@example.com',
            password: 'hr1234',
            role: 'hr',
            department: 'HR',
            branch: 'Gaurabagh',
            isActive: true
        });
        console.log(`✅ HR user: hr@example.com / hr1234`);
        
        // Create Employees and Users
        const users = [];
        const allTasks = [];
        let taskCount = 0;
        
        for (let idx = 0; idx < EMPLOYEES.length; idx++) {
            const emp = EMPLOYEES[idx];
            const branchName = BRANCH_MAPPING[emp.branchCode] || 'Gaurabagh';
            const department = emp.department || 'Academic';
            
            const email = generateEmail(emp.name, emp.empCode);
            
            // CREATE USER (for authentication)
            const user = await User.create({
                name: emp.name,
                email: email,
                password: 'employee123',
                role: 'employee',
                department: department,
                branch: branchName,
                isActive: true,
                employeeId: emp.empCode
            });
            users.push(user);
            console.log(`✅ Created User: ${emp.empCode} | ${emp.name} | ${branchName} | ${department}`);
            
            // CREATE EMPLOYEE RECORD (for HR details)
            const employee = await Employee.create({
                employeeId: emp.empCode,
                name: emp.name,
                email: email,
                phone: `9${Math.floor(Math.random() * 900000000) + 100000000}`,
                department: department,
                branch: branchName,
                designation: department === 'IT' ? 'Technical Staff' : 'Staff',
                joiningDate: new Date(emp.doj),
                isActive: true,
                salary: {
                    basic: 20000,
                    netSalary: 30000
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
        console.log('   👑 Admin: admin@example.com / admin123');
        console.log('   👥 HR: hr@example.com / hr1234');
        console.log('   🏢 Branch Head (GB): abdul.habib@company.com / branch123');
        console.log('   👨‍💼 Dept Manager: abdul.rahman@company.com / manager123');
        console.log('   👨‍💼 Employee: use email shown above / employee123');
        
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