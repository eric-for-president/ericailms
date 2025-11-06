import React, { useContext, useEffect, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { AppContext } from "../../context/AppContext";
import Loading from "../../components/students/Loading";
import { assets } from "../../assets/assets";
import humanizeDuration from "humanize-duration";
import Footer from "../../components/students/Footer";
import YouTube from "react-youtube";
import { toast } from "react-toastify";
import axios from "axios";
import { useAuth } from '@clerk/clerk-react';

const CourseDetails = () => {
    const { id } = useParams();
    const { isSignedIn } = useAuth();

    const [courseData, setCourseData] = useState(null);
    const [openSections, setOpenSections] = useState({});
    const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false);
    const [playerData, setPlayerData] = useState(null);
    const [previewTimeLeft, setPreviewTimeLeft] = useState(60); // 3 minutes in seconds
    const playerRef = useRef(null);
    const timerRef = useRef(null);

    // Preview time limit in seconds (change this value as needed)
    const PREVIEW_TIME_LIMIT = 60; // 3 minutes

    const {
        allCourses,
        currency,
        calculateRating,
        calculateChapterTime,
        calculateCourseDuration,
        calculateNoOfLectures,
        backendUrl,
        userData,
        getToken,
    } = useContext(AppContext);

    // Helper function to extract YouTube video ID
    const extractVideoId = (url) => {
        if (!url) return null;

        if (url.length === 11 && !url.includes('/') && !url.includes('?')) {
            return url;
        }

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

        const parts = url.split('/');
        const lastPart = parts[parts.length - 1];
        const videoId = lastPart.split('?')[0];

        return videoId;
    };

    const fetcheCourseData = async () => {
        try {
            if (!backendUrl) {
                toast.error("Backend URL not configured");
                return;
            }

            const { data } = await axios.get(backendUrl + "/api/course/" + id);
            if (data.success) {
                setCourseData(data.courseData);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Error fetching course:", error);
            toast.error(error.response?.data?.message || error.message);
        }
    };

    const enrollCourse = async () => {
        try {
            if (!isSignedIn) {
                return toast.warn("Login to Enroll!");
            }

            if (isAlreadyEnrolled) {
                return toast.warn("Already Enrolled");
            }

            const token = await getToken();

            if (!token) {
                return toast.warn("Authentication required");
            }

            const { data } = await axios.post(
                backendUrl + "/api/user/purchase-course",
                { courseId: courseData._id },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (data.success) {
                toast.success(data.message || "Successfully enrolled!");
                setIsAlreadyEnrolled(true);

                setTimeout(() => {
                    window.location.href = `/player/${courseData._id}`;
                }, 1000);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Error enrolling:", error);
            toast.error(error.response?.data?.message || error.message);
        }
    };

    useEffect(() => {
        fetcheCourseData();
    }, [id]);

    useEffect(() => {
        if (userData && courseData && userData.enrolledCourses && Array.isArray(userData.enrolledCourses)) {
            setIsAlreadyEnrolled(userData.enrolledCourses.includes(courseData._id));
        }
    }, [userData, courseData]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    const toggleSection = (index) => {
        setOpenSections((prev) => ({ ...prev, [index]: !prev[index] }));
    };

    const startPreviewTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        setPreviewTimeLeft(PREVIEW_TIME_LIMIT);

        timerRef.current = setInterval(() => {
            setPreviewTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    if (playerRef.current) {
                        playerRef.current.pauseVideo();
                        toast.info("Preview time expired. Enroll to watch full course!");
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const stopPreviewTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        setPreviewTimeLeft(PREVIEW_TIME_LIMIT);
    };

    const handlePreviewClick = (lecture) => {
        const videoId = extractVideoId(lecture.lectureUrl);
        console.log('Playing video:', videoId, 'from URL:', lecture.lectureUrl);
        setPlayerData({ videoId, isPreview: true });
        startPreviewTimer();
    };

    const closePreview = () => {
        stopPreviewTimer();
        setPlayerData(null);
    };

    // YouTube player options
    const opts = {
        height: '100%',
        width: '100%',
        playerVars: {
            autoplay: 1,
            modestbranding: 1,
            rel: 0,
            start: 0,
            end: playerData?.isPreview && !isAlreadyEnrolled ? PREVIEW_TIME_LIMIT : undefined
        },
    };

    const onPlayerReady = (event) => {
        playerRef.current = event.target;
        console.log('YouTube Player is ready');
    };

    const onPlayerError = (event) => {
        console.error('YouTube Player Error:', event.data);
        toast.error('Error loading video. Please check the video URL.');
    };

    const onPlayerStateChange = (event) => {
        // If preview time is up and video is still playing, pause it
        if (playerData?.isPreview && !isAlreadyEnrolled && previewTimeLeft <= 0) {
            event.target.pauseVideo();
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!courseData || !currency || !backendUrl) {
        return <Loading />;
    }

    return (
        <>
            <div className="flex md:flex-row flex-col-reverse gap-10 relative items-start justify-between md:px-36 px-8 md:placeholder-teal-300 pt-20 text-left">
                <div className="absolute top-0 left-0 w-full h-section-height -z-1 bg-gradient-to-b from-cyan-100/70"></div>

                {/* left column */}
                <div className="max-w-xl z-10 text-gray-500">
                    <h1 className="md:text-course-details-heading-large text-course-details-heading-small font-semibold text-gray-800">
                        {courseData.courseTitle}
                    </h1>
                    <p
                        className="pt-4 md:text-base text-sm"
                        dangerouslySetInnerHTML={{
                            __html: courseData.courseDescription?.slice(0, 200) || '',
                        }}
                    ></p>

                    {/* review and rating  */}
                    <div className="flex items-center space-x-2 pt-3 pb-1 text-sm">
                        <p>{calculateRating(courseData)}</p>
                        <div className="flex">
                            {[...Array(5)].map((_, i) => (
                                <img
                                    className="w-3.5 h-3.5"
                                    key={i}
                                    src={
                                        i < Math.floor(calculateRating(courseData))
                                            ? assets.star
                                            : assets.star_blank
                                    }
                                    alt="star"
                                />
                            ))}
                        </div>
                        <p className="text-blue-600">
                            ({courseData.courseRatings?.length || 0}{" "}
                            {(courseData.courseRatings?.length || 0) !== 1 ? "ratings" : "rating"})
                        </p>

                        <p>
                            {courseData.enrolledStudents?.length || 0}{" "}
                            {(courseData.enrolledStudents?.length || 0) !== 1 ? "students" : "student"}
                        </p>
                    </div>
                    <p className="text-sm">
                        Course by{" "}
                        <span className="text-blue-600 underline">
                            {courseData.educator?.name || 'Unknown'}
                        </span>
                    </p>

                    <div className="pt-8 text-gray-800">
                        <h2 className="text-xl font-semibold">Course Structure</h2>
                        <div className="pt-5">
                            {courseData.courseContent?.map((chapter, index) => (
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
                                            {chapter.chapterContent?.length || 0} lectures -{" "}
                                            {calculateChapterTime(chapter)}{" "}
                                        </p>
                                    </div>

                                    <div
                                        className={`overflow-hidden transition-all duration-300 ${
                                            openSections[index] ? "max-h-96" : "max-h-0"
                                        }`}
                                    >
                                        <ul className="list-disc md:pl-10 pl-4 pr-4 py-2 text-gray-600 border-t border-gray-300">
                                            {chapter.chapterContent?.map((lecture, i) => (
                                                <li key={i} className="flex items-start gap-2 py-1">
                                                    {lecture.isPreviewFree ? (
                                                        <img
                                                            onClick={() => handlePreviewClick(lecture)}
                                                            className="w-4 h-4 mt-1 cursor-pointer hover:opacity-70"
                                                            src={assets.play_icon}
                                                            alt="play_icon"
                                                        />
                                                    ) : (
                                                        <img
                                                            className="w-4 h-4 mt-1 opacity-50"
                                                            src={assets.play_icon}
                                                            alt="play_icon"
                                                        />
                                                    )}

                                                    <div className="flex items-center justify-between w-full text-gray-800 text-xs md:text-default">
                                                        <p>{lecture.lectureTitle}</p>
                                                        <div className="flex gap-2">
                                                            {lecture.isPreviewFree && (
                                                                <p
                                                                    onClick={() => handlePreviewClick(lecture)}
                                                                    className="text-blue-500 cursor-pointer hover:text-blue-700 font-medium"
                                                                >
                                                                    Preview
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
                    </div>

                    <div className="py-20 text-sm md:text-default">
                        <h3 className="text-xl font-semibold text-gray-800 ">
                            Course Description
                        </h3>
                        <p
                            className="pt-3 rich-text"
                            dangerouslySetInnerHTML={{
                                __html: courseData.courseDescription || '',
                            }}
                        ></p>
                    </div>
                </div>

                {/* right column */}
                <div className="max-w-course-card z-10 shadow-custom-card rounded-t md:rounded-none overflow-hidden bg-white min-w-[300px] sm:min-w-[420px]">
                    {playerData ? (
                        <div className="relative">
                            <div className="w-full aspect-video bg-black">
                                <YouTube
                                    videoId={playerData.videoId}
                                    opts={opts}
                                    onReady={onPlayerReady}
                                    onError={onPlayerError}
                                    onStateChange={onPlayerStateChange}
                                    className="w-full h-full"
                                    iframeClassName="w-full h-full"
                                />
                            </div>
                            {playerData.isPreview && !isAlreadyEnrolled && (
                                <div className="absolute top-2 right-2 bg-black/80 text-white px-3 py-1 rounded text-sm font-medium">
                                    Preview: {formatTime(previewTimeLeft)}
                                </div>
                            )}
                        </div>
                    ) : (
                        <img src={courseData.courseThumbnail} alt="courseThumbnail" className="w-full" />
                    )}

                    <div className="p-5">
                        {playerData && (
                            <button
                                onClick={closePreview}
                                className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                                ← Back to course info
                            </button>
                        )}

                        {playerData?.isPreview && !isAlreadyEnrolled && previewTimeLeft <= 0 && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                                Preview ended. Enroll to watch the full course!
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <img
                                className="w-3.5"
                                src={assets.time_left_clock_icon}
                                alt="time_left_clock_icon"
                            />

                            <p className="text-red-500">
                                <span className="font-medium">5 days</span> left at this price!
                            </p>
                        </div>

                        <div className="flex gap-3 items-center pt-2">
                            <p className="text-gray-800 md:text-4xl text-2xl font-semibold">
                                {currency}{" "}
                                {(
                                    courseData.coursePrice -
                                    (courseData.discount * courseData.coursePrice) / 100
                                ).toFixed(2)}
                            </p>
                            <p className="md:text-lg text-gray-500 line-through">
                                {currency} {courseData.coursePrice}{" "}
                            </p>
                            <p className="md:text-lg text-gray-500">
                                {courseData.discount}% off{" "}
                            </p>
                        </div>

                        <div className="flex items-center text-sm md:text-default gap-4 pt-2 md:pt-4 text-gray-500">
                            <div className="flex items-center gap-1">
                                <img src={assets.star} alt="star icon" />
                                <p>{calculateRating(courseData)}</p>
                            </div>

                            <div className="h-4 w-px bg-gray-500/40"></div>

                            <div className="flex items-center gap-1">
                                <img src={assets.time_clock_icon} alt="time_clock_icon" />
                                <p>{calculateCourseDuration(courseData)}</p>
                            </div>

                            <div className="h-4 w-px bg-gray-500/40"></div>

                            <div className="flex items-center gap-1">
                                <img src={assets.lesson_icon} alt="lesson_icon" />
                                <p>{calculateNoOfLectures(courseData)} lessons</p>
                            </div>
                        </div>

                        <div>
                            {isAlreadyEnrolled ? (
                                <p className="md:mt-6 mt-4 w-full py-3 rounded text-center bg-blue-600 text-white font-medium">
                                    Already Enrolled
                                </p>
                            ) : courseData.coursePrice -
                            (courseData.discount * courseData.coursePrice) / 100 ===
                            0.0 ? (
                                <p className="md:mt-6 mt-4 w-full py-3 rounded text-center bg-blue-600 text-white font-medium">
                                    Free
                                </p>
                            ) : (
                                <button
                                    onClick={enrollCourse}
                                    className="md:mt-6 mt-4 w-full py-3 rounded text-center bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                                >
                                    Enroll Now
                                </button>
                            )}
                        </div>

                        <div>
                            {courseData.coursePrice -
                            (courseData.discount * courseData.coursePrice) / 100 ===
                            0.0 ? (
                                <p className="md:mt-6 mt-4 w-full text-center py-3 rounded bg-blue-600 text-white font-medium">
                                    Click on Course structure
                                </p>
                            ) : isAlreadyEnrolled ? (
                                <Link to={`/player/${courseData._id}`}>
                                    <p className="md:mt-6 mt-4 w-full text-center py-3 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors">
                                        Watch Course
                                    </p>
                                </Link>
                            ) : null}
                        </div>

                        <div className="pt-6">
                            <p className="md:text-xl text-lg font-medium text-gray-800">
                                What's in the course?{" "}
                            </p>
                            <ul className="ml-4 pt-2 text-sm md:text-default list-disc text-gray-500">
                                <li>Lifetime access with free updates.</li>
                                <li>Step-by-step, hands-on project guidance.</li>
                                <li>Downloadable resources and source code.</li>
                                <li>Quizzes to test your knowledge.</li>
                                <li>Certificate of completion.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </>
    );
};

export default CourseDetails;