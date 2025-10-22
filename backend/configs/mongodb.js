import mongoose from "mongoose"

//connect to the mongodb database

const connectDB = async()=>{
    mongoose.connection.on('connected', ()=>{
        console.log("Dabase connected")
    })
    await mongoose.connect(`${process.env.MONGODB_URI}/ericailms`)
}
export default connectDB