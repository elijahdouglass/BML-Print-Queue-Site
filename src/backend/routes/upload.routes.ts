// routes/upload.routes.ts

import { Router } from 'express';
import uploadController, { upload } from '../controllers/upload.controller';

const router = Router();

// Upload STL file
router.post('/', upload.single('file'), uploadController.uploadFile.bind(uploadController));

// Get uploaded file
router.get('/:filename', uploadController.getFile.bind(uploadController));

export default router;