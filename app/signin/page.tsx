"use client";

import { useState, FormEvent, useEffect } from "react";
import {
    signIn,
    confirmSignIn,
    signUp,
    confirmSignUp,
    autoSignIn,
    getCurrentUser,
} from "aws-amplify/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SignInStep = "ENTER_EMAIL" | "CONFIRM_OTP" | "DONE";
type AuthFlow = "SIGN_UP" | "SIGN_IN";

export default function SignIn() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState<SignInStep>("ENTER_EMAIL");
    const [authFlow, setAuthFlow] = useState<AuthFlow>("SIGN_UP");
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
            // Try to sign up first (this is the recommended approach for passwordless)
            console.log("Attempting to sign up user...");
            const { nextStep: signUpStep } = await signUp({
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

            console.log("Sign up next step:", signUpStep);

            // After sign-up, check the next step
            if (signUpStep.signUpStep === "CONFIRM_SIGN_UP") {
                // User needs to confirm email with OTP, move to OTP step
                setAuthFlow("SIGN_UP");
                setStep("CONFIRM_OTP");
            } else if (signUpStep.signUpStep === "DONE") {
                // Auto sign-in after sign-up
                const { nextStep } = await signIn({
                    username: email,
                    options: {
                        authFlowType: "USER_AUTH",
                        preferredChallenge: "EMAIL_OTP",
                    },
                });

                if (
                    nextStep.signInStep ===
                    "CONFIRM_SIGN_IN_WITH_EMAIL_CODE"
                ) {
                    setAuthFlow("SIGN_IN");
                    setStep("CONFIRM_OTP");
                } else if (
                    nextStep.signInStep ===
                    "CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION"
                ) {
                    // User has multiple auth methods, select EMAIL_OTP
                    const { nextStep: selectStep } = await confirmSignIn({
                        challengeResponse: "EMAIL_OTP",
                    });

                    if (
                        selectStep.signInStep === "CONFIRM_SIGN_IN_WITH_EMAIL_CODE"
                    ) {
                        setAuthFlow("SIGN_IN");
                        setStep("CONFIRM_OTP");
                    }
                }
            }
        } catch (err: any) {
            console.error("Error during sign up:", err);

            // If user already exists, try to sign in instead
            if (
                err.name === "UsernameExistsException" ||
                err.message?.includes("An account with the given email already exists")
            ) {
                try {
                    console.log("User already exists, signing in...");
                    const { nextStep } = await signIn({
                        username: email,
                        options: {
                            authFlowType: "USER_AUTH",
                            preferredChallenge: "EMAIL_OTP",
                        },
                    });

                    console.log("Sign in next step:", nextStep);

                    if (nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_EMAIL_CODE") {
                        setAuthFlow("SIGN_IN");
                        setStep("CONFIRM_OTP");
                    } else if (
                        nextStep.signInStep ===
                        "CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION"
                    ) {
                        // User has multiple auth methods, select EMAIL_OTP
                        const { nextStep: selectStep } = await confirmSignIn({
                            challengeResponse: "EMAIL_OTP",
                        });

                        if (
                            selectStep.signInStep === "CONFIRM_SIGN_IN_WITH_EMAIL_CODE"
                        ) {
                            setAuthFlow("SIGN_IN");
                            setStep("CONFIRM_OTP");
                        }
                    }
                } catch (signInErr: any) {
                    console.error("Error signing in:", signInErr);
                    setError(
                        signInErr.message ||
                            "Failed to send OTP. Please try again.",
                    );
                }
            } else {
                setError(
                    err.message || "Failed to send OTP. Please try again.",
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
            if (authFlow === "SIGN_UP") {
                // Confirm sign-up with OTP
                const { nextStep } = await confirmSignUp({
                    username: email,
                    confirmationCode: otp,
                });

                console.log("Confirm sign up next step:", nextStep);

                if (nextStep.signUpStep === "COMPLETE_AUTO_SIGN_IN") {
                    // Complete the auto sign-in process
                    console.log("Completing auto sign-in...");
                    const signInResult = await autoSignIn();
                    console.log("Auto sign-in result:", signInResult);

                    if (signInResult.isSignedIn) {
                        setStep("DONE");
                        router.push("/");
                    }
                } else if (nextStep.signUpStep === "DONE") {
                    // Sign up is complete, but need to sign in manually
                    // This shouldn't happen with autoSignIn enabled, but handle it
                    setStep("DONE");
                    router.push("/");
                }
            } else {
                // Confirm sign-in with OTP
                const { nextStep } = await confirmSignIn({
                    challengeResponse: otp,
                });

                console.log("Confirm sign in next step:", nextStep);

                if (nextStep.signInStep === "DONE") {
                    setStep("DONE");
                    router.push("/");
                }
            }
        } catch (err: any) {
            console.error("Error confirming OTP:", err);
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
                        Sign In
                    </h1>

                    {step === "ENTER_EMAIL" && (
                        <>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center mb-8">
                                Enter your email to receive a one-time password.
                                If you don't have an account, we'll create one
                                for you.
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
                                    {loading ? "Sending..." : "Send Code"}
                                </button>
                                <div className="text-center">
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                        Don't have an account?{" "}
                                        <Link
                                            href="/signup"
                                            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                        >
                                            Sign Up
                                        </Link>
                                    </p>
                                </div>
                            </form>
                        </>
                    )}

                    {step === "CONFIRM_OTP" && (
                        <>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center mb-2">
                                We sent a code to <strong>{email}</strong>
                            </p>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center mb-8">
                                Enter the code to sign in
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
                                        One-Time Password
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
                                        maxLength={8}
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
                                        setAuthFlow("SIGN_UP");
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
