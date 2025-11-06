import mongoose from "mongoose";

const connectDB = async () => {
    try {
        mongoose.connection.on('connected', () => {
            console.log("✅ Database connected");
        });

        mongoose.connection.on('error', (err) => {
            console.error("❌ MongoDB Error:", err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log("⚠️ MongoDB Disconnected");
        });

        await mongoose.connect(`${process.env.MONGODB_URI}/ericailms`, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

    } catch (error) {
        console.error("❌ MongoDB Connection Failed:", error.message);
        process.exit(1);
    }
};

export default connectDB;