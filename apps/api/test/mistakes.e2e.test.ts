import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
let cardId: string;
let teacherToken: string;
let teacherId: string;
let classId: string;
import 'reflect-metadata';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, type INestApplication, type ValidationError } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from '../dist/src/app.module';
import { GlobalExceptionFilter } from '../dist/src/common/filters/global-exception.filter';
import { EnvelopeInterceptor } from '../dist/src/common/interceptors/envelope.interceptor';
import { AppException } from '../dist/src/common/errors/app.exception';
import { ErrorCode } from '../dist/src/common/errors/error-codes';
import { PrismaService } from '../dist/src/prisma/prisma.service';

/** Real DB lifecycle: failed review/graded attempt, ownership and durable notebook state. */
const PREFIX = 'api/v1';

let app: INestApplication;
let base: string;
let prisma: PrismaService;

const STUDENT_A_EMAIL = 'test.mistake.student.a@mistakes.hsk.local';
const STUDENT_B_EMAIL = 'test.mistake.student.b@mistakes.hsk.local';
const OWNED_EMAILS = [STUDENT_A_EMAIL, STUDENT_B_EMAIL];

function toDetails(errors: ValidationError[], prefix = ''): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const err of errors) {
    const field = prefix ? `${prefix}.${err.property}` : err.property;
    const messages = Object.values(err.constraints ?? {});
    if (messages.length) out[field] = [...(out[field] ?? []), ...messages];
    if (err.children?.length) Object.assign(out, toDetails(err.children, field));
  }
  return out;
}

// Test responses have different envelope shapes, asserted per case.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Res = { status: number; body: any };

