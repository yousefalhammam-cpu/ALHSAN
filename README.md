# شجرة العائلة (GitHub Pages)

هذا قالب جاهز لموقع شجرة عائلة باللغة العربية:
- أبناء تحت الأب
- البحث بالاسم
- تكبير/تصغير + سحب للتحريك
- خانة "الاسم المحدد" تتحدث عند الضغط على أي شخص
- وضع تعديل بكلمة سر (لإظهار أدوات الإضافة/التعديل)
  > ملاحظة: لأن GitHub Pages موقع ثابت، التعديل يولّد JSON جديد. انسخه والصقه داخل family.json ثم اعمل Commit.

## ملفات المشروع
- index.html
- style.css
- app.js
- family.json

## تغيير كلمة السر
في app.js غيّر:
```js
const FAMILY_PASSWORD = "YAM123";
```

## تشغيل GitHub Pages
1) ارفع الملفات في Repository جديد
2) Settings → Pages
3) Branch: main  + Folder: /root
4) افتح رابط الموقع.
