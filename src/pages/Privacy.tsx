import { Link } from "react-router-dom";

const Privacy = () => (
  <main dir="rtl" className="mx-auto max-w-2xl px-6 py-16 text-foreground">
    <h1 className="mb-6 text-3xl font-bold">سياسة الخصوصية</h1>

    <section className="mb-8 space-y-3">
      <h2 className="text-xl font-semibold">البيانات التي نجمعها</h2>
      <p className="leading-8 text-muted-foreground">
        عند إنشاء حساب نحفظ اسمك ورقم واتساب وكلمة المرور المشفّرة لإدارة حسابك وحفظ تقدمك في الألعاب.
        ونستخدم أدوات قياس لفهم كيفية استخدام المنصة وتحسينها.
      </p>
    </section>

    <section className="mb-8 space-y-3">
      <h2 className="text-xl font-semibold">قياس الإعلانات (Meta)</h2>
      <p className="leading-8 text-muted-foreground">
        نستخدم «بكسل Meta» (من شركة Meta Platforms) لقياس فعالية إعلاناتنا على فيسبوك، مثل معرفة أن زائراً
        وصل من إعلان ثم أكمل إنشاء حساب. يجمع البكسل بيانات تقنية عن الزيارة (نوع المتصفح والصفحات التي زرتها)
        ويشاركها مع Meta لأغراض القياس وتحسين استهداف الإعلانات.
      </p>
      <p className="leading-8 text-muted-foreground">
        لا يعمل هذا التتبع للزوار من الدول التي تشترط موافقة مسبقة (مثل دول الاتحاد الأوروبي) إلا بعد موافقتهم.
        ويمكنك في أي وقت الاعتراض على هذا القياس أو طلب حذف بياناتك بالتواصل معنا عبر واتساب على رقم الدعم
        الظاهر في المنصة، وسنوقف مشاركة بياناتك فوراً.
      </p>
    </section>

    <section className="mb-8 space-y-3">
      <h2 className="text-xl font-semibold">حقوقك</h2>
      <p className="leading-8 text-muted-foreground">
        يمكنك طلب الاطلاع على بياناتك أو تصحيحها أو حذف حسابك نهائياً في أي وقت عبر التواصل معنا.
      </p>
    </section>

    <p className="text-sm text-muted-foreground">
      <Link to="/" className="text-primary underline">العودة إلى الصفحة الرئيسية</Link>
    </p>
  </main>
);

export default Privacy;
