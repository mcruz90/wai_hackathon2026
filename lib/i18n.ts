/**
 * Every patient-facing string, stored. There is no live AI translation.
 * Strings marked "draft" in docs/translations-to-review.md need a native speaker's review.
 */
export const LANGS = ["en", "fr", "zh", "ar", "pa", "tl"] as const;
export type Lang = (typeof LANGS)[number];

/** English name of each language, as used in listing data and in the English call script. */
export const EN_NAME: Record<Lang, string> = { en: "English", fr: "French", zh: "Mandarin", ar: "Arabic", pa: "Punjabi", tl: "Tagalog" };

export type Strings = {
  name: string; loc: string; htmlLang: string;
  /** Text direction of the patient screens in this language. */
  dir: "ltr" | "rtl";
  own: string; match: string[];
  h: string; sub: string; lang: string; postal: string; type: string; any: string; fd: string; np: string;
  search: string; privacy: string; sample: string; results: string; count: string;
  today: string; day1: string; days: string; expires: string; exp1: string;
  speaks: string; km: string; source: string; call: string; hint: string;
  phone: string; after: string; open: string; full: string; thOpen: string; thFull: string;
  hcc: string; what: string; need: string; online: string; callnum: string; noohip: string;
  disc: string; back: string; none: string; unk: string; radius: string;
  src: Record<string, string>;
  /** Call script lines 1 to 4 in this language. Empty for English, where the line itself is the script. */
  s: [string, string, string, string];
  // ---- new screens (draft) ----
  toPlan: string; tooMany: string; err: string; gone: string;
  planH: string; planSub: string; opened: string; noneOpened: string;
  repOpen: string; repFull: string; repNone: string;
  callNext: string; noMore: string; alsoDo: string; hccIf: string; concept: string; wlLink: string; needSearch: string;
  wlBanner: string; wlNot: string; wlStatusH: string; wlEntry: string; wlAbout: string; wlFew: string;
  wlLast: string; wlLast1: string; wlLastToday: string; wlNever: string; wlNoPlace: string;
  wlRuleLink: string; wlOutboxLink: string; wlRuleH: string; wlRules: [string, string, string, string, string];
  mOffer: string; mReminder: string; mCheckin: string;
  // ---- languages not listed, patient language reports, appointment guide (draft) ----
  langUnknown: string; speaksRep: string; interpRep: string;
  langQ: string; lSpoke: string; lInterp: string; lNeither: string; thLang: string;
  guideLink: string; guideH: string; guideSub: string;
  /** Guide group titles, one per group in GUIDE. */
  gt: [string, string, string, string, string];
  /** Guide questions in this language, in GUIDE order. Empty for English, where the question itself is shown. */
  gq: string[];
};

