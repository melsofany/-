const express = require("express");
const { GoogleSpreadsheet } = require("google-spreadsheet");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8080;

// --- قراءة الإعدادات من متغيرات البيئة ---
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || "data";

// --- معالجة "كلمة المرور" المشفرة (Base64) ---
const ENCODED_CREDENTIALS = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
const DECODED_CREDENTIALS = Buffer.from(ENCODED_CREDENTIALS, 'base64').toString('utf-8');
const CREDENTIALS = JSON.parse(DECODED_CREDENTIALS);

/**
 * دالة مساعدة لجلب قيمة الخلية بمرونة:
 * تبحث عن اسم العمود مع تجاهل المسافات الزائدة وحالة الأحرف.
 * @param {object} row - صف من Google Sheets.
 * @param {string} headerName - اسم العمود المطلوب (كما يظهر تقريباً).
 * @returns {string} - قيمة الخلية أو سلسلة فارغة.
 */
function getSafeValue(row, headerName) {
    const header = row._sheet.headerValues.find(h => h.trim().toLowerCase() === headerName.trim().toLowerCase());
    return header ? (row[header] || "") : "";
}

// نقطة النهاية الرئيسية
app.get("/", async (req, res) => {
  const empName = req.query.empName;
  if (!empName) {
    return res.status(400).json({ error: "Employee name not provided." });
  }
  try {
    // الاتصال بـ Google Sheets
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth(CREDENTIALS);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle[SHEET_NAME];
    if (!sheet) {
      return res.status(404).json({ error: `Sheet '${SHEET_NAME}' not found.` });
    }

    const rows = await sheet.getRows();

    // تصفية الصفوف حسب اسم الموظف المعين
    const filteredTasks = rows
      .filter(row => getSafeValue(row, "Assigned Employee").trim() === empName.trim())
      .map(row => ({
        RFQ:          getSafeValue(row, "RFQ"),
        RequestDate:  getSafeValue(row, "DATE/ RFQ"),   // التاريخ الصحيح من العمود DATE/ RFQ
        ResDate:      getSafeValue(row, "RES. DATE"),    // تاريخ الرد
        LineItem:     getSafeValue(row, "LINE ITEM"),
        PartNo:       getSafeValue(row, "PART NO"),
        Description:  getSafeValue(row, "DESCREPTION"),  // مطابق للجدول (مع الخطأ الإملائي)
        Qty:          getSafeValue(row, "QTY")           // الكمية من العمود QTY
      }));

    res.status(200).json(filteredTasks);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal server error.", details: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));