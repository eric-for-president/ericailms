import { clerkClient } from "@clerk/express";
import User from "../models/User.js";
import crypto from "crypto";

// Simple in-memory storage (use Redis or MongoDB in production)
const invitations = new Map();

// Middleware to protect admin routes
export const protectAdmin = async (req, res, next) => {
    try {
        const { userId } = req.auth;
        const response = await clerkClient.users.getUser(userId);

        if (response.publicMetadata.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Unauthorized! Admin access required."
            });
        }
        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create new user with email/password (Admin only)
export const createUser = async (req, res) => {
    try {
        const { email, password, firstName, lastName, role = 'student' } = req.body;

        if (!email || !password || !firstName) {
            return res.status(400).json({
                success: false,
                message: "Email, password, and first name are required"
            });
        }

        const clerkUser = await clerkClient.users.createUser({
            emailAddress: [email],
            password,
            firstName,
            lastName: lastName || '',
            publicMetadata: { role },
            skipPasswordChecks: false,
            skipPasswordRequirement: false
        });

        console.log("✅ Clerk user created:", clerkUser.id);

        const userData = {
            _id: clerkUser.id,
            email,
            name: `${firstName} ${lastName || ''}`.trim(),
            imageUrl: clerkUser.imageUrl || "",
            enrolledCourses: []
        };

        const newUser = await User.create(userData);
        console.log('✅ User created in DB:', newUser._id);

        return res.status(201).json({
            success: true,
            message: "User created successfully. Verification email sent.",
            user: {
                id: clerkUser.id,
                email: clerkUser.emailAddresses[0].emailAddress,
                name: userData.name,
                role
            }
        });

    } catch (error) {
        console.error('❌ Error creating user:', error);

        if (error.errors && error.errors[0]?.code === 'form_identifier_exists') {
            return res.status(400).json({
                success: false,
                message: "User with this email already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all users (Admin only)
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-__v');

        const enrichedUsers = await Promise.all(
            users.map(async (user) => {
                try {
                    const clerkUser = await clerkClient.users.getUser(user._id);
                    return {
                        ...user.toObject(),
                        emailVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
                        lastSignIn: clerkUser.lastSignInAt,
                        role: clerkUser.publicMetadata.role || 'student'
                    };
                } catch (err) {
                    return user.toObject();
                }
            })
        );

        return res.json({
            success: true,
            users: enrichedUsers,
            count: enrichedUsers.length
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete user (Admin only)
export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        await clerkClient.users.deleteUser(userId);
        await User.findByIdAndDelete(userId);

        return res.json({
            success: true,
            message: "User deleted successfully"
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update user role (Admin only)
export const updateUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (!['student', 'educator', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role. Must be 'student', 'educator', or 'admin'"
            });
        }

        await clerkClient.users.updateUser(userId, {
            publicMetadata: { role }
        });

        return res.json({
            success: true,
            message: `User role updated to ${role}`
        });
    } catch (error) {
        console.error('Error updating user role:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Generate invitation link
export const generateInvitation = async (req, res) => {
    try {
        const { email, role = 'student', expiresInHours = 48 } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + (expiresInHours * 60 * 60 * 1000);

        invitations.set(token, {
            email,
            role,
            expiresAt,
            used: false
        });

        const inviteLink = `${process.env.FRONTEND_URL}/accept-invite/${token}`;

        console.log(`📧 Invitation link for ${email}: ${inviteLink}`);

        return res.status(201).json({
            success: true,
            message: "Invitation created successfully",
            inviteLink,
            expiresAt: new Date(expiresAt).toISOString()
        });

    } catch (error) {
        console.error('Error generating invitation:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Verify invitation token
export const verifyInvitation = async (req, res) => {
    try {
        const { token } = req.params;
        const invitation = invitations.get(token);

        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: "Invalid invitation link"
            });
        }

        if (invitation.used) {
            return res.status(400).json({
                success: false,
                message: "This invitation has already been used"
            });
        }

        if (Date.now() > invitation.expiresAt) {
            invitations.delete(token);
            return res.status(400).json({
                success: false,
                message: "This invitation has expired"
            });
        }

        return res.json({
            success: true,
            email: invitation.email,
            role: invitation.role
        });

    } catch (error) {
        console.error('Error verifying invitation:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Accept invitation and create user
export const acceptInvitation = async (req, res) => {
    try {
        const { token } = req.params;
        const { password, firstName, lastName } = req.body;

        const invitation = invitations.get(token);

        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: "Invalid invitation link"
            });
        }

        if (invitation.used) {
            return res.status(400).json({
                success: false,
                message: "This invitation has already been used"
            });
        }

        if (Date.now() > invitation.expiresAt) {
            invitations.delete(token);
            return res.status(400).json({
                success: false,
                message: "This invitation has expired"
            });
        }

        if (!password || !firstName) {
            return res.status(400).json({
                success: false,
                message: "Password and first name are required"
            });
        }

        const clerkUser = await clerkClient.users.createUser({
            emailAddress: [invitation.email],
            password,
            firstName,
            lastName: lastName || '',
            publicMetadata: { role: invitation.role },
            skipPasswordChecks: false,
            skipPasswordRequirement: false
        });

        console.log("✅ User created from invitation:", clerkUser.id);

        const userData = {
            _id: clerkUser.id,
            email: invitation.email,
            name: `${firstName} ${lastName || ''}`.trim(),
            imageUrl: clerkUser.imageUrl || "",
            enrolledCourses: []
        };

        const newUser = await User.create(userData);

        invitation.used = true;
        invitations.set(token, invitation);

        return res.status(201).json({
            success: true,
            message: "Account created successfully! You can now sign in.",
            userId: newUser._id
        });

    } catch (error) {
        console.error('Error accepting invitation:', error);

        if (error.errors && error.errors[0]?.code === 'form_identifier_exists') {
            return res.status(400).json({
                success: false,
                message: "An account with this email already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all invitations (Admin only)
export const getAllInvitations = async (req, res) => {
    try {
        const allInvitations = Array.from(invitations.entries()).map(([token, data]) => ({
            token,
            ...data,
            expired: Date.now() > data.expiresAt,
            inviteLink: `${process.env.FRONTEND_URL}/accept-invite/${token}`
        }));

        return res.json({
            success: true,
            invitations: allInvitations,
            count: allInvitations.length
        });
    } catch (error) {
        console.error('Error fetching invitations:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete/revoke invitation (Admin only)
export const revokeInvitation = async (req, res) => {
    try {
        const { token } = req.params;

        if (!invitations.has(token)) {
            return res.status(404).json({
                success: false,
                message: "Invitation not found"
            });
        }

        invitations.delete(token);

        return res.json({
            success: true,
            message: "Invitation revoked successfully"
        });
    } catch (error) {
        console.error('Error revoking invitation:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};