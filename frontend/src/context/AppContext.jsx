import { createContext, useEffect, useState } from "react";
import { dummyCourses } from "../assets/assets";
import { useNavigate } from "react-router-dom";
import humanizeDuration from "humanize-duration"
import { useAuth, useUser } from '@clerk/clerk-react'
import axios from 'axios'
import { toast } from 'react-toastify';

export const AppContext = createContext()

export const AppContextProvider = (props) => {

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const currency = import.meta.env.VITE_CURRENCY;
    const navigate = useNavigate();

    const { getToken, isSignedIn } = useAuth();
    const { user, isLoaded } = useUser()

    const [allCourses, setAllCourses] = useState([])
    const [isEducator, setIsEducator] = useState(false)
    const [enrolledCourses, setEnrolledCourses] = useState([])
    const [userData, setUserData] = useState(null)

    // fetch all courses (public - no auth needed)
    const fetchAllCourses = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/course/all');
            if (data.success) {
                setAllCourses(data.courses)
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
            toast.error(error.message)
        }
    }

    // fetch user data (requires auth)
    const fetchUserData = async () => {
        try {
            // Check if user is loaded and signed in
            if (!isLoaded || !isSignedIn || !user) {
                console.log("User not ready yet");
                return;
            }

            if (user.publicMetadata.role === 'educator') {
                setIsEducator(true);
            }

            const token = await getToken();

            if (!token) {
                console.error("No token available");
                return;
            }

            const { data } = await axios.get(backendUrl + '/api/user/data', {
                headers: { Authorization: `Bearer ${token}` }
            })

            if (data.success) {
                setUserData(data.user)
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            console.error("Error fetching user data:", error);
            toast.error(error.response?.data?.message || error.message)
        }
    }

    // Fetch user enrolled courses (requires auth)
    const fetchUserEnrolledCourses = async () => {
        try {
            // Check if user is loaded and signed in
            if (!isLoaded || !isSignedIn || !user) {
                console.log("User not ready for enrolled courses");
                return;
            }

            const token = await getToken();

            if (!token) {
                console.error("No token available");
                return;
            }

            const response = await axios.get(backendUrl + "/api/user/enrolled-courses", {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data && response.data.success) {
                setEnrolledCourses(response.data.enrolledCourses?.reverse() || []);
            } else {
                toast.error(response.data?.message || "No enrolled courses found.");
            }
        } catch (error) {
            console.error("Error fetching enrolled courses:", error);
            // Don't show error toast if user just doesn't have courses yet
            if (error.response?.status !== 404) {
                toast.error(error.response?.data?.message || error.message);
            } else {
                setEnrolledCourses([]);
            }
        }
    };

    // Function to calculate average rating of course
    const calculateRating = (course) => {
        if (course.courseRatings.length === 0) {
            return 0;
        }
        let totalRating = 0;
        course.courseRatings.forEach(rating => {
            totalRating += rating.rating;
        })
        return Math.floor(totalRating / course.courseRatings.length)
    }

    // function to calculate course chapter time
    const calculateChapterTime = (chapter) => {
        let time = 0;
        chapter.chapterContent.map((lecture) => time += lecture.lectureDuration)
        return humanizeDuration(time * 60 * 1000, { units: ["h", "m"] })
    }

    // Function to calculate course Duration
    const calculateCourseDuration = (course) => {
        let time = 0;
        course.courseContent.map((chapter) => chapter.chapterContent.map(
            (lecture) => time += lecture.lectureDuration
        ))

        return humanizeDuration(time * 60 * 1000, { units: ["h", "m"] })
    }

    // Function to calculate no. of lectures in the course
    const calculateNoOfLectures = (course) => {
        let totalLectures = 0;
        course.courseContent.forEach(chapter => {
            if (Array.isArray(chapter.chapterContent)) {
                totalLectures += chapter.chapterContent.length;
            }
        });
        return totalLectures;
    }

    // Fetch all courses on mount (no auth needed)
    useEffect(() => {
        fetchAllCourses()
    }, [])

    // Fetch user-specific data only when user is fully loaded and signed in
    useEffect(() => {
        if (isLoaded && isSignedIn && user) {
            console.log("User is ready, fetching user data");
            fetchUserData()
            fetchUserEnrolledCourses()
        }
    }, [isLoaded, isSignedIn, user])

    const value = {
        currency,
        allCourses,
        navigate,
        isEducator,
        setIsEducator,
        calculateRating,
        calculateChapterTime,
        calculateCourseDuration,
        calculateNoOfLectures,
        fetchUserEnrolledCourses,
        setEnrolledCourses,
        enrolledCourses,
        backendUrl,
        userData,
        setUserData,
        getToken,
        fetchAllCourses
    }

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    )
}