export const T: Record<Lang, Strings> = {
  en: {
    name: "English", loc: "en-CA", htmlLang: "en", dir: "ltr", own: "English", match: ["English"],
    h: "New to Ontario? Find a family doctor taking patients",
    sub: "See which family doctors and nurse practitioners near you are taking new patients, and when each listing was last confirmed.",
    lang: "Your language", postal: "First 3 characters of your postal code", type: "Who do you want to see?", any: "Either", fd: "Family doctor", np: "Nurse practitioner",
    search: "Show open listings", privacy: "We do not ask for your name, health card or health information. Nothing you type is saved.",
    sample: "Sample data. These clinics are not real.", results: "Open near {fsa}", count: "Listings found: {n}, best match first",
    today: "Confirmed today", day1: "Confirmed yesterday", days: "Confirmed {n} days ago", expires: "Expires in {n} days", exp1: "Expires tomorrow",
    speaks: "Speaks {lang}", km: "{n} km away", source: "Source", call: "Prepare your call", hint: "These are lines you can say on the phone.",
    phone: "Clinic phone", after: "After you call, tell us what you heard", open: "Still taking patients", full: "They are full",
    thOpen: "Thank you. The date on this listing is now today.", thFull: "Thank you. Your report is recorded.",
    hcc: "Also register with Health Care Connect",
    what: "Health Care Connect is Ontario's official program. A nurse helps look for a doctor or nurse practitioner for you. It can take time, so keep looking on your own too.",
    need: "You need a valid Ontario health card (OHIP).", online: "Register online", callnum: "Or call 1-800-445-1822",
    noohip: "No health card yet? Apply in person at a ServiceOntario centre first.",
    disc: "This tool helps you find and contact clinics. It does not choose a doctor for you and does not give medical advice.",
    back: "Back", none: "No open listings match. Try 'Either' or another postal code.",
    unk: "We do not have location data for that Ontario postal area. Try a nearby postal area; we will not substitute another location.",
    radius: "Within about {n} km of your postal area. Distances are approximate.",
    src: { web: "Clinic website", post: "Community post", list: "Regional list", news: "Clinic newsletter", rev: "Reviewed announcement" },
    s: ["", "", "", ""],
    toPlan: "My plan", tooMany: "Too many reports for now. Please try again later.", err: "That did not work. Please try again.",
    gone: "This listing is no longer shown.",
    planH: "My plan",
    planSub: "Calling clinics yourself is the fastest way to find a doctor. This list stays on this device and is cleared when you close the browser.",
    opened: "Clinics you opened", noneOpened: "You have not opened a clinic yet.",
    repOpen: "You reported: still taking patients", repFull: "You reported: full", repNone: "Not reported yet",
    callNext: "Call next", noMore: "No other open listings near you right now. Check again in a few days.",
    alsoDo: "Also do this", hccIf: "If you have a valid Ontario health card, do this at the same time. Keep calling clinics while you wait.",
    concept: "Concept", wlLink: "See how a fair waitlist could work", needSearch: "Enter your postal code first.",
    wlBanner: "Concept, sample patients", wlNot: "This is not a real waitlist. Nobody can join it and no message is sent.",
    wlStatusH: "Waitlist status", wlEntry: "Sample entry near {fsa}",
    wlAbout: "About {n} people are waiting near this area.", wlFew: "Fewer than 5 people are waiting near this area.",
    wlLast: "Last spot offered {n} days ago.", wlLast1: "Last spot offered yesterday.", wlLastToday: "A spot was offered today.",
    wlNever: "No spot has been offered near this area yet.",
    wlNoPlace: "We do not show an exact place in line. It changes when people accept, pass or leave.",
    wlRuleLink: "How the order works", wlOutboxLink: "See the sample messages", wlRuleH: "How the order works",
    wlRules: [
      "When a clinic has an open spot, it is offered to people waiting within {km} km of the clinic.",
      "The person who joined the list first is offered the spot first. Nothing else changes the order.",
      "A spot is offered to {batch} people at a time. The first person to accept gets it.",
      "You have {hours} hours to reply. If you pass or do not reply, the offer goes to the next person and you keep your place on the list.",
      "Every 30 days we ask if you still need a doctor. You can keep waiting, switch area, or leave the list.",
    ],
    mOffer: "{clinic} ({area}) has an open spot for a new patient. Reply YES to accept or PASS to skip. Please reply by {date}. If you pass, you keep your place on the list.",
    mReminder: "Reminder: the open spot at {clinic} is held for you until {date}. Reply YES to accept or PASS to skip.",
    mCheckin: "Do you still need a doctor? Reply 1 to keep waiting, 2 to switch area, or 3 to leave the list.",
    langUnknown: "Languages not listed. Ask when you call.",
    speaksRep: "Patients report: speaks {lang}",
    interpRep: "Patients report: interpreter offered",
    langQ: "Did they speak {lang}?",
    lSpoke: "Yes, someone spoke {lang}",
    lInterp: "They offered an interpreter",
    lNeither: "Neither",
    thLang: "Thank you. This tells the next person what to expect.",
    guideLink: "Questions to bring to your appointment",
    guideH: "Questions for your appointment",
    guideSub: "Show these to the clinic. They are practical questions. For the health conversation itself, ask for a professional interpreter.",
    gt: ["Calling the clinic", "Booking your first appointment", "At your first visit", "Medications and records", "After the visit"],
    gq: ["", "", "", "", "", "", "", "", "", ""],
  },
  fr: {
    name: "Français", loc: "fr-CA", htmlLang: "fr", dir: "ltr", own: "français", match: ["French"],
    h: "Nouvel arrivant en Ontario ? Trouvez un médecin de famille qui prend des patients",
    sub: "Voyez quels médecins de famille et infirmières praticiennes près de chez vous acceptent de nouveaux patients, et la date de la dernière confirmation.",
    lang: "Votre langue", postal: "Les 3 premiers caractères de votre code postal", type: "Qui souhaitez-vous consulter ?", any: "L'un ou l'autre", fd: "Médecin de famille", np: "Infirmière praticienne",
    search: "Voir les places ouvertes", privacy: "Nous ne demandons ni votre nom, ni votre carte Santé, ni de renseignements sur votre santé. Rien de ce que vous écrivez n'est enregistré.",
    sample: "Données fictives. Ces cliniques n'existent pas.", results: "Places ouvertes près de {fsa}", count: "{n} résultats, la meilleure correspondance en premier",
    today: "Confirmé aujourd'hui", day1: "Confirmé hier", days: "Confirmé il y a {n} jours", expires: "Expire dans {n} jours", exp1: "Expire demain",
    speaks: "Parle {lang}", km: "À {n} km", source: "Source", call: "Préparez votre appel", hint: "Dites la phrase en anglais. La traduction est en dessous.",
    phone: "Téléphone de la clinique", after: "Après l'appel, dites-nous ce qu'on vous a répondu", open: "Ils prennent encore des patients", full: "C'est complet",
    thOpen: "Merci. La date de cette fiche est maintenant celle d'aujourd'hui.", thFull: "Merci. Votre signalement est enregistré.",
    hcc: "Inscrivez-vous aussi à Accès Soins (Health Care Connect)",
    what: "Accès Soins est le programme officiel de l'Ontario. Une infirmière vous aide à chercher un médecin ou une infirmière praticienne. Cela peut prendre du temps, alors continuez aussi à chercher de votre côté.",
    need: "Il faut une carte Santé de l'Ontario valide.", online: "S'inscrire en ligne", callnum: "Ou appelez le 1-800-445-1822",
    noohip: "Pas encore de carte Santé ? Faites d'abord la demande en personne dans un centre ServiceOntario.",
    disc: "Cet outil vous aide à trouver et à joindre des cliniques. Il ne choisit pas de médecin à votre place et ne donne pas de conseils médicaux.",
    back: "Retour", none: "Aucune place ouverte ne correspond. Essayez « L'un ou l'autre » ou un autre code postal.",
    unk: "Nous ne disposons pas de données de localisation pour ce secteur postal ontarien. Essayez un secteur voisin; nous ne remplacerons pas votre position.",
    radius: "À environ {n} km de votre secteur postal. Les distances sont approximatives.",
    src: { web: "Site de la clinique", post: "Publication communautaire", list: "Liste régionale", news: "Infolettre de la clinique", rev: "Annonce vérifiée" },
    s: ["Bonjour. Je cherche un médecin de famille.", "J'ai vu que votre clinique prend de nouveaux patients. Est-ce toujours le cas ?", "Je parle français. Y a-t-il quelqu'un qui parle français, ou un interprète ?", "Que dois-je apporter pour m'inscrire ?"],
    toPlan: "Mon plan", tooMany: "Trop de signalements pour le moment. Réessayez plus tard.", err: "Cela n'a pas fonctionné. Veuillez réessayer.",
    gone: "Cette fiche n'est plus affichée.",
    planH: "Mon plan",
    planSub: "Appeler vous-même les cliniques est le moyen le plus rapide de trouver un médecin. Cette liste reste sur cet appareil et s'efface quand vous fermez le navigateur.",
    opened: "Cliniques que vous avez ouvertes", noneOpened: "Vous n'avez encore ouvert aucune clinique.",
    repOpen: "Votre signalement : ils prennent encore des patients", repFull: "Votre signalement : complet", repNone: "Pas encore de signalement",
    callNext: "À appeler ensuite", noMore: "Aucune autre place ouverte près de chez vous pour le moment. Revenez dans quelques jours.",
    alsoDo: "À faire aussi", hccIf: "Si vous avez une carte Santé de l'Ontario valide, faites-le en même temps. Continuez d'appeler les cliniques pendant que vous attendez.",
    concept: "Concept", wlLink: "Voir comment une liste d'attente équitable pourrait fonctionner", needSearch: "Entrez d'abord votre code postal.",
    wlBanner: "Concept, patients fictifs", wlNot: "Ce n'est pas une vraie liste d'attente. Personne ne peut s'y inscrire et aucun message n'est envoyé.",
    wlStatusH: "État de la liste d'attente", wlEntry: "Inscription fictive près de {fsa}",
    wlAbout: "Environ {n} personnes attendent près de ce secteur.", wlFew: "Moins de 5 personnes attendent près de ce secteur.",
    wlLast: "Dernière place offerte il y a {n} jours.", wlLast1: "Dernière place offerte hier.", wlLastToday: "Une place a été offerte aujourd'hui.",
    wlNever: "Aucune place n'a encore été offerte près de ce secteur.",
    wlNoPlace: "Nous n'affichons pas de rang exact. Il change quand des personnes acceptent, passent leur tour ou quittent la liste.",
    wlRuleLink: "Comment l'ordre fonctionne", wlOutboxLink: "Voir les messages fictifs", wlRuleH: "Comment l'ordre fonctionne",
    wlRules: [
      "Quand une clinique a une place, elle est offerte aux personnes qui attendent à moins de {km} km de la clinique.",
      "La personne inscrite en premier reçoit l'offre en premier. Rien d'autre ne change l'ordre.",
      "Une place est offerte à {batch} personnes à la fois. La première qui accepte l'obtient.",
      "Vous avez {hours} heures pour répondre. Si vous passez votre tour ou ne répondez pas, l'offre va à la personne suivante et vous gardez votre place dans la liste.",
      "Tous les 30 jours, nous demandons si vous avez encore besoin d'un médecin. Vous pouvez continuer d'attendre, changer de secteur ou quitter la liste.",
    ],
    mOffer: "{clinic} ({area}) a une place pour un nouveau patient. Répondez OUI pour accepter ou PASSER pour laisser la place. Répondez avant le {date}. Si vous passez, vous gardez votre place dans la liste.",
    mReminder: "Rappel : la place à {clinic} vous est réservée jusqu'au {date}. Répondez OUI pour accepter ou PASSER pour laisser la place.",
    mCheckin: "Avez-vous encore besoin d'un médecin ? Répondez 1 pour continuer d'attendre, 2 pour changer de secteur ou 3 pour quitter la liste.",
    langUnknown: "Langues non indiquées. Demandez-le quand vous appelez.",
    speaksRep: "Selon des patients : parle {lang}",
    interpRep: "Selon des patients : interprète proposé",
    langQ: "Vous a-t-on parlé en {lang} ?",
    lSpoke: "Oui, quelqu'un parlait {lang}",
    lInterp: "On m'a proposé un interprète",
    lNeither: "Ni l'un ni l'autre",
    thLang: "Merci. Cela aide la prochaine personne à savoir à quoi s'attendre.",
    guideLink: "Questions à apporter à votre rendez-vous",
    guideH: "Questions pour votre rendez-vous",
    guideSub: "Montrez l'anglais à la clinique. Le français est en dessous. Ce sont des questions pratiques. Pour parler de votre santé, demandez un interprète professionnel.",
    gt: ["Quand vous appelez la clinique", "Pour prendre votre premier rendez-vous", "À votre première visite", "Médicaments et dossier médical", "Après la visite"],
    gq: ["Acceptez-vous les patients couverts par le Programme fédéral de santé intérimaire (PFSI) ?", "Quelles langues parlent vos médecins et votre personnel ?", "J'aimerais un interprète pour mon rendez-vous. Pouvez-vous en prévoir un ?", "Que dois-je apporter à mon premier rendez-vous ?", "Je suis nouveau en Ontario et c'est mon premier médecin de famille ici.", "Pouvez-vous parler lentement ? Pouvez-vous me l'écrire ?", "Je prends des médicaments régulièrement. Pouvez-vous les renouveler pour plus d'un mois ?", "Mon dossier médical peut-il vous être envoyé par mon ancien médecin ?", "Comment puis-je prendre mon prochain rendez-vous ?", "Que dois-je faire si je suis malade quand la clinique est fermée ?"],
  },
  zh: {
    name: "中文（普通话）", loc: "zh-CN", htmlLang: "zh", dir: "ltr", own: "普通话", match: ["Mandarin"],
    h: "刚到安大略省？查找正在接收新病人的家庭医生",
    sub: "查看您附近哪些家庭医生和执业护士正在接收新病人，以及每条信息最近确认的日期。",
    lang: "您的语言", postal: "邮政编码的前三位", type: "您想看哪一类？", any: "都可以", fd: "家庭医生", np: "执业护士",
    search: "查看正在接收新病人的诊所", privacy: "我们不会询问您的姓名、健康卡或健康信息。您输入的内容不会被保存。",
    sample: "示例数据。这些诊所并不存在。", results: "{fsa} 附近正在接收新病人", count: "共 {n} 条，最匹配的排在最前",
    today: "今天已确认", day1: "昨天已确认", days: "{n} 天前确认", expires: "{n} 天后过期", exp1: "明天过期",
    speaks: "会说{lang}", km: "距离 {n} 公里", source: "来源", call: "准备打电话", hint: "请说英文句子，下面是中文意思。",
    phone: "诊所电话", after: "打完电话后，请告诉我们结果", open: "仍在接收新病人", full: "已经满了",
    thOpen: "谢谢。这条信息的日期已更新为今天。", thFull: "谢谢。您的反馈已记录。",
    hcc: "同时登记 Health Care Connect",
    what: "Health Care Connect 是安大略省的官方项目。会有一位护士帮您寻找家庭医生或执业护士。这可能需要一些时间，所以请同时继续自己寻找。",
    need: "您需要有效的安大略省健康卡（OHIP）。", online: "网上登记", callnum: "或致电 1-800-445-1822",
    noohip: "还没有健康卡？请先亲自到 ServiceOntario 服务中心申请。",
    disc: "本工具帮助您查找和联系诊所。它不会替您选择医生，也不提供医疗建议。",
    back: "返回", none: "没有符合条件的信息。请选择“都可以”或换一个邮政编码。",
    unk: "我们尚无该安大略省邮区的位置数据。请尝试附近邮区；系统不会替换成其他位置。",
    radius: "在您邮区约 {n} 公里范围内。距离为估算值。",
    src: { web: "诊所网站", post: "社区帖子", list: "地区名单", news: "诊所通讯", rev: "已审核的公告" },
    s: ["您好。我在找家庭医生。", "我看到你们诊所正在接收新病人。现在还接收吗？", "我说普通话。诊所有人会说普通话吗？或者有翻译吗？", "登记时我需要带什么？"],
    toPlan: "我的计划", tooMany: "目前反馈次数过多，请稍后再试。", err: "操作没有成功，请再试一次。",
    gone: "这条信息已不再显示。",
    planH: "我的计划",
    planSub: "自己给诊所打电话是找到医生最快的办法。这份清单只保存在这台设备上，关闭浏览器后就会清除。",
    opened: "您打开过的诊所", noneOpened: "您还没有打开过任何诊所。",
    repOpen: "您的反馈：仍在接收新病人", repFull: "您的反馈：已经满了", repNone: "尚未反馈",
    callNext: "接下来打给", noMore: "您附近暂时没有其他正在接收新病人的诊所。请过几天再来查看。",
    alsoDo: "同时也请这样做", hccIf: "如果您有有效的安大略省健康卡，请同时办理这一步。等待期间请继续给诊所打电话。",
    concept: "概念演示", wlLink: "看看公平的候补名单可以怎样运作", needSearch: "请先输入您的邮政编码。",
    wlBanner: "概念演示，示例病人", wlNot: "这不是真正的候补名单。任何人都无法加入，也不会发送任何信息。",
    wlStatusH: "候补名单状态", wlEntry: "{fsa} 附近的示例登记",
    wlAbout: "这个地区附近大约有 {n} 人在等候。", wlFew: "这个地区附近等候的人不到 5 人。",
    wlLast: "上一个名额是 {n} 天前发出的。", wlLast1: "上一个名额是昨天发出的。", wlLastToday: "今天发出了一个名额。",
    wlNever: "这个地区附近还没有发出过名额。",
    wlNoPlace: "我们不显示确切的排队位置，因为有人接受、放弃或退出时位置会变化。",
    wlRuleLink: "排序规则", wlOutboxLink: "查看示例信息", wlRuleH: "排序规则",
    wlRules: [
      "诊所有名额时，会提供给在诊所 {km} 公里范围内等候的人。",
      "最先加入名单的人最先得到名额。没有其他因素会改变顺序。",
      "一个名额每次同时提供给 {batch} 人。最先接受的人得到名额。",
      "您有 {hours} 小时回复。如果您放弃或没有回复，名额会提供给下一位，您在名单上的位置保持不变。",
      "我们每 30 天询问一次您是否仍需要医生。您可以继续等候、更换地区或退出名单。",
    ],
    mOffer: "{clinic}（{area}）有一个新病人名额。回复 YES 接受，回复 PASS 放弃。请在 {date} 前回复。如果放弃，您在名单上的位置保持不变。",
    mReminder: "提醒：{clinic} 的名额为您保留到 {date}。回复 YES 接受，回复 PASS 放弃。",
    mCheckin: "您还需要找医生吗？回复 1 继续等候，回复 2 更换地区，回复 3 退出名单。",
    langUnknown: "未列出语言。打电话时请询问。",
    speaksRep: "患者反映：会说{lang}",
    interpRep: "患者反映：提供口译员",
    langQ: "他们会说{lang}吗？",
    lSpoke: "会，有人说{lang}",
    lInterp: "他们提供了口译员",
    lNeither: "都没有",
    thLang: "谢谢。这能让下一位患者知道会遇到什么情况。",
    guideLink: "就诊时可以问的问题",
    guideH: "就诊问题清单",
    guideSub: "把英文给诊所工作人员看。中文在下面。这些是日常事务问题。谈论健康状况时，请要求专业口译员。",
    gt: ["给诊所打电话时", "预约第一次就诊", "第一次就诊时", "药物和病历", "就诊之后"],
    gq: ["你们接受由临时联邦健康计划（IFHP）承保的患者吗？", "你们的医生和工作人员会说哪些语言？", "我希望就诊时有口译员。你们可以安排吗？", "第一次就诊我需要带什么？", "我刚来安大略省，这是我在这里的第一位家庭医生。", "请说慢一点。可以帮我写下来吗？", "我需要长期服药。可以给我开超过一个月的药量吗？", "可以把我以前医生的病历转给你们吗？", "我怎样预约下一次就诊？", "诊所关门时如果我生病了，该怎么办？"],
  },
  ar: {
    name: "العربية", loc: "ar", htmlLang: "ar", dir: "rtl", own: "العربية", match: ["Arabic"],
    h: "جديد في أونتاريو؟ ابحث عن طبيب عائلة يقبل مرضى جدداً",
    sub: "اعرف أيّ أطباء العائلة والممرضين الممارسين بالقرب منك يقبلون مرضى جدداً، ومتى تم تأكيد كل إعلان آخر مرة.",
    lang: "لغتك", postal: "أول 3 أحرف من رمزك البريدي", type: "من تريد أن تراجع؟", any: "أيٌّ منهما", fd: "طبيب عائلة", np: "ممرض ممارس",
    search: "اعرض الإعلانات المتاحة", privacy: "لا نطلب اسمك أو بطاقتك الصحية أو أي معلومات عن صحتك. لا يُحفظ أي شيء تكتبه.",
    sample: "بيانات تجريبية. هذه العيادات غير حقيقية.", results: "متاح بالقرب من {fsa}", count: "عدد الإعلانات: {n}، الأنسب أولاً",
    today: "تم التأكيد اليوم", day1: "تم التأكيد أمس", days: "تم التأكيد قبل {n} أيام", expires: "ينتهي خلال {n} أيام", exp1: "ينتهي غداً",
    speaks: "يتحدث {lang}", km: "على بُعد {n} كم", source: "المصدر", call: "حضّر مكالمتك", hint: "قل الجملة بالإنجليزية. الترجمة العربية تحتها.",
    phone: "هاتف العيادة", after: "بعد الاتصال، أخبرنا بما سمعته", open: "ما زالوا يقبلون مرضى", full: "لا توجد أماكن",
    thOpen: "شكراً. أصبح تاريخ هذا الإعلان اليوم.", thFull: "شكراً. تم تسجيل بلاغك.",
    hcc: "سجّل أيضاً في Health Care Connect",
    what: "Health Care Connect هو البرنامج الرسمي في أونتاريو. تساعدك ممرضة في البحث عن طبيب أو ممرض ممارس. قد يستغرق ذلك وقتاً، لذا استمر في البحث بنفسك أيضاً.",
    need: "تحتاج إلى بطاقة صحية سارية من أونتاريو (OHIP).", online: "سجّل عبر الإنترنت", callnum: "أو اتصل على \u20661-800-445-1822\u2069",
    noohip: "ليست لديك بطاقة صحية بعد؟ قدّم طلباً شخصياً في أحد مراكز ServiceOntario أولاً.",
    disc: "تساعدك هذه الأداة على إيجاد العيادات والتواصل معها. لا تختار طبيباً نيابةً عنك ولا تقدّم نصائح طبية.",
    back: "رجوع", none: "لا توجد إعلانات متاحة مطابقة. جرّب «أيٌّ منهما» أو رمزاً بريدياً آخر.",
    unk: "ليست لدينا بيانات موقع لهذه المنطقة البريدية في أونتاريو. جرّب منطقة بريدية قريبة؛ لن نستبدل موقعك بموقع آخر.",
    radius: "ضمن نحو {n} كم من منطقتك البريدية. المسافات تقريبية.",
    src: { web: "موقع العيادة", post: "منشور مجتمعي", list: "قائمة إقليمية", news: "نشرة العيادة", rev: "إعلان تمت مراجعته" },
    s: ["مرحباً. أبحث عن طبيب عائلة.", "رأيت أن عيادتكم تقبل مرضى جدداً. هل ما زال ذلك صحيحاً؟", "أتحدث العربية. هل يوجد من يتحدث العربية، أو مترجم؟", "ما الذي يجب أن أحضره للتسجيل؟"],
    toPlan: "خطتي", tooMany: "بلاغات كثيرة جداً حالياً. يرجى المحاولة لاحقاً.", err: "لم ينجح ذلك. يرجى المحاولة مرة أخرى.",
    gone: "لم يعد هذا الإعلان معروضاً.",
    planH: "خطتي",
    planSub: "الاتصال بالعيادات بنفسك هو أسرع طريقة لإيجاد طبيب. تبقى هذه القائمة على هذا الجهاز وتُمسح عند إغلاق المتصفح.",
    opened: "العيادات التي فتحتها", noneOpened: "لم تفتح أي عيادة بعد.",
    repOpen: "أبلغتَ: ما زالوا يقبلون مرضى", repFull: "أبلغتَ: لا توجد أماكن", repNone: "لم يُبلَّغ بعد",
    callNext: "اتصل بعد ذلك", noMore: "لا توجد إعلانات متاحة أخرى بالقرب منك الآن. تحقّق مرة أخرى بعد بضعة أيام.",
    alsoDo: "افعل هذا أيضاً", hccIf: "إذا كانت لديك بطاقة صحية سارية من أونتاريو، فافعل هذا في الوقت نفسه. استمر في الاتصال بالعيادات أثناء الانتظار.",
    concept: "فكرة تجريبية", wlLink: "اطّلع على كيف يمكن أن تعمل قائمة انتظار عادلة", needSearch: "أدخل رمزك البريدي أولاً.",
    wlBanner: "فكرة تجريبية، مرضى افتراضيون", wlNot: "هذه ليست قائمة انتظار حقيقية. لا يمكن لأحد الانضمام إليها ولا تُرسَل أي رسالة.",
    wlStatusH: "حالة قائمة الانتظار", wlEntry: "تسجيل تجريبي بالقرب من {fsa}",
    wlAbout: "ينتظر نحو {n} شخصاً بالقرب من هذه المنطقة.", wlFew: "ينتظر أقل من 5 أشخاص بالقرب من هذه المنطقة.",
    wlLast: "عُرض آخر مكان قبل {n} أيام.", wlLast1: "عُرض آخر مكان أمس.", wlLastToday: "عُرض مكان اليوم.",
    wlNever: "لم يُعرض أي مكان بالقرب من هذه المنطقة بعد.",
    wlNoPlace: "لا نعرض ترتيبك الدقيق في القائمة. فهو يتغيّر عندما يقبل الآخرون أو يتجاوزون العرض أو يغادرون.",
    wlRuleLink: "كيف يعمل الترتيب", wlOutboxLink: "اطّلع على الرسائل التجريبية", wlRuleH: "كيف يعمل الترتيب",
    wlRules: [
      "عندما يتوفر مكان في عيادة، يُعرض على المنتظرين ضمن {km} كم من العيادة.",
      "من انضم إلى القائمة أولاً يُعرض عليه المكان أولاً. لا شيء آخر يغيّر الترتيب.",
      "يُعرض المكان على {batch} أشخاص في وقت واحد. أول من يقبل يحصل عليه.",
      "لديك {hours} ساعة للرد. إذا تجاوزت العرض أو لم ترد، ينتقل إلى الشخص التالي وتحتفظ بمكانك في القائمة.",
      "كل 30 يوماً نسألك إن كنت ما زلت بحاجة إلى طبيب. يمكنك مواصلة الانتظار أو تغيير المنطقة أو مغادرة القائمة.",
    ],
    mOffer: "لدى {clinic} ({area}) مكان متاح لمريض جديد. أرسل YES للقبول أو PASS للتجاوز. يرجى الرد قبل {date}. إذا تجاوزت العرض، تحتفظ بمكانك في القائمة.",
    mReminder: "تذكير: المكان في {clinic} محجوز لك حتى {date}. أرسل YES للقبول أو PASS للتجاوز.",
    mCheckin: "هل ما زلت بحاجة إلى طبيب؟ أرسل 1 لمواصلة الانتظار، أو 2 لتغيير المنطقة، أو 3 لمغادرة القائمة.",
    langUnknown: "اللغات غير مذكورة. اسأل عند الاتصال.",
    speaksRep: "حسب المرضى: يتحدثون {lang}",
    interpRep: "حسب المرضى: عُرض مترجم",
    langQ: "هل تحدثوا {lang}؟",
    lSpoke: "نعم، تحدث أحدهم {lang}",
    lInterp: "عرضوا مترجماً",
    lNeither: "لا هذا ولا ذاك",
    thLang: "شكراً. هذا يساعد الشخص التالي على معرفة ما يتوقعه.",
    guideLink: "أسئلة تأخذها معك إلى موعدك",
    guideH: "أسئلة لموعدك",
    guideSub: "اعرض النص الإنجليزي على موظفي العيادة. الترجمة العربية تحته. هذه أسئلة عملية. للحديث عن صحتك نفسها، اطلب مترجماً محترفاً.",
    gt: ["عند الاتصال بالعيادة", "عند حجز موعدك الأول", "في زيارتك الأولى", "الأدوية والسجلات الطبية", "بعد الزيارة"],
    gq: ["هل تقبلون المرضى المشمولين بالبرنامج الفيدرالي المؤقت للصحة (IFHP)؟", "ما اللغات التي يتحدثها أطباؤكم وموظفوكم؟", "أرغب في وجود مترجم في موعدي. هل يمكنكم ترتيب ذلك؟", "ماذا يجب أن أحضر إلى موعدي الأول؟", "أنا جديد في أونتاريو وهذا أول طبيب عائلة لي هنا.", "من فضلك تحدث ببطء. هل يمكنك كتابة ذلك لي؟", "أتناول دواءً بانتظام. هل يمكنك تجديده لأكثر من شهر واحد؟", "هل يمكن إرسال سجلاتي الطبية من طبيبي السابق إليكم؟", "كيف أحجز موعدي القادم؟", "ماذا أفعل إذا مرضت والعيادة مغلقة؟"],
  },
  pa: {
    name: "ਪੰਜਾਬੀ", loc: "pa", htmlLang: "pa", dir: "ltr", own: "ਪੰਜਾਬੀ", match: ["Punjabi"],
    h: "ਓਨਟਾਰੀਓ ਵਿੱਚ ਨਵੇਂ ਹੋ? ਨਵੇਂ ਮਰੀਜ਼ ਲੈ ਰਹੇ ਫੈਮਿਲੀ ਡਾਕਟਰ ਲੱਭੋ",
    sub: "ਦੇਖੋ ਕਿ ਤੁਹਾਡੇ ਨੇੜੇ ਕਿਹੜੇ ਫੈਮਿਲੀ ਡਾਕਟਰ ਅਤੇ ਨਰਸ ਪ੍ਰੈਕਟੀਸ਼ਨਰ ਨਵੇਂ ਮਰੀਜ਼ ਲੈ ਰਹੇ ਹਨ, ਅਤੇ ਹਰ ਸੂਚੀ ਦੀ ਆਖਰੀ ਵਾਰ ਪੁਸ਼ਟੀ ਕਦੋਂ ਹੋਈ ਸੀ।",
    lang: "ਤੁਹਾਡੀ ਭਾਸ਼ਾ", postal: "ਤੁਹਾਡੇ ਪੋਸਟਲ ਕੋਡ ਦੇ ਪਹਿਲੇ 3 ਅੱਖਰ", type: "ਤੁਸੀਂ ਕਿਸ ਨੂੰ ਮਿਲਣਾ ਚਾਹੁੰਦੇ ਹੋ?", any: "ਕੋਈ ਵੀ", fd: "ਫੈਮਿਲੀ ਡਾਕਟਰ", np: "ਨਰਸ ਪ੍ਰੈਕਟੀਸ਼ਨਰ",
    search: "ਖੁੱਲ੍ਹੀਆਂ ਸੂਚੀਆਂ ਦਿਖਾਓ", privacy: "ਅਸੀਂ ਤੁਹਾਡਾ ਨਾਮ, ਹੈਲਥ ਕਾਰਡ ਜਾਂ ਸਿਹਤ ਬਾਰੇ ਜਾਣਕਾਰੀ ਨਹੀਂ ਮੰਗਦੇ। ਤੁਸੀਂ ਜੋ ਵੀ ਲਿਖਦੇ ਹੋ, ਉਹ ਸੇਵ ਨਹੀਂ ਹੁੰਦਾ।",
    sample: "ਨਮੂਨਾ ਡਾਟਾ। ਇਹ ਕਲੀਨਿਕ ਅਸਲੀ ਨਹੀਂ ਹਨ।", results: "{fsa} ਦੇ ਨੇੜੇ ਖੁੱਲ੍ਹੇ", count: "{n} ਸੂਚੀਆਂ ਮਿਲੀਆਂ, ਸਭ ਤੋਂ ਢੁਕਵੀਂ ਪਹਿਲਾਂ",
    today: "ਅੱਜ ਪੁਸ਼ਟੀ ਹੋਈ", day1: "ਕੱਲ੍ਹ ਪੁਸ਼ਟੀ ਹੋਈ", days: "{n} ਦਿਨ ਪਹਿਲਾਂ ਪੁਸ਼ਟੀ ਹੋਈ", expires: "{n} ਦਿਨਾਂ ਵਿੱਚ ਖ਼ਤਮ", exp1: "ਕੱਲ੍ਹ ਖ਼ਤਮ",
    speaks: "{lang} ਬੋਲਦੇ ਹਨ", km: "{n} ਕਿ.ਮੀ. ਦੂਰ", source: "ਸਰੋਤ", call: "ਆਪਣੀ ਕਾਲ ਦੀ ਤਿਆਰੀ ਕਰੋ", hint: "ਵਾਕ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਬੋਲੋ। ਹੇਠਾਂ ਪੰਜਾਬੀ ਵਿੱਚ ਹੈ।",
    phone: "ਕਲੀਨਿਕ ਦਾ ਫ਼ੋਨ", after: "ਕਾਲ ਕਰਨ ਤੋਂ ਬਾਅਦ, ਸਾਨੂੰ ਦੱਸੋ ਕਿ ਉਨ੍ਹਾਂ ਨੇ ਕੀ ਕਿਹਾ", open: "ਅਜੇ ਵੀ ਮਰੀਜ਼ ਲੈ ਰਹੇ ਹਨ", full: "ਉਹ ਭਰ ਗਏ ਹਨ",
    thOpen: "ਧੰਨਵਾਦ। ਇਸ ਸੂਚੀ ਦੀ ਤਾਰੀਖ਼ ਹੁਣ ਅੱਜ ਦੀ ਹੈ।", thFull: "ਧੰਨਵਾਦ। ਤੁਹਾਡੀ ਰਿਪੋਰਟ ਦਰਜ ਹੋ ਗਈ ਹੈ।",
    hcc: "Health Care Connect ਵਿੱਚ ਵੀ ਰਜਿਸਟਰ ਕਰੋ",
    what: "Health Care Connect ਓਨਟਾਰੀਓ ਦਾ ਅਧਿਕਾਰਤ ਪ੍ਰੋਗਰਾਮ ਹੈ। ਇੱਕ ਨਰਸ ਤੁਹਾਡੇ ਲਈ ਡਾਕਟਰ ਜਾਂ ਨਰਸ ਪ੍ਰੈਕਟੀਸ਼ਨਰ ਲੱਭਣ ਵਿੱਚ ਮਦਦ ਕਰਦੀ ਹੈ। ਇਸ ਵਿੱਚ ਸਮਾਂ ਲੱਗ ਸਕਦਾ ਹੈ, ਇਸ ਲਈ ਆਪ ਵੀ ਲੱਭਦੇ ਰਹੋ।",
    need: "ਤੁਹਾਨੂੰ ਓਨਟਾਰੀਓ ਦੇ ਵੈਧ ਹੈਲਥ ਕਾਰਡ (OHIP) ਦੀ ਲੋੜ ਹੈ।", online: "ਔਨਲਾਈਨ ਰਜਿਸਟਰ ਕਰੋ", callnum: "ਜਾਂ 1-800-445-1822 'ਤੇ ਕਾਲ ਕਰੋ",
    noohip: "ਅਜੇ ਹੈਲਥ ਕਾਰਡ ਨਹੀਂ ਹੈ? ਪਹਿਲਾਂ ਕਿਸੇ ServiceOntario ਸੈਂਟਰ ਵਿੱਚ ਜਾ ਕੇ ਅਪਲਾਈ ਕਰੋ।",
    disc: "ਇਹ ਟੂਲ ਤੁਹਾਨੂੰ ਕਲੀਨਿਕ ਲੱਭਣ ਅਤੇ ਉਨ੍ਹਾਂ ਨਾਲ ਸੰਪਰਕ ਕਰਨ ਵਿੱਚ ਮਦਦ ਕਰਦਾ ਹੈ। ਇਹ ਤੁਹਾਡੇ ਲਈ ਡਾਕਟਰ ਨਹੀਂ ਚੁਣਦਾ ਅਤੇ ਡਾਕਟਰੀ ਸਲਾਹ ਨਹੀਂ ਦਿੰਦਾ।",
    back: "ਵਾਪਸ", none: "ਕੋਈ ਖੁੱਲ੍ਹੀ ਸੂਚੀ ਮੇਲ ਨਹੀਂ ਖਾਂਦੀ। 'ਕੋਈ ਵੀ' ਜਾਂ ਕੋਈ ਹੋਰ ਪੋਸਟਲ ਕੋਡ ਅਜ਼ਮਾਓ।",
    unk: "ਸਾਡੇ ਕੋਲ ਓਨਟਾਰੀਓ ਦੇ ਉਸ ਪੋਸਟਲ ਖੇਤਰ ਦਾ ਟਿਕਾਣਾ ਡਾਟਾ ਨਹੀਂ ਹੈ। ਨੇੜੇ ਦਾ ਕੋਈ ਪੋਸਟਲ ਖੇਤਰ ਅਜ਼ਮਾਓ; ਅਸੀਂ ਕੋਈ ਹੋਰ ਟਿਕਾਣਾ ਨਹੀਂ ਵਰਤਾਂਗੇ।",
    radius: "ਤੁਹਾਡੇ ਪੋਸਟਲ ਖੇਤਰ ਤੋਂ ਲਗਭਗ {n} ਕਿ.ਮੀ. ਦੇ ਅੰਦਰ। ਦੂਰੀਆਂ ਅੰਦਾਜ਼ਨ ਹਨ।",
    src: { web: "ਕਲੀਨਿਕ ਦੀ ਵੈੱਬਸਾਈਟ", post: "ਭਾਈਚਾਰਕ ਪੋਸਟ", list: "ਖੇਤਰੀ ਸੂਚੀ", news: "ਕਲੀਨਿਕ ਦਾ ਨਿਊਜ਼ਲੈਟਰ", rev: "ਸਮੀਖਿਆ ਕੀਤੀ ਘੋਸ਼ਣਾ" },
    s: ["ਹੈਲੋ ਜੀ। ਮੈਂ ਫੈਮਿਲੀ ਡਾਕਟਰ ਲੱਭ ਰਿਹਾ/ਰਹੀ ਹਾਂ।", "ਮੈਂ ਦੇਖਿਆ ਕਿ ਤੁਹਾਡਾ ਕਲੀਨਿਕ ਨਵੇਂ ਮਰੀਜ਼ ਲੈ ਰਿਹਾ ਹੈ। ਕੀ ਇਹ ਅਜੇ ਵੀ ਸਹੀ ਹੈ?", "ਮੈਂ ਪੰਜਾਬੀ ਬੋਲਦਾ/ਬੋਲਦੀ ਹਾਂ। ਕੀ ਉੱਥੇ ਕੋਈ ਪੰਜਾਬੀ ਬੋਲਣ ਵਾਲਾ ਹੈ, ਜਾਂ ਕੋਈ ਦੁਭਾਸ਼ੀਆ?", "ਰਜਿਸਟਰ ਕਰਨ ਲਈ ਮੈਨੂੰ ਕੀ ਲੈ ਕੇ ਆਉਣਾ ਚਾਹੀਦਾ ਹੈ?"],
    toPlan: "ਮੇਰੀ ਯੋਜਨਾ", tooMany: "ਇਸ ਵੇਲੇ ਬਹੁਤ ਸਾਰੀਆਂ ਰਿਪੋਰਟਾਂ ਹਨ। ਕਿਰਪਾ ਕਰਕੇ ਬਾਅਦ ਵਿੱਚ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।", err: "ਇਹ ਕੰਮ ਨਹੀਂ ਕੀਤਾ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
    gone: "ਇਹ ਸੂਚੀ ਹੁਣ ਨਹੀਂ ਦਿਖਾਈ ਜਾਂਦੀ।",
    planH: "ਮੇਰੀ ਯੋਜਨਾ",
    planSub: "ਆਪ ਕਲੀਨਿਕਾਂ ਨੂੰ ਕਾਲ ਕਰਨਾ ਡਾਕਟਰ ਲੱਭਣ ਦਾ ਸਭ ਤੋਂ ਤੇਜ਼ ਤਰੀਕਾ ਹੈ। ਇਹ ਸੂਚੀ ਇਸੇ ਡਿਵਾਈਸ 'ਤੇ ਰਹਿੰਦੀ ਹੈ ਅਤੇ ਬ੍ਰਾਊਜ਼ਰ ਬੰਦ ਕਰਨ 'ਤੇ ਮਿਟ ਜਾਂਦੀ ਹੈ।",
    opened: "ਤੁਹਾਡੇ ਵੱਲੋਂ ਖੋਲ੍ਹੇ ਕਲੀਨਿਕ", noneOpened: "ਤੁਸੀਂ ਅਜੇ ਕੋਈ ਕਲੀਨਿਕ ਨਹੀਂ ਖੋਲ੍ਹਿਆ।",
    repOpen: "ਤੁਹਾਡੀ ਰਿਪੋਰਟ: ਅਜੇ ਵੀ ਮਰੀਜ਼ ਲੈ ਰਹੇ ਹਨ", repFull: "ਤੁਹਾਡੀ ਰਿਪੋਰਟ: ਭਰ ਗਏ ਹਨ", repNone: "ਅਜੇ ਰਿਪੋਰਟ ਨਹੀਂ ਕੀਤੀ",
    callNext: "ਅੱਗੇ ਇਨ੍ਹਾਂ ਨੂੰ ਕਾਲ ਕਰੋ", noMore: "ਇਸ ਵੇਲੇ ਤੁਹਾਡੇ ਨੇੜੇ ਕੋਈ ਹੋਰ ਖੁੱਲ੍ਹੀ ਸੂਚੀ ਨਹੀਂ ਹੈ। ਕੁਝ ਦਿਨਾਂ ਬਾਅਦ ਦੁਬਾਰਾ ਦੇਖੋ।",
    alsoDo: "ਇਹ ਵੀ ਕਰੋ", hccIf: "ਜੇ ਤੁਹਾਡੇ ਕੋਲ ਓਨਟਾਰੀਓ ਦਾ ਵੈਧ ਹੈਲਥ ਕਾਰਡ ਹੈ, ਤਾਂ ਇਹ ਵੀ ਨਾਲ ਹੀ ਕਰੋ। ਉਡੀਕ ਕਰਦੇ ਹੋਏ ਕਲੀਨਿਕਾਂ ਨੂੰ ਕਾਲ ਕਰਦੇ ਰਹੋ।",
    concept: "ਸੰਕਲਪ", wlLink: "ਦੇਖੋ ਕਿ ਇੱਕ ਨਿਰਪੱਖ ਉਡੀਕ ਸੂਚੀ ਕਿਵੇਂ ਕੰਮ ਕਰ ਸਕਦੀ ਹੈ", needSearch: "ਪਹਿਲਾਂ ਆਪਣਾ ਪੋਸਟਲ ਕੋਡ ਦਰਜ ਕਰੋ।",
    wlBanner: "ਸੰਕਲਪ, ਨਮੂਨਾ ਮਰੀਜ਼", wlNot: "ਇਹ ਅਸਲੀ ਉਡੀਕ ਸੂਚੀ ਨਹੀਂ ਹੈ। ਕੋਈ ਇਸ ਵਿੱਚ ਸ਼ਾਮਲ ਨਹੀਂ ਹੋ ਸਕਦਾ ਅਤੇ ਕੋਈ ਸੁਨੇਹਾ ਨਹੀਂ ਭੇਜਿਆ ਜਾਂਦਾ।",
    wlStatusH: "ਉਡੀਕ ਸੂਚੀ ਦੀ ਸਥਿਤੀ", wlEntry: "{fsa} ਦੇ ਨੇੜੇ ਨਮੂਨਾ ਐਂਟਰੀ",
    wlAbout: "ਇਸ ਖੇਤਰ ਦੇ ਨੇੜੇ ਲਗਭਗ {n} ਲੋਕ ਉਡੀਕ ਕਰ ਰਹੇ ਹਨ।", wlFew: "ਇਸ ਖੇਤਰ ਦੇ ਨੇੜੇ 5 ਤੋਂ ਘੱਟ ਲੋਕ ਉਡੀਕ ਕਰ ਰਹੇ ਹਨ।",
    wlLast: "ਆਖਰੀ ਥਾਂ {n} ਦਿਨ ਪਹਿਲਾਂ ਪੇਸ਼ ਕੀਤੀ ਗਈ ਸੀ।", wlLast1: "ਆਖਰੀ ਥਾਂ ਕੱਲ੍ਹ ਪੇਸ਼ ਕੀਤੀ ਗਈ ਸੀ।", wlLastToday: "ਅੱਜ ਇੱਕ ਥਾਂ ਪੇਸ਼ ਕੀਤੀ ਗਈ।",
    wlNever: "ਇਸ ਖੇਤਰ ਦੇ ਨੇੜੇ ਅਜੇ ਤੱਕ ਕੋਈ ਥਾਂ ਪੇਸ਼ ਨਹੀਂ ਕੀਤੀ ਗਈ।",
    wlNoPlace: "ਅਸੀਂ ਕਤਾਰ ਵਿੱਚ ਤੁਹਾਡੀ ਸਹੀ ਥਾਂ ਨਹੀਂ ਦਿਖਾਉਂਦੇ। ਇਹ ਉਦੋਂ ਬਦਲਦੀ ਹੈ ਜਦੋਂ ਲੋਕ ਸਵੀਕਾਰ ਕਰਦੇ ਹਨ, ਛੱਡ ਦਿੰਦੇ ਹਨ ਜਾਂ ਸੂਚੀ ਤੋਂ ਨਿਕਲ ਜਾਂਦੇ ਹਨ।",
    wlRuleLink: "ਕ੍ਰਮ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ", wlOutboxLink: "ਨਮੂਨਾ ਸੁਨੇਹੇ ਦੇਖੋ", wlRuleH: "ਕ੍ਰਮ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ",
    wlRules: [
      "ਜਦੋਂ ਕਿਸੇ ਕਲੀਨਿਕ ਵਿੱਚ ਥਾਂ ਖਾਲੀ ਹੁੰਦੀ ਹੈ, ਤਾਂ ਇਹ ਕਲੀਨਿਕ ਤੋਂ {km} ਕਿ.ਮੀ. ਦੇ ਅੰਦਰ ਉਡੀਕ ਕਰ ਰਹੇ ਲੋਕਾਂ ਨੂੰ ਪੇਸ਼ ਕੀਤੀ ਜਾਂਦੀ ਹੈ।",
      "ਜੋ ਸੂਚੀ ਵਿੱਚ ਪਹਿਲਾਂ ਸ਼ਾਮਲ ਹੋਇਆ, ਉਸਨੂੰ ਥਾਂ ਪਹਿਲਾਂ ਪੇਸ਼ ਕੀਤੀ ਜਾਂਦੀ ਹੈ। ਹੋਰ ਕੁਝ ਵੀ ਕ੍ਰਮ ਨਹੀਂ ਬਦਲਦਾ।",
      "ਇੱਕ ਥਾਂ ਇੱਕੋ ਵੇਲੇ {batch} ਲੋਕਾਂ ਨੂੰ ਪੇਸ਼ ਕੀਤੀ ਜਾਂਦੀ ਹੈ। ਜੋ ਪਹਿਲਾਂ ਸਵੀਕਾਰ ਕਰਦਾ ਹੈ, ਉਸਨੂੰ ਮਿਲ ਜਾਂਦੀ ਹੈ।",
      "ਤੁਹਾਡੇ ਕੋਲ ਜਵਾਬ ਦੇਣ ਲਈ {hours} ਘੰਟੇ ਹਨ। ਜੇ ਤੁਸੀਂ ਛੱਡ ਦਿੰਦੇ ਹੋ ਜਾਂ ਜਵਾਬ ਨਹੀਂ ਦਿੰਦੇ, ਤਾਂ ਪੇਸ਼ਕਸ਼ ਅਗਲੇ ਵਿਅਕਤੀ ਕੋਲ ਜਾਂਦੀ ਹੈ ਅਤੇ ਸੂਚੀ ਵਿੱਚ ਤੁਹਾਡੀ ਥਾਂ ਬਣੀ ਰਹਿੰਦੀ ਹੈ।",
      "ਹਰ 30 ਦਿਨਾਂ ਬਾਅਦ ਅਸੀਂ ਪੁੱਛਦੇ ਹਾਂ ਕਿ ਕੀ ਤੁਹਾਨੂੰ ਅਜੇ ਵੀ ਡਾਕਟਰ ਦੀ ਲੋੜ ਹੈ। ਤੁਸੀਂ ਉਡੀਕ ਜਾਰੀ ਰੱਖ ਸਕਦੇ ਹੋ, ਖੇਤਰ ਬਦਲ ਸਕਦੇ ਹੋ, ਜਾਂ ਸੂਚੀ ਛੱਡ ਸਕਦੇ ਹੋ।",
    ],
    mOffer: "{clinic} ({area}) ਵਿੱਚ ਇੱਕ ਨਵੇਂ ਮਰੀਜ਼ ਲਈ ਥਾਂ ਖਾਲੀ ਹੈ। ਸਵੀਕਾਰ ਕਰਨ ਲਈ YES ਜਾਂ ਛੱਡਣ ਲਈ PASS ਭੇਜੋ। ਕਿਰਪਾ ਕਰਕੇ {date} ਤੱਕ ਜਵਾਬ ਦਿਓ। ਜੇ ਤੁਸੀਂ ਛੱਡਦੇ ਹੋ, ਤਾਂ ਸੂਚੀ ਵਿੱਚ ਤੁਹਾਡੀ ਥਾਂ ਬਣੀ ਰਹਿੰਦੀ ਹੈ।",
    mReminder: "ਯਾਦ ਦਿਵਾਉਣਾ: {clinic} ਵਿੱਚ ਥਾਂ {date} ਤੱਕ ਤੁਹਾਡੇ ਲਈ ਰੱਖੀ ਗਈ ਹੈ। ਸਵੀਕਾਰ ਕਰਨ ਲਈ YES ਜਾਂ ਛੱਡਣ ਲਈ PASS ਭੇਜੋ।",
    mCheckin: "ਕੀ ਤੁਹਾਨੂੰ ਅਜੇ ਵੀ ਡਾਕਟਰ ਦੀ ਲੋੜ ਹੈ? ਉਡੀਕ ਜਾਰੀ ਰੱਖਣ ਲਈ 1, ਖੇਤਰ ਬਦਲਣ ਲਈ 2, ਜਾਂ ਸੂਚੀ ਛੱਡਣ ਲਈ 3 ਭੇਜੋ।",
    langUnknown: "ਭਾਸ਼ਾਵਾਂ ਨਹੀਂ ਦੱਸੀਆਂ ਗਈਆਂ। ਕਾਲ ਕਰਨ ਵੇਲੇ ਪੁੱਛੋ।",
    speaksRep: "ਮਰੀਜ਼ਾਂ ਮੁਤਾਬਕ: {lang} ਬੋਲਦੇ ਹਨ",
    interpRep: "ਮਰੀਜ਼ਾਂ ਮੁਤਾਬਕ: ਦੁਭਾਸ਼ੀਏ ਦੀ ਪੇਸ਼ਕਸ਼ ਕੀਤੀ",
    langQ: "ਕੀ ਉਨ੍ਹਾਂ ਨੇ {lang} ਬੋਲੀ?",
    lSpoke: "ਹਾਂ, ਕਿਸੇ ਨੇ {lang} ਬੋਲੀ",
    lInterp: "ਉਨ੍ਹਾਂ ਨੇ ਦੁਭਾਸ਼ੀਏ ਦੀ ਪੇਸ਼ਕਸ਼ ਕੀਤੀ",
    lNeither: "ਦੋਵਾਂ ਵਿੱਚੋਂ ਕੋਈ ਨਹੀਂ",
    thLang: "ਧੰਨਵਾਦ। ਇਸ ਨਾਲ ਅਗਲੇ ਵਿਅਕਤੀ ਨੂੰ ਪਤਾ ਲੱਗਦਾ ਹੈ ਕਿ ਕੀ ਉਮੀਦ ਕਰਨੀ ਹੈ।",
    guideLink: "ਆਪਣੀ ਮੁਲਾਕਾਤ ਲਈ ਸਵਾਲ",
    guideH: "ਤੁਹਾਡੀ ਮੁਲਾਕਾਤ ਲਈ ਸਵਾਲ",
    guideSub: "ਕਲੀਨਿਕ ਨੂੰ ਅੰਗਰੇਜ਼ੀ ਦਿਖਾਓ। ਹੇਠਾਂ ਪੰਜਾਬੀ ਵਿੱਚ ਹੈ। ਇਹ ਵਿਹਾਰਕ ਸਵਾਲ ਹਨ। ਆਪਣੀ ਸਿਹਤ ਬਾਰੇ ਗੱਲਬਾਤ ਲਈ, ਪੇਸ਼ੇਵਰ ਦੁਭਾਸ਼ੀਏ ਦੀ ਮੰਗ ਕਰੋ।",
    gt: ["ਕਲੀਨਿਕ ਨੂੰ ਕਾਲ ਕਰਨ ਵੇਲੇ", "ਪਹਿਲੀ ਮੁਲਾਕਾਤ ਬੁੱਕ ਕਰਨ ਵੇਲੇ", "ਪਹਿਲੀ ਮੁਲਾਕਾਤ ਵੇਲੇ", "ਦਵਾਈਆਂ ਅਤੇ ਮੈਡੀਕਲ ਰਿਕਾਰਡ", "ਮੁਲਾਕਾਤ ਤੋਂ ਬਾਅਦ"],
    gq: ["ਕੀ ਤੁਸੀਂ ਅੰਤਰਿਮ ਫੈਡਰਲ ਹੈਲਥ ਪ੍ਰੋਗਰਾਮ (IFHP) ਵਾਲੇ ਮਰੀਜ਼ ਲੈਂਦੇ ਹੋ?", "ਤੁਹਾਡੇ ਡਾਕਟਰ ਅਤੇ ਸਟਾਫ਼ ਕਿਹੜੀਆਂ ਭਾਸ਼ਾਵਾਂ ਬੋਲਦੇ ਹਨ?", "ਮੈਨੂੰ ਆਪਣੀ ਮੁਲਾਕਾਤ ਲਈ ਦੁਭਾਸ਼ੀਆ ਚਾਹੀਦਾ ਹੈ। ਕੀ ਤੁਸੀਂ ਇਸ ਦਾ ਪ੍ਰਬੰਧ ਕਰ ਸਕਦੇ ਹੋ?", "ਪਹਿਲੀ ਮੁਲਾਕਾਤ ਲਈ ਮੈਨੂੰ ਕੀ ਲੈ ਕੇ ਆਉਣਾ ਚਾਹੀਦਾ ਹੈ?", "ਮੈਂ ਓਨਟਾਰੀਓ ਵਿੱਚ ਨਵਾਂ/ਨਵੀਂ ਹਾਂ ਅਤੇ ਇਹ ਇੱਥੇ ਮੇਰਾ ਪਹਿਲਾ ਫੈਮਿਲੀ ਡਾਕਟਰ ਹੈ।", "ਕਿਰਪਾ ਕਰਕੇ ਹੌਲੀ ਬੋਲੋ। ਕੀ ਤੁਸੀਂ ਇਹ ਮੈਨੂੰ ਲਿਖ ਕੇ ਦੇ ਸਕਦੇ ਹੋ?", "ਮੈਂ ਨਿਯਮਿਤ ਤੌਰ 'ਤੇ ਦਵਾਈ ਲੈਂਦਾ/ਲੈਂਦੀ ਹਾਂ। ਕੀ ਤੁਸੀਂ ਇਸਨੂੰ ਇੱਕ ਮਹੀਨੇ ਤੋਂ ਵੱਧ ਲਈ ਦੁਬਾਰਾ ਲਿਖ ਸਕਦੇ ਹੋ?", "ਕੀ ਮੇਰੇ ਪਿਛਲੇ ਡਾਕਟਰ ਤੋਂ ਮੇਰੇ ਮੈਡੀਕਲ ਰਿਕਾਰਡ ਤੁਹਾਨੂੰ ਭੇਜੇ ਜਾ ਸਕਦੇ ਹਨ?", "ਮੈਂ ਆਪਣੀ ਅਗਲੀ ਮੁਲਾਕਾਤ ਕਿਵੇਂ ਬੁੱਕ ਕਰਾਂ?", "ਜੇ ਕਲੀਨਿਕ ਬੰਦ ਹੋਣ ਵੇਲੇ ਮੈਂ ਬੀਮਾਰ ਹੋ ਜਾਵਾਂ ਤਾਂ ਮੈਨੂੰ ਕੀ ਕਰਨਾ ਚਾਹੀਦਾ ਹੈ?"],
  },
  tl: {
    name: "Tagalog", loc: "fil", htmlLang: "fil", dir: "ltr", own: "Tagalog", match: ["Tagalog"],
    h: "Bago sa Ontario? Humanap ng family doctor na tumatanggap ng pasyente",
    sub: "Tingnan kung aling mga family doctor at nurse practitioner na malapit sa iyo ang tumatanggap ng bagong pasyente, at kung kailan huling nakumpirma ang bawat listahan.",
    lang: "Ang iyong wika", postal: "Unang 3 character ng iyong postal code", type: "Sino ang gusto mong makita?", any: "Kahit alin", fd: "Family doctor", np: "Nurse practitioner",
    search: "Ipakita ang mga bukas", privacy: "Hindi namin hinihingi ang iyong pangalan, health card, o impormasyon tungkol sa kalusugan mo. Walang sine-save sa anumang tina-type mo.",
    sample: "Halimbawang datos lamang. Hindi totoo ang mga klinikang ito.", results: "Bukas malapit sa {fsa}", count: "{n} listahan, pinakaangkop ang nasa itaas",
    today: "Nakumpirma ngayong araw", day1: "Nakumpirma kahapon", days: "Nakumpirma {n} araw na ang nakalipas", expires: "Mag-e-expire sa loob ng {n} araw", exp1: "Mag-e-expire bukas",
    speaks: "Nagsasalita ng {lang}", km: "{n} km ang layo", source: "Pinagmulan", call: "Ihanda ang iyong tawag", hint: "Sabihin ang pangungusap sa Ingles. Nasa ibaba ang Tagalog.",
    phone: "Telepono ng klinika", after: "Pagkatapos tumawag, sabihin sa amin ang sagot nila", open: "Tumatanggap pa sila", full: "Puno na sila",
    thOpen: "Salamat. Ngayong araw na ang petsa ng listahang ito.", thFull: "Salamat. Naitala na ang iyong ulat.",
    hcc: "Magparehistro rin sa Health Care Connect",
    what: "Ang Health Care Connect ay opisyal na programa ng Ontario. May nurse na tutulong maghanap ng doktor o nurse practitioner para sa iyo. Maaaring matagalan ito, kaya ituloy mo rin ang sarili mong paghahanap.",
    need: "Kailangan mo ng valid na Ontario health card (OHIP).", online: "Magparehistro online", callnum: "O tumawag sa 1-800-445-1822",
    noohip: "Wala ka pang health card? Mag-apply muna nang personal sa isang ServiceOntario centre.",
    disc: "Tinutulungan ka ng tool na ito na humanap at tumawag sa mga klinika. Hindi ito pumipili ng doktor para sa iyo at hindi ito nagbibigay ng payong medikal.",
    back: "Bumalik", none: "Walang tumutugmang listahan. Subukan ang 'Kahit alin' o ibang postal code.",
    unk: "Wala pa kaming lokasyon para sa postal area na iyan sa Ontario. Subukan ang kalapit na postal area; hindi namin papalitan ang iyong lokasyon.",
    radius: "Sa loob ng humigit-kumulang {n} km mula sa iyong postal area. Tantiya ang mga distansya.",
    src: { web: "Website ng klinika", post: "Post sa komunidad", list: "Listahan ng rehiyon", news: "Newsletter ng klinika", rev: "Nasuring anunsyo" },
    s: ["Hello po. Naghahanap ako ng family doctor.", "Nakita ko na tumatanggap ang klinika ninyo ng bagong pasyente. Totoo pa ba iyon?", "Tagalog ang salita ko. May nagsasalita ba ng Tagalog diyan, o may interpreter?", "Ano ang kailangan kong dalhin para makapagparehistro?"],
    toPlan: "Ang plano ko", tooMany: "Masyadong maraming ulat sa ngayon. Subukan ulit mamaya.", err: "Hindi ito gumana. Pakisubukan ulit.",
    gone: "Hindi na ipinapakita ang listahang ito.",
    planH: "Ang plano ko",
    planSub: "Ang pagtawag mo mismo sa mga klinika ang pinakamabilis na paraan para makahanap ng doktor. Nasa device na ito lang ang listahang ito at mabubura kapag isinara mo ang browser.",
    opened: "Mga klinikang binuksan mo", noneOpened: "Wala ka pang binubuksang klinika.",
    repOpen: "Iniulat mo: tumatanggap pa sila", repFull: "Iniulat mo: puno na sila", repNone: "Wala pang ulat",
    callNext: "Susunod na tawagan", noMore: "Wala nang ibang bukas na listahan malapit sa iyo sa ngayon. Tingnan ulit pagkalipas ng ilang araw.",
    alsoDo: "Gawin din ito", hccIf: "Kung may valid kang Ontario health card, gawin ito nang sabay. Ituloy ang pagtawag sa mga klinika habang naghihintay.",
    concept: "Konsepto", wlLink: "Tingnan kung paano maaaring gumana ang patas na waitlist", needSearch: "Ilagay muna ang iyong postal code.",
    wlBanner: "Konsepto, mga halimbawang pasyente", wlNot: "Hindi ito totoong waitlist. Walang makakasali rito at walang ipinapadalang mensahe.",
    wlStatusH: "Kalagayan ng waitlist", wlEntry: "Halimbawang entry malapit sa {fsa}",
    wlAbout: "Mga {n} tao ang naghihintay malapit sa lugar na ito.", wlFew: "Wala pang 5 tao ang naghihintay malapit sa lugar na ito.",
    wlLast: "{n} araw na ang nakalipas mula nang huling may inialok na puwesto.", wlLast1: "Kahapon huling may inialok na puwesto.", wlLastToday: "May inialok na puwesto ngayong araw.",
    wlNever: "Wala pang inialok na puwesto malapit sa lugar na ito.",
    wlNoPlace: "Hindi namin ipinapakita ang eksaktong puwesto sa pila. Nagbabago ito kapag may tumanggap, pumasa o umalis.",
    wlRuleLink: "Paano gumagana ang pagkakasunod-sunod", wlOutboxLink: "Tingnan ang mga halimbawang mensahe", wlRuleH: "Paano gumagana ang pagkakasunod-sunod",
    wlRules: [
      "Kapag may bukas na puwesto ang isang klinika, iniaalok ito sa mga naghihintay sa loob ng {km} km mula sa klinika.",
      "Ang unang sumali sa listahan ang unang aalukin. Wala nang ibang nagbabago sa pagkakasunod-sunod.",
      "Iniaalok ang isang puwesto sa {batch} tao nang sabay. Ang unang tumanggap ang makakakuha nito.",
      "May {hours} oras ka para sumagot. Kung papasa ka o hindi sasagot, mapupunta ang alok sa susunod na tao at mananatili ang puwesto mo sa listahan.",
      "Tuwing 30 araw, tinatanong namin kung kailangan mo pa ng doktor. Puwede kang patuloy na maghintay, lumipat ng lugar, o umalis sa listahan.",
    ],
    mOffer: "May bukas na puwesto para sa bagong pasyente sa {clinic} ({area}). Sumagot ng OO para tanggapin o PASA para laktawan. Pakisagot bago ang {date}. Kung papasa ka, mananatili ang puwesto mo sa listahan.",
    mReminder: "Paalala: nakalaan para sa iyo ang puwesto sa {clinic} hanggang {date}. Sumagot ng OO para tanggapin o PASA para laktawan.",
    mCheckin: "Kailangan mo pa ba ng doktor? Sumagot ng 1 para patuloy na maghintay, 2 para lumipat ng lugar, o 3 para umalis sa listahan.",
    langUnknown: "Hindi nakalista ang mga wika. Itanong kapag tumawag ka.",
    speaksRep: "Ayon sa mga pasyente: nagsasalita ng {lang}",
    interpRep: "Ayon sa mga pasyente: may inalok na interpreter",
    langQ: "Nagsalita ba sila ng {lang}?",
    lSpoke: "Oo, may nagsalita ng {lang}",
    lInterp: "Nag-alok sila ng interpreter",
    lNeither: "Wala sa dalawa",
    thLang: "Salamat. Makakatulong ito sa susunod na tao na malaman ang aasahan.",
    guideLink: "Mga tanong na dadalhin sa iyong appointment",
    guideH: "Mga tanong para sa iyong appointment",
    guideSub: "Ipakita ang Ingles sa klinika. Nasa ibaba ang Tagalog. Mga praktikal na tanong ito. Para sa usapan tungkol sa iyong kalusugan, humingi ng propesyonal na interpreter.",
    gt: ["Kapag tumatawag sa klinika", "Kapag nagbu-book ng unang appointment", "Sa iyong unang pagbisita", "Mga gamot at medical record", "Pagkatapos ng pagbisita"],
    gq: ["Tumatanggap ba kayo ng mga pasyenteng sakop ng Interim Federal Health Program (IFHP)?", "Anong mga wika ang sinasalita ng inyong mga doktor at staff?", "Gusto ko sana ng interpreter para sa aking appointment. Maaari ba ninyong ayusin ito?", "Ano ang kailangan kong dalhin sa aking unang appointment?", "Bago ako sa Ontario at ito ang aking unang family doctor dito.", "Pakiusap, magsalita nang dahan-dahan. Maaari ba ninyong isulat iyon para sa akin?", "Regular akong umiinom ng gamot. Maaari ba ninyong i-renew ito nang higit sa isang buwan?", "Maaari bang ipadala sa inyo ang aking medical records mula sa dati kong doktor?", "Paano ko ibu-book ang susunod kong appointment?", "Ano ang dapat kong gawin kung magkasakit ako habang sarado ang klinika?"],
  },
};

