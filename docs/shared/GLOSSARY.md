# 📖 Glossary — HSK Learning Platform

> Thuật ngữ domain + kỹ thuật được dùng nhất quán trong toàn bộ docs.  
> Khi thêm thuật ngữ mới, cập nhật file này trước rồi mới dùng ở chỗ khác.

---

## A

| Term | Định nghĩa |
|------|-----------|
| **Access Token** | JWT ngắn hạn (15 phút), lưu trong Zustand (memory). Dùng để xác thực mỗi API call. |
| **Attempt** | Một lần làm bài của student cho một Assignment. Entity trong PostgreSQL. |
| **AttemptAnswer** | Một đáp án của student cho một câu hỏi trong Attempt. |

## B

| Term | Định nghĩa |
|------|-----------|
| **boxNumber** | Số thứ tự "hộp" trong SRS (Leitner system). Box 1 = ôn sớm nhất, Box 5+ = đã nhớ tốt. |

## C

| Term | Định nghĩa |
|------|-----------|
| **ClassEnrollment** | Bản ghi liên kết Student ↔ Class. Tạo khi student nhập enrollmentCode. |
| **ClassSession** | Một buổi học thực tế. Teacher log → submit → admin approve → payroll. |

## E

| Term | Định nghĩa |
|------|-----------|
| **easeFactor** | Hệ số dễ của flashcard trong SM-2. Khởi tạo 2.5, giảm khi đánh giá "Again/Hard", tăng khi "Easy". Min: 1.3. |
| **enrollmentCode** | Mã 8 ký tự (chữ hoa + số) dùng để student tham gia lớp. Auto-generated khi teacher tạo lớp. |

## F

| Term | Định nghĩa |
|------|-----------|
| **Flashcard** | Thẻ từ vựng tiếng Trung trong MongoDB. Chứa: chữ Hán, pinyin, nghĩa VN/EN, ví dụ, audio. |

## G

| Term | Định nghĩa |
|------|-----------|
| **Grading** | Quá trình teacher chấm điểm Attempt sau khi student submit. Trạng thái: submitted → graded. |

## H

| Term | Định nghĩa |
|------|-----------|
| **HSK** | Hanyu Shuiping Kaoshi — kỳ thi đánh giá trình độ tiếng Trung quốc tế. Cấp độ 1–6 (HSK 1 dễ nhất). |
| **hskLevel** | Trường dữ liệu chỉ cấp độ HSK (1–6), áp dụng cho User, Class, Question, Flashcard. |

## I

| Term | Định nghĩa |
|------|-----------|
| **Invoice** | Xem **StudentInvoice** |

## J

| Term | Định nghĩa |
|------|-----------|
| **JWT** | JSON Web Token. Platform dùng 2 loại: Access Token (15 phút) + Refresh Token (7 ngày). |

## M

| Term | Định nghĩa |
|------|-----------|
| **Mock Test** | Loại Assignment có giới hạn thời gian (timeLimitMinutes). Tự submit khi hết giờ. |

## N

| Term | Định nghĩa |
|------|-----------|
| **nextReviewDate** | Ngày kế tiếp card SRS cần được ôn tập. Tính bởi SM-2 algorithm. |

## P

| Term | Định nghĩa |
|------|-----------|
| **PayrollPeriod** | Kỳ lương của teacher (periodStart → periodEnd). Trạng thái: draft → finalized → paid. |
| **Pinyin** | Hệ thống phiên âm tiếng Trung bằng chữ Latin. VD: 你好 = nǐ hǎo. |

## Q

| Term | Định nghĩa |
|------|-----------|
| **Question** | Câu hỏi trong ngân hàng câu hỏi (MongoDB). Có skill (listening/reading/writing) và subType. |
| **Question Bank** | Tập hợp tất cả câu hỏi của một teacher hoặc platform. Dùng để tạo Assignment. |

## R

| Term | Định nghĩa |
|------|-----------|
| **RBAC** | Role-Based Access Control. Xem [RBAC_MATRIX.md](./RBAC_MATRIX.md). |
| **Refresh Token** | JWT dài hạn (7 ngày), lưu trong httpOnly cookie. Dùng để lấy Access Token mới. |
| **repetitionsCount** | Số lần đã ôn thành công liên tiếp. Dùng trong SM-2 để tính interval tiếp theo. |

## S

| Term | Định nghĩa |
|------|-----------|
| **SM-2** | Thuật toán Spaced Repetition (SuperMemo 2). Tính interval dựa trên easeFactor và repetitionsCount. |
| **SRS** | Spaced Repetition System. Hệ thống ôn tập có khoảng cách ngày càng tăng theo mức nhớ. |
| **StudentInvoice** | Hóa đơn học phí cho student. Admin tạo, student xem. Trạng thái: unpaid/partially_paid/paid/void. |

## T

| Term | Định nghĩa |
|------|-----------|
| **timeLimitMinutes** | Giới hạn thời gian cho Mock Test (tính bằng phút). Null = không giới hạn (Assignment thường). |
| **TuitionPayment** | Bản ghi thanh toán học phí. Liên kết với StudentInvoice. |

## U

| Term | Định nghĩa |
|------|-----------|
| **UserFlashcardState** | Trạng thái SRS của 1 user × 1 flashcard. Chứa: boxNumber, easeFactor, repetitionsCount, nextReviewDate. |

## V

| Term | Định nghĩa |
|------|-----------|
| **VietQR** | Tiêu chuẩn QR thanh toán ngân hàng Việt Nam. Platform dùng cho student trả học phí. Đối soát thủ công bởi admin. |
