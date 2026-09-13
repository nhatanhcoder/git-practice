import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
const apiRequire = createRequire(new URL("../../api/package.json", import.meta.url));
const { PrismaClient } = apiRequire("@prisma/client");
const mongoose = apiRequire("mongoose");

// Opt-in real API/DB test. Run with the dev .env and a production web build.
test("S-MSTK live login, review, reload, error and responsive layout", async ({ page, request }, info) => {
 test.skip(!process.env.MONGODB_URI || !process.env.DATABASE_URL, "Requires explicit dev DB environment");
 test.setTimeout(90000);
 const api = process.env.MSTK_API_URL ?? "http://localhost:3001/api/v1";
 const email = `mistake.browser.${Date.now()}.${info.project.name}@hsk.local`;
 const password = "Password123!";
 const prisma = new PrismaClient();
 const mongo = await mongoose.createConnection(process.env.MONGODB_URI).asPromise();
 let userId: string | undefined;
 let cardId: string | undefined;
 try {
  const admin = await request.post(`${api}/auth/login`, {data:{email:"admin@hsk.local",password}});
  expect(admin.status()).toBe(200);
  const adminToken = (await admin.json()).data.accessToken;
  const registered = await request.post(`${api}/auth/register`, {data:{email,password,fullName:"Mistake browser",role:"student"}});
  expect(registered.status()).toBe(201);
  userId = (await registered.json()).data.id;
  expect((await request.patch(`${api}/admin/users/${userId}/approve`, {headers:{Authorization:`Bearer ${adminToken}`}})).status()).toBe(200);
  const login = await request.post(`${api}/auth/login`, {data:{email,password}});
  const token = (await login.json()).data.accessToken;
  const headers = {Authorization:`Bearer ${token}`};
  const inserted = await mongo.collection("flashcards").insertOne({hanzi:"认真学习",pinyin:"rèn zhēn xué xí",meaning:"học tập chăm chỉ",hskLevel:1,tags:[]});
  cardId = String(inserted.insertedId);
  expect((await request.post(`${api}/student/flashcards/${cardId}/review`,{headers,data:{rating:0}})).status()).toBe(201);
  await page.goto("/login?next=/student/mistakes/review");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button",{name:"Đăng nhập",exact:true}).click();
  await expect(page.getByRole("heading",{name:"认真学习"})).toBeVisible();
  await page.screenshot({path:info.outputPath("review.png"),fullPage:true});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button",{name:"Hiện nghĩa"}).click();
  await page.getByRole("button",{name:"Chưa nhớ",exact:true}).click();
  await expect(page.getByText("Chưa đúng — nội dung vẫn cần ôn.",{exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading",{name:"认真学习"})).toBeVisible();
  await page.getByRole("button",{name:"Hiện nghĩa"}).click();
  await page.getByRole("button",{name:"Đã nhớ",exact:true}).click();
  await expect(page.getByText("Đúng — đã lưu trạng thái đã ôn.",{exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading",{name:"Không có lỗi sai cần ôn"})).toBeVisible();
  await page.goto("/student/mistakes");
  await expect(page.getByText("Đã ôn đúng",{exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath("notebook.png"),fullPage:true});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.route("**/student/mistakes?**",route => route.abort());
  await page.reload();
  await expect(page.getByText("Không tải được sổ tay lỗi sai.",{exact:true})).toBeVisible();
  await expect(page.getByText("Đã ôn đúng",{exact:true})).toHaveCount(0);
 } finally {
  if(userId) {
   await mongo.collection("user_mistakes").deleteMany({userId});
   await mongo.collection("user_flashcard_states").deleteMany({userId});
   await prisma.user.delete({where:{id:userId}});
  }
  if(cardId) await mongo.collection("flashcards").deleteOne({_id:new mongoose.Types.ObjectId(cardId)});
  await mongo.close(); await prisma.$disconnect();
 }
});
