const express = require('express');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3003;

const dotenv = require("dotenv");
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Allow any file type, set size limit if you want
const upload = multer({
  storage: storage,
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB limit (adjust as needed)
});

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Cloudinary Upload Server is running!',
    endpoints: {
      upload: 'POST /upload',
      health: 'GET /'
    }
  });
});

// Upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const filePath = req.file.path;

    // Upload to Cloudinary with auto detection
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'auto', // detect file type automatically
      public_id: `uploads/${Date.now()}_${path.parse(req.file.originalname).name}`,
      overwrite: true
    });

    // Clean up local file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting local file:', err);
    });

    res.json({
      success: true,
      message: 'File uploaded successfully!',
      data: {
        public_id: result.public_id,
        url: result.secure_url,
        resource_type: result.resource_type,
        format: result.format,
        bytes: result.bytes,
        created_at: result.created_at
      }
    });

  } catch (error) {
    console.error('Upload error:', error);

    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting local file:', err);
      });
    }

    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large.'
      });
    }
  }
  res.status(400).json({ error: error.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
