-- =============================================
-- PT100 FOUNDATION V3 — Phase 1 corrections
-- Timestamp: 20260913140000
-- =============================================

-- 1. Fix attendance_plan_type ENUM — add not_attending value
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'not_attending'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'attendance_plan_type')
  ) THEN
    ALTER TYPE public.attendance_plan_type ADD VALUE 'not_attending';
  END IF;
END $$;

-- 2. Fix score_value in existing seed data — set all to 1 (spec: 1 point per activity)
UPDATE public.schedule_events
SET score_value = 1
WHERE score_value != 1;

-- 3. Fix counts_for_score — Zoom events should count for score too
UPDATE public.schedule_events
SET counts_for_score = true
WHERE title ILIKE '%זום%';

-- 4. Add is_recurring_fixed column to schedule_events if not exists
ALTER TABLE public.schedule_events
  ADD COLUMN IF NOT EXISTS is_recurring_fixed BOOLEAN DEFAULT false;

-- Mark fixed zoom events as recurring
UPDATE public.schedule_events
SET is_recurring_fixed = true
WHERE is_fixed = true;

-- 5. Updated handle_new_user: match email to existing approved profile
--    If found → link auth user + insert into group_members
--    If not found → create unapproved entry (no group membership)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_profile_id UUID;
  v_pt100_group_id UUID;
