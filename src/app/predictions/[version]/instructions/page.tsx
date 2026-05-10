"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface ScoringRule {
  id: string;
  eventType: string;
  nameHe: string;
  points: number;
  isActive: boolean;
  order: number;
}

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
  const [matchRules, setMatchRules] = useState<ScoringRule[]>([]);

  useEffect(() => {
    fetch("/api/admin/scoring-rules")
      .then((r) => r.json())
      .then((data: ScoringRule[]) => Array.isArray(data) && setMatchRules(data))
      .catch(() => {});
  }, []);

  const activeRules = matchRules.filter((r) => r.isActive).sort((a, b) => a.order - b.order);

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

        <Section title="📋 סקירה כללית">
          <p className="text-gray-300 text-sm leading-relaxed">
            יש לכם <strong className="text-white">3 גרסאות</strong> לניחושים — כל גרסה היא הזדמנות נפרדת שתתחרה בטבלת הדירוג שלה.
            בכל גרסה ניתן לנחש שלושה דברים: תוצאות משחקי שלב הבתים, עמדות הקבוצות בכל בית, וברקט הנוקאאוט המלא.
          </p>
          <p className="text-gray-300 text-sm leading-relaxed">
            לכל גרסה יש <strong className="text-white">דד-ליין</strong> — לאחריו לא ניתן לשנות ניחושים בגרסה זו.
          </p>
        </Section>

        <Section title="⚽ ניחוש תוצאות משחקים">
          <p className="text-gray-300 text-sm leading-relaxed">
            ב<strong className="text-white">טאב "תוצאות משחקים"</strong> ניחשים את תוצאות 72 משחקי שלב הבתים.
            מזינים כמה גולים בית ואורח, לוחצים על <strong className="text-white">שמור ניחושים</strong>.
          </p>
          <p className="text-gray-500 text-xs">ניתן לסנן לפי בית או לפי תאריך. ניחושים שנשמרו מודגשים.</p>
        </Section>

        <Section title="🏅 ניקוד — משחקי שלב הבתים">
          {activeRules.length > 0 ? (
            activeRules.map((r) => (
              <Row key={r.id} label={r.nameHe} value={`${r.points} נקודות`} />
            ))
          ) : (
            <>
              <Row label="ניחוש מנצח נכון" value="3 נקודות" sub="ניחשת נכון מי ניצח (לא חייב תוצאה מדויקת)" />
              <Row label="תוצאה מדויקת" value="5 נקודות" sub="ניחשת את הניקוד המדויק — כולל ה-3 של מנצח נכון" />
              <Row label="ניחוש תיקו" value="2 נקודות" sub="ניחשת תיקו ויצא תיקו (ללא ציין מדויק)" />
              <Row label="ניחוש מפסיד נכון" value="1 נקודה" sub="ניחשת נכון מי הפסיד (גם כשהמנצח שגוי)" />
            </>
          )}
        </Section>

        <Section title="📊 עמדות קבוצות">
          <p className="text-gray-300 text-sm leading-relaxed">
            ב<strong className="text-white">טאב "עמדות קבוצות"</strong> מסדרים את 4 הנבחרות בכל בית לפי הסדר הצפוי שלהן (1-4).
            ניתן לגרור ולשחרר. הסדר נשמר עצמאית מניחוש התוצאות.
          </p>
          <p className="text-gray-500 text-xs">
            טיפ: לחץ "חשב מניחושי תוצאות" לסדר אוטומטי לפי הניחושים שלך.
          </p>
        </Section>

        <Section title="🏅 ניקוד — עמדות קבוצות">
          <Row label="ניחוש מקום 1 בבית" value="10 נקודות" sub="לכל בית שניחשת נכון מי יסיים ראשון" />
          <Row label="ניחוש מקום 2 בבית" value="7 נקודות" sub="לכל בית שניחשת נכון מי יסיים שני" />
          <Row label="ניחוש מקום 3 שעלה לסיבוב 32" value="4 נקודות" sub="רק אם הקבוצה אכן עלתה מהמקום השלישי" />
          <p className="text-gray-500 text-xs pt-1">
            יש 12 בתים (A–L) → מקסימום <strong className="text-gray-300">204 נקודות</strong> מעמדות קבוצות.
          </p>
        </Section>

        <Section title="🏆 ברקט נוקאאוט">
          <p className="text-gray-300 text-sm leading-relaxed">
            ב<strong className="text-white">טאב "ברקט"</strong> ניחשים את כל שלבי הנוקאאוט של מונדיאל 2026.
          </p>
          <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
            <li><strong className="text-white">סיבוב 32</strong> — עמדות 1/2 מתמלאות מעמדות הקבוצות, עמדות 3 נבחרות ידנית.</li>
            <li><strong className="text-white">שמינית גמר</strong> — מהמנצחים בסיבוב 32.</li>
            <li><strong className="text-white">רבע גמר, חצי גמר, גמר</strong> — לחץ על הנבחרת שלדעתך תנצח.</li>
          </ol>
          <p className="text-gray-500 text-xs pt-1">
            שינוי בחירה בשלב נמוך מנקה אוטומטית את השלבים הבאים.
          </p>
        </Section>

        <Section title="🏅 ניקוד — ברקט נוקאאוט">
          <Row label="הגעה לסיבוב 32" value="2 נקודות" />
          <Row label="הגעה לשמינית גמר" value="3 נקודות" />
          <Row label="הגעה לרבע גמר" value="5 נקודות" />
          <Row label="הגעה לחצי גמר" value="10 נקודות" />
          <Row label="הגעה לגמר" value="20 נקודות" />
          <Row label="אלוף" value="40 נקודות" />
          <p className="text-gray-500 text-xs pt-1">
            נבחרת שהגיעה לגמר = 2+3+5+10+20 = <strong className="text-gray-300">40 נקודות</strong> + 40 אם ניחשת אותה אלופה.
          </p>
        </Section>

        <Section title="🔄 גרסאות">
          <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
            <li>3 גרסאות עצמאיות — כל גרסה מתחרה בנפרד</li>
            <li>לכל גרסה דד-ליין משלה</li>
            <li>ניחושים בגרסה אחת לא משפיעים על גרסאות אחרות</li>
          </ul>
        </Section>

      </div>
    </div>
  );
}

