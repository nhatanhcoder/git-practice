"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, register, type MarketingSignupBlock } from "@/lib/api-client";
import { AuthShell } from "@/components/auth/auth-shell";
import "@/styles/hanlu/tokens.css";
import "@/styles/hanlu/auth.css";

/** Codes from docs/api/API_ERROR_CODES.md — mapped by code, never by HTTP status. */
const MESSAGE_FOR_CODE: Record<string, string> = {
  AUTH_EMAIL_EXISTS: "Email này đã có tài khoản. Bạn muốn đăng nhập thay vì đăng ký?",
  VALIDATION_ERROR: "Dữ liệu chưa hợp lệ. Kiểm tra lại các ô được đánh dấu.",
  TOO_MANY_REQUESTS: "Bạn đã thử quá nhiều lần. Vui lòng đợi ít phút rồi thử lại.",
};

const GENDERS = [
  ["female", "Nữ"],
  ["male", "Nam"],
  ["other", "Khác"],
  ["prefer_not_to_say", "Không muốn nói"],
] as const;

const OCCUPATIONS = [
  ["student", "Học sinh / sinh viên"],
  ["office_worker", "Đi làm văn phòng"],
  ["teacher", "Giáo viên"],
  ["freelancer", "Tự do"],
  ["other", "Khác"],
] as const;

const GOALS = [
  ["study_abroad", "Du học Trung Quốc"],
  ["work", "Phục vụ công việc"],
  ["certificate", "Thi lấy chứng chỉ HSK"],
  ["hobby", "Sở thích cá nhân"],
  ["other", "Lý do khác"],
] as const;

const SOURCES = ["Facebook", "TikTok", "Google", "Bạn bè giới thiệu", "Trung tâm / trường", "Khác"];

const CHANNELS = [
  ["email", "Email"],
  ["sms", "SMS"],
  ["zalo", "Zalo"],
] as const;

