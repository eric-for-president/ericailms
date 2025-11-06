import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './configs/mongodb.js';
import { clerkWebhooks } from './controllers/webhooks.js';
import educatorRouter from './routes/educatorRoutes.js';
import { clerkMiddleware } from '@clerk/express';
import connectCloudinary from './configs/cloudinary.js';
import courseRouter from './routes/courseRoute.js';
import userRouter from './routes/userRoutes.js';
import adminRouter from './routes/adminRoutes.js';

// initialize express
const app = express();

// connect to db
await connectDB();
await connectCloudinary();

// CORS
app.use(cors());

// CRITICAL: Webhook route MUST come BEFORE express.json()
// Use express.raw() to preserve the raw body for signature verification
app.post('/api/webhooks/clerk',
    express.raw({ type: 'application/json' }),
    clerkWebhooks
);

// NOW apply express.json() globally for other routes
app.use(express.json());

// Apply Clerk middleware AFTER express.json()
app.use(clerkMiddleware());

// Routes
app.get('/', (req,res)=>{res.send("ERIC AI API is working fine!")})

// API Routes
app.use('/api/educator', educatorRouter);
app.use('/api/course', courseRouter);
app.use('/api/user', userRouter);
app.use('/api/admin', adminRouter);

// port
const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=> {
    console.log(`Server is running on ${PORT}`);
})