/**
 * The appointment guide: fixed practical questions, written and reviewed in advance (no live translation, no chat).
 * Each group has its English questions; T[lang].gq holds the same questions in order in the patient's language.
 */
export const GUIDE: string[][] = [
  ["Do you accept patients covered by the Interim Federal Health Program (IFHP)?", "Which languages do your doctors and staff speak?"],
  ["I would like an interpreter for my appointment. Can you arrange one?", "What do I need to bring to my first appointment?"],
  ["I am new to Ontario and this is my first family doctor here.", "Please speak slowly. Can you write that down for me?"],
  ["I take medication regularly. Can you renew it for longer than one month?", "Can my medical records from my previous doctor be sent to you?"],
  ["How do I book my next appointment?", "What should I do if I am sick when the clinic is closed?"],
];

/** The guide in one language: each group's title, and each question in English with this language underneath. */
export function guide(lang: Lang): { title: string; items: { en: string; own: string }[] }[] {
  let i = 0;
  return GUIDE.map((qs, g) => ({ title: T[lang].gt[g], items: qs.map((en) => ({ en, own: T[lang].gq[i++] ?? "" })) }));
}

/** The back-link arrow points the way the page reads. */
export const backArrow = (lang: Lang) => (T[lang].dir === "rtl" ? "→" : "←");

