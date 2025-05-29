import { Authenticated, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function Profile() {
    const loggedInUser = useQuery(api.auth.loggedInUser);

    if (loggedInUser === undefined) {
        return (
            <div className="flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <Authenticated>
            <div className="max-w-2xl mx-auto pt-8">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>
                    {/* {JSON.stringify(loggedInUser)} */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>
                            <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
                                {loggedInUser?.email ?? "No email provided"}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                User ID
                            </label>
                            <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 font-mono text-sm">
                                {loggedInUser?._id ?? "Not available"}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Account Created
                            </label>
                            <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
                                {loggedInUser?._creationTime
                                    ? new Date(loggedInUser._creationTime).toLocaleDateString()
                                    : "Not available"
                                }
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Actions</h2>
                        <div className="space-y-3">
                            <button className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                                Update Profile
                            </button>
                            <button className="w-full sm:w-auto px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors ml-0 sm:ml-3">
                                Change Password
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Authenticated>
    );
} 