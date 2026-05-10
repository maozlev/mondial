"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
      <h2 className="text-base font-bold text-yellow-400">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-gray-800 last:border-0">
      <span className="text-gray-300 text-sm">{label}</span>
      <div className="text-right">
        <span className="text-white font-semibold text-sm">{value}</span>
        {sub && <div className="text-gray-500 text-xs mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function InstructionsPage() {
  const { version } = useParams<{ version: string }>();
  const versionNum = parseInt(version, 10);

  return (
    <div className="max-w-2xl mx-auto px-3 py-6" dir="rtl">

      {/* Sub-nav */}
      <div className="flex gap-1 mb-6 border-b border-gray-800 pb-0 overflow-x-auto">
        <Link href={`/predictions/${versionNum}`} className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap border-b-2 border-transparent">
          תוצאות משחקים
        </Link>
        <Link href={`/predictions/${versionNum}/standings`} className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap border-b-2 border-transparent">
          עמדות קבוצות
        </Link>
        <Link href={`/predictions/${versionNum}/bracket`} className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap border-b-2 border-transparent">
          ברקט
        </Link>
        <span className="px-3 py-2 text-sm text-white font-semibold whitespace-nowrap border-b-2 border-yellow-400">
          הוראות
        </span>
      </div>

      <h1 className="text-xl font-bold text-white mb-1">הוראות המשחק</h1>
      <p className="text-gray-400 text-sm mb-6">מדריך מלא לניחושים ולמערכת הניקוד</p>

      <div className="space-y-5">

        {/* Overview */}
        <Section title="📋 סקירה כללית">
          <p className="text-gray-300 text-sm leading-relaxed">
            יש לכם <strong className="text-white">3 גרסאות</strong> לניחושים — כל גרסה היא הזדמנות נפרדת שתתחרה בטבלת הדירוג שלה.
            בכל גרסה ניתן לנחש שלושה דברים: תוצאות משחקי שלב הבתים, עמדות הקבוצות בכל בית, וברקט הנוקאאוט המלא.
          </p>
          <p className="text-gray-300 text-sm leading-relaxed">
            לכל גרסה יש <strong className="text-white">דד-ליין</strong> — לאחריו לא ניתן לשנות ניחושים בגרסה זו.
            ניתן לשמור ולעדכן ניחושים בכל עת עד לדד-ליין.
          </p>
        </Section>

        {/* Tab 1: Match predictions */}
        <Section title="⚽ ניחוש תוצאות משחקים">
          <p className="text-gray-300 text-sm leading-relaxed">
            ב<strong className="text-white">טאב "תוצאות משחקים"</strong> ניחשים את תוצאות 72 משחקי שלב הבתים.
            מזינים כמה גולים בית ואורח, לוחצים על <strong className="text-white">שמור הכל</strong> בסוף.
          </p>
          <p className="text-gray-500 text-xs">ניתן לסנן לפי בית או לפי תאריך. ניחושים שנשמרו מודגשים.</p>
        </Section>

        {/* Scoring - matches */}
        <Section title="🏅 ניקוד — משחקי שלב הבתים">
          <Row label="ניחוש מנצח נכון" value="3 נקודות" sub="ניחשת נכון מי ניצח (לא חייב תוצאה מדויקת)" />
          <Row label="תוצאה מדויקת" value="5 נקודות" sub="ניחשת את הניקוד המדויק — כולל ה-3 של מנצח נכון" />
          <Row label="ניחוש תיקו" value="2 נקודות" sub="ניחשת תיקו ויצא תיקו (ללא ציין מדויק)" />
          <Row label="ניחוש מפסיד נכון" value="1 נקודה" sub='ניחשת נכון מי הפסיד (גם כשהמנצח שגוי)' />
          <p className="text-gray-500 text-xs pt-1">
            הנקודות מצטברות — תוצאה מדויקת = 5 נק׳ + 1 נק׳ למפסיד = <strong className="text-gray-300">6 נקודות סה״כ</strong>.
          </p>
        </Section>

        {/* Tab 2: Standings */}
        <Section title="📊 עמדות קבוצות">
          <p className="text-gray-300 text-sm leading-relaxed">
            ב<strong className="text-white">טאב "עמדות קבוצות"</strong> מסדרים את 4 הנבחרות בכל בית לפי הסדר הצפוי שלהן (1-4).
            ניתן לגרור ולשחרר או להשתמש בחיצים. הסדר נשמר עצמאית מניחוש התוצאות.
          </p>
          <p className="text-gray-500 text-xs">
            טיפ: ניתן ללחוץ "חשב מניחושי תוצאות" כדי שהמערכת תחשב אוטומטית את הסדר לפי ניחושי ה-72 משחקים שלך.
          </p>
        </Section>

        {/* Scoring - standings */}
        <Section title="🏅 ניקוד — עמדות קבוצות">
          <Row label="ניחוש מקום 1 בבית" value="10 נקודות" sub="לכל בית שניחשת נכון מי יסיים ראשון" />
          <Row label="ניחוש מקום 2 בבית" value="7 נקודות" sub="לכל בית שניחשת נכון מי יסיים שני" />
          <Row label="ניחוש מקום 3 שעלה לסיבוב 32" value="4 נקודות" sub="רק אם הקבוצה אכן עלתה מהמקום השלישי" />
          <p className="text-gray-500 text-xs pt-1">
            יש 12 בתים (A–L) → מקסימום <strong className="text-gray-300">204 נקודות</strong> מעמדות קבוצות.
          </p>
        </Section>

        {/* Tab 3: Bracket */}
        <Section title="🏆 ברקט נוקאאוט">
          <p className="text-gray-300 text-sm leading-relaxed">
            ב<strong className="text-white">טאב "ברקט"</strong> ניחשים את כל שלבי הנוקאאוט של מונדיאל 2026.
            השלבים מתמלאים אוטומטית מלמטה למעלה:
          </p>
          <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
            <li><strong className="text-white">סיבוב 32</strong> — 16 משחקים. עמדות rank1/rank2 מתמלאות מעמדות הקבוצות. עמדות rank3 בוחרים ידנית מהתפריט.</li>
            <li><strong className="text-white">שמינית גמר</strong> — 8 משחקים. מתמלא מהמנצחים שבחרת בסיבוב 32.</li>
            <li><strong className="text-white">רבע גמר</strong> — 4 משחקים. לחץ על הנבחרת שלדעתך תנצח.</li>
            <li><strong className="text-white">חצי גמר</strong> — 2 משחקים.</li>
            <li><strong className="text-white">גמר</strong> — בחר אלוף!</li>
          </ol>
          <p className="text-gray-500 text-xs pt-1">
            שינוי בחירה בשלב נמוך מנקה אוטומטית את כל השלבים הבאים עבור אותה נבחרת.
          </p>
        </Section>

        {/* Scoring - bracket */}
        <Section title="🏅 ניקוד — ברקט נוקאאוט">
          <Row label="ניחוש נבחרת לסיבוב 32" value="2 נקודות" sub="לכל נבחרת שניחשת שתגיע לסיבוב 32 ואכן הגיעה" />
          <Row label="ניחוש נבחרת לשמינית גמר" value="3 נקודות" />
          <Row label="ניחוש נבחרת לרבע גמר" value="5 נקודות" />
          <Row label="ניחוש נבחרת לחצי גמר" value="10 נקודות" />
          <Row label="ניחוש נבחרת לגמר" value="20 נקודות" />
          <Row label="ניחוש האלוף" value="40 נקודות" />
          <p className="text-gray-500 text-xs pt-1">
            נבחרת שניחשת שתגיע לגמר ואכן הגיעה = 2+3+5+10+20 = <strong className="text-gray-300">40 נקודות בסיס</strong> + 40 אם ניחשת אותה אלופה.
          </p>
        </Section>

        {/* Versions */}
        <Section title="🔄 גרסאות">
          <p className="text-gray-300 text-sm leading-relaxed">
            קיימות 3 גרסאות ניחוש עצמאיות. כל גרסה:
          </p>
          <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
            <li>מתחרה בטבלת דירוג נפרדת</li>
            <li>יש לה דד-ליין משלה</li>
            <li>ניחושים בגרסה אחת לא משפיעים על גרסאות אחרות</li>
          </ul>
          <p className="text-gray-500 text-xs pt-1">
            הניצחון בגרסה אחת מספיק — לכן שתלו קבוצות שונות בגרסאות השונות!
          </p>
        </Section>

      </div>
    </div>
  );
}