export const fill = (s: string, o: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(o[k] ?? ""));

export function asLang(v: string | null | undefined): Lang {
  return (LANGS as readonly string[]).includes(v || "") ? (v as Lang) : "en";
}

/** The four English lines of the call script. Line 3 is dropped for English speakers. */
export function callScript(lang: Lang): { en: string; own: string }[] {
  const L = EN_NAME[lang];
  const lines = [
    "Hello. I am looking for a family doctor.",
    "I saw that your clinic is taking new patients. Is that still true?",
    lang === "en" ? null : `I speak ${L}. Is there someone who speaks ${L}, or an interpreter?`,
    "What do I need to bring to register?",
  ];
  return lines.flatMap((en, i) => (en ? [{ en, own: T[lang].s[i] }] : []));
}

export function confirmedText(lang: Lang, age: number): string {
  const w = T[lang];
  return age <= 0 ? w.today : age === 1 ? w.day1 : fill(w.days, { n: age });
}
export function expiresText(lang: Lang, daysLeft: number): string {
  const w = T[lang];
  return daysLeft <= 1 ? w.exp1 : fill(w.expires, { n: daysLeft });
}
export function shortDate(lang: Lang, iso: string | Date): string {
  return new Intl.DateTimeFormat(T[lang].loc, { day: "numeric", month: "short", timeZone: "America/Toronto" }).format(new Date(iso));
}