const CURRENT_YEAR = new Date().getUTCFullYear();

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — the account itself.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [consent, setConsent] = useState(false);
  const [channels, setChannels] = useState<string[]>(["email"]);

  // Step 2 — everything here is optional and skippable.
  const [birthYear, setBirthYear] = useState("");
  const [gender, setGender] = useState("");
  const [province, setProvince] = useState("");
  const [phone, setPhone] = useState("");
  const [occupation, setOccupation] = useState("");
  const [learningGoal, setLearningGoal] = useState("");
  const [currentLevel, setCurrentLevel] = useState("");
  const [referralSource, setReferralSource] = useState("");

  // Campaign attribution, read from the URL the person arrived on. Captured
  // silently because asking someone which ad they clicked gets a worse answer
  // than the link already carries — referralSource above is the asked version,
  // and the two disagreeing is itself useful.
  const [utm, setUtm] = useState<Pick<MarketingSignupBlock, "utmSource" | "utmMedium" | "utmCampaign">>(
    {},
  );

  useEffect(() => {
    setUtm({
      utmSource: searchParams.get("utm_source") ?? undefined,
      utmMedium: searchParams.get("utm_medium") ?? undefined,
      utmCampaign: searchParams.get("utm_campaign") ?? undefined,
    });
  }, [searchParams]);

  const step1Valid = email.trim().length > 3 && password.length >= 8 && fullName.trim().length > 0;

  function buildMarketing(includeStep2: boolean): MarketingSignupBlock | undefined {
    const block: MarketingSignupBlock = {
      marketingConsent: consent,
      // Only meaningful alongside consent; the server clears them on a refusal anyway.
      ...(consent && channels.length ? { consentChannels: channels } : {}),
      ...utm,
    };

    if (includeStep2) {
      if (birthYear) block.birthYear = Number(birthYear);
      if (gender) block.gender = gender;
      if (province.trim()) block.province = province.trim();
      if (phone.trim()) block.phone = phone.trim();
      if (occupation) block.occupation = occupation;
      if (learningGoal) block.learningGoal = learningGoal;
      if (currentLevel !== "") block.currentLevel = Number(currentLevel);
      if (referralSource) block.referralSource = referralSource;
    }

    // Nothing to say at all — send no block rather than an empty object.
    const meaningful =
      consent || Object.values(block).some((v) => v !== undefined && v !== false && v !== "");
    return meaningful ? block : undefined;
  }

  async function submit(includeStep2: boolean) {
    setError(null);
    setSubmitting(true);
    try {
      await register({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        role,
        marketing: buildMarketing(includeStep2),
      });
      // No session is created — the account is `pending`. Say so on /login rather
      // than dropping the person on a screen that will reject them.
      router.replace("/login?registered=1");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(MESSAGE_FOR_CODE[err.code] ?? err.message);
        // An email collision belongs to step 1; sending them back is the only way
        // they can act on it.
        if (err.code === "AUTH_EMAIL_EXISTS" || err.code === "VALIDATION_ERROR") setStep(1);
      } else {
        setError("Không kết nối được máy chủ. Kiểm tra API có đang chạy không.");
      }
      setSubmitting(false);
    }
  }

  function toggleChannel(value: string) {
    setChannels((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value],
    );
  }

  return (
    <AuthShell
      title="Bắt đầu con đường HSK của bạn."
      lead="Tạo tài khoản để lưu tiến độ, ôn tập theo lịch lặp lại ngắt quãng và vào lớp của giáo viên."
    >
      <div className="auth-steps" aria-hidden="true">
        <span className={`auth-step ${step >= 1 ? "auth-step--current" : ""}`}>
          <span className="auth-step__fill" />
        </span>
        <span className={`auth-step ${step >= 2 ? "auth-step--current" : ""}`}>
          <span className="auth-step__fill" />
        </span>
        <span className="auth-stepLabel">Bước {step}/2</span>
      </div>

      <h1 className="auth-title">{step === 1 ? "Đăng ký" : "Hoàn thiện hồ sơ"}</h1>
      <p className="auth-sub">
        {step === 1
          ? "Tài khoản mới cần quản trị viên duyệt trước khi đăng nhập được."
          : "Không bắt buộc — giúp chúng tôi gợi ý lộ trình hợp với bạn. Có thể bỏ qua."}
      </p>

      {error && (
        <div className="auth-banner auth-banner--error" role="alert">
          {error}
        </div>
      )}

      {step === 1 ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step1Valid) setStep(2);
          }}
          noValidate
        >
          <div className="auth-field" style={{ "--i": 0 } as React.CSSProperties}>
            <label className="auth-label" htmlFor="fullName">
              Họ và tên
            </label>
            <input
              id="fullName"
              className="auth-input"
              autoComplete="name"
              placeholder="Nguyễn Văn A"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="auth-field" style={{ "--i": 1 } as React.CSSProperties}>
            <label className="auth-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="auth-input"
              type="email"
              autoComplete="email"
              placeholder="ban@vidu.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="auth-field" style={{ "--i": 2 } as React.CSSProperties}>
            <label className="auth-label" htmlFor="password">
              Mật khẩu
            </label>
            <input
              id="password"
              className="auth-input"
              type="password"
              autoComplete="new-password"
              placeholder="Ít nhất 8 ký tự"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby="pw-hint"
            />
            <p className="auth-hint" id="pw-hint">
              Tối thiểu 8 ký tự.
            </p>
          </div>

          <div className="auth-field" style={{ "--i": 3 } as React.CSSProperties}>
            <span className="auth-label">Bạn là</span>
            <div className="auth-choices">
              <label className="auth-choice">
                <input
                  type="radio"
                  name="role"
                  value="student"
                  checked={role === "student"}
                  onChange={() => setRole("student")}
                />
                <strong>Học viên</strong>
                <span>Học và luyện thi HSK</span>
              </label>
              <label className="auth-choice">
                <input
                  type="radio"
                  name="role"
                  value="teacher"
                  checked={role === "teacher"}
                  onChange={() => setRole("teacher")}
                />
                <strong>Giáo viên</strong>
                <span>Dạy và quản lý lớp</span>
              </label>
            </div>
          </div>

          {/* Separate from the fields above, unticked by default, and worded so it is
              clear what is being agreed to. Bundling this into account creation is
              what makes a consent unusable for the purpose it was collected for. */}
          <div className="auth-consent">
            <input
              id="consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <label className="auth-consent__text" htmlFor="consent">
              Tôi đồng ý nhận thông tin về khoá học, ưu đãi và nội dung học tập từ Hán Lộ. Không bắt
              buộc để tạo tài khoản, và có thể rút lại bất cứ lúc nào trong phần hồ sơ.
              {consent && (
                <span className="auth-channels">
                  {CHANNELS.map(([value, label]) => (
                    <label className="auth-channel" key={value}>
                      <input
                        type="checkbox"
                        checked={channels.includes(value)}
                        onChange={() => toggleChannel(value)}
                      />
                      {label}
                    </label>
                  ))}
                </span>
              )}
            </label>
          </div>

          <button className="auth-submit" type="submit" disabled={!step1Valid}>
            Tiếp tục
          </button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit(true);
          }}
          noValidate
        >
          <div className="auth-grid2">
            <div className="auth-field" style={{ "--i": 0 } as React.CSSProperties}>
              <label className="auth-label" htmlFor="birthYear">
                Năm sinh
              </label>
              <input
                id="birthYear"
                className="auth-input"
                type="number"
                inputMode="numeric"
                min={1900}
                max={CURRENT_YEAR}
                placeholder="1998"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
              />
            </div>

            <div className="auth-field" style={{ "--i": 1 } as React.CSSProperties}>
              <label className="auth-label" htmlFor="gender">
                Giới tính
              </label>
              <select
                id="gender"
                className="auth-select"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">— Chọn —</option>
                {GENDERS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="auth-grid2">
            <div className="auth-field" style={{ "--i": 2 } as React.CSSProperties}>
              <label className="auth-label" htmlFor="province">
                Tỉnh / thành
              </label>
              <input
                id="province"
                className="auth-input"
                placeholder="Hà Nội"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
              />
            </div>

            <div className="auth-field" style={{ "--i": 3 } as React.CSSProperties}>
              <label className="auth-label" htmlFor="phone">
                Số điện thoại
              </label>
              <input
                id="phone"
                className="auth-input"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="09xx xxx xxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="auth-field" style={{ "--i": 4 } as React.CSSProperties}>
            <label className="auth-label" htmlFor="learningGoal">
              Bạn học tiếng Trung để làm gì?
            </label>
            <select
              id="learningGoal"
              className="auth-select"
              value={learningGoal}
              onChange={(e) => setLearningGoal(e.target.value)}
            >
              <option value="">— Chọn —</option>
              {GOALS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="auth-grid2">
            <div className="auth-field" style={{ "--i": 5 } as React.CSSProperties}>
              <label className="auth-label" htmlFor="occupation">
                Công việc hiện tại
              </label>
              <select
                id="occupation"
                className="auth-select"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
              >
                <option value="">— Chọn —</option>
                {OCCUPATIONS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div className="auth-field" style={{ "--i": 6 } as React.CSSProperties}>
              <label className="auth-label" htmlFor="currentLevel">
                Trình độ hiện tại
              </label>
              <select
                id="currentLevel"
                className="auth-select"
                value={currentLevel}
                onChange={(e) => setCurrentLevel(e.target.value)}
              >
                <option value="">— Chọn —</option>
                <option value="0">Chưa học bao giờ</option>
                {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    HSK {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="auth-field" style={{ "--i": 7 } as React.CSSProperties}>
            <label className="auth-label" htmlFor="referralSource">
              Bạn biết đến Hán Lộ từ đâu?
            </label>
            <select
              id="referralSource"
              className="auth-select"
              value={referralSource}
              onChange={(e) => setReferralSource(e.target.value)}
            >
              <option value="">— Chọn —</option>
              {SOURCES.map((sname) => (
                <option key={sname} value={sname}>
                  {sname}
                </option>
              ))}
            </select>
          </div>

          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting && <span className="auth-spinner" aria-hidden="true" />}
            {submitting ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
          </button>

          {/* Skipping still creates the account. The step is optional and must
              behave that way, or the "có thể bỏ qua" above is a lie. */}
          <button
            className="auth-ghost"
            type="button"
            disabled={submitting}
            onClick={() => void submit(false)}
          >
            Bỏ qua bước này
          </button>
        </form>
      )}

      <p className="auth-foot">
        {step === 2 ? (
          <button
            className="auth-ghost"
            type="button"
            style={{ marginTop: 0 }}
            onClick={() => setStep(1)}
            disabled={submitting}
          >
            ← Quay lại bước 1
          </button>
        ) : (
          <>
            Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
          </>
        )}
      </p>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="auth-root student-root" data-theme="dark" />}>
      <RegisterForm />
    </Suspense>
  );
}
