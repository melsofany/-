const express = require("express");
const { GoogleSpreadsheet } = require("google-spreadsheet");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8080;

// --- قراءة الإعدادات من متغيرات البيئة ---
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || "data"; // اسم الشيت المصدر
const CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);

// دالة مساعدة ذكية لجلب القيمة بغض النظر عن حالة الأحرف أو المسافات
function getSafeValue(row, headerName) {
    const header = row._sheet.headerValues.find(h => h.trim().toLowerCase() === headerName.trim().toLowerCase());
    return header ? (row[header] || "") : "";
}

app.get("/", async (req, res) => {
  const empName = req.query.empName;
  if (!empName) {
    return res.status(400).json({ error: "Employee name not provided. Use ?empName=NAME" });
  }
  try {
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth(CREDENTIALS);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle[SHEET_NAME];
    if (!sheet) {
      return res.status(404).json({ error: `Sheet '${SHEET_NAME}' not found.` });
    }
    const rows = await sheet.getRows();
    
    const filteredTasks = rows
      .filter(row => getSafeValue(row, "Assigned Employee").trim() === empName.trim())
      .map(row => ({
        // --- **هذا هو التعديل الرئيسي والمهم** ---
        // الجهة اليمنى: الأسماء كما هي في شيت "data"
        // الجهة اليسرى: الأسماء التي سيفهمها الإكسيل (شيت "Tasks")
        
        RFQ:          getSafeValue(row, "RFQ"),
        RequestDate:  getSafeValue(row, "(DATE/ RFQ)"), // اسم العمود في شيت data
        ResDate:      getSafeValue(row, "RES. DATE"),   // اسم العمود في شيت data
        LineItem:     getSafeValue(row, "LINE ITEM"),   // اسم العمود في شيت data
        PartNo:       getSafeValue(row, "PART NO"),     // اسم العمود في شيت data
        Description:  getSafeValue(row, "DESCREPTION"), // اسم العمود في شيت data
        Qty:          getSafeValue(row, "QTY/")         // اسم العمود في شيت data
      }));
      
    res.status(200).json(filteredTasks);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal server error.", details: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
