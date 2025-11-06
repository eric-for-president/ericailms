import { Webhook } from "svix";
import User from "../models/User.js";
import { clerkClient } from "@clerk/express";

export const clerkWebhooks = async (req, res) => {
    console.log("🔔 Webhook received!");

    try {
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

        // Convert raw buffer to string for svix verification
        const payload = req.body.toString();

        const headers = {
            "svix-id": req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"]
        };

        console.log("Headers received:", headers);

        // Verify the webhook
        let evt;
        try {
            evt = whook.verify(payload, headers);
            console.log("✅ Webhook verified successfully");
        } catch (err) {
            console.error("❌ Webhook verification failed:", err.message);
            return res.status(400).json({
                success: false,
                message: 'Webhook verification failed'
            });
        }

        const { data, type } = evt;
        console.log("Event type:", type);
        console.log("User data:", data);

        switch (type) {
            case 'user.created': {
                const userData = {
                    _id: data.id,
                    email: data.email_addresses?.[0]?.email_address || "",
                    name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || "User",
                    imageUrl: data.image_url || "",
                    enrolledCourses: []
                };

                console.log("Creating user with data:", userData);

                // Check if user already exists
                const existingUser = await User.findById(data.id);
                if (existingUser) {
                    console.log("⚠️ User already exists:", data.id);
                    return res.status(200).json({ success: true, message: 'User already exists' });
                }

                const newUser = await User.create(userData);
                console.log('✅ User created in DB:', newUser._id);

                // ✅ SET DEFAULT ROLE TO 'student' IF NOT ALREADY SET
                // This ensures all new users have a role
                if (!data.public_metadata?.role) {
                    try {
                        await clerkClient.users.updateUser(data.id, {
                            publicMetadata: { role: 'student' }
                        });
                        console.log('✅ Default role "student" assigned to user:', data.id);
                    } catch (roleError) {
                        console.error('⚠️ Failed to set default role:', roleError.message);
                        // Don't fail the webhook if role assignment fails
                    }
                }

                return res.status(200).json({ success: true, userId: newUser._id });
            }

            case 'user.updated': {
                const userData = {
                    email: data.email_addresses?.[0]?.email_address || "",
                    name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || "User",
                    imageUrl: data.image_url || "",
                };

                console.log("Updating user:", data.id);
                const updatedUser = await User.findByIdAndUpdate(
                    data.id,
                    userData,
                    { new: true }
                );

                if (!updatedUser) {
                    console.log("⚠️ User not found for update:", data.id);
                }

                console.log('✅ User updated:', data.id);
                return res.status(200).json({ success: true });
            }

            case 'user.deleted': {
                console.log("Deleting user:", data.id);
                await User.findByIdAndDelete(data.id);
                console.log('✅ User deleted:', data.id);
                return res.status(200).json({ success: true });
            }

            default:
                console.log("⚠️ Unhandled event type:", type);
                return res.status(200).json({ success: true });
        }
    } catch (error) {
        console.error('❌ Clerk webhook error:', error);
        console.error('Error stack:', error.stack);
        return res.status(400).json({ success: false, message: error.message });
    }
};

/* Configure Clerk Dashboard:**

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your application
3. Go to **Webhooks** in the sidebar
4. Click **Add Endpoint**
5. Enter your webhook URL:
   - **Development**: `https://your-ngrok-url.ngrok.io/api/webhooks/clerk`
    - **Production**: `https://your-domain.com/api/webhooks/clerk`
6. Subscribe to these events:
    - `user.created`
    - `user.updated`
    - `user.deleted`
7. Copy the **Signing Secret** and add it to your `.env`: */