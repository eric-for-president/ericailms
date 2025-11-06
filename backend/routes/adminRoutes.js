import express from "express";
import { requireAuth } from "@clerk/express";
import {
    protectAdmin,
    createUser,
    getAllUsers,
    deleteUser,
    updateUserRole,
    generateInvitation,
    verifyInvitation,
    acceptInvitation,
    getAllInvitations,
    revokeInvitation
} from "../controllers/adminController.js";

const adminRouter = express.Router();

// Public invitation routes (no auth required)
adminRouter.get('/invitations/verify/:token', verifyInvitation);
adminRouter.post('/invitations/accept/:token', acceptInvitation);

// Protected admin routes
adminRouter.use(requireAuth());
adminRouter.use(protectAdmin);

// User management
adminRouter.post('/create-user', createUser);
adminRouter.get('/users', getAllUsers);
adminRouter.delete('/users/:userId', deleteUser);
adminRouter.patch('/users/:userId/role', updateUserRole);

// Invitation management
adminRouter.post('/invitations/generate', generateInvitation);
adminRouter.get('/invitations', getAllInvitations);
adminRouter.delete('/invitations/:token', revokeInvitation);

export default adminRouter;