require('dotenv').config(); 
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

// --- Config ---
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = './public/uploads';

// สร้างโฟลเดอร์ uploads ถ้ายังไม่มี
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ตั้งค่า View Engine
app.set('view engine', 'ejs');
app.use(express.static('public')); // ให้เข้าถึงไฟล์ใน public ได้
app.use(express.urlencoded({ extended: true }));

// --- Multer Setup (จัดการการอัปโหลดไฟล์) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // ตั้งชื่อไฟล์ใหม่ป้องกันชื่อซ้ำ: timestamp + นามสกุลเดิม
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// กรองไฟล์ (อนุญาตเฉพาะรูปและวิดีโอ)
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif|mp4|webm|ogg/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: อนุญาตเฉพาะไฟล์รูปภาพและวิดีโอเท่านั้น!');
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // จำกัดขนาด 50MB
  fileFilter: fileFilter
});

// --- Routes ---
// 1. หน้าแรก (Gallery View) + Pagination
app.get('/', (req, res) => {
  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Error reading upload directory');
    }

    // 1. เรียงลำดับไฟล์ (ใหม่ -> เก่า)
    files.sort().reverse();

    // 2. ตั้งค่า Pagination
    const page = parseInt(req.query.page) || 1; // รับค่าหน้าจาก URL (ถ้าไม่มีให้เป็น 1)
    const limit = 100; // --- กำหนดจำนวนภาพต่อหน้าตรงนี้ ---

    // คำนวณ Index เริ่มต้นและสิ้นสุด
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const totalFiles = files.length;
    const totalPages = Math.ceil(totalFiles / limit);

    // ตัด Array ไฟล์เฉพาะส่วนที่จะแสดงในหน้านั้น
    const paginatedFiles = files.slice(startIndex, endIndex);

    // ส่งข้อมูลไปที่หน้าจอ
    res.render('index', {
      files: paginatedFiles,
      currentPage: page,
      totalPages: totalPages,
      totalFiles: totalFiles
    });
  });
});

// 2. หน้าฟอร์มอัปโหลด
app.get('/upload', (req, res) => {
  res.render('upload');
});

// 3. Process การอัปโหลด (POST)
// อนุญาตให้อัปโหลดทีละหลายไฟล์ (สมมติให้สูงสุด 20 ไฟล์ต่อครั้ง)
app.post('/upload', upload.array('mediaFile', 20), (req, res) => {
    
    // เช็คว่ามีไฟล์ส่งมาหรือไม่ (ใช้ req.files เติม s)
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('กรุณาเลือกไฟล์ หรือไฟล์ไม่รองรับ');
    }

    // อัปโหลดเสร็จแล้ว เด้งกลับหน้าแรก
    res.redirect('/');
});

// 4. ดาวน์โหลดไฟล์
app.get('/download/:filename', (req, res) => {
  const file = path.join(UPLOAD_DIR, req.params.filename);
  res.download(file);
});

// 5. ลบไฟล์
app.post('/delete/:filename', (req, res) => {
  const file = path.join(UPLOAD_DIR, req.params.filename);

  fs.unlink(file, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('ลบไฟล์ไม่สำเร็จ');
    }
    res.redirect('/');
  });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📂 Upload folder: ${path.resolve(UPLOAD_DIR)}`);
});