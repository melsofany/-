const express = require("express");
const { GoogleSpreadsheet } = require("google-spreadsheet");
require("dotenv").config(); // لتحميل المتغيرات من ملف .env

// --- الإعدادات الأساسية ---
const app = express();
const PORT = process.env.PORT || 8080; // سيستخدم البورت الذي يحدده Render

// --- إعدادات Google Sheet (سيتم قراءتها من متغيرات البيئة) ---
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || "data";
const CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);

// --- نقطة النهاية الرئيسية (API Endpoint) ---
app.get("/", async (req, res) => {
  const empName = req.query.empName;

  // التحقق من أن اسم الموظف تم إرساله
  if (!empName) {
    return res.status(400).json({ error: "Employee name not provided. Please use ?empName=NAME" });
  }

  try {
    // 1. الاتصال بملف Google Sheet
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth(CREDENTIALS);
    await doc.loadInfo(); // تحميل معلومات الملف

    // 2. الوصول إلى الشيت (الورقة) المطلوبة
    const sheet = doc.sheetsByTitle[SHEET_NAME];
    if (!sheet) {
      return res.status(404).json({ error: `Sheet with name '${SHEET_NAME}' not found.` });
    }
    const rows = await sheet.getRows(); // جلب كل الصفوف

    // 3. فلترة البيانات وإعادة هيكلتها
    const filteredTasks = rows
      .filter(row => row["Technical Name"] && row["Technical Name"].trim() === empName.trim())
      .map(row => ({
        // إعادة تسمية الحقول لتكون متوافقة مع VBA وسهلة القراءة
        RFQ: row["RFQ"] || "",
        RequestDate: row["Request Date"] || "",
        ResDate: row["RES DATE"] || "",
        LineItem: row["LINEITEM"] || "",
        PartNo: row["PART NO"] || "",
        Description: row["Description"] || "",
        Qty: row["QTY"] || ""
      }));

    // 4. إرجاع البيانات بصيغة JSON
    res.status(200).json(filteredTasks);

  } catch (err) {
    console.error("Error accessing Google Sheet:", err);
    res.status(500).json({ error: "An internal server error occurred.", details: err.message });
  }
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`Server is running and listening on port ${PORT}`);
});
