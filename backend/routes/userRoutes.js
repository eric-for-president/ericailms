import express from "express";
import { addUserRating, getUserCourseProgress, getUserData, purchaseCourse, updateUserCourseProgress, userEnrolledCourses } from "../controllers/userController.js";
import { requireAuth } from "@clerk/express";

const userRouter = express.Router();

// Apply requireAuth middleware to all user routes
userRouter.use(requireAuth());

userRouter.get('/data', getUserData);
userRouter.get('/enrolled-courses', userEnrolledCourses);
userRouter.post('/purchase-course', purchaseCourse);  // ✅ Changed from /purchase to /purchase-course
userRouter.post('/update-course-progress', updateUserCourseProgress);
userRouter.post('/get-course-progress', getUserCourseProgress);
userRouter.post('/add-rating', addUserRating);

export default userRouter;