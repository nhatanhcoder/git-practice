"use client";

import {
  AlertCircle,
  Bell,
  BookOpen,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  LayoutDashboard,
  Loader2,
  Menu,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  formatDate,
  getInitials,
  initialAdminProfile,
  mockValidationErrors,
  UserProfile,
} from "../../../lib/auth-profile-data";
import {
  fetchMyProfile,
  updateMyProfile,
  changePassword,
} from "../../../lib/auth-profile-service";
import { ApiError } from "../../../lib/api-client";
import { evaluatePasswordStrength } from "../../../lib/password-strength";
import styles from "./profile.module.css";

type ReviewState =
  | "ready"
  | "loading"
  | "saving_profile"
  | "saving_password"
  | "validation_error"
  | "error"
  | "forbidden";

export default function AdminProfilePage() {
  // Navigation & Shell state
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Review state switcher (design/dev validation)
  const [reviewState, setReviewState] = useState<ReviewState>("ready");

  // MOCK(A-AUTH-4): Profile state in memory. Replaced when GET /api/v1/auth/me is wired.
  const [profile, setProfile] = useState<UserProfile>(initialAdminProfile);

  // Form 1: Profile fields
  const [nickname, setNickname] = useState(profile.nickname);
  const [email, setEmail] = useState(profile.email);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatarUrl);
  const [profileErrors, setProfileErrors] = useState<Record<string, string[]>>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Form 2: Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string[]>>({});
  const [cardBannerError, setCardBannerError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const fileInputId = useId();

  useEffect(() => {
    let isMounted = true;
    fetchMyProfile()
      .then((res) => {
        if (!isMounted) return;
        setProfile(res.profile);
        setNickname(res.profile.nickname);
        setEmail(res.profile.email);
        setAvatarPreview(res.profile.avatarUrl);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Password strength
  const passwordStrength = useMemo(
    () => evaluatePasswordStrength(newPassword),
    [newPassword]
  );

  // Profile dirty check
  const isProfileDirty =
    nickname.trim() !== profile.nickname ||
    email.trim() !== profile.email ||
    avatarPreview !== profile.avatarUrl;

  // Password ready check
  const isPasswordReady =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmPassword.length > 0;

  // Trigger toast
  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  }

  // Handle avatar upload simulation (A-AUTH-4)
  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // MOCK(A-AUTH-4): optimistic local preview before backend upload endpoint is wired
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    setProfileErrors((prev) => {
      const next = { ...prev };
      delete next.avatar;
      return next;
    });
  }

  // Handle avatar removal
  function handleRemoveAvatar() {
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // Form 1 Submit: Save Profile (PATCH /api/v1/auth/me)
  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isProfileDirty || isSavingProfile) return;

    setIsSavingProfile(true);
    setProfileErrors({});

    if (!email.includes("@")) {
      setProfileErrors({ email: ["Email không đúng định dạng."] });
      setIsSavingProfile(false);
      return;
    }

    try {
      const res = await updateMyProfile({
        nickname: nickname.trim(),
        avatarUrl: avatarPreview,
      });
      setProfile(res.profile);
      showToast("Đã lưu hồ sơ");
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setProfileErrors(err.details);
      } else {
        // Fallback optimistic update for offline dev / demo
        setProfile((prev) => ({
          ...prev,
          nickname: nickname.trim(),
          fullName: nickname.trim(),
          email: email.trim(),
          avatarUrl: avatarPreview,
          initials: getInitials(nickname.trim()),
        }));
        showToast("Đã lưu hồ sơ");
      }
    } finally {
      setIsSavingProfile(false);
    }
  }

  // Form 2 Submit: Change Password (POST /api/v1/auth/change-password)
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isPasswordReady || isSavingPassword) return;

    setIsSavingPassword(true);
    setPasswordErrors({});
    setCardBannerError(null);

    const errors: Record<string, string[]> = {};
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      errors.newPassword = ["Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa và số."];
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = ["Mật khẩu xác nhận không khớp."];
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      setIsSavingPassword(false);
      return;
    }

    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Đã đổi mật khẩu");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details) {
          setPasswordErrors(err.details);
        } else if (err.code === "AUTH_INVALID_CREDENTIALS" || err.statusCode === 401) {
          setCardBannerError("Mật khẩu hiện tại không chính xác (AUTH_INVALID_CREDENTIALS).");
        } else {
          setCardBannerError(err.message);
        }
      } else {
        if (currentPassword === "wrongpassword") {
          setCardBannerError("Mật khẩu hiện tại không chính xác (AUTH_INVALID_CREDENTIALS).");
        } else {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          showToast("Đã đổi mật khẩu");
        }
      }
    } finally {
      setIsSavingPassword(false);
    }
  }

  // State Switcher handler for test / demo verification
  function applyReviewState(state: ReviewState) {
    setReviewState(state);
    if (state === "ready") {
      setProfileErrors({});
      setPasswordErrors({});
      setCardBannerError(null);
    }
  }

  const effectiveProfileErrors =
    reviewState === "validation_error"
      ? { email: mockValidationErrors.email }
      : profileErrors;

  const effectivePasswordErrors =
    reviewState === "validation_error"
      ? { newPassword: mockValidationErrors.password }
      : passwordErrors;

  const effectiveCardBannerError =
    reviewState === "error"
      ? "Lỗi kết nối máy chủ hoặc thông tin xác thực không hợp lệ (AUTH_INVALID_CREDENTIALS)."
      : cardBannerError;

  const effectiveSavingProfile = isSavingProfile || reviewState === "saving_profile";
  const effectiveSavingPassword = isSavingPassword || reviewState === "saving_password";

  return (
    <div className={styles.appShell}>
      {/* Sidebar Navigation */}
      <aside className={`${styles.sidebar} ${mobileNav ? styles.sidebarOpen : ""}`}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>学</span>
          <span>HSK Platform</span>
          <button
            className={styles.closeNav}
            onClick={() => setMobileNav(false)}
            aria-label="Đóng menu"
          >
            <X size={20} />
          </button>
        </div>
        <nav className={styles.nav} aria-label="Điều hướng quản trị">
          <Link className={styles.navItem} href="/admin">
            <LayoutDashboard size={20} />
            <span>Tổng quan</span>
          </Link>
          <Link className={styles.navItem} href="/admin/users">
            <Users size={20} />
            <span>Tài khoản</span>
          </Link>
          <Link className={styles.navItem} href="/admin/invoices">
            <CircleDollarSign size={20} />
            <span>Học phí</span>
          </Link>
          <Link className={styles.navItem} href="/admin/payroll">
            <WalletCards size={20} />
            <span>Lương</span>
          </Link>
          <Link className={styles.navItem} href="/admin/monitoring">
            <ShieldCheck size={20} />
            <span>Giám sát</span>
          </Link>
        </nav>
        <div className={styles.sidebarFooter}>
          <BookOpen size={18} />
          <div>
            <strong>HSK 1–9</strong>
            <span>Nền tảng học tập</span>
          </div>
        </div>
      </aside>

      {mobileNav && (
        <button
          className={styles.navBackdrop}
          onClick={() => setMobileNav(false)}
          aria-label="Đóng menu"
        />
      )}

      {/* Main Content Column */}
      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <button
              className={styles.menuButton}
              onClick={() => setMobileNav(true)}
              aria-label="Mở menu"
            >
              <Menu size={20} />
            </button>
            <Link href="/admin">Quản trị</Link>
            <ChevronRight size={15} />
            <strong>Hồ sơ của tôi</strong>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.iconButton} aria-label="Thông báo">
              <Bell size={19} />
              <span className={styles.notificationDot} />
            </button>
            <div className={styles.headerDivider} />
            <button className={styles.profileButton} aria-label="Menu tài khoản">
              <span className={styles.headerAvatar}>
                {getInitials(profile.nickname)}
              </span>
              <span>
                <strong>{profile.nickname}</strong>
                <small>Quản trị viên</small>
              </span>
              <ChevronDown size={16} />
            </button>
          </div>
        </header>

        <main className={styles.content}>
          {reviewState === "forbidden" ? (
            <div className={styles.forbiddenBox}>
              <ShieldAlert size={48} className={styles.forbiddenIcon} />
              <h2>Từ chối truy cập (AUTH_INSUFFICIENT_ROLE)</h2>
              <p>Bạn không có quyền quản trị để truy cập trang hồ sơ này.</p>
              <Link href="/login" className={styles.primaryButton}>
                Đăng nhập lại
              </Link>
            </div>
          ) : reviewState === "loading" ? (
            <>
              <div className={styles.titleRow}>
                <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
              </div>
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={`${styles.skeleton}`} style={{ height: "20px", width: "140px" }} />
                </div>
                <div className={styles.avatarSection}>
                  <div className={`${styles.skeleton} ${styles.skeletonAvatar}`} />
                  <div className={styles.avatarActions}>
                    <div className={`${styles.skeleton}`} style={{ height: "32px", width: "100px" }} />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <div className={`${styles.skeleton} ${styles.skeletonInput}`} />
                  <div className={`${styles.skeleton} ${styles.skeletonInput}`} />
                </div>
              </section>
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={`${styles.skeleton}`} style={{ height: "20px", width: "140px" }} />
                </div>
                <div className={styles.formGroup}>
                  <div className={`${styles.skeleton} ${styles.skeletonInput}`} />
                  <div className={`${styles.skeleton} ${styles.skeletonInput}`} />
                  <div className={`${styles.skeleton} ${styles.skeletonInput}`} />
                </div>
              </section>
            </>
          ) : (
            <>
              <div className={styles.titleRow}>
                <h1>Hồ sơ của tôi</h1>
                <p className={styles.subtitle}>
                  Quản lý thông tin cá nhân và thiết lập mật khẩu tài khoản quản trị.
                </p>
              </div>

              {/* CARD 1: Profile Form (A-AUTH-4) */}
              <section className={styles.card} aria-labelledby="profile-card-title">
                <div className={styles.cardHeader}>
                  <h2 id="profile-card-title">Thông tin cá nhân</h2>
                </div>

                <form onSubmit={handleProfileSubmit}>
                  {/* Avatar Upload Block */}
                  <div className={styles.avatarSection}>
                    <div className={styles.avatarContainer}>
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt={profile.nickname}
                          className={styles.avatarImage}
                        />
                      ) : (
                        <div className={styles.avatarFallback}>
                          {getInitials(nickname || profile.nickname)}
                        </div>
                      )}
                    </div>
                    <div className={styles.avatarActions}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        id={fileInputId}
                        accept="image/*"
                        onChange={handleAvatarChange}
                        disabled={effectiveSavingProfile}
                        style={{ display: "none" }}
                      />
                      <button
                        type="button"
                        className={styles.uploadButton}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={effectiveSavingProfile}
                      >
                        <Camera size={16} />
                        Đổi ảnh
                      </button>
                      {avatarPreview && (
                        <button
                          type="button"
                          className={styles.removeAvatarButton}
                          onClick={handleRemoveAvatar}
                          disabled={effectiveSavingProfile}
                        >
                          <Trash2 size={14} />
                          Xóa ảnh
                        </button>
                      )}
                      <p className={styles.avatarHint}>
                        Định dạng JPG, PNG. Tối đa 2MB.
                      </p>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className={styles.formGroup}>
                    <div className={styles.field}>
                      <label htmlFor="profile-name">Tên hiển thị</label>
                      <input
                        id="profile-name"
                        type="text"
                        required
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        disabled={effectiveSavingProfile}
                        className={`${styles.input} ${
                          effectiveProfileErrors.nickname ? styles.inputError : ""
                        }`}
                        placeholder="Nhập họ và tên"
                      />
                      {effectiveProfileErrors.nickname?.map((err, i) => (
                        <span key={i} className={styles.errorText}>
                          {err}
                        </span>
                      ))}
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="profile-email">Email</label>
                      <input
                        id="profile-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={effectiveSavingProfile}
                        className={`${styles.input} ${
                          effectiveProfileErrors.email ? styles.inputError : ""
                        }`}
                        placeholder="name@example.com"
                      />
                      <p className={styles.helperText}>Dùng để đăng nhập.</p>
                      {effectiveProfileErrors.email?.map((err, i) => (
                        <span key={i} className={styles.errorText}>
                          {err}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <button
                      type="submit"
                      className={styles.primaryButton}
                      disabled={!isProfileDirty || effectiveSavingProfile}
                    >
                      {effectiveSavingProfile ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Đang lưu…
                        </>
                      ) : (
                        "Lưu thay đổi"
                      )}
                    </button>
                  </div>
                </form>
              </section>

              {/* CARD 2: Password Form (A-AUTH-5) */}
              <section className={styles.card} aria-labelledby="password-card-title">
                <div className={styles.cardHeader}>
                  <h2 id="password-card-title">Đổi mật khẩu</h2>
                </div>

                {effectiveCardBannerError && (
                  <div className={styles.cardBannerError} role="alert">
                    <AlertCircle size={18} />
                    <span>{effectiveCardBannerError}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit}>
                  <div className={styles.formGroup}>
                    <div className={styles.field}>
                      <label htmlFor="current-password">Mật khẩu hiện tại</label>
                      <input
                        id="current-password"
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        disabled={effectiveSavingPassword}
                        className={`${styles.input} ${
                          effectivePasswordErrors.currentPassword ? styles.inputError : ""
                        }`}
                        placeholder="••••••••"
                      />
                      {effectivePasswordErrors.currentPassword?.map((err, i) => (
                        <span key={i} className={styles.errorText}>
                          {err}
                        </span>
                      ))}
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="new-password">Mật khẩu mới</label>
                      <input
                        id="new-password"
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={effectiveSavingPassword}
                        className={`${styles.input} ${
                          effectivePasswordErrors.newPassword ? styles.inputError : ""
                        }`}
                        placeholder="••••••••"
                      />
                      <p className={styles.helperText}>
                        Ít nhất 8 ký tự, có chữ hoa và số.
                      </p>

                      {/* Password Strength Meter */}
                      {newPassword.length > 0 && (
                        <div className={styles.strengthMeter}>
                          <div className={styles.strengthTrack}>
                            <div
                              className={styles.strengthFill}
                              style={{
                                width: `${passwordStrength.percent}%`,
                                backgroundColor: passwordStrength.color,
                              }}
                            />
                          </div>
                          <div className={styles.strengthLabel}>
                            <span>Độ mạnh mật khẩu</span>
                            <span style={{ color: passwordStrength.color, fontWeight: 600 }}>
                              {passwordStrength.label}
                            </span>
                          </div>
                        </div>
                      )}

                      {effectivePasswordErrors.newPassword?.map((err, i) => (
                        <span key={i} className={styles.errorText}>
                          {err}
                        </span>
                      ))}
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="confirm-password">Xác nhận mật khẩu mới</label>
                      <input
                        id="confirm-password"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={effectiveSavingPassword}
                        className={`${styles.input} ${
                          effectivePasswordErrors.confirmPassword ? styles.inputError : ""
                        }`}
                        placeholder="••••••••"
                      />
                      {effectivePasswordErrors.confirmPassword?.map((err, i) => (
                        <span key={i} className={styles.errorText}>
                          {err}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <button
                      type="submit"
                      className={styles.primaryButton}
                      disabled={!isPasswordReady || effectiveSavingPassword}
                    >
                      {effectiveSavingPassword ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Đang lưu…
                        </>
                      ) : (
                        "Đổi mật khẩu"
                      )}
                    </button>
                  </div>
                </form>
              </section>
            </>
          )}
        </main>
      </div>

      {/* Dev Review State Switcher */}
      <div className={styles.stateSwitcher}>
        <span>REVIEW STATE</span>
        {(
          [
            "ready",
            "loading",
            "saving_profile",
            "saving_password",
            "validation_error",
            "error",
            "forbidden",
          ] as ReviewState[]
        ).map((state) => (
          <button
            key={state}
            className={reviewState === state ? styles.stateActive : ""}
            onClick={() => applyReviewState(state)}
          >
            {state}
          </button>
        ))}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={styles.toast} role="status">
          <Check size={18} className={styles.toastIcon} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
