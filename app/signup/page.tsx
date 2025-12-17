"use client";

import { useState, FormEvent, useEffect } from "react";
import { signUp, confirmSignUp, autoSignIn, getCurrentUser } from "aws-amplify/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SignUpStep = "ENTER_EMAIL" | "CONFIRM_OTP" | "DONE";

export default function SignUp() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState<SignUpStep>("ENTER_EMAIL");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Check if user is already signed in
    useEffect(() => {
        const checkAuth = async () => {
            try {
                await getCurrentUser();
                // User is signed in, redirect to home
                router.push("/");
            } catch {
                // User is not signed in, stay on this page
            }
        };
        checkAuth();
    }, [router]);

    const handleEmailSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const { nextStep } = await signUp({
                username: email,
                options: {
                    userAttributes: {
                        email: email,
                    },
                    autoSignIn: {
                        authFlowType: "USER_AUTH",
                    },
                },
            });

            console.log("Sign up next step:", nextStep);

            if (nextStep.signUpStep === "CONFIRM_SIGN_UP") {
                setStep("CONFIRM_OTP");
            } else if (nextStep.signUpStep === "DONE") {
                setStep("DONE");
                router.push("/");
            }
        } catch (err: any) {
            console.error("Error signing up:", err);

            if (err.name === "UsernameExistsException") {
                setError(
                    "An account with this email already exists. Please sign in instead.",
                );
            } else {
                setError(
                    err.message ||
                        "Failed to create account. Please try again.",
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // Confirm the sign-up with OTP
            const { nextStep } = await confirmSignUp({
                username: email,
                confirmationCode: otp,
            });

            console.log("Confirm sign up next step:", nextStep);

            if (nextStep.signUpStep === "COMPLETE_AUTO_SIGN_IN") {
                // Complete the auto sign-in process
                const signInResult = await autoSignIn();
                console.log("Auto sign-in result:", signInResult);

                setStep("DONE");
                router.push("/");
            } else if (nextStep.signUpStep === "DONE") {
                setStep("DONE");
                router.push("/");
            }
        } catch (err: any) {
            console.error("Error confirming sign up:", err);
            setError(err.message || "Invalid OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
            <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
                <div className="w-full max-w-md">
                    <h1 className="text-3xl font-bold mb-4 text-center">
                        Create Account
                    </h1>

                    {step === "ENTER_EMAIL" && (
                        <>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center mb-8">
                                Enter your email to create a new account. We'll
                                send you a one-time password to verify your
                                email.
                            </p>
                            <form
                                className="space-y-6"
                                onSubmit={handleEmailSubmit}
                            >
                                <div>
                                    <label
                                        htmlFor="email"
                                        className="block text-sm font-medium mb-2"
                                    >
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={email}
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
                                        className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900"
                                        placeholder="Enter your email"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                {error && (
                                    <div className="text-sm text-red-600 dark:text-red-400">
                                        {error}
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading
                                        ? "Creating Account..."
                                        : "Create Account"}
                                </button>
                                <div className="text-center">
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                        Already have an account?{" "}
                                        <Link
                                            href="/signin"
                                            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                        >
                                            Sign In
                                        </Link>
                                    </p>
                                </div>
                            </form>
                        </>
                    )}

                    {step === "CONFIRM_OTP" && (
                        <>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center mb-2">
                                We sent a verification code to{" "}
                                <strong>{email}</strong>
                            </p>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center mb-8">
                                Enter the code to complete your sign-up
                            </p>
                            <form
                                className="space-y-6"
                                onSubmit={handleOtpSubmit}
                            >
                                <div>
                                    <label
                                        htmlFor="otp"
                                        className="block text-sm font-medium mb-2"
                                    >
                                        Verification Code
                                    </label>
                                    <input
                                        type="text"
                                        id="otp"
                                        name="otp"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-center text-2xl tracking-widest"
                                        placeholder="000000"
                                        required
                                        disabled={loading}
                                        maxLength={6}
                                        autoComplete="one-time-code"
                                    />
                                </div>
                                {error && (
                                    <div className="text-sm text-red-600 dark:text-red-400">
                                        {error}
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? "Verifying..." : "Verify Code"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep("ENTER_EMAIL");
                                        setOtp("");
                                        setError("");
                                    }}
                                    className="w-full px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors text-sm"
                                >
                                    Use a different email
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
