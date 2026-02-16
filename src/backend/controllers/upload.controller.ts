// controllers/upload.controller.ts

import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Preserve original filename with timestamp prefix for uniqueness
    const timestamp = Date.now();
    const originalName = file.originalname;
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);
    
    // Format: timestamp-originalname.stl
    // Example: 1234567890-my-part.stl
    const filename = `${timestamp}-${nameWithoutExt}${ext}`;
    
    cb(null, filename);
  }
});

// File filter - only accept STL files
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (ext !== '.stl') {
    return cb(new Error('Only STL files are allowed'));
  }
  
  cb(null, true);
};

// Create multer upload instance
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  }
});

export class UploadController {
  /**
   * Upload STL file
   * POST /api/upload
   */
  async uploadFile(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
      }

      // Generate file URL
      const fileUrl = `${req.protocol}://${req.get('host')}/api/uploads/${req.file.filename}`;

      res.status(200).json({
        success: true,
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload file',
      });
    }
  }

  /**
   * Get uploaded file
   * GET /uploads/:filename
   */
  async getFile(req: Request, res: Response) {
    try {
      const filename = req.params.filename as string;
      const filePath = path.join(__dirname, '../../uploads', filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          error: 'File not found',
        });
      }

      // Send file
      res.sendFile(filePath);
    } catch (error) {
      console.error('Error retrieving file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve file',
      });
    }
  }
}

export default new UploadController();