import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";
import loginBg from "../assets/loginphoto.jpg";
import registerBg from "../assets/loginphoto.jpg";
import { useIsMobile } from "../hooks/use-mobile";
import { useToast } from "../hooks/use-toast";

type StoredUser = {
  fullName?: string;
  email: string;
  password: string;
  role: "owner" | "tenant";
};

const Auth = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [isLogin, setIsLogin] = useState(true);

  // common UI state
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  // login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginRole, setLoginRole] = useState<"owner" | "tenant">("owner");
  const [loginLoading, setLoginLoading] = useState(false);

  // register state
  const [fullName, setFullName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerRole, setRegisterRole] = useState<"owner" | "tenant">("owner");
  const [registerLoading, setRegisterLoading] = useState(false);

  // show/hide password toggles
  const [loginShowPassword, setLoginShowPassword] = useState(false);
  const [registerShowPassword, setRegisterShowPassword] = useState(false);
  const [confirmShowPassword, setConfirmShowPassword] = useState(false);

  useEffect(() => {
    // auto-redirect if already logged in
    try {
      const raw = localStorage.getItem("currentUser");
      if (raw) {
        const cu = JSON.parse(raw);
        if (cu && cu.loggedIn) {
          navigate("/interface");
        }
      }
    } catch {
      /* ignore */
    }

    // load remembered email (if any)
    const remembered = localStorage.getItem("rememberedEmail");
    if (remembered) {
      setLoginEmail(remembered);
      setRememberMe(true);
    }
  }, [navigate]);

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // add helpers to read/write the "users" profile store
  type ProfileUser = {
    name?: string;
    email: string;
    role?: "owner" | "tenant";
    avatar?: string;
  };

  function readUsersStore(): ProfileUser[] {
    try {
      const raw = localStorage.getItem("users");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  function writeUsersStore(users: ProfileUser[]) {
    try {
      localStorage.setItem("users", JSON.stringify(users));
    } catch {}
  }
  function upsertProfile(user: ProfileUser) {
    if (!user?.email) return;
    const list = readUsersStore();
    const idx = list.findIndex((u) => u.email.toLowerCase() === user.email.toLowerCase());
    if (idx === -1) list.push(user);
    else list[idx] = { ...list[idx], ...user };
    writeUsersStore(list);
  }

  const handleLoginSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (loginLoading) return;

    if (!loginEmail || !loginPassword) {
      toast({ title: "Login failed", description: "Please fill in all fields." });
      return;
    }

    if (!validateEmail(loginEmail)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address." });
      return;
    }

    setLoginLoading(true);

    // simulate server delay
    setTimeout(() => {
      const users = (JSON.parse(localStorage.getItem("registeredUsers") || "[]") as StoredUser[]) || [];
      const matched = users.find((u) => u.email.toLowerCase() === loginEmail.trim().toLowerCase());

      if (!matched) {
        setLoginLoading(false);
        toast({ title: "Login failed", description: "Account not found. Please register first." });
        return;
      }

      // check role
      if (matched.role !== loginRole) {
        setLoginLoading(false);
        toast({ title: "Wrong account type", description: "Wrong account type." });
        return;
      }

      // check password
      if (matched.password !== loginPassword) {
        setLoginLoading(false);
        toast({ title: "Login failed", description: "Email or password is incorrect." });
        return;
      }

      // remember email if requested
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", loginEmail.trim());
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      // read profile from "users" store (if present)
      const profileList = readUsersStore();
      const profile = profileList.find((p) => p.email.toLowerCase() === matched.email.toLowerCase());

      const currentUser = {
        name: profile?.name ?? matched.fullName ?? matched.email,
        email: matched.email,
        role: matched.role,
        avatar: profile?.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile?.name ?? matched.fullName ?? matched.email)}`,
        loggedIn: true,
      };

      // persist currentUser session
      localStorage.setItem("currentUser", JSON.stringify(currentUser));

      // ensure profile store has the up-to-date entry (so AccountSettings can update it later)
      upsertProfile({ name: currentUser.name, email: currentUser.email, role: matched.role, avatar: currentUser.avatar });

      setLoginLoading(false);
      toast({
        title: `Welcome back, ${currentUser.name}!`,
        description: `You are logged in as ${currentUser.role}.`,
      });

      // redirect to interface
      setTimeout(() => navigate("/interface"), 600);
    }, 700);
  };

  const handleRegisterSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (registerLoading) return;

    if (!fullName || !registerEmail || !registerPassword || !confirmPassword) {
      toast({ title: "Registration failed", description: "Please fill in all fields." });
      return;
    }

    if (!validateEmail(registerEmail)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address." });
      return;
    }

    if (registerPassword.length < 6) {
      toast({ title: "Weak password", description: "Password must be at least 6 characters long." });
      return;
    }

    if (registerPassword !== confirmPassword) {
      toast({ title: "Password mismatch", description: "Passwords do not match." });
      return;
    }

    setRegisterLoading(true);

    setTimeout(() => {
      const users = (JSON.parse(localStorage.getItem("registeredUsers") || "[]") as StoredUser[]) || [];

      if (users.some((u) => u.email.toLowerCase() === registerEmail.trim().toLowerCase())) {
        setRegisterLoading(false);
        toast({ title: "Account already registered.", description: "Use another email or login." });
        return;
      }

      const newUser: StoredUser = {
        fullName: fullName.trim(),
        email: registerEmail.trim().toLowerCase(),
        password: registerPassword,
        role: registerRole,
      };

      users.push(newUser);
      localStorage.setItem("registeredUsers", JSON.stringify(users));

      // create profile entry in "users" store so AccountSettings can persist changes later
      upsertProfile({ name: newUser.fullName, email: newUser.email, role: newUser.role, avatar: undefined });

      setRegisterLoading(false);
      toast({ title: "Registration successful", description: "You can now log in with your credentials." });

      // switch to login and pre-fill
      setIsLogin(true);
      setLoginEmail(newUser.email);
      setLoginPassword("");
      setConfirmPassword("");
      setRegisterPassword("");
    }, 700);
  };

  const handleForgotPassword = (e: FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast({ title: "Validation", description: "Please enter your email address." });
      return;
    }
    if (!validateEmail(forgotEmail)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address." });
      return;
    }

    // simulate send
    toast({ title: "Reset link sent", description: `Password reset link has been sent to ${forgotEmail}` });
    setShowForgotPassword(false);
    setForgotEmail("");
  };

  const toggleForm = () => setIsLogin((s) => !s);

  return (
    <div className={`auth-container ${isLogin ? "no-scroll-form" : ""}`}>
      {/* Navigation arrows (visible on forms) - clicking redirects to index.html
          Show only LEFT arrow on the Login form and only RIGHT arrow on Register */}
      {isLogin ? (
        <button
          className="nav-arrow arrow-left"
          type="button"
          onClick={() => navigate("/")}
          aria-label="Go to home"
        >
          {/* white chevron-left icon */}
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      ) : (
        <button
          className="nav-arrow arrow-right"
          type="button"
          onClick={() => navigate("/")}
          aria-label="Go to home"
        >
          {/* white chevron-right icon */}
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
      <div
        className={`auth-background ${isLogin ? "login-bg" : "register-bg"}`}
        style={{ backgroundImage: `url(${isLogin ? loginBg : registerBg})` }}
      />

      <div className={`auth-overlay ${isLogin ? "left-to-right" : "right-to-left"}`} />

      <div className={`auth-content ${isLogin ? "form-left" : "form-right"} ${isMobile ? "mobile" : ""}`}>
        {/* Logo */}
        <div className={`auth-logo ${isLogin ? "logo-left" : "logo-right"}`}>
          <div className="logo-icon">
            <img className="img-logo" src="/HomebaseFinderOfficialLogo.png" alt="Homebase Finder Logo" />
          </div>
          <div className="logo-text">
            <div className="logo-title">HOMEBASE</div>
            <div className="logo-subtitle">FINDER</div>
          </div>
        </div>

        {/* Forms */}
        <div className="forms-wrapper">
          {/* Login */}
          <div className={`auth-form ${isLogin ? "form-active" : "form-hidden"}`}>
            <h1 className="form-title">Welcome Back!</h1>
            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <input
                  id="loginEmail"
                  type="email"
                  className="form-input"
                  placeholder=" "
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
                <label htmlFor="loginEmail" className="floating">Email Address</label>
              </div>

              <div className="form-group">
                <div className="password-wrapper">
                  <input
                    id="loginPassword"
                    type={loginShowPassword ? "text" : "password"}
                    className="form-input has-toggle"
                    placeholder=" "
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                  <label htmlFor="loginPassword" className="floating">Password</label>
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setLoginShowPassword((s) => !s)}
                    aria-label={loginShowPassword ? "Hide password" : "Show password"}
                  >
                    {loginShowPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <select
                  className="form-select"
                  value={loginRole}
                  onChange={(e) => setLoginRole(e.target.value as "owner" | "tenant")}
                >
                  <option value="owner">Owner</option>
                  <option value="tenant">Tenant</option>
                </select>
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                  <span>Remember me</span>
                </label>

                <button type="button" className="forgot-password" onClick={() => setShowForgotPassword(true)}>
                  Forgot Password?
                </button>
              </div>

              <button type="submit" className="form-button" disabled={loginLoading}>
                {loginLoading ? "Logging in..." : "LOGIN"}
              </button>

              <div className="form-switch-text">
                <button type="button" className="form-switch-link" onClick={toggleForm}>
                  Register Instead
                </button>
              </div>
            </form>
          </div>

          {/* Register */}
          <div className={`auth-form ${!isLogin ? "form-active" : "form-hidden"}`}>
            <h1 className="form-title">Create an Account</h1>
            <form onSubmit={handleRegisterSubmit}>
              <div className="form-group">
                <input
                  id="fullName"
                  type="text"
                  className="form-input"
                  placeholder=" "
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <label htmlFor="fullName" className="floating">Full Name</label>
              </div>

              <div className="form-group">
                <input
                  id="registerEmail"
                  type="email"
                  className="form-input"
                  placeholder=" "
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                />
                <label htmlFor="registerEmail" className="floating">Email Address</label>
              </div>

              <div className="form-group">
                <div className="password-wrapper">
                  <input
                    id="registerPassword"
                    type={registerShowPassword ? "text" : "password"}
                    className="form-input has-toggle"
                    placeholder=" "
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                  />
                  <label htmlFor="registerPassword" className="floating">Password</label>
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setRegisterShowPassword((s) => !s)}
                    aria-label={registerShowPassword ? "Hide password" : "Show password"}
                  >
                    {registerShowPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <div className="password-wrapper">
                  <input
                    id="confirmPassword"
                    type={confirmShowPassword ? "text" : "password"}
                    className="form-input has-toggle"
                    placeholder=" "
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <label htmlFor="confirmPassword" className="floating">Confirm Password</label>
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setConfirmShowPassword((s) => !s)}
                    aria-label={confirmShowPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {confirmShowPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <select
                  className="form-select"
                  value={registerRole}
                  onChange={(e) => setRegisterRole(e.target.value as "owner" | "tenant")}
                >
                  <option value="owner">Owner</option>
                  <option value="tenant">Tenant</option>
                </select>
              </div>

              <button type="submit" className="form-button" disabled={registerLoading}>
                {registerLoading ? "Creating..." : "Register"}
              </button>

              <div className="form-switch-text">
                Already have an Account?
                <button type="button" className="form-switch-link" onClick={toggleForm}>
                  Login here
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="modal-overlay" onClick={() => setShowForgotPassword(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowForgotPassword(false)}>×</button>
            <h2 className="modal-title">Reset Password</h2>
            <p className="modal-text">Enter your email address and we'll send you a link to reset your password.</p>
            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <input
                  id="forgotEmail"
                  type="email"
                  className="form-input"
                  placeholder=" "
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
                <label htmlFor="forgotEmail" className="floating">Email Address</label>
              </div>
              <button type="submit" className="form-button">Send Reset Link</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;
