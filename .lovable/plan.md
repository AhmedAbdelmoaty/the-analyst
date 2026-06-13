
## فهمت إيه بالظبط

- اللعبة brand اسمه **The Analyst** متفرع من INP — نستخدم ألوان INP (الأحمر #A61E25 + الأسود + الكريمي) من غير logo INP.
- الـ logo بتاع The Analyst موجود فوق يمين كل صفحة في الـ PDF — هو **فقاعة كلام فيها bar chart أحمر** + كلمة **THE ANALYST** تحتها.
- المطلوب: أضيفه في **أماكن قليلة ومدروسة**، مش في كل شاشة. ولو المكان فيه نص/برand قديم (زي "Zenalist" في الـ BootLoader) أشيله وأحط اللوجو بدله — مش أكدس.

## استخراج الـ logo

أقدر أستخرجه نضيف من الـ PDF بدقة عالية (الصفحة 960×540 والـ logo فوق يمين بحجم محترم). هطلع **نسختين** كأصول شفافة (PNG transparent):

1. **`the-analyst-lockup.png`** — الرمز + كلمة THE ANALYST (للشاشات الكبيرة: البداية والنهاية).
2. **`the-analyst-mark.png`** — الرمز لوحده (فقاعة + bars) للأماكن الصغيرة (header، settings).

طريقة الاستخراج: قص الـ region فوق-يمين من الصفحة بـ 400 DPI، إزالة الخلفية البيضاء → PNG شفاف، تنظيف الحواف. النتيجة احترافية لأن الأصل vector في الـ PDF.

## أفضل 4 أماكن لإضافة الـ logo

اخترتهم على أساس قواعد branding الألعاب (BioShock, Hades, Disco Elysium): الـ logo بيظهر في **نقاط البداية، الفخر، والمرجعية** — مش أثناء اللعب الفعلي.

### 1. شاشة الـ Boot/Loading (`BootLoader.tsx`) — **استبدال**
- دلوقتي مكتوب "Zenalist" كنص.
- **هشيل النص ده وأحط الـ lockup logo** في مكانه، مع animation خفيف (fade + scale).
- الـ tagline تحته (لو فيه) يفضل أو يتشال حسب الشكل.

### 2. شاشة Brand Intro (`AnalystBrandIntroScreen.tsx`) — **إضافة دقيقة**
- دلوقتي فيها الصورة الترويجية الكبيرة + زرار "ابدأ الآن".
- **هحط mark صغير شفاف فوق-شمال** (corner badge) بحجم ~48px مع opacity 0.85 — يأكد الهوية من غير ما يكسر الـ cinematic feel.

### 3. شاشة النتيجة النهائية (`ResultScreen.tsx`) — **إضافة في الـ CASE FILE badge**
- دلوقتي فيه badge مكتوب "THE ANALYST / CASE FILE" فوق-شمال الإطار.
- **هستبدل النص "THE ANALYST" بالـ mark logo** (حجم صغير ~20px) وأسيب "CASE FILE" كـ subtitle. ده يخلي الـ badge أقوى وأكثر احترافية.

### 4. لوحة الإعدادات (`PlayerSettingsPanel.tsx`) — **إضافة في الـ header**
- في أعلى الـ panel هضيف الـ lockup صغير (height ~32px) كـ footer/header للـ panel — يأكد الهوية لما اللاعب يفتح الإعدادات.

## الأماكن اللي **مش** هضيفه فيها (مدروس)

- ❌ شاشات اللعب الفعلية (Inquiry, Framing, Dialogue, Travel) — الـ logo هيشتت اللاعب.
- ❌ شاشة Arrival والـ Phone Call — cinematic، الـ logo هيكسر الإيهام.
- ❌ Notebook والـ Report — دول مستندات داخل القصة، اللوجو فيهم out of context.

## الناحية التقنية

```text
src/assets/brand/
  the-analyst-lockup.png   ← شفاف، عالي الدقة (~600px wide)
  the-analyst-mark.png     ← شفاف، square (~256px)
```

- استخراج بـ pymupdf من PDF → معالجة بـ PIL (إزالة خلفية بيضاء بـ alpha threshold) → حفظ.
- استيراد عادي في React: `import lockup from "@/assets/brand/the-analyst-lockup.png"`.
- ملفات صغيرة (<50KB كل واحد) فمش محتاجين lovable-assets CDN.

## تأكيدات قبل التنفيذ

1. الـ 4 أماكن دي مناسبة، ولا تحب أشيل/أضيف مكان؟
2. في الـ BootLoader: أشيل نص "Zenalist" بالكامل وأحط الـ logo بدله — موافق؟
3. لون الـ logo يفضل الأحمر الأصلي (#A61E25) — هيتباين مع الخلفيات السودا والكريمية كويس.

لما توافق على الـ plan، هبدأ التنفيذ.
