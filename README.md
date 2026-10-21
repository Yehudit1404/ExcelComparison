# השוואת קבצי אקסל

אתר להשוואה בין קובץ אקסל **חיצוני** לקובץ אקסל **פנימי** לפי העמודה "מספר פריט".
האתר מציג את השורות המלאות שקיימות רק באחד הקבצים, ומאפשר להוריד אותן לאקסל.

האתר עובד **בלי חיבור לאינטרנט**, והקבצים מעובדים בדפדפן בלבד ואינם נשלחים לשום מקום.

## כללי ההשוואה

- אין הבדל בין אותיות גדולות לקטנות (`ab123` = `AB123`).
- מתעלמים מאפסים לפני האותיות (`0CD5` = `CD5`).
- אפס אחרי האותיות הוא חלק מהמספר (`EF012` ≠ `EF12`).
- מתעלמים מרווחים (`GH 7` = `GH7`).
- נקרא הגיליון הראשון בכל קובץ, והכותרות בשורה הראשונה.
- שורות בלי מספר פריט אינן נכללות בהשוואה (האתר מציין כמה כאלה היו).
- נתמכים קבצי ‎`.xlsx`. קובץ ‎`.xls` ישן יש לשמור מחדש כ-‎`.xlsx` מתוך אקסל.

## טכנולוגיות

- **Angular 17** (17.2 ומעלה), עם אותן גרסאות חבילות כמו בפרויקטי Angular 17 בארגון, בלי שום ספרייה נוספת.
- קריאה וכתיבה של קבצי אקסל נעשות בקוד של הפרויקט (`src/app/core/xlsx`),
  בעזרת יכולות מובנות של הדפדפן (`DecompressionStream`, `CompressionStream`, `DOMParser`).
  נדרש דפדפן Chrome או Edge בגרסה 80 ומעלה, או Firefox בגרסה 113 ומעלה.
- בדיקות: Karma + Jasmine (קבצי `*.spec.ts`). חבילות הבדיקה לא מותקנות כברירת מחדל, ראו בהמשך.

## מבנה הפרויקט

```
src/app/
├── app.component.*                  המסך הראשי: העלאה, השוואה, תוצאות והורדה
├── core/
│   ├── item-key.ts                  ניקוי מספר הפריט לפני ההשוואה (כללי ההשוואה)
│   ├── compare.ts                   ההשוואה בין שני הקבצים
│   ├── excel.service.ts             קריאת קובץ אקסל ויצירת קובץ להורדה
│   ├── sheet.model.ts               הגדרות הטיפוסים (קובץ, שורה, תא)
│   └── xlsx/
│       ├── zip.ts                   פתיחה ויצירה של קובץ ZIP (קובץ xlsx הוא ZIP של קבצי XML)
│       ├── xlsx-reader.ts           קריאת הגיליון הראשון
│       └── xlsx-writer.ts           יצירת קובץ xlsx עם גיליונות מימין לשמאל
└── components/
    ├── file-drop/                   תיבת העלאת קובץ (לחיצה או גרירה)
    └── result-table/                טבלת תוצאות עם כפתור הורדה
scripts/build-offline.mjs            יוצר קובץ HTML אחד שנפתח בלחיצה כפולה
```

## הרצה

```bash
npm install
npm start               # פיתוח: האתר עולה בכתובת http://localhost:4200
npm run build           # בנייה רגילה לשרת, התוצאה בתיקייה dist/excel-comparison/browser
npm run build:offline   # קובץ אחד: dist/offline/excel-comparison.html
```

נדרש Node.js בגרסה 18.13 ומעלה, או 20.

אם `npm install` נחסם במאגר החבילות של הארגון, אפשר להעתיק לכאן את `package-lock.json`
מפרויקט Angular 17 אחר שעובד, ולהריץ שוב `npm install`.

### הרצת הבדיקות (לא חובה)

```bash
npm install --no-save @types/jasmine@~5.1.0 jasmine-core@~5.1.0 karma@~6.4.0 karma-chrome-launcher@~3.2.0 karma-coverage@~2.2.0 karma-jasmine@~5.1.0 karma-jasmine-html-reporter@~2.1.0
npx ng test
```

### שימוש במחשב בלי אינטרנט

הדרך הפשוטה: מריצים `npm run build:offline` ומעבירים את הקובץ
`dist/offline/excel-comparison.html` למחשב. פותחים אותו בלחיצה כפולה, ולא צריך שרת או התקנה.

## חבילה מוכנה ל-Windows (ענף windows-package)

בענף הזה יש את הקובץ `ExcelComparison.zip`: הפרויקט כולו כולל `node_modules` לגרסת Windows (64 ביט),
`start.bat` להפעלת האתר במצב פיתוח, ו-`excel-comparison.html` המוכן. לא צריך להריץ `npm install`.

הורדה: https://github.com/Yehudit1404/ExcelComparison/raw/windows-package/ExcelComparison.zip
