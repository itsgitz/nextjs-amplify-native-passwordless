"use client";

import { useState, useEffect } from "react";
import { getCurrentUser, fetchUserAttributes, signOut } from "aws-amplify/auth";
import { useRouter } from "next/navigation";

export default function Home() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userAttributes, setUserAttributes] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const currentUser = await getCurrentUser();
                const attributes = await fetchUserAttributes();
                setUser(currentUser);
                setUserAttributes(attributes);
            } catch (error) {
                console.error("Error fetching user:", error);
                router.push("/signin");
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [router]);

    const handleSignOut = async () => {
        try {
            await signOut();
            router.push("/signin");
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
                <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
                    <div>Loading...</div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
            <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
                <div className="w-full max-w-md space-y-6">
                    <h1 className="text-3xl font-bold mb-4">
                        Welcome!
                    </h1>

                    <div className="bg-zinc-100 dark:bg-zinc-900 rounded-lg p-6 space-y-4">
                        <h2 className="text-xl font-semibold mb-4">
                            User Information
                        </h2>

                        <div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                Username
                            </p>
                            <p className="font-medium">
                                {user?.username || "N/A"}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                Email
                            </p>
                            <p className="font-medium">
                                {userAttributes?.email || "N/A"}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                Email Verified
                            </p>
                            <p className="font-medium">
                                {userAttributes?.email_verified ? "Yes" : "No"}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                User ID
                            </p>
                            <p className="font-medium text-xs break-all">
                                {user?.userId || "N/A"}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleSignOut}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                        Sign Out
                    </button>
                </div>
            </main>
        </div>
    );
}
