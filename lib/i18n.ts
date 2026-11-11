/**
 * Every patient-facing string, stored. There is no live AI translation.
 * Strings marked "draft" in docs/translations-to-review.md need a native speaker's review.
 */
export const LANGS = ["en", "fr", "zh", "es", "tl"] as const;
export type Lang = (typeof LANGS)[number];

/** English name of each language, as used in listing data and in the English call script. */
export const EN_NAME: Record<Lang, string> = { en: "English", fr: "French", zh: "Mandarin", es: "Spanish", tl: "Tagalog" };

export type Strings = {
  name: string; loc: string; htmlLang: string; own: string; match: string[];
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
};

export const T: Record<Lang, Strings> = {
  en: {
    name: "English", loc: "en-CA", htmlLang: "en", own: "English", match: ["English"],
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
  },
  fr: {
    name: "Français", loc: "fr-CA", htmlLang: "fr", own: "français", match: ["French"],
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
  },
  zh: {
    name: "中文（普通话）", loc: "zh-CN", htmlLang: "zh", own: "普通话", match: ["Mandarin"],
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
  },
  es: {
    name: "Español", loc: "es", htmlLang: "es", own: "español", match: ["Spanish"],
    h: "¿Nuevo en Ontario? Encuentre un médico de familia que acepta pacientes",
    sub: "Vea qué médicos de familia y enfermeras practicantes cerca de usted aceptan pacientes nuevos, y cuándo se confirmó cada aviso por última vez.",
    lang: "Su idioma", postal: "Los primeros 3 caracteres de su código postal", type: "¿A quién quiere ver?", any: "Cualquiera", fd: "Médico de familia", np: "Enfermera practicante",
    search: "Ver lugares disponibles", privacy: "No pedimos su nombre, su tarjeta de salud ni información sobre su salud. No se guarda nada de lo que escribe.",
    sample: "Datos de ejemplo. Estas clínicas no existen.", results: "Disponibles cerca de {fsa}", count: "{n} resultados, la mejor opción primero",
    today: "Confirmado hoy", day1: "Confirmado ayer", days: "Confirmado hace {n} días", expires: "Vence en {n} días", exp1: "Vence mañana",
    speaks: "Habla {lang}", km: "A {n} km", source: "Fuente", call: "Prepare su llamada", hint: "Diga la frase en inglés. Debajo está en español.",
    phone: "Teléfono de la clínica", after: "Después de llamar, cuéntenos qué le dijeron", open: "Siguen aceptando pacientes", full: "Ya no hay lugar",
    thOpen: "Gracias. La fecha de este aviso ahora es hoy.", thFull: "Gracias. Su aviso quedó registrado.",
    hcc: "Inscríbase también en Health Care Connect",
    what: "Health Care Connect es el programa oficial de Ontario. Una enfermera le ayuda a buscar un médico o una enfermera practicante. Puede tardar, así que siga buscando por su cuenta también.",
    need: "Necesita una tarjeta de salud de Ontario (OHIP) válida.", online: "Inscribirse en línea", callnum: "O llame al 1-800-445-1822",
    noohip: "¿Aún no tiene tarjeta de salud? Primero solicítela en persona en un centro de ServiceOntario.",
    disc: "Esta herramienta le ayuda a encontrar clínicas y a comunicarse con ellas. No elige un médico por usted ni da consejos médicos.",
    back: "Atrás", none: "Ningún aviso coincide. Pruebe «Cualquiera» u otro código postal.",
    unk: "No tenemos datos de ubicación para esa zona postal de Ontario. Prueba una zona cercana; no sustituiremos tu ubicación.",
    radius: "A unos {n} km de tu zona postal. Las distancias son aproximadas.",
    src: { web: "Sitio web de la clínica", post: "Publicación comunitaria", list: "Lista regional", news: "Boletín de la clínica", rev: "Anuncio revisado" },
    s: ["Hola. Busco un médico de familia.", "Vi que su clínica acepta pacientes nuevos. ¿Sigue siendo así?", "Hablo español. ¿Hay alguien que hable español, o un intérprete?", "¿Qué debo llevar para inscribirme?"],
    toPlan: "Mi plan", tooMany: "Demasiados avisos por ahora. Inténtelo más tarde.", err: "No funcionó. Inténtelo de nuevo.",
    gone: "Este aviso ya no se muestra.",
    planH: "Mi plan",
    planSub: "Llamar usted mismo a las clínicas es la forma más rápida de encontrar un médico. Esta lista se queda en este dispositivo y se borra al cerrar el navegador.",
    opened: "Clínicas que abrió", noneOpened: "Todavía no ha abierto ninguna clínica.",
    repOpen: "Usted informó: siguen aceptando pacientes", repFull: "Usted informó: ya no hay lugar", repNone: "Aún sin informar",
    callNext: "Llame después a", noMore: "Por ahora no hay otros lugares disponibles cerca de usted. Vuelva a revisar en unos días.",
    alsoDo: "Haga esto también", hccIf: "Si tiene una tarjeta de salud de Ontario válida, haga esto al mismo tiempo. Siga llamando a las clínicas mientras espera.",
    concept: "Concepto", wlLink: "Vea cómo podría funcionar una lista de espera justa", needSearch: "Primero escriba su código postal.",
    wlBanner: "Concepto, pacientes de ejemplo", wlNot: "Esta no es una lista de espera real. Nadie puede inscribirse y no se envía ningún mensaje.",
    wlStatusH: "Estado de la lista de espera", wlEntry: "Inscripción de ejemplo cerca de {fsa}",
    wlAbout: "Unas {n} personas esperan cerca de esta zona.", wlFew: "Menos de 5 personas esperan cerca de esta zona.",
    wlLast: "El último lugar se ofreció hace {n} días.", wlLast1: "El último lugar se ofreció ayer.", wlLastToday: "Hoy se ofreció un lugar.",
    wlNever: "Todavía no se ha ofrecido ningún lugar cerca de esta zona.",
    wlNoPlace: "No mostramos un puesto exacto en la fila. Cambia cuando otras personas aceptan, pasan o salen de la lista.",
    wlRuleLink: "Cómo funciona el orden", wlOutboxLink: "Ver los mensajes de ejemplo", wlRuleH: "Cómo funciona el orden",
    wlRules: [
      "Cuando una clínica tiene un lugar, se ofrece a las personas que esperan a menos de {km} km de la clínica.",
      "La persona que se inscribió primero recibe la oferta primero. Nada más cambia el orden.",
      "Un lugar se ofrece a {batch} personas a la vez. La primera que acepta se queda con él.",
      "Tiene {hours} horas para responder. Si pasa o no responde, la oferta va a la siguiente persona y usted conserva su puesto en la lista.",
      "Cada 30 días preguntamos si todavía necesita un médico. Puede seguir esperando, cambiar de zona o salir de la lista.",
    ],
    mOffer: "{clinic} ({area}) tiene un lugar para un paciente nuevo. Responda SÍ para aceptar o PASO para dejarlo. Responda antes del {date}. Si pasa, conserva su puesto en la lista.",
    mReminder: "Recordatorio: el lugar en {clinic} está reservado para usted hasta el {date}. Responda SÍ para aceptar o PASO para dejarlo.",
    mCheckin: "¿Todavía necesita un médico? Responda 1 para seguir esperando, 2 para cambiar de zona o 3 para salir de la lista.",
  },
  tl: {
    name: "Tagalog", loc: "fil", htmlLang: "fil", own: "Tagalog", match: ["Tagalog"],
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
  },
};

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