async function req(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  token?: string,
): Promise<Res> {
  const headers: Record<string, string> = {};
  if (body) headers['content-type'] = 'application/json';
  if (token) headers['authorization'] = `Bearer ${token}`;
  const res = await fetch(`${base}/${PREFIX}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

let adminToken: string;
let aToken: string;
let bToken: string;
let aId: string;
let bId: string;

before(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix(PREFIX);
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new AppException(ErrorCode.VALIDATION_ERROR, 'Dữ liệu không hợp lệ', toDetails(errors)),
    }),
  );
  app.useGlobalInterceptors(new EnvelopeInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.listen(0);
  base = (await app.getUrl()).replace('[::1]', 'localhost');
  prisma = app.get(PrismaService);

  await prisma.user.deleteMany({ where: { email: { in: OWNED_EMAILS } } });

  const adminLogin = await req('POST', '/auth/login', {
    email: 'admin@hsk.local',
    password: 'Password123!',
  });
  adminToken = adminLogin.body.data.accessToken;

  for (const [email, name] of [
    [STUDENT_A_EMAIL, 'Học Sinh Kho Từ A'],
    [STUDENT_B_EMAIL, 'Học Sinh Kho Từ B'],
  ] as const) {
    const reg = await req('POST', '/auth/register', {
      email,
      password: 'Password123!',
      fullName: name,
      role: 'student',
    });
    assert.equal(reg.status, 201, JSON.stringify(reg.body));
    await req('PATCH', `/admin/users/${reg.body.data.id}/approve`, undefined, adminToken);
    const login = await req('POST', '/auth/login', { email, password: 'Password123!' });
    assert.equal(login.status, 200, JSON.stringify(login.body));
    if (email === STUDENT_A_EMAIL) {
      aToken = login.body.data.accessToken;
      aId = reg.body.data.id;
    } else {
      bToken = login.body.data.accessToken;
      bId = reg.body.data.id;
    }
  }

 const mongo = app.get<Connection>(getConnectionToken());
 await mongo.collection('user_mistakes').createIndex({userId: 1, sourceType: 1, sourceId: 1}, {unique: true});
 const card = await mongo.collection('flashcards').insertOne({hanzi: '错误练习专用', pinyin: 'cuò wù', meaning: 'test mistake', hskLevel: 1, tags: []});
 cardId = String(card.insertedId);
 const email = 'test.mistake.teacher@hsk.local';
 OWNED_EMAILS.push(email);
 await prisma.user.deleteMany({where: {email}});
 const reg = await req('POST', '/auth/register', {email, password: 'Password123!', fullName: 'Mistake Teacher', role: 'teacher'});
 assert.equal(reg.status,201,JSON.stringify(reg.body));
 teacherId = reg.body.data.id;
 await req('PATCH', `/admin/users/${teacherId}/approve`, undefined, adminToken);
 teacherToken = (await req('POST','/auth/login',{email,password:'Password123!'})).body.data.accessToken;
 const cls = await req('POST','/teacher/classes',{name:'Mistake lifecycle', hskLevel:1},teacherToken);
 assert.equal(cls.status,201,JSON.stringify(cls.body)); classId=cls.body.data.id;
 await prisma.classEnrollment.create({data:{classId,studentId:aId,status:'active'}});
});
after(async () => {
 if (!app) return;
 const mongo = app.get<Connection>(getConnectionToken());
 const ids = [aId,bId].filter(Boolean);
 await mongo.collection('user_mistakes').deleteMany({userId:{$in:ids}});
 await mongo.collection('user_flashcard_states').deleteMany({userId:{$in:ids}});
 await mongo.collection('flashcards').deleteMany({hanzi:'错误练习专用'});
 if (teacherId) await mongo.collection('questions').deleteMany({createdBy:teacherId});
 if (classId) await prisma.class.delete({where:{id:classId}});
 await prisma.user.deleteMany({where:{email:{in:OWNED_EMAILS}}});
 await app.close();
});
const list = async (token=aToken) => (await req('GET','/student/mistakes',undefined,token)).body.data as {id:string; sourceId:string; status:string; version:number; available:boolean}[];
describe('S-MSTK lifecycle and isolation', () => {
 it('creates only from real failure, deduplicates, persists review and reopens on later failure', async () => {
  assert.equal((await list()).length,0);
  assert.equal((await req('POST',`/student/flashcards/${cardId}/review`,{rating:4},aToken)).status,201);
  assert.equal((await list()).length,0);
  for(let i=0;i<2;i++) assert.equal((await req('POST',`/student/flashcards/${cardId}/review`,{rating:0},aToken)).status,201);
  let rows=await list(); assert.equal(rows.length,1);
  const id=rows[0].id;
  let r=await req('POST',`/student/mistakes/${id}/review`,{version:rows[0].version,recalled:false},aToken);
  assert.equal(r.status,200); assert.equal(r.body.data.correct,false);
  rows=await list(); assert.equal(rows[0].status,'needs_review');
  const version=rows[0].version;
  r=await req('POST',`/student/mistakes/${id}/review`,{version,recalled:true},aToken);
  assert.equal(r.status,200); assert.equal((await list())[0].status,'reviewed');
  assert.equal((await req('POST',`/student/mistakes/${id}/review`,{version,recalled:true},aToken)).status,409);
  await req('POST',`/student/flashcards/${cardId}/review`,{rating:0},aToken);
  rows=await list(); assert.equal(rows.length,1); assert.equal(rows[0].id,id); assert.equal(rows[0].status,'needs_review');
  assert.equal((await list(bToken)).length,0);
  assert.equal((await req('POST',`/student/mistakes/${id}/review`,{version:rows[0].version,recalled:true},bToken)).status,404);
  assert.equal((await req('GET','/student/mistakes',undefined,teacherToken)).status,403);
  assert.equal((await req('GET','/student/mistakes')).status,401);
  const mongo=app.get<Connection>(getConnectionToken());
  assert.equal(await mongo.collection('user_mistakes').countDocuments({userId:aId,sourceId:cardId}),1);
  assert.equal(await mongo.collection('flashcards').countDocuments({hanzi:'错误练习专用'}),1);
 });
 it('rejects invalid/foreign payloads and atomically accepts one concurrent review', async () => {
  const row=(await list()).find(i=>i.sourceId===cardId)!;
  const path=`/student/mistakes/${row.id}/review`;
  for(const body of [{version:0,recalled:true},{version:row.version,recalled:true,userId:bId},{version:row.version,selectedOptions:['a']}]) {
   assert.equal((await req('POST',path,body,aToken)).status,400);
  }
  assert.equal((await req('POST','/student/mistakes/not-an-id/review',{version:1,recalled:true},aToken)).status,404);
  assert.equal((await req('GET','/student/mistakes/review',undefined,bToken)).body.data.length,0);
  const results=await Promise.all([1,2].map(()=>req('POST',path,{version:row.version,recalled:true},aToken)));
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const mongo=app.get<Connection>(getConnectionToken());
  await mongo.collection('flashcards').deleteOne({_id:new (await import('mongoose')).Types.ObjectId(cardId)});
  const unavailable=(await list()).find(i=>i.id===row.id)!;
  assert.equal(unavailable.available,false);
  assert.equal((await req('POST',path,{version:unavailable.version,recalled:true},aToken)).status,404);
 });
 it('reconciles a real submitted wrong answer only after grading and never reopens on reload', async () => {
  const q=await req('POST','/teacher/questions',{skill:'reading',subType:'multiple_choice_multi',hskLevel:1,difficulty:'easy',content:{passage:'选择正确答案'},options:[{id:'a',text:'正确'},{id:'b',text:'错误'}],correctAnswer:['a'],explanation:'a'},teacherToken);
  assert.equal(q.status,201,JSON.stringify(q.body)); const qid=q.body.data.id;
  const assignment=await req('POST','/teacher/assignments',{classId,title:'Mistake source',type:'homework',status:'published',questionIds:[qid]},teacherToken);
  assert.equal(assignment.status,201,JSON.stringify(assignment.body));
  const start=await req('POST',`/student/assignments/${assignment.body.data.id}/attempts`,undefined,aToken);
  assert.equal(start.status,201,JSON.stringify(start.body)); const aid=start.body.data.attempt.id;
  await req('PATCH',`/student/attempts/${aid}/answers`,{questionId:qid,selectedOptions:['b']},aToken);
  const submitted=await req('POST',`/student/attempts/${aid}/submit`,undefined,aToken);
  assert.equal(submitted.status,200,JSON.stringify(submitted.body));
  assert.equal((await list()).filter(i=>i.sourceId===qid).length,0);
  const graded=await req('PATCH',`/teacher/attempts/${aid}/grade`,{grades:[]},teacherToken);
  assert.equal(graded.status,200,JSON.stringify(graded.body));
  let row=(await list()).find(i=>i.sourceId===qid)!; assert.ok(row);
  assert.equal('correctAnswer' in row,false); assert.equal('key' in row,false);
  const wrong=await req('POST',`/student/mistakes/${row.id}/review`,{version:row.version,selectedOptions:['b']},aToken);
  assert.equal(wrong.status,200); assert.equal(wrong.body.data.correct,false);
  row=(await list()).find(i=>i.sourceId===qid)!; assert.equal(row.status,'needs_review');
  const res=await req('POST',`/student/mistakes/${row.id}/review`,{version:row.version,selectedOptions:['a']},aToken);
  assert.equal(res.status,200,JSON.stringify(res.body)); assert.equal(res.body.data.correct,true);
  for(let i=0;i<3;i++){row=(await list()).find(i=>i.sourceId===qid)!;assert.equal(row.status,'reviewed');}
 });
});
