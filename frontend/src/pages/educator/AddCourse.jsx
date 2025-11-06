import React, { useContext, useEffect, useRef, useState } from 'react'
import uniqid from 'uniqid'
import Quill from 'quill'
import { assets } from '../../assets/assets'
import { toast } from 'react-toastify'
import axios from 'axios'
import { AppContext } from '../../context/AppContext'
import Logger from '../../components/Logger'

const AddCourse = () => {
    const { backendUrl, getToken } = useContext(AppContext)

    const quillRef = useRef(null)
    const editorRef = useRef(null)

    const [courseTitle, setCourseTitle] = useState('')
    const [coursePrice, setCoursePrice] = useState(0)
    const [discount, setDiscount] = useState(0)
    const [image, setImage] = useState(null)
    const [chapters, setChapters] = useState([])
    const [showPopup, setShowPopup] = useState(false)
    const [currentChapterId, setCurrentChapterId] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false) // ✅ Add loading state

    const [lectureDetails, setLectureDetails] = useState({
        lectureTitle: '',
        lectureDuration: '',
        lectureUrl: '',
        isPreviewFree: false,
    })

    const handleChapter = (action, chapterId) => {
        if (action === 'add') {
            const title = prompt('Enter Chapter Name:');
            if (title) {
                const newChapter = {
                    chapterId: uniqid(),
                    chapterTitle: title,
                    chapterContent: [],
                    collapsed: false,
                    chapterOrder: chapters.length > 0 ? chapters.slice(-1)[0].chapterOrder + 1 : 1,
                };
                setChapters([...chapters, newChapter]);
            }
        } else if (action === 'remove') {
            setChapters(chapters.filter((chapter) => chapter.chapterId !== chapterId));
        } else if (action === 'toggle') {
            setChapters(
                chapters.map((chapter) =>
                    chapter.chapterId === chapterId ? { ...chapter, collapsed: !chapter.collapsed } : chapter
                )
            );
        }
    };

    const handleLecture = (action, chapterId, lectureIndex) => {
        if (action === 'add') {
            setCurrentChapterId(chapterId);
            setShowPopup(true);
        } else if (action === 'remove') {
            setChapters(
                chapters.map((chapter) => {
                    if (chapter.chapterId === chapterId) {
                        chapter.chapterContent.splice(lectureIndex, 1);
                    }
                    return chapter;
                })
            );
        }
    };

    const addLecture = () => {
        // ✅ Validate lecture details
        if (!lectureDetails.lectureTitle.trim()) {
            toast.error("Lecture title is required");
            return;
        }
        if (!lectureDetails.lectureDuration || lectureDetails.lectureDuration <= 0) {
            toast.error("Valid lecture duration is required");
            return;
        }
        if (!lectureDetails.lectureUrl.trim()) {
            toast.error("Lecture URL is required");
            return;
        }

        setChapters(
            chapters.map((chapter) => {
                if (chapter.chapterId === currentChapterId) {
                    const newLecture = {
                        ...lectureDetails,
                        lectureDuration: Number(lectureDetails.lectureDuration), // ✅ Convert to number
                        lectureOrder: chapter.chapterContent.length > 0
                            ? chapter.chapterContent.slice(-1)[0].lectureOrder + 1
                            : 1,
                        lectureId: uniqid()
                    };
                    console.log("Lecture", newLecture);
                    chapter.chapterContent.push(newLecture);
                }
                return chapter;
            })
        );

        setShowPopup(false);
        setLectureDetails({
            lectureTitle: '',
            lectureDuration: '',
            lectureUrl: '',
            isPreviewFree: false,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // ✅ Prevent multiple submissions
        if (isSubmitting) {
            return;
        }

        try {
            setIsSubmitting(true);

            // ✅ Validation
            if (!courseTitle.trim()) {
                toast.error("Course title is required");
                return;
            }

            if (!image) {
                toast.error("Thumbnail not selected");
                return;
            }

            if (!quillRef.current || !quillRef.current.root.innerHTML.trim()) {
                toast.error("Course description is required");
                return;
            }

            if (chapters.length === 0) {
                toast.error("At least one chapter is required");
                return;
            }

            // ✅ Check if chapters have lectures
            const hasLectures = chapters.some(ch => ch.chapterContent.length > 0);
            if (!hasLectures) {
                toast.error("Add at least one lecture to your chapters");
                return;
            }

            const courseData = {
                courseTitle,
                courseDescription: quillRef.current.root.innerHTML,
                coursePrice: Number(coursePrice),
                discount: Number(discount),
                courseContent: chapters,
            };

            const formData = new FormData();
            formData.append("courseData", JSON.stringify(courseData));
            formData.append("image", image);

            const token = await getToken();

            if (!token) {
                toast.error("Authentication required. Please login again.");
                return;
            }

            const { data } = await axios.post(
                backendUrl + "/api/educator/add-course",
                formData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log("Response data", data);

            if (data.success) {
                toast.success(data.message || "Course added successfully!");

                // ✅ Reset form
                setCourseTitle("");
                setCoursePrice(0);
                setDiscount(0);
                setImage(null);
                setChapters([]);
                if (quillRef.current) {
                    quillRef.current.root.innerHTML = "";
                }
            } else {
                toast.error(data.message || "Failed to add course");
            }
        } catch (error) {
            console.error("Error adding course:", error);
            toast.error(error.response?.data?.message || error.message || "Failed to add course");
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        // Initiate Quill only once
        if (!quillRef.current && editorRef.current) {
            quillRef.current = new Quill(editorRef.current, {
                theme: 'snow',
            })
        }
    }, [])

    return (
        <div className='h-screen overflow-scroll flex flex-col items-start justify-between md:p-8 md:pb-0 p-4 pt-8 pb-0'>
            <form onSubmit={handleSubmit} className='flex flex-col gap-4 max-w-md w-full text-gray-500'>
                <div className="block sm:hidden ">
                    <Logger />
                </div>

                <div className='flex flex-col gap-1'>
                    <p>Course Title: </p>
                    <input
                        onChange={e => setCourseTitle(e.target.value)}
                        value={courseTitle}
                        type="text"
                        placeholder='Type here'
                        className='outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500'
                        required
                        disabled={isSubmitting}
                    />
                </div>

                <div className='flex flex-col gap-1'>
                    <p>Course Description:</p>
                    <div ref={editorRef}></div>
                </div>

                <div className='flex items-center justify-between flex-wrap'>
                    <div className='flex flex-col gap-1'>
                        <p>Course Price</p>
                        <input
                            onChange={e => setCoursePrice(e.target.value)}
                            value={coursePrice}
                            type="number"
                            placeholder='0'
                            min="0"
                            className='outline-none md:py-2.5 w-28 py-2 px-3 rounded border border-gray-500'
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className='flex md:flex-row flex-col items-center gap-3 mt-5'>
                        <p>Course Thumbnail</p>
                        <label htmlFor="thumbnailImage" className='flex items-center gap-3'>
                            <img
                                src={assets.file_upload_icon}
                                alt="file_upload_icon"
                                className='p-3 bg-blue-500 rounded cursor-pointer'
                            />
                            <input
                                type="file"
                                id='thumbnailImage'
                                onChange={e => setImage(e.target.files[0])}
                                accept="image/*"
                                hidden
                                disabled={isSubmitting}
                            />
                            {image && (
                                <img
                                    className='max-h-10 rounded border'
                                    src={URL.createObjectURL(image)}
                                    alt="Thumbnail preview"
                                />
                            )}
                        </label>
                    </div>
                </div>

                <div className='flex flex-col gap-1'>
                    <p>Discount %</p>
                    <input
                        onChange={e => setDiscount(e.target.value)}
                        value={discount}
                        type="number"
                        placeholder='0'
                        min={0}
                        max={100}
                        className='outline-none md:py-2.5 py-2 px-3 w-28 rounded border border-gray-500'
                        required
                        disabled={isSubmitting}
                    />
                </div>

                {/* Adding chapters & lectures  */}
                <div>
                    {chapters.map((chapter, chapterIndex) => (
                        <div key={chapterIndex} className='bg-white border rounded-lg mb-4'>
                            <div className='flex justify-between items-center p-4 border-b'>
                                <div className='flex items-center'>
                                    <img
                                        onClick={() => handleChapter('toggle', chapter.chapterId)}
                                        width={14}
                                        className={`mr-2 cursor-pointer transition-all ${chapter.collapsed && "-rotate-90"}`}
                                        src={assets.dropdown_icon}
                                        alt="dropdown"
                                    />
                                    <span className='font-semibold'>
                                        {chapterIndex + 1}. {chapter.chapterTitle}
                                    </span>
                                </div>
                                <span className='text-gray-500'>
                                    {chapter.chapterContent.length} Lecture{chapter.chapterContent.length !== 1 ? 's' : ''}
                                </span>
                                <img
                                    onClick={() => handleChapter('remove', chapter.chapterId)}
                                    className='cursor-pointer'
                                    src={assets.cross_icon}
                                    alt="remove"
                                />
                            </div>

                            {!chapter.collapsed && (
                                <div className='p-4'>
                                    {chapter.chapterContent.map((lecture, lectureIndex) => (
                                        <div key={lectureIndex} className='flex justify-between items-center mb-2 text-sm'>
                                            <span>
                                                {lectureIndex + 1}. {lecture.lectureTitle} - {lecture.lectureDuration} mins -
                                                <a href={lecture.lectureUrl} target='_blank' rel="noopener noreferrer" className='text-blue-500 ml-1'>
                                                    Link
                                                </a> -
                                                <span className={lecture.isPreviewFree ? 'text-green-600 ml-1' : 'text-gray-600 ml-1'}>
                                                    {lecture.isPreviewFree ? 'Free Preview' : 'Paid'}
                                                </span>
                                            </span>
                                            <img
                                                onClick={() => handleLecture('remove', chapter.chapterId, lectureIndex)}
                                                src={assets.cross_icon}
                                                alt="remove lecture"
                                                className='cursor-pointer'
                                            />
                                        </div>
                                    ))}
                                    <div
                                        onClick={() => handleLecture('add', chapter.chapterId)}
                                        className='inline-flex bg-gray-100 p-2 rounded cursor-pointer mt-2 hover:bg-gray-200 transition-colors'
                                    >
                                        + Add Lecture
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    <div
                        className='flex justify-center items-center bg-blue-100 p-2 rounded-lg cursor-pointer hover:bg-blue-200 transition-colors'
                        onClick={() => handleChapter('add')}
                    >
                        + Add Chapter
                    </div>

                    {showPopup && (
                        <div className='fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50'>
                            <div className='bg-white text-gray-700 p-6 rounded relative w-full max-w-md'>
                                <h2 className='text-lg font-semibold mb-4'>Add Lecture</h2>

                                <div className='mb-3'>
                                    <p className='mb-1 font-medium'>Lecture Title <span className='text-red-500'>*</span></p>
                                    <input
                                        type="text"
                                        className='mt-1 block w-full border rounded py-2 px-3 outline-none focus:border-blue-500'
                                        value={lectureDetails.lectureTitle}
                                        onChange={(e) => setLectureDetails({ ...lectureDetails, lectureTitle: e.target.value })}
                                        placeholder="Enter lecture title"
                                    />
                                </div>

                                <div className='mb-3'>
                                    <p className='mb-1 font-medium'>Duration (minutes) <span className='text-red-500'>*</span></p>
                                    <input
                                        type="number"
                                        min="1"
                                        className='mt-1 block w-full border rounded py-2 px-3 outline-none focus:border-blue-500'
                                        value={lectureDetails.lectureDuration}
                                        onChange={(e) => setLectureDetails({ ...lectureDetails, lectureDuration: e.target.value })}
                                        placeholder="Enter duration in minutes"
                                    />
                                </div>

                                <div className='mb-3'>
                                    <p className='mb-1 font-medium'>Lecture URL <span className='text-red-500'>*</span></p>
                                    <input
                                        type="text"
                                        className='mt-1 block w-full border rounded py-2 px-3 outline-none focus:border-blue-500'
                                        value={lectureDetails.lectureUrl}
                                        onChange={(e) => setLectureDetails({ ...lectureDetails, lectureUrl: e.target.value })}
                                        placeholder="Enter YouTube/video URL"
                                    />
                                </div>

                                <div className='mb-4 flex items-center gap-2'>
                                    <input
                                        type="checkbox"
                                        id="previewFree"
                                        className='w-4 h-4 cursor-pointer'
                                        checked={lectureDetails.isPreviewFree}
                                        onChange={(e) => setLectureDetails({ ...lectureDetails, isPreviewFree: e.target.checked })}
                                    />
                                    <label htmlFor="previewFree" className='cursor-pointer'>
                                        Is Preview Free?
                                    </label>
                                </div>

                                <button
                                    className='w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors'
                                    onClick={addLecture}
                                    type='button'
                                >
                                    Add Lecture
                                </button>

                                <img
                                    onClick={() => setShowPopup(false)}
                                    className='absolute top-4 right-4 w-4 cursor-pointer hover:opacity-70'
                                    src={assets.cross_icon}
                                    alt="close"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <button
                    type='submit'
                    disabled={isSubmitting}
                    className={`font-semibold text-white w-max pt-2.5 px-8 py-2 rounded my-4 transition-colors ${
                        isSubmitting
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-black hover:bg-gray-800'
                    }`}
                >
                    {isSubmitting ? 'ADDING...' : 'ADD'}
                </button>
            </form>
        </div>
    )
}

export default AddCourse