/**
 * Arabic is the source of truth. Add keys here first — TypeScript will refuse
 * to compile until en.ts has every one of them too.
 */
// ═══════════════════════════════════════════════════════════════════════════
// HOW THIS FILE IS USED
//
// It is a plain nested object of text. Nothing clever happens in here — the
// machinery lives in ../translate.ts and ../dictionary.ts, which read this
// file's TYPE to build their guarantees.
//
// The nesting is what creates the dotted keys you call `t()` with:
//
//   ar.common.search   →  t("common.search")
//   ar.nav.home        →  t("nav.home")
//
// ── Adding a new string ──
// 1. Add it here, in the group it belongs to.
// 2. The build immediately breaks, because en.ts no longer matches.
// 3. Add the English. The build passes.
//
// That failure in step 2 is the entire point: a half-translated screen cannot
// reach production, because it cannot compile.
//
// ── Why `as const` at the very bottom of the file ──
// It makes TypeScript infer each value as its exact literal ("بحث") rather
// than the general type `string`. `NestedKey` in ../translate.ts then walks
// that precise shape to build the union of every valid key path — which is
// what gives you autocomplete on `t()` and a compile error on a typo.
//
// Remove `as const` and the type collapses to plain `string`, the key union
// falls apart, and `t("anything.at.all")` starts compiling. So leave it there.
// ═══════════════════════════════════════════════════════════════════════════
export const ar = {
  common: {
    appName: "دليل اللياقة",
    search: "بحث",
    cancel: "إلغاء",
    confirm: "تأكيد",
    save: "حفظ",
    retry: "إعادة المحاولة",
    loading: "جارٍ التحميل",
    back: "رجوع",
    viewAll: "عرض الكل",
    from: "يبدأ من",
    close: "إغلاق",
  },
  nav: {
    menu: "القائمة",
    home: "الرئيسية",
    explore: "الأندية",
    memberships: "اشتراكاتي",
    profile: "حسابي",
    admin: "لوحة التحكم",
    myGym: "ناديي",
  },
  home: {
    // The brochure's own headline, under the FITNESS GUIDE wordmark:
    // "كل ما تحتاجه في عالم اللياقة... في تطبيق واحد".
    // The title carries the full vision; the subtitle stays honest about
    // what is actually live today.
    title: "كل ما تحتاجه في عالم اللياقة",
    subtitle:
      "منصة واحدة تجمع الأندية والمدربين والتغذية والطب الرياضي. نبدأ بالأندية في الكويت.",
    nearbyGyms: "أندية قريبة",
    todaysOffers: "عروض اليوم",
    searchPlaceholder: "ابحث عن نادٍ أو منطقة",
    searchAction: "بحث",
  },
  ads: {
    // مساحات الإعلان فارغة إلى أن يأتي معلن حقيقي. لا نضع شعار أي شركة
    // بدون إذن مكتوب منها.
    label: "إعلان",
    empty: "مساحة إعلانية متاحة",
  },
  footer: {
    tagline: "بوابتك إلى مجتمع اللياقة",
    links: "روابط",
    contact: "تواصل معنا",
    phone: "الهاتف",
    email: "البريد الإلكتروني",
    address: "العنوان",
    addressValue: "الكويت — حولي — السالمية",
    pending: "يُحدَّد لاحقاً",
    demo: "نسخة تجريبية — ليست خدمة فعلية بعد",
  },
  sections: {
    // الأقسام العشرة من تصميم عماد، بترتيب صفحته الرئيسية نفسه.
    // البنود الفرعية تحت كل قسم منقولة من التصميم كما هي.
    title: "كل أقسام دليل اللياقة",
    subtitle: "نبدأ بالأندية، وبقية الأقسام في الطريق",
    available: "متاح الآن",
    soon: "قريباً",

    offers: "العروض والخصومات",
    offers1: "عروض يومية",
    offers2: "كوبونات خصم",
    offers3: "صفقات حصرية",
    offers4: "خصومات الاشتراكات",

    gyms: "الأندية",
    gyms1: "أندية رجال",
    gyms2: "أندية نساء",
    gyms3: "الاشتراكات",
    gyms4: "العروض والخصومات",

    trainers: "المدرب الشخصي",
    trainers1: "مدربون",
    trainers2: "مدربات",
    trainers3: "تدريب حضوري",
    trainers4: "تدريب أونلاين",

    equipment: "المعدات الرياضية",
    equipment1: "أجهزة منزلية",
    equipment2: "أجهزة ثقيلة",
    equipment3: "إكسسوارات رياضية",

    doctors: "الأطباء",
    doctors1: "طبيب تغذية",
    doctors2: "علاج طبيعي",
    doctors3: "طبيب إصابات رياضية",

    labs: "الفحوصات المخبرية",
    labs1: "مختبرات معتمدة",
    labs2: "تحاليل طبية",
    labs3: "العروض والخصومات",

    sportswear: "الملابس الرياضية",
    sportswear1: "ملابس رجالية",
    sportswear2: "ملابس نسائية",
    sportswear3: "أحذية وإكسسوارات",

    restaurants: "مطاعم الدايت",
    restaurants1: "مطاعم صحية",
    restaurants2: "وجبات دايت",
    restaurants3: "اشتراكات",
    restaurants4: "العروض والخصومات",

    supplements: "المكملات الغذائية",
    supplements1: "بروتينات",
    supplements2: "فيتامينات",
    supplements3: "أحماض أمينية",
    supplements4: "أعشاب ومكملات طبيعية",

    complaints: "الشكاوى والاقتراحات",
    complaints1: "تقديم شكوى",
    complaints2: "تقديم اقتراح",
    complaints3: "تقييم الخدمات",
    complaints4: "متابعة الطلب",
  },
  gymsPage: {
    // صفحة قسم الأندية — التصميم يبدأ بأزرار رجال/نساء/مختلط، وهي الطريقة
    // الأساسية للدخول حسب جواب عماد.
    title: "الأندية",
    subtitle: "اعثر على النادي المناسب لك",
    men: "أندية الرجال",
    women: "أندية النساء",
    mixed: "أندية مختلطة",
    offers: "عروض وخصومات",
    menDesc: "أندية للرجال فقط",
    womenDesc: "أندية للنساء فقط",
    mixedDesc: "صالة واحدة للجميع",
    offersDesc: "أندية عليها خصم الآن",
    countOne: "نادٍ",
    countMany: "نادٍ",
  },
  gym: {
    verified: "نادٍ موثّق",
    pendingReview: "قيد المراجعة",
    reviews: {
      zero: "تقييمات",
      one: "تقييم",
      two: "تقييمان",
      few: "تقييمات",
      many: "تقييماً",
      other: "تقييم",
    },
    startingFrom: "يبدأ من",
    viewPlans: "عرض الاشتراكات",
    openNow: "مفتوح الآن",
    closed: "مغلق",
    about: "عن النادي",
    amenities: "المرافق",
    hours: "ساعات العمل",
    location: "الموقع",
    directions: "الاتجاهات",
    plansTitle: "الاشتراكات",
    reviewsTitle: "التقييمات",
    writeReview: "أضف تقييمك",
    reviewLocked: "التقييم متاح للأعضاء المشتركين فقط",
    noReviews: "لا توجد تقييمات بعد",
    photos: "الصور",
  },
  access: {
    men: "رجال",
    women: "نساء",
    mixed: "مختلط",
    separateSections: "أقسام منفصلة",
  },
  amenity: {
    parking: "موقف سيارات",
    sauna: "ساونا",
    classes: "حصص جماعية",
    childcare: "حضانة أطفال",
    pool: "مسبح",
    lockers: "خزائن",
    personalTraining: "تدريب شخصي",
    cardio: "أجهزة كارديو",
    freeWeights: "أوزان حرة",
  },
  plan: {
    dayPass: "دخول يومي",
    monthly: "شهري",
    quarterly: "ربع سنوي",
    halfYearly: "نصف سنوي",
    yearly: "سنوي",
    choose: "اختيار",
    exclusive: "عرض حصري",
    save: "وفّر",
  },
  explore: {
    title: "استكشف الأندية",
    // Six plural forms — see pluralForm() in @fg/i18n. English fills all six
    // too so both dictionaries keep the same shape; it only ever uses two.
    results: {
      zero: "أندية",
      one: "نادٍ",
      two: "ناديان",
      few: "أندية",
      many: "نادياً",
      other: "نادٍ",
    },
    noResults: "لا توجد أندية مطابقة",
    noResultsHint: "جرّب توسيع البحث أو إزالة بعض الفلاتر",
    clearFilters: "مسح الفلاتر",
    searchPlaceholder: "ابحث باسم النادي أو المنطقة",
    filterArea: "المحافظة",
    filterCity: "المنطقة",
    filterAccess: "النوع",
    filterAll: "الكل",
    sortBy: "ترتيب حسب",
    sortPriceLow: "الأقل سعراً",
    sortRating: "الأعلى تقييماً",
  },
  governorate: {
    capital: "العاصمة",
    hawalli: "حولي",
    farwaniya: "الفروانية",
    ahmadi: "الأحمدي",
    jahra: "الجهراء",
    mubarakAlKabeer: "مبارك الكبير",
  },
  checkout: {
    title: "إتمام الشراء",
    orderSummary: "ملخص الطلب",
    subtotal: "المجموع الفرعي",
    discount: "الخصم",
    total: "الإجمالي",
    paymentMethod: "طريقة الدفع",
    payWithKnet: "الدفع عبر كي نت",
    payWithCard: "الدفع بالبطاقة",
    payNow: "ادفع الآن",
    startDate: "تاريخ البدء",
    startsToday: "يبدأ اليوم",
    securedNote: "الدفع يتم عبر بوابة آمنة",
    demoNote: "هذه نسخة تجريبية — لن يتم خصم أي مبلغ",
  },
  confirmation: {
    title: "تم تأكيد اشتراكك",
    subtitle: "أصبح بإمكانك الدخول إلى النادي باستخدام رمز الدخول",
    viewCard: "عرض بطاقة العضوية",
    backHome: "العودة للرئيسية",
    reference: "رقم العملية",
  },
  membership: {
    title: "اشتراكاتي",
    showQr: "إظهار رمز الدخول",
    checkedIn: "تم تسجيل الدخول",
    expiresOn: "ينتهي في",
    startsOn: "يبدأ في",
    renew: "تجديد",
    active: "نشط",
    expired: "منتهي",
    frozen: "مجمّد",
    pendingPayment: "بانتظار الدفع",
    cancelled: "ملغي",
    none: "لا توجد اشتراكات بعد",
    noneHint: "تصفّح الأندية واشترك في النادي المناسب لك",
    browseGyms: "تصفّح الأندية",
    scanAtGym: "امسح هذا الرمز عند مدخل النادي",
    memberSince: "عضو منذ",
    cardHint: "يعمل الرمز بدون اتصال بالإنترنت",
  },
  auth: {
    identifierLabel: "اسم المستخدم أو رقم الهاتف",
    passwordLabel: "كلمة المرور",
    signOut: "تسجيل الخروج",
    signIn: "تسجيل الدخول",
    // The header shows both doors when signed out, so each has to say which
    // audience it is for. "تسجيل الدخول" alone would be ambiguous beside it.
    gymSignIn: "دخول الأندية",
    loginRequired: "سجّل الدخول لعرض اشتراكاتك",
    failed: "اسم المستخدم أو كلمة المرور غير صحيحة",

    // باب الأعضاء
    memberTitle: "دخول الأعضاء",
    memberSubtitle: "لعرض اشتراكاتك وبطاقة الدخول",
    memberPlaceholder: "emad أو 51338855",
    memberDemo: "حسابات تجريبية: emad أو rodi — كلمة المرور 123",
    toPartner: "هل تدير نادياً؟ ادخل من هنا",
    wrongDoorMember: "هذا الحساب خاص بالأندية. استخدم دخول الأندية بالأسفل.",

    // باب الأندية
    partnerTitle: "دخول الأندية",
    partnerSubtitle: "لإدارة ناديك وأسعارك وأعضائك",
    partnerPlaceholder: "ironclub",
    partnerDemo: "حسابات تجريبية: ironclub أو admin — كلمة المرور 123",
    toMember: "هل أنت عضو؟ ادخل من هنا",
    wrongDoorPartner: "هذا حساب عضو. استخدم دخول الأعضاء بالأسفل.",
  },
  admin: {
    usersTitle: "المستخدمون",
    usersSubtitle: "كل الحسابات المسجّلة في المنصة",
    gymsTitle: "الأندية",
    gymsSubtitle: "كل الأندية وتفاصيلها",
    colUser: "المستخدم",
    colUsername: "اسم المستخدم",
    colPhone: "رقم الهاتف",
    colRole: "الصلاحية",
    colLocale: "اللغة",
    colMemberships: "الاشتراكات",
    colActive: "نشطة",
    colTotalPaid: "إجمالي المدفوع",
    colGym: "النادي",
    colArea: "المنطقة",
    colAccess: "النوع",
    colStatus: "الحالة",
    colRating: "التقييم",
    colPlans: "الباقات",
    colMembers: "الأعضاء",
    colRevenue: "الإيرادات",
    roleMember: "عضو",
    roleAdmin: "مسؤول",
    roleGymOwner: "مالك نادٍ",
    roleGymStaff: "موظف نادٍ",
    noPhone: "لا يوجد",
    total: "الإجمالي",

    // أقسام لوحة المسؤول
    tabOverview: "نظرة عامة",
    tabGyms: "الأندية",
    tabUsers: "المستخدمون",
    tabMemberships: "الاشتراكات",
    tabCheckIns: "سجل الدخول",
    tabPayments: "المدفوعات",

    overviewTitle: "نظرة عامة",
    overviewSubtitle: "كل ما يجري على المنصة",
    statGyms: "الأندية",
    statVerified: "موثّقة",
    statUsers: "الحسابات",
    statMembers: "الأعضاء",
    statMemberships: "الاشتراكات",
    statActive: "نشطة",
    statGross: "إجمالي المبيعات",
    statPlatform: "عمولة المنصة",
    statGymShare: "حصة الأندية",
    statCheckIns: "عمليات الدخول",

    membershipsTitle: "كل الاشتراكات",
    membershipsSubtitle: "كل اشتراك في كل نادٍ",
    checkInsTitle: "كل عمليات الدخول",
    checkInsSubtitle: "كل مسح لرمز الدخول في كل نادٍ",
    paymentsTitle: "المدفوعات",
    paymentsSubtitle: "كل عملية دفع وحصة المنصة منها",

    colMember: "العضو",
    colPlan: "الباقة",
    colDate: "التاريخ",
    colTime: "الوقت",
    colAmount: "المبلغ",
    colFee: "عمولة المنصة",
    colGymShare: "حصة النادي",
    colRate: "النسبة",
    colMethod: "طريقة الدفع",
    paid: "مدفوع",
    refunded: "مسترجع",
    methodKnet: "كي نت",
    methodCard: "بطاقة",
    noRows: "لا توجد بيانات بعد",
    recentOnly: "أحدث العمليات فقط",
  },
  manage: {
    myGym: "نادي",
    profileTitle: "بيانات النادي",
    profileSubtitle: "ما يظهر للأعضاء في صفحة النادي",
    plansTitle: "إدارة الاشتراكات",
    plansSubtitle: "الأسعار والعروض التي يراها الأعضاء",
    sectionIdentity: "الاسم والوصف",
    sectionLocation: "الموقع وساعات العمل",
    sectionFacilities: "المرافق",
    nameAr: "الاسم بالعربية",
    nameEn: "الاسم بالإنجليزية",
    descriptionAr: "الوصف بالعربية",
    descriptionEn: "الوصف بالإنجليزية",
    areaAr: "المنطقة بالعربية",
    areaEn: "المنطقة بالإنجليزية",
    addressAr: "العنوان بالعربية",
    addressEn: "العنوان بالإنجليزية",
    hoursAr: "ساعات العمل بالعربية",
    hoursEn: "ساعات العمل بالإنجليزية",
    governorate: "المحافظة",
    access: "نوع النادي",
    listPrice: "السعر الأساسي",
    offerPrice: "سعر العرض",
    priceHint: "بالدينار، مثال: 19.900",
    offerHint: "اتركه فارغاً إذا لا يوجد عرض",
    activePlan: "معروضة للأعضاء",
    save: "حفظ",
    saved: "تم الحفظ",
    savedMemory: "تم الحفظ مؤقتاً — لن يبقى بعد إعادة تشغيل الخادم",
    editProfile: "تعديل البيانات",
    editPlans: "تعديل الاشتراكات",
    viewPublic: "عرض الصفحة العامة",
    demoWarning:
      "نسخة تجريبية: التعديلات تُحفظ في ملفات محلية، وقد لا تبقى على الاستضافة.",

    // الأعضاء
    membersTitle: "الأعضاء",
    membersSubtitle: "كل من اشترك في ناديك",
    editMembers: "الأعضاء",
    colMember: "العضو",
    colPlan: "الباقة",
    colState: "الحالة",
    colStarted: "البداية",
    colExpires: "الانتهاء",
    colPaid: "المدفوع",
    colVisits: "الزيارات",
    colLastVisit: "آخر زيارة",
    neverVisited: "لم يحضر بعد",
    noMembers: "لا يوجد أعضاء بعد",
    noMembersHint: "سيظهر هنا كل من يشترك في ناديك",
    activeMembers: "أعضاء نشطون",

    // سجل الدخول
    checkInsTitle: "سجل الدخول",
    checkInsSubtitle: "كل عملية مسح لرمز الدخول عند المدخل",
    editCheckIns: "سجل الدخول",
    colDate: "التاريخ",
    colTime: "الوقت",
    colToken: "رمز الدخول",
    statToday: "اليوم",
    statLast7: "آخر 7 أيام",
    statLast30: "آخر 30 يوماً",
    statUnique: "أعضاء مختلفون",
    noCheckIns: "لا توجد عمليات دخول بعد",
    noCheckInsHint: "سيظهر هنا كل مسح لرمز الدخول عند مدخل النادي",
    recentOnly: "أحدث العمليات فقط",
  },
  errors: {
    paymentDeclined: "لم تتم الموافقة على الدفع. جرّب بطاقة أخرى.",
    noConnection: "لا يوجد اتصال بالإنترنت.",
    notFound: "لم نجد ما تبحث عنه.",
  },
} as const;
