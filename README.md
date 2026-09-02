# Content Spark — Apni Website Live Karne Ka Guide

Ye ek real, working website hai — koi terminal ya coding tool ki zarurat nahi. Bas neeche diye steps follow karo.

**Isme kya hai:**
- `index.html` — poori website (design + form + result dikhane wala hissa)
- `api/generate.js` — wo hissa jo Google ke AI (Gemini) ko call karta hai script/ideas banane ke liye
- `package.json`, `.gitignore` — chhoti setup files, inhe touch karne ki zarurat nahi

---

## Step 1 — Free Gemini API key lo

1. [Google AI Studio](https://aistudio.google.com/) kholo aur apne Google account se login karo
2. "Get API key" pe click karo
3. "Create API key" dabao
4. Jo key milegi (lambi string, jaise `AIzaSy...`), use kahin safe jagah copy karke rakh lo (Notes app mein) — ye tumhara password jaisa hai, kisi ko mat dena

## Step 2 — GitHub account banao (agar nahi hai)

1. [github.com](https://github.com/) pe jaake free account bana lo
2. Login karne ke baad, top-right "+" icon se **"New repository"** banao
3. Naam do: `content-spark`
4. "Public" ya "Private" — dono chalega, "Create repository" dabao

## Step 3 — Files GitHub pe upload karo

1. Jo files maine di hain (zip), unhe apne computer mein **extract/unzip** kar lo pehle
2. GitHub pe apni nayi repository ke andar, **"uploading an existing file"** wala link dhoondo (ye repository ke homepage pe hi dikhta hai jab wo khali hoti hai)
3. Extract ki hui **saari files aur `api` folder** ko wahan drag-and-drop kar do (seedha zip mat daalna, extract ki hui files)
4. Neeche "Commit changes" button dabao

## Step 4 — Vercel se connect karo aur live karo

1. [vercel.com](https://vercel.com/) pe jaake **"Continue with GitHub"** se sign up karo (same GitHub account se)
2. Dashboard mein **"Add New..." → "Project"** pe click karo
3. Apni `content-spark` repository dhoondo aur **"Import"** dabao
4. Deploy karne se **pehle**, "Environment Variables" wala section kholo:
   - Name: `GEMINI_API_KEY`
   - Value: (Step 1 wali key paste karo)
   - "Add" dabao
5. Ab **"Deploy"** button dabao — 30-60 second wait karo
6. Deploy hone ke baad ek live link milega (jaisa `content-spark-xyz.vercel.app`) — yahi tumhari **asli, live website** hai!

## Step 5 — Test karo

1. Wo live link kholo apne browser mein
2. Ek niche daalo (jaise "true crime"), "Generate ideas" dabao
3. Kuch second mein ideas/scripts aa jaane chahiye

Agar koi error aaye, screenshot le lo aur Claude ko bhej do — dobara batayenge kya galat hua.

---

## Aage jaake (abhi zaroori nahi)

- **Custom domain** connect karna ho, to Vercel ke project settings mein "Domains" section se ho sakta hai
- **Usage limit / payment system** add karna ho jab real users aane lagein, tab bata dena — us hisaab se code update karenge

## Ek zaroori baat

`GEMINI_API_KEY` kabhi kisi ke saath share mat karna, aur kabhi bhi seedha `index.html` ya kisi frontend file mein mat likhna — hamesha sirf Vercel ke "Environment Variables" mein hi dalna. Agar kabhi lagta hai ki key leak ho gayi hai, Google AI Studio mein jaake purani key delete karke nayi bana lo.
