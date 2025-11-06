import express from 'express'
import {
    addCourse,
    educatorDashboardData,
    getEducatorCourses,
    getEnrolledStudentsData,
    requestEducatorRole,
    getAllEducatorRequests,
    approveEducatorRequest,
    rejectEducatorRequest,
    getMyEducatorRequestStatus
} from '../controllers/educatorController.js'
import { protectEducator } from '../middleware/authMiddleware.js';
import { protectAdmin } from '../controllers/adminController.js';
import upload from '../configs/multer.js';
import { requireAuth } from '@clerk/express';

const educatorRouter = express.Router();

// All routes need authentication
educatorRouter.use(requireAuth());

// ===== EDUCATOR REQUEST SYSTEM (STUDENTS) =====
educatorRouter.post('/request', requestEducatorRole);
educatorRouter.get('/request/status', getMyEducatorRequestStatus);

// ===== ADMIN ROUTES - MANAGE EDUCATOR REQUESTS =====
educatorRouter.get('/requests', protectAdmin, getAllEducatorRequests);
educatorRouter.patch('/requests/:requestId/approve', protectAdmin, approveEducatorRequest);
educatorRouter.patch('/requests/:requestId/reject', protectAdmin, rejectEducatorRequest);

// ===== EDUCATOR ROUTES - REQUIRE EDUCATOR ROLE =====
educatorRouter.post('/add-course', upload.single('image'), protectEducator, addCourse);
educatorRouter.get('/courses', protectEducator, getEducatorCourses);
educatorRouter.get('/dashboard', protectEducator, educatorDashboardData);
educatorRouter.get('/enrolled-students', protectEducator, getEnrolledStudentsData);

export default educatorRouter;