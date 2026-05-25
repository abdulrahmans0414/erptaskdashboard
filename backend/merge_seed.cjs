const fs = require('fs');

// Read the old seed.js
const seedContent = fs.readFileSync('seed.js', 'utf8');

// The new data from the user
const newData = [
  { "srNo": 1, "branch": "VN", "dateOfJoining": "4-Apr-2019", "ageOnNetwork": 2606, "name": "Shabeena Usmani", "empCode": "190012" },
  { "srNo": 2, "branch": "VN", "dateOfJoining": "11-Aug-2021", "ageOnNetwork": 1746, "name": "Shama Parveen", "empCode": "210021" },
  { "srNo": 3, "branch": "VN", "dateOfJoining": "27-Feb-2023", "ageOnNetwork": 1181, "name": "Mohammad Aman [1]", "empCode": "230028" },
  { "srNo": 4, "branch": "VN", "dateOfJoining": "27-Mar-2024", "ageOnNetwork": 787, "name": "Aisha Shuaib", "empCode": "240048" },
  { "srNo": 5, "branch": "VN", "dateOfJoining": "21-Mar-2024", "ageOnNetwork": 793, "name": "Shabana", "empCode": "240047" },
  { "srNo": 6, "branch": "VN", "dateOfJoining": "24-Nov-2022", "ageOnNetwork": 1276, "name": "Aarifa Ansari", "empCode": "220028" },
  { "srNo": 7, "branch": "VN", "dateOfJoining": "26-Sep-2024", "ageOnNetwork": 604, "name": "Sumbul Zafar", "empCode": "240078" },
  { "srNo": 8, "branch": "VN", "dateOfJoining": "3-Oct-2023", "ageOnNetwork": 963, "name": "Mohammad Muzammil", "empCode": "230036" },
  { "srNo": 9, "branch": "VN", "dateOfJoining": "17-Feb-2026", "ageOnNetwork": 95, "name": "Mohd Taufeeq [2]", "empCode": "260004" },
  { "srNo": 10, "branch": "GB", "dateOfJoining": "6-Mar-2026", "ageOnNetwork": 78, "name": "Shehnvaj Alam", "empCode": "260017" },
  { "srNo": 11, "branch": "VN", "dateOfJoining": "12-Mar-2026", "ageOnNetwork": 72, "name": "Samiya Bano", "empCode": "260020" },
  { "srNo": 12, "branch": "VN", "dateOfJoining": "1-Apr-2026", "ageOnNetwork": 52, "name": "Ramsha Zaheen [3]", "empCode": "260029" },
  { "srNo": 13, "branch": "VN", "dateOfJoining": "4-Apr-2026", "ageOnNetwork": 49, "name": "Sabnam", "empCode": "260030" },
  { "srNo": 14, "branch": "VN", "dateOfJoining": "22-Apr-2026", "ageOnNetwork": 31, "name": "Rohma Ali", "empCode": "260034" },
  { "srNo": 15, "branch": "SHA", "dateOfJoining": "7-Aug-2018", "ageOnNetwork": 2846, "name": "Mohammad Adil Ekrami", "empCode": "180011" },
  { "srNo": 16, "branch": "SHA", "dateOfJoining": "13-Aug-2021", "ageOnNetwork": 1744, "name": "Syed Sadiq Ali", "empCode": "210018" },
  { "srNo": 17, "branch": "SHA", "dateOfJoining": "3-Mar-2023", "ageOnNetwork": 1177, "name": "Shan Ahmad", "empCode": "230032" },
  { "srNo": 18, "branch": "SHA", "dateOfJoining": "3-Apr-2023", "ageOnNetwork": 1146, "name": "Mohd Abdullah Haris", "empCode": "230034" },
  { "srNo": 19, "branch": "SHA", "dateOfJoining": "25-Jul-2024", "ageOnNetwork": 667, "name": "Mohd Ghufran", "empCode": "240063" },
  { "srNo": 20, "branch": "SHA", "dateOfJoining": "27-Aug-2024", "ageOnNetwork": 634, "name": "Faheemuddin Malik", "empCode": "240089" },
  { "srNo": 21, "branch": "SHA", "dateOfJoining": "1-Mar-2025", "ageOnNetwork": 448, "name": "Insha Khan", "empCode": "250093" },
  { "srNo": 22, "branch": "SHA", "dateOfJoining": "4-Apr-2025", "ageOnNetwork": 414, "name": "Tamish Hasan", "empCode": "250121" },
  { "srNo": 23, "branch": "SHA", "dateOfJoining": "25-Jul-2024", "ageOnNetwork": 667, "name": "Imamuddin", "empCode": "240090" },
  { "srNo": 24, "branch": "SHA", "dateOfJoining": "28-Apr-2025", "ageOnNetwork": 390, "name": "Hira Mariyam", "empCode": "250122" },
  { "srNo": 25, "branch": "SHA", "dateOfJoining": "8-Apr-2026", "ageOnNetwork": 45, "name": "Habibullah Khan", "empCode": "260027" },
  { "srNo": 26, "branch": "SHA", "dateOfJoining": "27-Apr-2026", "ageOnNetwork": 26, "name": "Mohd Saad", "empCode": "260049" },
  { "srNo": 27, "branch": "SH", "dateOfJoining": "3-Jan-2016", "ageOnNetwork": 3793, "name": "Anjum", "empCode": "160003" },
  { "srNo": 28, "branch": "SH", "dateOfJoining": "27-Dec-2017", "ageOnNetwork": 3069, "name": "Zeeshan Ahamad", "empCode": "170009" },
  { "srNo": 29, "branch": "SH", "dateOfJoining": "8-Aug-2022", "ageOnNetwork": 1384, "name": "Aisha Ansari", "empCode": "220027" },
  { "srNo": 30, "branch": "SH", "dateOfJoining": "25-Jul-2025", "ageOnNetwork": 302, "name": "Bushra Quraishi", "empCode": "250145" },
  { "srNo": 31, "branch": "SH", "dateOfJoining": "17-Sep-2025", "ageOnNetwork": 248, "name": "Seema Ishaque", "empCode": "250154" },
  { "srNo": 32, "branch": "SH", "dateOfJoining": "9-Mar-2026", "ageOnNetwork": 75, "name": "Saltanat Naaz", "empCode": "260019" },
  { "srNo": 33, "branch": "SH", "dateOfJoining": "26-Mar-2026", "ageOnNetwork": 58, "name": "Arifa Khatoon", "empCode": "260025" },
  { "srNo": 34, "branch": "SH", "dateOfJoining": "21-Apr-2026", "ageOnNetwork": 32, "name": "Shaziya Siddiqui", "empCode": "260036" },
  { "srNo": 35, "branch": "SH", "dateOfJoining": "21-Apr-2026", "ageOnNetwork": 32, "name": "Aliya Bano", "empCode": "260038" },
  { "srNo": 36, "branch": "MN", "dateOfJoining": "19-Jun-2019", "ageOnNetwork": 2530, "name": "Nida Javed", "empCode": "190015" },
  { "srNo": 37, "branch": "MN", "dateOfJoining": "4-Jan-2021", "ageOnNetwork": 1965, "name": "Mohammad Adil", "empCode": "210017" },
  { "srNo": 38, "branch": "MN", "dateOfJoining": "7-Jan-2022", "ageOnNetwork": 1597, "name": "Rais Ahmad", "empCode": "220029" },
  { "srNo": 39, "branch": "MN", "dateOfJoining": "2-Jan-2023", "ageOnNetwork": 1237, "name": "Mohammad Ubaid", "empCode": "230029" },
  { "srNo": 40, "branch": "MN", "dateOfJoining": "15-May-2023", "ageOnNetwork": 1104, "name": "Fariya Saif", "empCode": "230043" },
  { "srNo": 41, "branch": "MN", "dateOfJoining": "20-Sep-2023", "ageOnNetwork": 976, "name": "Shazia Raza", "empCode": "230040" },
  { "srNo": 42, "branch": "MN", "dateOfJoining": "1-Feb-2024", "ageOnNetwork": 842, "name": "Mariyam Haneef", "empCode": "240043" },
  { "srNo": 43, "branch": "MN", "dateOfJoining": "1-Mar-2024", "ageOnNetwork": 813, "name": "Shua Saher", "empCode": "240045" },
  { "srNo": 44, "branch": "MN", "dateOfJoining": "18-Mar-2024", "ageOnNetwork": 796, "name": "Varisha", "empCode": "240049" },
  { "srNo": 45, "branch": "MN", "dateOfJoining": "26-Apr-2024", "ageOnNetwork": 757, "name": "Aasiya Adil", "empCode": "240051" },
  { "srNo": 46, "branch": "MN", "dateOfJoining": "23-Apr-2024", "ageOnNetwork": 760, "name": "Zainab Khan", "empCode": "240050" },
  { "srNo": 47, "branch": "MN", "dateOfJoining": "15-May-2024", "ageOnNetwork": 738, "name": "Arba Kulsum", "empCode": "240055" },
  { "srNo": 48, "branch": "MN", "dateOfJoining": "29-Jun-2024", "ageOnNetwork": 693, "name": "Insha Siddiqui", "empCode": "240057" },
  { "srNo": 49, "branch": "MN", "dateOfJoining": "8-Nov-2024", "ageOnNetwork": 561, "name": "Mariya Quraishi", "empCode": "240091" },
  { "srNo": 50, "branch": "MN", "dateOfJoining": "24-Sep-2024", "ageOnNetwork": 606, "name": "Mohd Zaid", "empCode": "240076" },
  { "srNo": 51, "branch": "MN", "dateOfJoining": "24-Sep-2024", "ageOnNetwork": 606, "name": "Anam Akhtar", "empCode": "240077" },
  { "srNo": 52, "branch": "MN", "dateOfJoining": "1-Mar-2025", "ageOnNetwork": 448, "name": "Asma Bano", "empCode": "250103" },
  { "srNo": 53, "branch": "MN", "dateOfJoining": "10-Apr-2025", "ageOnNetwork": 408, "name": "Ruba", "empCode": "250124" },
  { "srNo": 54, "branch": "MN", "dateOfJoining": "10-May-2025", "ageOnNetwork": 378, "name": "Zeba Bano", "empCode": "250126" },
  { "srNo": 55, "branch": "MN", "dateOfJoining": "30-Jun-2025", "ageOnNetwork": 327, "name": "Yusra Naaz Qidwai", "empCode": "250135" },
  { "srNo": 56, "branch": "MN", "dateOfJoining": "26-Aug-2025", "ageOnNetwork": 270, "name": "Aqsa Hareem", "empCode": "250151" },
  { "srNo": 57, "branch": "MN", "dateOfJoining": "10-Sep-2025", "ageOnNetwork": 255, "name": "Sabiya", "empCode": "250153" },
  { "srNo": 58, "branch": "MN", "dateOfJoining": "30-Aug-2025", "ageOnNetwork": 266, "name": "Asma Hafeez", "empCode": "250152" },
  { "srNo": 59, "branch": "MN", "dateOfJoining": "10-Nov-2025", "ageOnNetwork": 194, "name": "Laiba Noor", "empCode": "250161" },
  { "srNo": 60, "branch": "MN", "dateOfJoining": "21-Nov-2025", "ageOnNetwork": 183, "name": "Laiba Izhar", "empCode": "250163" },
  { "srNo": 61, "branch": "MN", "dateOfJoining": "26-Feb-2026", "ageOnNetwork": 86, "name": "Rizwana Nihal", "empCode": "260005" },
  { "srNo": 62, "branch": "MN", "dateOfJoining": "26-Feb-2026", "ageOnNetwork": 86, "name": "Armana", "empCode": "260006" },
  { "srNo": 63, "branch": "MN", "dateOfJoining": "16-Mar-2026", "ageOnNetwork": 68, "name": "Ikram Ul Aziz", "empCode": "260021" },
  { "srNo": 64, "branch": "MN", "dateOfJoining": "16-Mar-2026", "ageOnNetwork": 68, "name": "Md. Shanu Rahman", "empCode": "260022" },
  { "srNo": 65, "branch": "MN", "dateOfJoining": "24-Mar-2026", "ageOnNetwork": 60, "name": "Muhammad Hammad Rashid", "empCode": "260023" },
  { "srNo": 66, "branch": "MN", "dateOfJoining": "24-Mar-2026", "ageOnNetwork": 60, "name": "Farheen Hafeez", "empCode": "260035" },
  { "srNo": 67, "branch": "MN", "dateOfJoining": "9-May-2026", "ageOnNetwork": 14, "name": "Benazeer Nadeem", "empCode": "260054" },
  { "srNo": 68, "branch": "KR", "dateOfJoining": "15-Feb-2017", "ageOnNetwork": 3384, "name": "Mohammad Amir Ali [4]", "empCode": "170005" },
  { "srNo": 69, "branch": "KR", "dateOfJoining": "3-Mar-2023", "ageOnNetwork": 1177, "name": "Mantasha Fatima", "empCode": "230033" },
  { "srNo": 70, "branch": "KR", "dateOfJoining": "11-May-2023", "ageOnNetwork": 1108, "name": "Farida", "empCode": "230038" },
  { "srNo": 71, "branch": "KR", "dateOfJoining": "28-Jun-2024", "ageOnNetwork": 694, "name": "Farheen Arshad", "empCode": "240093" },
  { "srNo": 72, "branch": "KR", "dateOfJoining": "16-Jul-2024", "ageOnNetwork": 676, "name": "Tabassum Bano", "empCode": "240062" },
  { "srNo": 73, "branch": "KR", "dateOfJoining": "25-Nov-2024", "ageOnNetwork": 544, "name": "Huzaifa Ahmad", "empCode": "240083" },
  { "srNo": 74, "branch": "KR", "dateOfJoining": "2-Dec-2024", "ageOnNetwork": 537, "name": "Sana Bano", "empCode": "240085" },
  { "srNo": 75, "branch": "KR", "dateOfJoining": "6-Jan-2025", "ageOnNetwork": 502, "name": "Umra Bano", "empCode": "240088" },
  { "srNo": 76, "branch": "KR", "dateOfJoining": "3-Feb-2025", "ageOnNetwork": 474, "name": "Mohd Saleem", "empCode": "250090" },
  { "srNo": 77, "branch": "KR", "dateOfJoining": "3-May-2025", "ageOnNetwork": 385, "name": "Sakeena Khan", "empCode": "250119" },
  { "srNo": 78, "branch": "KR", "dateOfJoining": "26-Apr-2025", "ageOnNetwork": 392, "name": "Khushnuma", "empCode": "250118" },
  { "srNo": 79, "branch": "KR", "dateOfJoining": "16-May-2025", "ageOnNetwork": 372, "name": "Saddam Husain", "empCode": "250127" },
  { "srNo": 80, "branch": "KR", "dateOfJoining": "2-Mar-2026", "ageOnNetwork": 82, "name": "Asiya Khatoon", "empCode": "260012" },
  { "srNo": 81, "branch": "KR", "dateOfJoining": "2-Mar-2026", "ageOnNetwork": 82, "name": "Bushra Khalid Umar", "empCode": "260014" },
  { "srNo": 82, "branch": "KR", "dateOfJoining": "18-Apr-2026", "ageOnNetwork": 35, "name": "Sabreen Bano", "empCode": "260050" },
  { "srNo": 83, "branch": "GB", "dateOfJoining": "13-Jul-2018", "ageOnNetwork": 2871, "name": "Sana Mohd Danish", "empCode": "180012" },
  { "srNo": 84, "branch": "GB", "dateOfJoining": "10-Jul-2016", "ageOnNetwork": 3604, "name": "Abu Amir", "empCode": "160004" },
  { "srNo": 85, "branch": "GB", "dateOfJoining": "7-Jul-2017", "ageOnNetwork": 3242, "name": "Asiya Saeed", "empCode": "170007" },
  { "srNo": 86, "branch": "GB", "dateOfJoining": "5-May-2017", "ageOnNetwork": 3305, "name": "Beenish Farheen", "empCode": "170006" },
  { "srNo": 87, "branch": "GB", "dateOfJoining": "24-Oct-2017", "ageOnNetwork": 3133, "name": "Nazish Khan", "empCode": "170008" },
  { "srNo": 88, "branch": "GB", "dateOfJoining": "10-Jun-2019", "ageOnNetwork": 2539, "name": "Samad Qavi Khan", "empCode": "190014" },
  { "srNo": 89, "branch": "GB", "dateOfJoining": "8-Jun-2019", "ageOnNetwork": 2541, "name": "Nikhat Mohammad Shahid", "empCode": "190013" },
  { "srNo": 90, "branch": "GB", "dateOfJoining": "30-Mar-2021", "ageOnNetwork": 1880, "name": "Shameen Bano", "empCode": "210016" },
  { "srNo": 91, "branch": "GB", "dateOfJoining": "27-Oct-2021", "ageOnNetwork": 1669, "name": "Bushra Khatoon", "empCode": "210020" },
  { "srNo": 92, "branch": "GB", "dateOfJoining": "1-Nov-2021", "ageOnNetwork": 1664, "name": "Ahsanullah Siddiqui", "empCode": "210015" },
  { "srNo": 93, "branch": "GB", "dateOfJoining": "1-Mar-2022", "ageOnNetwork": 1544, "name": "Ranno Siddiqui", "empCode": "220023" },
  { "srNo": 94, "branch": "GB", "dateOfJoining": "10-Mar-2022", "ageOnNetwork": 1535, "name": "Ahmad Zia Danish", "empCode": "220024" },
  { "srNo": 95, "branch": "GB", "dateOfJoining": "22-Jun-2022", "ageOnNetwork": 1431, "name": "Aqib Khan", "empCode": "220026" },
  { "srNo": 96, "branch": "GB", "dateOfJoining": "11-Jan-2022", "ageOnNetwork": 1593, "name": "Afsar Ali [5]", "empCode": "220050" },
  { "srNo": 97, "branch": "GB", "dateOfJoining": "3-Oct-2023", "ageOnNetwork": 963, "name": "Amra Fatima", "empCode": "230041" },
  { "srNo": 98, "branch": "GB", "dateOfJoining": "7-Mar-2024", "ageOnNetwork": 807, "name": "Eram Irfan", "empCode": "240046" },
  { "srNo": 99, "branch": "GB", "dateOfJoining": "29-Apr-2024", "ageOnNetwork": 754, "name": "Zainab Hashmi", "empCode": "240053" },
  { "srNo": 100, "branch": "GB", "dateOfJoining": "26-Jul-2024", "ageOnNetwork": 666, "name": "Fiza Naaz", "empCode": "240065" },
  { "srNo": 101, "branch": "GB", "dateOfJoining": "27-Jul-2024", "ageOnNetwork": 665, "name": "Taliba Rizwan", "empCode": "240066" },
  { "srNo": 102, "branch": "GB", "dateOfJoining": "26-Jul-2024", "ageOnNetwork": 666, "name": "Fahmeeda Bano", "empCode": "240064" },
  { "srNo": 103, "branch": "CN", "dateOfJoining": "2-Oct-2024", "ageOnNetwork": 598, "name": "Nadeem Ur Rahman", "empCode": "240080" },
  { "srNo": 104, "branch": "CN", "dateOfJoining": "1-Nov-2024", "ageOnNetwork": 568, "name": "Mohd Aslam", "empCode": "240096" },
  { "srNo": 105, "branch": "GB", "dateOfJoining": "2-Dec-2024", "ageOnNetwork": 537, "name": "Adeeba Aleem", "empCode": "240084" },
  { "srNo": 106, "branch": "CN", "dateOfJoining": "3-Feb-2025", "ageOnNetwork": 474, "name": "Muzalfa Fareed Ansari", "empCode": "250089" },
  { "srNo": 107, "branch": "GB", "dateOfJoining": "6-Mar-2025", "ageOnNetwork": 443, "name": "Alvira Naim Ansari", "empCode": "250105" },
  { "srNo": 108, "branch": "GB", "dateOfJoining": "1-Mar-2025", "ageOnNetwork": 448, "name": "Shaziya Parveen", "empCode": "250096" },
  { "srNo": 109, "branch": "VN", "dateOfJoining": "26-Feb-2022", "ageOnNetwork": 1547, "name": "Ayesha Khatoon", "empCode": "220022" },
  { "srNo": 110, "branch": "GB", "dateOfJoining": "1-Mar-2025", "ageOnNetwork": 448, "name": "Sana Ehtisham", "empCode": "250095" },
  { "srNo": 111, "branch": "GB", "dateOfJoining": "11-Mar-2025", "ageOnNetwork": 438, "name": "Darakshan Faiz Khan", "empCode": "250107" },
  { "srNo": 112, "branch": "GB", "dateOfJoining": "1-Mar-2025", "ageOnNetwork": 448, "name": "Sadiya Yunus", "empCode": "250100" },
  { "srNo": 113, "branch": "GB", "dateOfJoining": "14-Apr-2025", "ageOnNetwork": 404, "name": "Abdul Hafeez", "empCode": "250117" },
  { "srNo": 114, "branch": "GB", "dateOfJoining": "28-Apr-2025", "ageOnNetwork": 390, "name": "Ayesha Jalil Siddiqui", "empCode": "250114" },
  { "srNo": 115, "branch": "GB", "dateOfJoining": "23-Apr-2025", "ageOnNetwork": 395, "name": "Anamta Khan", "empCode": "250113" },
  { "srNo": 116, "branch": "GB", "dateOfJoining": "23-Apr-2025", "ageOnNetwork": 395, "name": "Parveen Jaheer", "empCode": "250110" },
  { "srNo": 117, "branch": "GB", "dateOfJoining": "1-May-2025", "ageOnNetwork": 387, "name": "Sagufa", "empCode": "250112" },
  { "srNo": 118, "branch": "CN", "dateOfJoining": "19-May-2025", "ageOnNetwork": 369, "name": "Imran Ahmad", "empCode": "250129" },
  { "srNo": 119, "branch": "GB", "dateOfJoining": "16-Jun-2025", "ageOnNetwork": 341, "name": "Mohd Adeel Alam", "empCode": "250130" },
  { "srNo": 120, "branch": "GB", "dateOfJoining": "9-Jul-2025", "ageOnNetwork": 318, "name": "Rabab Naqvi", "empCode": "250134" },
  { "srNo": 121, "branch": "GB", "dateOfJoining": "1-Jan-2020", "ageOnNetwork": 2334, "name": "Salman Khan", "empCode": "200080" },
  { "srNo": 122, "branch": "GB", "dateOfJoining": "22-Jul-2025", "ageOnNetwork": 305, "name": "Haris Zahidi", "empCode": "250136" },
  { "srNo": 123, "branch": "GB", "dateOfJoining": "22-Jul-2025", "ageOnNetwork": 305, "name": "Zainab Khan", "empCode": "250137" },
  { "srNo": 124, "branch": "GB", "dateOfJoining": "28-Jul-2025", "ageOnNetwork": 299, "name": "Khaliqul Rahman Ansari", "empCode": "250142" },
  { "srNo": 125, "branch": "GB", "dateOfJoining": "25-Aug-2025", "ageOnNetwork": 271, "name": "Ehtishamul Hak", "empCode": "250146" },
  { "srNo": 126, "branch": "GB", "dateOfJoining": "25-Aug-2025", "ageOnNetwork": 271, "name": "Sana Aisha", "empCode": "250147" },
  { "srNo": 127, "branch": "CN", "dateOfJoining": "9-Oct-2025", "ageOnNetwork": 226, "name": "Mohd Akmal", "empCode": "250158" },
  { "srNo": 128, "branch": "GB", "dateOfJoining": "27-Oct-2025", "ageOnNetwork": 208, "name": "Mohd Bilal", "empCode": "250160" },
  { "srNo": 129, "branch": "GB", "dateOfJoining": "22-Nov-2025", "ageOnNetwork": 182, "name": "Kahkasha Siddiqui", "empCode": "250162" },
  { "srNo": 130, "branch": "GB", "dateOfJoining": "2-Mar-2026", "ageOnNetwork": 82, "name": "Sameena Parveen", "empCode": "260007" },
  { "srNo": 131, "branch": "GB", "dateOfJoining": "2-Mar-2026", "ageOnNetwork": 82, "name": "Amreen Farooqui", "empCode": "260009" },
  { "srNo": 132, "branch": "GB", "dateOfJoining": "2-Mar-2026", "ageOnNetwork": 82, "name": "Bisma Ashraf", "empCode": "260010" },
  { "srNo": 133, "branch": "GB", "dateOfJoining": "2-Mar-2026", "ageOnNetwork": 82, "name": "Kumari Hena Fatma", "empCode": "260011" },
  { "srNo": 134, "branch": "GB", "dateOfJoining": "2-Mar-2026", "ageOnNetwork": 82, "name": "Zaib Khan", "empCode": "260013" },
  { "srNo": 135, "branch": "GB", "dateOfJoining": "2-Mar-2026", "ageOnNetwork": 82, "name": "Rizwan Ahmad Ansari", "empCode": "260015" },
  { "srNo": 136, "branch": "GB", "dateOfJoining": "2-Apr-2026", "ageOnNetwork": 51, "name": "Rooma Aman", "empCode": "260028" },
  { "srNo": 137, "branch": "GB", "dateOfJoining": "8-Apr-2026", "ageOnNetwork": 45, "name": "Rooshna Ashraf", "empCode": "260031" },
  { "srNo": 138, "branch": "GB", "dateOfJoining": "17-Apr-2026", "ageOnNetwork": 36, "name": "Subiya khatoon", "empCode": "260043" },
  { "srNo": 139, "branch": "SHA", "dateOfJoining": "23-Apr-2026", "ageOnNetwork": 30, "name": "Anvarul Haq", "empCode": "260045" },
  { "srNo": 140, "branch": "GB", "dateOfJoining": "24-Apr-2026", "ageOnNetwork": 29, "name": "Mohd Tayyab Khan", "empCode": "260046" },
  { "srNo": 141, "branch": "GB", "dateOfJoining": "27-Apr-2026", "ageOnNetwork": 26, "name": "Abdul Rahman", "empCode": "260048" },
  { "srNo": 142, "branch": "GB", "dateOfJoining": "9-May-2026", "ageOnNetwork": 14, "name": "Hamza Khan", "empCode": "260053" },
  { "srNo": 143, "branch": "GB", "dateOfJoining": "14-May-2026", "ageOnNetwork": 9, "name": "Mohammad Shiraj", "empCode": "260057" },
  { "srNo": 144, "branch": "SOPL", "dateOfJoining": "18-Jul-2018", "ageOnNetwork": 2866, "name": "Mohd Amin", "empCode": "180014" },
  { "srNo": 145, "branch": "SOPL", "dateOfJoining": "16-Mar-2025", "ageOnNetwork": 433, "name": "Mohd Faiz Khan", "empCode": "250138" },
  { "srNo": 146, "branch": "SOPL", "dateOfJoining": "12-Dec-2024", "ageOnNetwork": 527, "name": "Tabish", "empCode": "240095" },
  { "srNo": 147, "branch": "AN", "dateOfJoining": "2-Feb-2026", "ageOnNetwork": 110, "name": "Taj Ahmad", "empCode": "260002" },
  { "srNo": 148, "branch": "AN", "dateOfJoining": "17-Feb-2026", "ageOnNetwork": 95, "name": "Sidra Khan", "empCode": "260003" },
  { "srNo": 149, "branch": "AN", "dateOfJoining": "2-Mar-2026", "ageOnNetwork": 82, "name": "Noorussabah", "empCode": "260008" },
  { "srNo": 150, "branch": "AN", "dateOfJoining": "26-Mar-2026", "ageOnNetwork": 58, "name": "Shereen Abrar", "empCode": "260026" },
  { "srNo": 151, "branch": "AN", "dateOfJoining": "17-Apr-2026", "ageOnNetwork": 36, "name": "Afreen", "empCode": "260044" },
  { "srNo": 152, "branch": "AN", "dateOfJoining": "11-May-2026", "ageOnNetwork": 12, "name": "Khadeeja Ilma", "empCode": "260055" },
  { "srNo": 153, "branch": "AN", "dateOfJoining": "12-May-2026", "ageOnNetwork": 11, "name": "Yasha Zaheen", "empCode": "260056" },
  { "srNo": 154, "branch": "MG", "dateOfJoining": "3-Dec-2025", "ageOnNetwork": 171, "name": "Mohd Zakariya", "empCode": "250168" },
  { "srNo": 155, "branch": "MG", "dateOfJoining": "3-Dec-2025", "ageOnNetwork": 171, "name": "Abu Shahma", "empCode": "250169" },
  { "srNo": 156, "branch": "MG", "dateOfJoining": "3-Dec-2025", "ageOnNetwork": 171, "name": "Afreen Khatoon", "empCode": "800001" },
  { "srNo": 157, "branch": "MG", "dateOfJoining": "13-Apr-2026", "ageOnNetwork": 40, "name": "Asfiya Qadir", "empCode": "260032" },
  { "srNo": 158, "branch": "MG", "dateOfJoining": "13-Apr-2026", "ageOnNetwork": 40, "name": "Naziya Parveen", "empCode": "260033" },
  { "srNo": 159, "branch": "MG", "dateOfJoining": "22-Apr-2026", "ageOnNetwork": 31, "name": "Shahna Khatoon", "empCode": "260039" },
  { "srNo": 160, "branch": "MG", "dateOfJoining": "22-Apr-2026", "ageOnNetwork": 31, "name": "Shabeena Parveen", "empCode": "260040" },
  { "srNo": 161, "branch": "MG", "dateOfJoining": "22-Apr-2026", "ageOnNetwork": 31, "name": "Zainab Mushtaque", "empCode": "260041" },
  { "srNo": 162, "branch": "MG", "dateOfJoining": "8-Apr-2026", "ageOnNetwork": 45, "name": "Noor Ahmad", "empCode": "260042" },
  { "srNo": 163, "branch": "MG", "dateOfJoining": "11-Apr-2026", "ageOnNetwork": 42, "name": "Safiya Anees", "empCode": "260047" },
  { "srNo": 164, "branch": "MG", "dateOfJoining": "6-May-2026", "ageOnNetwork": 17, "name": "Shameem Bano", "empCode": "260051" },
  { "srNo": 165, "branch": "MG", "dateOfJoining": "8-May-2026", "ageOnNetwork": 15, "name": "Nlikhat Fatima", "empCode": "260052" },
  { "srNo": 166, "branch": "MG", "dateOfJoining": "8-Apr-2026", "ageOnNetwork": 45, "name": "Mohd Adil", "empCode": "260063" }
];

