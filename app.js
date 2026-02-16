const express = require("express");
const { GoogleSpreadsheet } = require("google-spreadsheet");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8080;

// --- قراءة الإعدادات من متغيرات البيئة ---
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || "data";

// --- معالجة "كلمة المرور" المشفرة ---
// 1. قراءة النص المشفر Base64 من متغيرات البيئة
const ENCODED_CREDENTIALS = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
// 2. فك تشفير النص للحصول على JSON الأصلي
const DECODED_CREDENTIALS = Buffer.from(ENCODED_CREDENTIALS, 'base64').toString('utf-8');
// 3. تحويل النص إلى كائن JSON جاهز للاستخدام
const CREDENTIALS = JSON.parse(DECODED_CREDENTIALS);
// -----------------------------------------

app.get("/", async (req, res) => {
  const empName = req.query.empName;
  if (!empName) {
    return res.status(400).json({ error: "Employee name not provided. Use ?empName=NAME" });
  }
  try {
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth(CREDENTIALS); // استخدام الكائن بعد فك التشفير
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle[SHEET_NAME];
    if (!sheet) {
      return res.status(404).json({ error: `Sheet '${SHEET_NAME}' not found.` });
    }
    const rows = await sheet.getRows();
    
    // --- **هذا هو السطر الذي تم تعديله باسم العمود الصحيح** ---
    const filteredTasks = rows
      .filter(row => row["Assigned Employee"] && row["Assigned Employee"].trim() === empName.trim())
      .map(row => ({
        RFQ: row["RFQ"] || "",
        RequestDate: row["Request Date"] || "",
        ResDate: row["RES DATE"] || "",
        LineItem: row["LINEITEM"] || "",
        PartNo: row["PART NO"] || "",
        Description: row["Description"] || "",
        Qty: row["QTY"] || ""
      }));
      
    res.status(200).json(filteredTasks);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal server error.", details: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
