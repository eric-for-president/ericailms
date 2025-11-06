import {clerkClient} from '@clerk/express'
import Course from '../models/Course.js'
import {v2 as cloudinary} from 'cloudinary'
import { Purchase } from '../models/Purchase.js'
import User from '../models/User.js'
import {EducatorRequest} from "../models/EducatorRequest.js";

// ❌ DEPRECATED - Remove this function or make it admin-only
// Users should now use the request system instead
export const updateRoleToEducator = async (req,res)=>{
    try {
        const { userId } = req.auth;

        // Check if requester is admin
        const requester = await clerkClient.users.getUser(userId);
        if (requester.publicMetadata.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Please submit an educator request for admin approval"
            });
        }

        // If admin wants to promote someone directly
        const { targetUserId } = req.body;
        const userToPromote = targetUserId || userId;

        await clerkClient.users.updateUser(userToPromote, {
            publicMetadata: { role: 'educator' }
        });

        res.json({success: true, message: 'User promoted to educator successfully'});

    } catch (error) {
        res.json({success: false, message:error.message})
    }
}

export const addCourse = async (req, res) => {
    try {
        const { courseData } = req.body;
        const imageFile = req.file;
        const { userId: educatorId } = req.auth;

        if (!imageFile) {
            return res.json({ success: false, message: "Thumbnail Not Attached" });
        }

        const parsedCourseData = JSON.parse(courseData);
        parsedCourseData.educator = educatorId;

        const imageUpload = await cloudinary.uploader.upload(imageFile.path);
        parsedCourseData.courseThumbnail = imageUpload.secure_url;

        const newCourse = await Course.create(parsedCourseData);
        await newCourse.save()

        res.json({ success: true, message: "Course Added", course: newCourse });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get educator courses
export const getEducatorCourses = async(req,res) => {
    try {
        const { userId: educator } = req.auth;
        const courses = await Course.find({educator})
        res.json({success: true, courses})

    } catch (error) {
        res.json({success: false, message:error.message})
    }
}

// get educator dashboard data (total earnings, enrolled students, No. of courses)
export const educatorDashboardData = async(req,res) =>{
    try {
        const { userId: educator } = req.auth;

        const courses = await Course.find({educator});
        const totalCourses = courses.length;

        const courseIds = courses.map(course => course._id)

        const purchases = await Purchase.find({
            courseId: {$in: courseIds},
            status: 'completed'
        });

        const totalEarnings = Math.round(purchases.reduce((sum, purchase) => sum + purchase.amount, 0)).toFixed(2)

        const enrolledStudentsData = [];
        for(const course of courses){
            const students = await User.find({
                _id: {$in: course.enrolledStudents}
            }, 'name imageUrl')

            students.forEach(student => {
                enrolledStudentsData.push({
                    courseTitle: course.courseTitle,
                    student
                });
            });
        }
        res.json({success: true, dashboardData: {
                totalEarnings, enrolledStudentsData, totalCourses
            }})
    } catch (error) {
        res.json({success: false, message:error.message})
    }
}

// Get Enrolled Students Data with purchase data
export const getEnrolledStudentsData = async(req,res) =>{
    try {
        const { userId: educator } = req.auth;
        const courses = await Course.find({educator})
        const courseIds = courses.map(course => course._id)

        const purchases = await Purchase.find({
            courseId: {$in: courseIds},
            status: 'completed'
        }).populate('userId', 'name imageUrl').populate('courseId', 'courseTitle')

        const enrolledStudents = purchases.map(purchase => ({
            student: purchase.userId,
            courseTitle: purchase.courseId.courseTitle,
            purchaseDate: purchase.createdAt
        }));

        res.json({success: true, enrolledStudents});

    } catch (error) {
        res.json({success: false, message:error.message})
    }
}

// ===== EDUCATOR REQUEST SYSTEM =====

// Request to become educator (Student submits request)
export const requestEducatorRole = async (req, res) => {
    try {
        const { userId } = req.auth;
        const { reason } = req.body;

        // Check if user already has a pending request
        const existingRequest = await EducatorRequest.findOne({
            userId,
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({
                success: false,
                message: "You already have a pending educator request"
            });
        }

        // Check current role
        const clerkUser = await clerkClient.users.getUser(userId);
        if (clerkUser.publicMetadata.role === 'educator' || clerkUser.publicMetadata.role === 'admin') {
            return res.status(400).json({
                success: false,
                message: "You are already an educator"
            });
        }

        // Create educator request
        const request = await EducatorRequest.create({
            userId,
            reason: reason || "I want to become an educator",
            status: 'pending',
            requestedAt: new Date()
        });

        return res.status(201).json({
            success: true,
            message: "Educator request submitted successfully. Waiting for admin approval.",
            requestId: request._id
        });

    } catch (error) {
        console.error('Error requesting educator role:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all educator requests (Admin only)
export const getAllEducatorRequests = async (req, res) => {
    try {
        const { status } = req.query;

        const filter = status ? { status } : {};
        const requests = await EducatorRequest.find(filter)
            .sort({ requestedAt: -1 });

        // Enrich with user data
        const enrichedRequests = await Promise.all(
            requests.map(async (request) => {
                try {
                    const user = await User.findById(request.userId);
                    const clerkUser = await clerkClient.users.getUser(request.userId);

                    return {
                        ...request.toObject(),
                        userInfo: {
                            name: user?.name || 'Unknown',
                            email: clerkUser.emailAddresses[0]?.emailAddress,
                            imageUrl: user?.imageUrl
                        }
                    };
                } catch (err) {
                    return request.toObject();
                }
            })
        );

        return res.json({
            success: true,
            requests: enrichedRequests,
            count: enrichedRequests.length
        });
    } catch (error) {
        console.error('Error fetching educator requests:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Approve educator request (Admin only)
export const approveEducatorRequest = async (req, res) => {
    try {
        const { requestId } = req.params;

        const request = await EducatorRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Request not found"
            });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Request is already ${request.status}`
            });
        }

        // Update user role in Clerk
        await clerkClient.users.updateUser(request.userId, {
            publicMetadata: { role: 'educator' }
        });

        // Update request status
        request.status = 'approved';
        request.reviewedAt = new Date();
        request.reviewedBy = req.auth.userId;
        await request.save();

        return res.json({
            success: true,
            message: "Educator request approved successfully. User is now an educator."
        });

    } catch (error) {
        console.error('Error approving educator request:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Reject educator request (Admin only)
export const rejectEducatorRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { reason } = req.body;

        const request = await EducatorRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Request not found"
            });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Request is already ${request.status}`
            });
        }

        request.status = 'rejected';
        request.rejectionReason = reason || 'No reason provided';
        request.reviewedAt = new Date();
        request.reviewedBy = req.auth.userId;
        await request.save();

        return res.json({
            success: true,
            message: "Educator request rejected."
        });

    } catch (error) {
        console.error('Error rejecting educator request:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Check user's educator request status
export const getMyEducatorRequestStatus = async (req, res) => {
    try {
        const { userId } = req.auth;

        const request = await EducatorRequest.findOne({ userId })
            .sort({ requestedAt: -1 });

        if (!request) {
            return res.json({
                success: true,
                hasRequest: false,
                status: null
            });
        }

        return res.json({
            success: true,
            hasRequest: true,
            status: request.status,
            requestedAt: request.requestedAt,
            reviewedAt: request.reviewedAt,
            rejectionReason: request.rejectionReason
        });

    } catch (error) {
        console.error('Error checking educator request status:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};