BEGIN
  -- Check if an approved profile with this email already exists (pre-seeded by admin)
  SELECT id INTO v_existing_profile_id
  FROM public.user_profiles
  WHERE email = NEW.email AND is_approved = true
  LIMIT 1;

  IF v_existing_profile_id IS NOT NULL THEN
    -- Link the auth user to the existing approved profile
    UPDATE public.user_profiles
    SET id = NEW.id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_existing_profile_id;

    -- Insert into group_members for PT100
    SELECT id INTO v_pt100_group_id
    FROM public.groups
    WHERE name = 'PT100'
    LIMIT 1;

    IF v_pt100_group_id IS NOT NULL THEN
      INSERT INTO public.group_members (group_id, user_id)
      VALUES (v_pt100_group_id, NEW.id)
      ON CONFLICT (group_id, user_id) DO NOTHING;
    END IF;
  ELSE
    -- No approved profile found — create unapproved entry (no group membership)
    INSERT INTO public.user_profiles (id, email, display_name, is_approved, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      false,
      'member'::public.member_role
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-attach trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Add missing RLS policy: all approved members can read activity_completions (for leaderboard)
DROP POLICY IF EXISTS "members_read_all_completions" ON public.activity_completions;
CREATE POLICY "members_read_all_completions" ON public.activity_completions
FOR SELECT TO authenticated
USING (true);

-- 7. Add admin read policy for user_profiles (admin can see all profiles)
DROP POLICY IF EXISTS "admins_manage_all_profiles" ON public.user_profiles;
CREATE POLICY "admins_manage_all_profiles" ON public.user_profiles
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 8. Ensure PT100 group exists (idempotent)
INSERT INTO public.groups (name, description)
VALUES ('PT100', 'קבוצת PT100 — 30 חברים מאושרים')
ON CONFLICT (name) DO NOTHING;

-- 9. Seed 30 approved profiles (pre-seeded by admin, NOT via auth.users)
--    These profiles will be matched when members register via email/Google OAuth
--    profile_id is kept for legacy reference from members.ts
DO $$
DECLARE
  v_pt100_group_id UUID;
BEGIN
  SELECT id INTO v_pt100_group_id FROM public.groups WHERE name = 'PT100' LIMIT 1;

  -- Insert all 30 approved member profiles
  -- id is a placeholder UUID; will be replaced by handle_new_user when member authenticates
  INSERT INTO public.user_profiles (
    id, email, display_name, profile_id,
    life_work, relationship_status, hobbies, path_duration,
    connection_strength, desired_quality,
    is_approved, role, created_at, updated_at
  ) VALUES
    (gen_random_uuid(), 'shachar.cohen052@gmail.com', 'שחר כהן', 1,
     'חייל בצבא', 'רווק',
     'מוזיקה וספורט, מסחר בשוק ההון, תופים ו AI',
     'חצי שנה',
     'המסגרת, לראות אנשים קמים לשיעור בוקר עושה לי רצון להיות חלק',
     'עשיה מחוץ לקבלה, התכוללות בנינו.',
     true, 'admin'::public.member_role, NOW(), NOW()),

    (gen_random_uuid(), 'yoniberk199@gmail.com', 'יונתן', 30001,
     'מברקן, בן 27 קצין בחיל אוויר מתעסק בהנדסת מערכת', 'רווק',
     'ספורט, צלילה, טיולים',
     '9 שנים בדרך',
     'גדלות החברה והבורא, חשיבות וכוח להתמיד',
     'כוונה בעל מנת להשפיע',
     true, 'member'::public.member_role, NOW(), NOW()),

    (gen_random_uuid(), 'shayreshef1@gmail.com', 'שי רשף', 60001,
     'סטודנט טכנאי מחשבים ומנהל רשתות', 'רווק',
     'מנגל שר ומצייר אוהב סרטים ואנימה',
     '3 שנים',
     'ההתמדה שלהם. החברים נותנים לי ביטחון ברצינות שלהם',
     'הייתי רוצה לבוא יותר עם לב פתוח.',
     true, 'member'::public.member_role, NOW(), NOW()),

    (gen_random_uuid(), 'rondahan17@gmail.com', 'רון דהן', 90001,
     'רון, מנשר, מתעסק באדריכלות', 'רווק',
     'בישול, ציור, אנימה, מוזיקה אלקטרונית',
     'לפני שבע שנים',
     'תמיכה',
     'הייתי רוצה להיות יותר רגיש למצב של החברים',
     true, 'member'::public.member_role, NOW(), NOW()),

    (gen_random_uuid(), 'yehudasha@gmail.com', 'יהודה שדמון', 120001,
     'סטודנט להנדסאי מכונות בהתמחות רובוטיקה', 'יוצא עם מישהי חמודה',
     'מוסיקה, אלקטרוניקה, רובוטיקה, חקלאות',
     '4 שנים',
     'תפילות, לפעמים באמצע היום אני פשוט מרגיש שמישהו מתפלל עבור העשירייה',
     'יצירת מוזיקה משותפת',
     true, 'member'::public.member_role, NOW(), NOW()),

    (gen_random_uuid(), 'davidisofer@gmail.com', 'דוד סופר', 150001,
     'עובד בבנק, ומשתדל לחיות כמה שיותר בבני ברוך', 'בזוגיות',
     'טיולים, קצת שוק ההון והרבה מאמרי רב״ש',
     'מגיל 15',
     'כוח, גדלות וחשיבות, ותקווה',
     'גדלות המטרה, תמיכה ודוגמא',
     true, 'member'::public.member_role, NOW(), NOW()),

    (gen_random_uuid(), 'lior.elhan@gmail.com', 'ליאור אלחננוב', 180001,
     'יועץ מנכ״ל במשרד ממשלתי בירושלים', 'בזוגיות',
     'ספורט - כדורגל, טניס, צילום',
     'מאז שאני ילד',
     'מאוד מתפעל מלראות את החברים מידי יום יושבים בשיעור',
     'פתיחות, חיבור, סבלנות',
     true, 'member'::public.member_role, NOW(), NOW()),

    (gen_random_uuid(), 'daniel@danforce.com', 'דניאל ויזל', 210001,
     'אחראי על פיתוח שיווק ומיתוג של חברת אורטופדיה', 'נשוי',
     'חכמת הקבלה, פאדל, כדורסל, טניס, פוקר',
     'מגיל 24',
     NULL,
     'יזמות',
     true, 'member'::public.member_role, NOW(), NOW()),

    (gen_random_uuid(), 'israelsh95@gmail.com', 'ישראל שוסטרמן', 240001,
     'מורה לחינוך מיוחד בבית ספר יסודי', 'בזוגיות 3 וחצי שנים',
     'ספורט, כדורסל וNBA בפרט',
     'נולדתי בדרך',
     'מקבל מהם התפעלות גדולה יום יום',
     'כוונה לשרת את החברים ולחזק את החברים',
     true, 'member'::public.member_role, NOW(), NOW()),

    (gen_random_uuid(), 'bobcatman83@gmail.com', 'איתמר', 270001,
     NULL, NULL,
     'אוכל, אפייה',
     'נולדתי להורים בדרך',
     'חשיבות וגדלות המטרה',
     'דאגה עבור החברים',
     true, 'member'::public.member_role, NOW(), NOW()),

    (gen_random_uuid(), 'yardeng04@gmail.com', 'ירדן גבריאלי', 300001,
     'סטודנט לפסיכולוגיה וחינוך בבן גוריון', 'רווק',
     'טניס וכל תחומי המחבטים, גלישת קייט',
     'שנה בדרך',
     'אני מקבל דוגמא שאליה אני רוצה לשאוף',
     'השקעה — אני רוצה להשקיע יותר בחברים',
     true, 'member'::public.member_role, NOW(), NOW()),

    (gen_random_uuid(), 'yohayi.amar@gmail.com', 'יוחאי עמר', 330001,
     'עובד כנהג גרר', 'רווק',
     'רכבים, אופנועים, ספורט, שחיה, טיולים',
     '17 שנה במצטבר',
     'מקבל מהם נחישות, דוגמא חיובית להתמדה',
     'יותר סבלנות',
     true, 'member'::public.member_role, NOW(), NOW()),

    (gen_random_uuid(), 'sbskab11@gmail.com', 'שלמה בן שלום', 360001,
     'סטודנט ומועמד לגיוס', 'רווק',
     'טיול עם חברים',
     'נולדתי בה',
     'דאגה ע״פ בקורת',
     'מחויבות עצמית והתחייבות כלפי האחרים',
     true, 'member'::public.member_role, NOW(), NOW()),

    (gen_random_uuid(), 'shimirain@gmail.com', 'שימי', 390001,
     'עבדתי כרל״ש וכמנהל התקשורת של שר החינוך', 'רווק',
     'הפצה ופיתוח קהילת הצעירים',
     'ההורים שלי הגיעו כשהייתי בן 3',
     'הדוגמה שאני מקבל מכל חבר נותנת כוח אדיר',
     NULL,
     true, 'member'::public.member_role, NOW(), NOW()),

    (gen_random_uuid(), 'pangolier58@gmail.com', 'מיכאל חיימוב', 420001,
     'עובד בשיטור עירוני תל אביב', 'בזוגיות',
     'מוזיקה, ספורט, התפתחות אישית',
     'בערך חצי שנה',
     'היחס, האהבה הבלתי פוסקת, הרצון להשפיע',
     'הייתי רוצה להביא מעצמי יותר פתיחות',
     true, 'member'::public.member_role, NOW(), NOW()),

    (gen_random_uuid(), 'yarden326181724@gmail.com', 'טל בורנשטיין', 510001,
     'הנדסאי חשמל ועובד בחברת החשמל', 'רווק',
     'דלג',
     'בסביבות 10 שנים',
     'התמדה — אני רואה איך החברים משקיעים',
     'הייתי רוצה להביא יותר חשיבות לדרך',
     true, 'member'::public.member_role, NOW(), NOW()),

    (gen_random_uuid(), 'or.shperling1@gmail.com', 'אור', 540001,
     'מורה נהיגה ויצרן ליקרים', 'רווק',
     'מכוניות, כסף, חוקים ושווארמה',
     '6 וחצי שנים',
     'האינטנסיביות, והטוטאליות של החברים',
     'הקרבה',
     true, 'member'::public.member_role, NOW(), NOW()),

    (gen_random_uuid(), 'shshadmon@gmail.com', 'שלמה שדמון', 630001,
     'יזם ומוזיקאי', 'רווק',
     'ספורט, מוזיקה, יזמות, אקטואליה',
     'מהיום שנולדתי',
     'גדלות המטרה! — מוטיבציה לבוא לשעורים',
     'נכונות לעשייה רוחנית',
     true, 'member'::public.member_role, NOW(), NOW()),

    (gen_random_uuid(), 'baruch.ratz@gmail.com', 'ברוך רץ', 660001,
     'עדיין בצה״ל', 'רווק',
     'מוזיקה, צילום, כל נושא אקראי בעולם',
     'הגעתי דרך ההורים לפני 21 שנה',
     'השקעה מעבר למצופה דוגמה של חברים',
     'באמת להראות אהבה',
     true, 'member'::public.member_role, NOW(), NOW()),

    (gen_random_uuid(), 'alex.mizrachi@gmail.com', 'אלכס מזרחי', 690001,
     'מנהל טכני בבני ברוך', 'נשוי ויש לי 4 בנות',
     'טכנולוגיה בעיקר',
     'בדרך 20 שנה',
     'תמיד מיזק אותי לראות את החברים בהתלהבות',
     NULL,
     true, 'member'::public.member_role, NOW(), NOW()),

    (gen_random_uuid(), '2021nati.mn@gmail.com', 'נתנאל בן עיון', 720001,
     'עובד בצהל', 'רווק',
     'אנימה, קפוארה',
     '3 שנים',
     'שיחות זום היומיות',
     'התמדה',
     true, 'member'::public.member_role, NOW(), NOW()),

    (gen_random_uuid(), 'noamabbb@gmail.com', 'נועם אבואב', 750001,
     'בן 23 מפתח תקווה', 'רווק',
     'ספורט',
     'מלידה, אבל נכנסתי לפני שנה מרצון עצמאי',
     'מקבל דוגמה אישית, חשיבות וגדלות המטרה',
     'הקשבה, נתינה, קרבה והמון התמדה',
     true, 'member'::public.member_role, NOW(), NOW()),

    (gen_random_uuid(), 'akuo8181@gmail.com', 'שלום לוי', 810001,
     'bi, מחפש דרכים להרחיב את ההסתכלות שלי', 'רווק',
     'סוציולוגיה, שפת גוף, תקשורת בן אישית',
     'נולדתי בדרך, בשיעורים קבוע מ 16.5',
     'בושה מהחברים, שהם עושים כל כך הרבה',
     'שמחה, דוגמה אישית',
     true, 'member'::public.member_role, NOW(), NOW())

  ON CONFLICT (email) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    profile_id = EXCLUDED.profile_id,
    life_work = EXCLUDED.life_work,
    relationship_status = EXCLUDED.relationship_status,
    hobbies = EXCLUDED.hobbies,
    path_duration = EXCLUDED.path_duration,
    connection_strength = EXCLUDED.connection_strength,
    desired_quality = EXCLUDED.desired_quality,
    is_approved = true,
    updated_at = NOW();

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Seed profiles insertion error: %', SQLERRM;
END $$;

-- 10. Verify exactly 30 approved members
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.user_profiles WHERE is_approved = true;
  RAISE NOTICE 'Approved members count: %', v_count;
END $$;