// Extract old EMPLOYEES array
const startIndex = seedContent.indexOf('const EMPLOYEES = [');
const endIndex = seedContent.indexOf('];', startIndex);
const oldEmployeesText = seedContent.substring(startIndex + 18, endIndex + 1);

// Parse it (it might not be strict JSON due to missing quotes on keys, so use eval)
const oldEmployees = eval(`(${oldEmployeesText})`);

// Map of old names to departments
const oldDeptMap = {};
for (const emp of oldEmployees) {
  let cleanName = emp.name.replace(/ \[\d+\]$/, '').toLowerCase().trim();
  oldDeptMap[cleanName] = emp.department;
}

const months = {
  'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
  'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
};

const formatDate = (dateStr) => {
  // e.g. "4-Apr-2019" -> "2019-04-04"
  const parts = dateStr.split('-');
  const d = parts[0].padStart(2, '0');
  const m = months[parts[1]];
  const y = parts[2];
  return `${y}-${m}-${d}`;
}

const result = [];

for (const emp of newData) {
  let cleanName = emp.name.replace(/ \[\d+\]$/, '').trim();
  
  // match department from old map
  const matchKey = cleanName.toLowerCase();
  
  let dept = 'Academic'; // default
  if (oldDeptMap[matchKey]) {
    dept = oldDeptMap[matchKey];
  } else {
    // If not exact match, try matching just first 2 words
    for (const key of Object.keys(oldDeptMap)) {
      if (key.includes(matchKey) || matchKey.includes(key)) {
        dept = oldDeptMap[key];
        break;
      }
    }
  }

  result.push({
    empCode: emp.empCode,
    name: cleanName,
    branchCode: emp.branch,
    doj: formatDate(emp.dateOfJoining),
    department: dept
  });
}

const formattedArrayString = '[\n    ' + result.map(e => `{ empCode: '${e.empCode}', name: '${e.name}', branchCode: '${e.branchCode}', doj: '${e.doj}', department: '${e.department}' }`).join(',\n    ') + '\n]';

const newSeedContent = seedContent.substring(0, startIndex + 18) + formattedArrayString + seedContent.substring(endIndex + 1);

fs.writeFileSync('seed.js', newSeedContent);

console.log('Successfully merged new data while preserving departments.');
