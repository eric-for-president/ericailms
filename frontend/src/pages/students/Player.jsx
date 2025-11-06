import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { useParams } from "react-router-dom";
import { assets } from "../../assets/assets";
import humanizeDuration from "humanize-duration";
import YouTube from 'react-youtube'
import Footer from "../../components/students/Footer";
import Rating from "../../components/students/Rating";
import axios from "axios";
import { toast } from "react-toastify";
import Loading from "../../components/students/Loading";

const Player = () => {

    const {enrolledCourses, calculateChapterTime, backendUrl, getToken, userData, fetchUserEnrolledCourses} = useContext(AppContext)
    const {courseId} = useParams();
    const [courseData, setCourseData] = useState(null)
    const [openSections, setOpenSections] = useState({})
    const [playerData, setPlayerData] = useState(null)
    const [progressData, setProgressData] = useState(null)
    const [initialRating, setInitialRating] = useState(0)

    // Helper function to extract YouTube video ID from various URL formats
    const extractVideoId = (url) => {
        if (!url) return null;

        // If it's already just the ID
        if (url.length === 11 && !url.includes('/') && !url.includes('?')) {
            return url;
        }

        // Handle different YouTube URL formats
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /^([a-zA-Z0-9_-]{11})$/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        // Try splitting by / and getting the last part
        const parts = url.split('/');
        const lastPart = parts[parts.length - 1];

        // Remove query parameters if any
        const videoId = lastPart.split('?')[0];

        return videoId;
    };

    const getCourseData = () =>{
        enrolledCourses.map((course)=>{
            if(course._id === courseId)
            {
                setCourseData(course)
                course.courseRatings.map((item)=>{
                    if(item.userId === userData._id){
                        setInitialRating(item.rating)
                    }
                })
            }
        })
    }

    const toggleSection = (index) => {
        setOpenSections((prev) => ({ ...prev, [index]: !prev[index] }));
    };

    useEffect(()=>{
        if(enrolledCourses.length > 0){
            getCourseData()
        }
    },[enrolledCourses])

    const markLectureAsCompleted = async (lectureId) => {
        try {
            const token = await getToken();
            const {data} = await axios.post(backendUrl + '/api/user/update-course-progress',{courseId, lectureId}, {headers: {Authorization: `Bearer ${token}`}})

            if(data.success){
                toast.success(data.message)
                getCourseProgress()
            }else{
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const getCourseProgress = async () => {
        try {
            const token = await getToken();
            const {data} = await axios.post(backendUrl + '/api/user/get-course-progress', {courseId}, {headers: {Authorization: `Bearer ${token}`}})

            if(data.success){
                setProgressData(data.progressData)
            }else{
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const handleRate = async (rating)=>{
        try {
            const token = await getToken();

            const {data} = await axios.post(backendUrl + '/api/user/add-rating', {courseId, rating},{headers: {Authorization: `Bearer ${token}`}})

            if(data.success){
                toast.success(data.message)
                fetchUserEnrolledCourses();
            }
            else{
                toast.error(data.message)
            }

        } catch (error) {
            toast.error(error.message)
        }
    }

    useEffect(()=>{
        getCourseProgress();
    },[])

    // YouTube player options
    const opts = {
        height: '100%',
        width: '100%',
        playerVars: {
            autoplay: 1,
            modestbranding: 1,
            rel: 0
        },
    };

    const onPlayerReady = (event) => {
        console.log('YouTube Player is ready');
    };

    const onPlayerError = (event) => {
        console.error('YouTube Player Error:', event.data);
        toast.error('Error loading video. Please check the video URL.');
    };

    return courseData ? (
            <>
                <div className="p-4 sm:p-10 flex flex-col-reverse md:grid md:grid-cols-2 gap-10 md:px-36">
                    {/* Left column */}
                    <div className="text-gray-800">
                        <h2 className="text-xl font-semibold">Course Structure</h2>
                        <div className="pt-5">
                            {courseData && courseData.courseContent.map((chapter, index) => (
                                <div
                                    className="border border-gray-300 bg-white mb-2 rounded"
                                    key={index}
                                >
                                    <div
                                        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                                        onClick={() => toggleSection(index)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <img
                                                className={`transform transition-transform ${
                                                    openSections[index] ? "rotate-180" : ""
                                                }`}
                                                src={assets.down_arrow_icon}
                                                alt="down_arrow_icon"
                                            />
                                            <p className="font-medium md:text-base text-sm">
                                                {chapter.chapterTitle}
                                            </p>
                                        </div>
                                        <p className="text-sm md:text-default">
                                            {chapter.chapterContent.length} lectures -{" "}
                                            {calculateChapterTime(chapter)}{" "}
                                        </p>
                                    </div>

                                    <div
                                        className={`overflow-hidden transition-all duration-300 ${
                                            openSections[index] ? "max-h-96" : "max-h-0"
                                        }`}
                                    >
                                        <ul className="list-disc md:pl-10 pl-4 pr-4 py-2 text-gray-600 border-t border-gray-300">
                                            {chapter.chapterContent.map((lecture, i) => (
                                                <li key={i} className="flex items-start gap-2 py-1">
                                                    <img onClick={() =>
                                                        setPlayerData({
                                                            ...lecture, chapter: index + 1, lecture: i+1
                                                        })}

                                                         className="w-4 h-4 mt-1 cursor-pointer"
                                                         src={progressData && progressData.lectureCompleted.includes(lecture.lectureId) ? assets.blue_tick_icon : assets.play_icon}
                                                         alt="play_icon"
                                                    />
                                                    <div className="flex items-center justify-between w-full text-gray-800 text-xs md:text-default">
                                                        <p>{lecture.lectureTitle}</p>
                                                        <div className="flex gap-2">
                                                            {lecture.lectureUrl && (
                                                                <p
                                                                    onClick={() =>
                                                                        setPlayerData({
                                                                            ...lecture, chapter: index + 1, lecture: i+1
                                                                        })
                                                                    }
                                                                    className="text-blue-500 cursor-pointer"
                                                                >
                                                                    Watch
                                                                </p>
                                                            )}
                                                            <p>
                                                                {humanizeDuration(
                                                                    lecture.lectureDuration * 60 * 1000,
                                                                    { units: ["h", "m"] }
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 py-3 mt-10">
                            <h1 className="text-xl font-bold">Rate this Course:</h1>
                            <Rating initialRating={initialRating} onRate={handleRate}/>
                        </div>
                    </div>

                    {/* right column */}
                    <div className="md:mt-10">
                        {playerData ? (
                                <div>
                                    <div className="w-full aspect-video bg-black">
                                        <YouTube
                                            videoId={extractVideoId(playerData.lectureUrl)}
                                            opts={opts}
                                            onReady={onPlayerReady}
                                            onError={onPlayerError}
                                            className="w-full h-full"
                                            iframeClassName="w-full h-full"
                                        />
                                    </div>

                                    <div className="flex justify-between items-center mt-2 p-2 bg-gray-50 rounded">
                                        <p className="font-medium">{playerData.chapter}.{playerData.lecture} {playerData.lectureTitle}</p>
                                        <button
                                            onClick={() => markLectureAsCompleted(playerData.lectureId)}
                                            className={`px-4 py-2 rounded ${
                                                progressData && progressData.lectureCompleted.includes(playerData.lectureId)
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                            }`}
                                        >
                                            {progressData && progressData.lectureCompleted.includes(playerData.lectureId) ? 'Completed ✓' : 'Mark As Complete'}
                                        </button>
                                    </div>
                                </div>
                            )
                            :
                            <div>
                                <img
                                    src={courseData ? courseData.courseThumbnail : ''}
                                    alt="courseThumbnail"
                                    className="w-full rounded"
                                />
                                <p className="text-center text-gray-500 mt-4">Click on a lecture to start watching</p>
                            </div>
                        }
                    </div>
                </div>
                <Footer/>
            </>
        )
        : <Loading/>;
};

export default Player;