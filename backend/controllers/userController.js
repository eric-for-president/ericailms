import Course from "../models/Course.js";
import { Purchase } from "../models/Purchase.js";
import User from "../models/User.js";
import { CourseProgress } from "../models/CourseProgress.js";

// ✅ Get user data
export const getUserData = async (req, res) => {
    try {
        const { userId } = req.auth

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized user!" });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found!" });
        }

        return res.json({ success: true, user });
    } catch (error) {
        console.error("Error in getUserData:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ✅ User enrolled courses
export const userEnrolledCourses = async (req, res) => {
    try {
        const { userId } = req.auth

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized user!" });
        }

        const userData = await User.findById(userId).populate("enrolledCourses");

        if (!userData) {
            return res.status(404).json({ success: false, message: "User not found!" });
        }

        return res.json({ success: true, enrolledCourses: userData.enrolledCourses });
    } catch (error) {
        console.error("Error in userEnrolledCourses:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ✅ Purchase course (without payment processing)
export const purchaseCourse = async (req, res) => {
    try {
        const { courseId } = req.body;
        const { userId } = req.auth;

        const userData = await User.findById(userId);
        const courseData = await Course.findById(courseId);

        if (!userData || !courseData) {
            return res.status(404).json({ success: false, message: "Data not found" });
        }

        // Check if already enrolled
        if (userData.enrolledCourses.includes(courseId)) {
            return res.status(400).json({ success: false, message: "Already enrolled in this course" });
        }

        // Calculate amount (for record keeping)
        const amount = (
            courseData.coursePrice -
            (courseData.discount * courseData.coursePrice) / 100
        ).toFixed(2);

        // Create purchase record with completed status
        const newPurchase = await Purchase.create({
            courseId: courseData._id,
            userId,
            amount,
            status: 'completed'
        });

        // Enroll user in course
        userData.enrolledCourses.push(courseId);
        await userData.save();

        return res.json({
            success: true,
            message: "Successfully enrolled in course",
            purchase: newPurchase
        });
    } catch (error) {
        console.error("Error in purchaseCourse:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ✅ Update course progress
export const updateUserCourseProgress = async (req, res) => {
    try {
        const { userId } = req.auth
        const { courseId, lectureId } = req.body;

        let progressData = await CourseProgress.findOne({ userId, courseId });

        if (progressData) {
            if (progressData.lectureCompleted.includes(lectureId)) {
                return res.json({ success: true, message: "Lecture already completed" });
            }
            progressData.lectureCompleted.push(lectureId);
            progressData.completed = true;
            await progressData.save();
        } else {
            await CourseProgress.create({
                userId,
                courseId,
                lectureCompleted: [lectureId],
            });
        }

        return res.json({ success: true, message: "Progress updated" });
    } catch (error) {
        console.error("Error in updateUserCourseProgress:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ✅ Get user course progress
export const getUserCourseProgress = async (req, res) => {
    try {
        const { userId } = req.auth
        const { courseId } = req.body;

        const progressData = await CourseProgress.findOne({ userId, courseId });
        return res.json({ success: true, progressData });
    } catch (error) {
        console.error("Error in getUserCourseProgress:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ✅ Add user rating
export const addUserRating = async (req, res) => {
    try {
        const { userId } = req.auth
        const { courseId, rating } = req.body;

        if (!courseId || !userId || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: "Invalid details" });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: "Course not found!" });
        }

        const user = await User.findById(userId);
        if (!user || !user.enrolledCourses.includes(courseId)) {
            return res.status(403).json({ success: false, message: "User has not purchased this course." });
        }

        const existingRatingIndex = course.courseRatings.findIndex(
            (r) => r.userId.toString() === userId.toString()
        );

        if (existingRatingIndex > -1) {
            course.courseRatings[existingRatingIndex].rating = rating;
        } else {
            course.courseRatings.push({ userId, rating });
        }

        await course.save();
        return res.json({ success: true, message: "Rating added" });
    } catch (error) {
        console.error("Error in addUserRating:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};