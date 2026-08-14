"use client";

import { AlertCircle, Bell, BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, Clock3, Inbox, LayoutDashboard, Menu, ShieldCheck, UserRound, Users, WalletCards, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { getStudentDataset, getTeacherDataset, getUserDetailDataset } from "../../../../lib/user-detail-data.js";
import { nextStatus } from "../../../../lib/user-status.js";
import baseStyles from "../users.module.css";
import detailStyles from "./detail.module.css";

const styles = { ...baseStyles, ...detailStyles };

type UserStatus = "pending" | "active" | "suspended";
type Action = "approve" | "suspend" | "activate";
type ReviewState = "student" | "teacher" | "loading" | "empty" | "partial" | "error";
type DetailUser = { id:string; nickname:string; email:string; role:"student"|"teacher"|"admin"; status:UserStatus; createdAt:string; lastLoginAt:string|null; initials:string; hskLevelGoal?:number; bio?:string };

const statusLabels:Record<UserStatus,string>={pending:"Chờ duyệt",active:"Đang hoạt động",suspended:"Đã khóa"};
const roleLabels={student:"Học sinh",teacher:"Giáo viên",admin:"Admin"};
const actionLabels:Record<Action,string>={approve:"Duyệt tài khoản",suspend:"Khóa tài khoản",activate:"Mở khóa"};
const actionFor=(status:UserStatus):Action=>status==="pending"?"approve":status==="active"?"suspend":"activate";

export default function AdminUserDetailPage({params}:{params:{userId:string}}){
  const routeData=getUserDetailDataset(params.userId);
  const initialState:ReviewState=routeData?.user.role==="teacher"?"teacher":routeData?"student":"error";
  const [reviewState,setReviewState]=useState<ReviewState>(initialState);
  const [user,setUser]=useState<DetailUser>((routeData?.user??getStudentDataset().user) as DetailUser);
  const [modal,setModal]=useState<Action|null>(null); const [reason,setReason]=useState(""); const [toast,setToast]=useState(""); const [mobileNav,setMobileNav]=useState(false);
  function switchState(state:ReviewState){setReviewState(state);if(state==="teacher")setUser(getTeacherDataset().user as DetailUser);if(["student","empty","partial"].includes(state))setUser(getStudentDataset().user as DetailUser)}
  function confirm(){if(!modal||(modal==="suspend"&&!reason.trim()))return;setUser(current=>({...current,status:nextStatus(current.status,modal) as UserStatus}));setToast({approve:"Đã duyệt tài khoản",suspend:"Đã khóa tài khoản",activate:"Đã mở khóa tài khoản"}[modal]);setModal(null);setReason("");window.setTimeout(()=>setToast(""),2600)}
  return <div className={styles.appShell}>
    <AdminSidebar open={mobileNav} close={()=>setMobileNav(false)}/>{mobileNav&&<button className={styles.navBackdrop} onClick={()=>setMobileNav(false)} aria-label="Đóng menu"/>}
    <div className={styles.mainColumn}><AdminHeader openMenu={()=>setMobileNav(true)}/><main className={`${styles.content} ${styles.detailContent}`}>
      {reviewState==="error"?<NotFound/>:reviewState==="loading"?<DetailLoading/>:<>
        <Link className={styles.backLink} href="/admin/users"><ChevronLeft size={17}/>Quay lại danh sách</Link>
        <section className={styles.profileCard}><div className={`${styles.detailAvatar} ${user.role==="student"?styles.blue:styles.amber}`}>{user.initials}</div><div className={styles.profileHeading}><div className={styles.profileNameRow}><h1>{user.nickname}</h1><StatusPill status={user.status}/></div><p>{user.email}</p><div className={styles.profileMeta}><span>{roleLabels[user.role]}</span>{user.hskLevelGoal&&<span>Mục tiêu HSK {user.hskLevelGoal}</span>}{user.bio&&<span>{user.bio}</span>}</div></div><button className={actionFor(user.status)==="suspend"?styles.detailDangerButton:styles.detailPrimaryButton} onClick={()=>{setReason("");setModal(actionFor(user.status))}}>{actionLabels[actionFor(user.status)]}</button></section>
        <section className={styles.identityCard}><h2>Thông tin tài khoản</h2><dl><div><dt>Ngày đăng ký</dt><dd>{user.createdAt}</dd></div><div><dt>Đăng nhập gần nhất</dt><dd>{user.lastLoginAt??"—"}</dd></div><div><dt>Trạng thái</dt><dd><StatusPill status={user.status}/></dd></div></dl></section>
        {reviewState==="partial"?<HistorySkeleton/>:<HistoryPanels state={reviewState}/>}<section className={styles.disabledCard}><div className={styles.disabledIcon}><Clock3 size={20}/></div><div><h2>Lịch sử đăng nhập</h2><p>Chưa khả dụng — phụ thuộc Sprint 5</p></div></section>
      </>}
    </main></div>
    <div className={`${styles.stateSwitcher} ${styles.detailSwitcher}`}><span>REVIEW STATE</span>{(["student","teacher","loading","empty","partial","error"] as ReviewState[]).map(state=><button key={state} className={reviewState===state?styles.stateActive:""} onClick={()=>switchState(state)}>{state==="student"?"ready: student":state==="teacher"?"ready: teacher":state}</button>)}</div>
    {toast&&<div className={styles.toast}><Check size={18}/>{toast}</div>}{modal&&<ActionModal user={user} action={modal} reason={reason} setReason={setReason} close={()=>setModal(null)} confirm={confirm}/>} </div>
}

function AdminSidebar({open,close}:{open:boolean;close:()=>void}){return <aside className={`${styles.sidebar} ${open?styles.sidebarOpen:""}`}><div className={styles.brand}><span className={styles.brandMark}>学</span><span>HSK Platform</span><button className={styles.closeNav} onClick={close} aria-label="Đóng menu"><X size={20}/></button></div><nav className={styles.nav} aria-label="Điều hướng quản trị"><a href="#"><LayoutDashboard size={20}/>Tổng quan</a><a className={styles.navActive} href="/admin/users"><Users size={20}/>Tài khoản</a><a href="#"><CircleDollarSign size={20}/>Học phí</a><a href="#"><WalletCards size={20}/>Lương</a><a href="#"><ShieldCheck size={20}/>Giám sát</a></nav><div className={styles.sidebarFooter}><BookOpen size={18}/><div><strong>HSK 1–9</strong><span>Nền tảng học tập</span></div></div></aside>}
function AdminHeader({openMenu}:{openMenu:()=>void}){return <header className={styles.topbar}><div className={styles.breadcrumb}><button className={styles.menuButton} onClick={openMenu} aria-label="Mở menu"><Menu size={20}/></button><span>Quản trị</span><ChevronRight size={15}/><Link href="/admin/users">Tài khoản</Link><ChevronRight size={15}/><strong>Chi tiết</strong></div><div className={styles.headerActions}><button className={styles.iconButton} aria-label="Thông báo"><Bell size={19}/><span className={styles.notificationDot}/></button><div className={styles.headerDivider}/><button className={styles.profileButton}><span className={`${styles.avatar} ${styles.slate}`}>AT</span><span><strong>Anh Tuấn</strong><small>Quản trị viên</small></span><ChevronDown size={16}/></button></div></header>}
function StatusPill({status}:{status:UserStatus}){return <span className={`${styles.statusPill} ${styles[status]}`}><i/>{statusLabels[status]}</span>}

function HistoryPanels({state}:{state:ReviewState}){if(state==="teacher"){const data=getTeacherDataset();return <div className={styles.historyGrid}><HistoryCard title="Lớp đang dạy" headers={["Lớp","Học sinh","Trạng thái"]} rows={data.classes.map((item:{name:string;students:number})=>[item.name,`${item.students} học sinh`,<MiniPill key={item.name} label="Đang hoạt động" tone="success"/>])}/><HistoryCard title="Buổi học" headers={["Ngày","Lớp","Thời lượng","Trạng thái"]} rows={data.sessions.map((item:{date:string;className:string;duration:string;status:string})=>[item.date,item.className,item.duration,<MiniPill key={item.date} label={item.status==="approved"?"Đã duyệt":"Chờ duyệt"} tone={item.status==="approved"?"success":"warning"}/>])}/></div>}return <div className={styles.historyGrid}><HistoryCard title="Lớp đã tham gia" headers={[]} rows={[]}/><HistoryCard title="Bài đã nộp" headers={[]} rows={[]}/></div>}
function HistoryCard({title,headers,rows}:{title:string;headers:string[];rows:React.ReactNode[][]}){return <section className={styles.historyCard}><div className={styles.historyTitle}><h2>{title}</h2></div>{!rows.length?<div className={styles.panelEmpty}><Inbox size={27}/><p>Chưa có hoạt động nào</p></div>:<><div className={styles.historyTable}><table><thead><tr>{headers.map(header=><th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={index}>{row.map((cell,i)=><td key={i}>{cell}</td>)}</tr>)}</tbody></table></div><div className={styles.historyCardsMobile}>{rows.map((row,index)=><article key={index}>{row.map((cell,i)=><div key={i}><span>{headers[i]}</span><strong>{cell}</strong></div>)}</article>)}</div></>}</section>}
function MiniPill({label,tone}:{label:string;tone:"success"|"warning"}){return <span className={`${styles.miniPill} ${styles[tone]}`}>{label}</span>}
function DetailLoading(){return <div className={styles.detailLoading}><div className={styles.detailSkeletonBack}/><div className={styles.detailSkeletonHeader}/><div className={styles.detailSkeletonIdentity}/><HistorySkeleton/></div>}
function HistorySkeleton(){return <div className={styles.historyGrid}>{[0,1].map(item=><div className={styles.historySkeleton} key={item}><span/><i/><i/><i/></div>)}</div>}
function NotFound(){return <div className={styles.notFound}><span><AlertCircle size={34}/></span><h1>Không tìm thấy tài khoản này.</h1><p>Tài khoản có thể đã bị xóa hoặc đường dẫn không chính xác.</p><Link href="/admin/users"><ChevronLeft size={17}/>Quay lại danh sách</Link></div>}
function ActionModal({user,action,reason,setReason,close,confirm}:{user:DetailUser;action:Action;reason:string;setReason:(value:string)=>void;close:()=>void;confirm:()=>void}){const bodies={approve:`Tài khoản ${user.nickname} sẽ được kích hoạt và có thể đăng nhập ngay.`,suspend:`${user.nickname} sẽ không thể đăng nhập cho đến khi được mở khóa.`,activate:`Tài khoản ${user.nickname} sẽ có thể đăng nhập và sử dụng hệ thống trở lại.`};return <div className={styles.modalBackdrop} role="presentation" onMouseDown={close}><div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="detail-modal-title" onMouseDown={event=>event.stopPropagation()}><div className={styles.modalIcon}><UserRound size={22}/></div><h2 id="detail-modal-title">{actionLabels[action]}</h2><p>{bodies[action]}</p>{action==="suspend"&&<label className={styles.reasonField}><span>Lý do khóa</span><textarea autoFocus value={reason} onChange={event=>setReason(event.target.value)} placeholder="Nhập lý do khóa tài khoản" rows={3}/><small>Bắt buộc</small></label>}<div className={styles.modalActions}><button className={styles.cancelButton} onClick={close}>Hủy</button><button className={action==="suspend"?styles.dangerButton:styles.primaryButton} disabled={action==="suspend"&&!reason.trim()} onClick={confirm}>{actionLabels[action]}</button></div></div></div>}
