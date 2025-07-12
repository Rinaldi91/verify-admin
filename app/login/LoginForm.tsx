"use client";

import { useState, useEffect, JSX } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Image from "next/image"; // Import Image from next/image
import { Eye, EyeOff, LogIn, Mail, Lock } from "lucide-react"; // Remove Building2
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

interface LoginResponse {
  token: string;
  data: {
    role: {
      slug: string;
      permissions: Array<{ slug: string }>;
    };
  };
}

export default function LoginForm(): JSX.Element {
  const router = useRouter();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [remember, setRemember] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Ambil email & password dari cookie jika remember me aktif
  useEffect(() => {
    const savedEmail = Cookies.get("remember_email");
    const savedPassword = Cookies.get("remember_password");
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRemember(true);
    }
  }, []);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    setIsLoading(true);
    setError("");

    try {
      const res = await axios.post<LoginResponse>(
        "http://verify-api.test/api/login",
        { email, password }
      );

      const { token, data } = res.data;
      const cookieOptions = remember ? { expires: 7 } : { expires: 1 };

      // Simpan cookie login
      Cookies.set("token", token, cookieOptions);
      Cookies.set("role", data.role.slug, cookieOptions);
      Cookies.set("user", JSON.stringify(data), cookieOptions);

      const permissionSlugs = data.role.permissions.map(
        (p: { slug: string }) => p.slug
      );
      Cookies.set(
        "permissions",
        JSON.stringify(permissionSlugs),
        cookieOptions
      );

      // Simpan email/password kalau Remember me aktif
      if (remember) {
        Cookies.set("remember_email", email, { expires: 7 });
        Cookies.set("remember_password", password, { expires: 7 });
      } else {
        Cookies.remove("remember_email");
        Cookies.remove("remember_password");
      }

      // ✅ Notifikasi sukses
      await MySwal.fire({
        icon: "success",
        title: "Login Successful!",
        text: "Redirecting to dashboard...",
        timer: 1500,
        showConfirmButton: false,
        background: "#111827",
        color: "#F9FAFB",
        customClass: {
          popup: "rounded-xl",
        },
      });

      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      setError("Login gagal. Periksa email dan password.");

      // ❌ Notifikasi gagal
      await MySwal.fire({
        icon: "error",
        title: "Login Failed",
        text: "Invalid email or password",
        timer: 1500,
        showConfirmButton: false,
        background: "#111827",
        color: "#F9FAFB",
        customClass: {
          popup: "rounded-xl",
        },
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      // Form akan otomatis submit karena button type="submit"
      // Tidak perlu manual submit di sini
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-900 flex items-center justify-center p-4 w-full">
      <div className="bg-blue-200 rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full flex min-h-[600px]">
        {/* Left Card - Logo & Company Info */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-blue-300 p-12 flex flex-col justify-center items-center w-1/2 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-32 h-32 bg-blue-400 rounded-full"></div>
            <div className="absolute bottom-10 right-10 w-20 h-20 bg-blue-400 rounded-full"></div>
            <div className="absolute top-1/2 right-20 w-16 h-16 bg-blue-400 rounded-full"></div>
            <div className="absolute top-20 right-32 w-12 h-12 bg-blue-400 rounded-full"></div>
            <div className="absolute bottom-32 left-20 w-8 h-8 bg-blue-400 rounded-full"></div>
          </div>

          {/* Logo Section */}
          <div className="text-center z-10 relative">
            <div className="flex items-center justify-center mx-auto mb-3">
              <Image
                src="/images/logo_smart_connection.png"
                alt="Logo PT. Anugerah Rezeki Bersama Indonesia"
                width={500} // Anda bisa sesuaikan ukurannya
                height={500} // Anda bisa sesuaikan ukurannya
              />
            </div>
          </div>
        </div>

        {/* Right Card - Login Form */}
        <div className="w-1/2 p-12 flex flex-col justify-center bg-gray-50">
          <div className="max-w-sm mx-auto w-full">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Welcome Back
              </h2>
              <p className="text-gray-600">Please sign in to your account</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <p className="text-blue-700 text-sm font-medium">{error}</p>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    placeholder="name@company.com"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEmail(e.target.value)
                    }
                    suppressHydrationWarning={true}
                    onKeyPress={handleKeyPress}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-500 bg-white"
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    placeholder="••••••••••"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPassword(e.target.value)
                    }
                    onKeyPress={handleKeyPress}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-500 bg-white"
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                    suppressHydrationWarning={true}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-gray-100 rounded-r-lg transition-colors duration-200"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={remember}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setRemember(e.target.checked)
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors duration-200"
                    disabled={isLoading}
                    suppressHydrationWarning={true}
                  />
                  <label
                    htmlFor="remember"
                    className="ml-2 text-sm text-gray-700 font-medium"
                  >
                    Remember me
                  </label>
                </div>
                <div>
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors duration-200 font-medium hover:underline"
                    disabled={isLoading}
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className={`w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-white font-semibold transition-all duration-200 cursor-pointer ${
                  isLoading || !email || !password
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Login
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Don’t have an account?{" "}
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200 hover:underline"
                  disabled={isLoading}
                >
                  Contact Administrator
                </button>
              </p>
            </div>

            {/* Version Info */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-400">
                v1.0.0 | © 2025 PT. Anugerah Rezeki Bersama Indonesia
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
