import React from "react";
import { useNavigate } from "react-router-dom";

const ProfileHeader = ({
    employee,
    profileImage,
    handleImageUpload,
    userRole,
    effectiveId,
    currentUser,
    handleEditClick,
    API_ORIGIN
}) => {
    const navigate = useNavigate();

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-5 sm:p-7 text-white shadow-xl">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-10 w-56 h-56 bg-purple-300/20 rounded-full blur-3xl" />

            <button
                onClick={() => navigate(-1)}
                className="relative mb-4 inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-all hover:gap-2"
            >
                <span>←</span> Back
            </button>

            <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="relative group flex-shrink-0 mx-auto sm:mx-0">
                    {profileImage ? (
                        <img
                            src={
                                profileImage.startsWith("http")
                                    ? profileImage
                                    : `${API_ORIGIN}${profileImage}`
                            }
                            alt={employee.name}
                            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-white/30 shadow-2xl"
                        />
                    ) : (
                        <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-4xl font-bold ring-4 ring-white/30 shadow-2xl">
                            {employee.name?.charAt(0)?.toUpperCase()}
                        </div>
                    )}
                    <button
                        onClick={() => document.getElementById("profileImageInput").click()}
                        className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-600 shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                        title="Change photo"
                    >
                        📷
                    </button>
                    <input
                        id="profileImageInput"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                    />
                </div>

                <div className="flex-1 min-w-0 text-center sm:text-left">
                    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                        <h1 className="text-2xl sm:text-3xl font-bold truncate">
                            {employee.name}
                        </h1>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm capitalize">
                            {employee.role}
                        </span>
                    </div>
                    <p className="opacity-90 text-sm mt-1 truncate">
                        {employee.email}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs opacity-80 justify-center sm:justify-start">
                        <span className="inline-flex items-center gap-1">
                            🏢 {employee.department}
                        </span>
                        <span className="inline-flex items-center gap-1">
                            📍 {employee.branch}
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono">
                            ID: {employee.employeeId || employee._id?.slice(-6)}
                        </span>
                    </div>
                </div>

                {(userRole === "admin" || effectiveId === (currentUser?._id || currentUser?.id)) && (
                    <div className="flex sm:flex-col gap-2 flex-shrink-0 justify-center">
                        {userRole === "admin" && effectiveId !== (currentUser?._id || currentUser?.id) && (
                            <span className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-center">
                                👑 Admin View
                            </span>
                        )}
                        <button
                            onClick={handleEditClick}
                            className="bg-white text-blue-700 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-50 transition shadow-md hover:shadow-lg"
                        >
                            ✏️ Edit
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileHeader;
