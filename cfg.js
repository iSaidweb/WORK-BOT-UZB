const { Markup } = require("telegraf");
const userModel = require("./models/userModel");

module.exports = {
    txt:{
        start: "📨Sizni bo'tda ko'rib turganimdan hursandman!\nBo'tdan to'liq foydalanish uchun <b>📞Raqamni yuborish</b> tugmasini bosing!",

        main: "<i>📋Bosh sahifa</i>",

        block: "<b>❌Siz qora ro'yhatga tushgansiz!</b>",

        about: "<b>📚Bot haqida qisqacha tasnif!</b>\n<i>📋Bot orqali:\n💳Loyihalar sotish\n🤝Sotib olish\n👨‍💻Vakansiya joylash\n💰Ish topish\n💻Buyurtmaga ishlash</i>\nImkoniyatlari bo'ladi! Botdan ishlagan pullaringizni esa qiyinchiliksiz <b>UZCARD</b> <b>HUMO</b> kartalariga chiqarib olishingiz mumkin bo'ladi!",
        setContact: "<i>✅Raqamingiz qabul qilindi!</i>",

        requestSpecial: "<b>🔀Yo'nalishni tanlang</b>\n\n<b>💰Buyurtmachi:</b> O'z loyihasini tugallash, rivojlantirish, vakansiya joylash yoki tayyor loyihalarni sotib olish uchun!\n\n<b> 👨‍💻Freelancer:</b> O'z loyihasini sotish, vakansiya uchun nomzod bo'lish yoki buyurtma asosida ishlash uchun!",

        setBuyer:"<i>✅Botda o'z kompaniyangiz yoki loyihangiz uchun ishchi, Dasturchi, Grafik dizayner, Targetolog, Marketolog, Teamlead va stajyorlar topishingiz mumkin!</i>\n📨Shunchaki botda e'lon joylashtirishingiz yoki vakandlar ro'yhatini ko'rishingiz kifoya!",

        setFreelancer: "<i>✅Botda o'z loyihalaringizni sotishingiz, ish topishingiz yoki buyurtma asosida ishlashingiz mumkin!</i>\n📨Loyiha sotish uchun e'lon joylashtiring, vakansiyalarni ko'rish yoki buyurtma asosida ishlash uchun birjaga kiring!",

        edit_name: "<b>💬Ismingizni yozing!</b>\n⚙️Namuna: <b>Shoxrux</b>",

        upname: "<i>✅Ism o'zgartirildi</i>",

        edit_phone: "<b>☎️Raqamni yuborish</b> tugmasini bosing!\n\n<b>❗️Raqamni yangilash uchun kerak!</b>",
        
        upphone: "<i>✅Raqam qabul qilindi!</i>",

        edit_uzcard: "<i>💳UzCard raqamini yozing</i>\n\n<b>❗️Namuna:</b> 8600132456789876",

        edit_humo: "<i>💳Humo raqamini yozing</i>\n\n<b>❗️Namuna:</b> 9860132456789876",

        upuzcard: "<i>✅UzCard o'zgartirildi!</i>",

        uphumo: "<i>✅Humo o'zgartirildi!</i>",

        err_uzcard: "<b>❌Karta raqami noto'g'ri kiritildi</b>\n\nRaqam oralig'ida bo'shliqlar bo'lmasin\n❗️Namuna: <b>8600132456789876</b>",

        err_humo: "<b>❌Karta raqami noto'g'ri kiritildi</b>\n\nRaqam oralig'ida bo'shliqlar bo'lmasin\n❗️Namuna: <b>9800132456789876</b>",

        card: "<b>❌Karta raqami avvalgisi bilan bir xil!</b>\n\n⭕️Qaytadan urinib ko'ring!",

        reqResume: "<b>🗞️O'z rezyumeyingizni(Ismingiz, Yoshingiz, Aloqa manzillari, Qanday dasturlash tillarini bilasiz, Tajribangiz, Qayerda o'qigansiz, Ishlagan joylaringiz) ni yuboring!</b>\n🔹Namuna:\n\n<i>Men Veb dasturchiman ismim Shoxrux yoshim 21 da yo'nalishim FullStack dasturchi va PHP-Laravel, MySql, PostgreSql, NodeJS, ExpressJS, ReactJS, Redux, Angular texnologiyalarini mukammal bilaman! Tajribam 2 yil va avval IT-PARK da ishlaganman! Aloqa uchun: +998-90-123-45-67</i>\n\n❗Kamida 30 ta ishoradan iborat bo'lishi lozim"
    },
    btn: {
        start: Markup.keyboard([
            Markup.button.contactRequest("📞Raqamni yuborish")
        ]).resize(true),
        main: Markup.keyboard([
            ["💎Birja","💻Ishlarim"],
            ["👤Profil","📚Bot haqida"]
        ]).resize(true),

        back: Markup.keyboard([
            ["🔙Ortga"]
        ]).resize(true),

        edit_phone: Markup.keyboard([
            [Markup.button.contactRequest("📞Raqamni yuborish")],
            ["🔙Ortga"]
        ]).resize(true),
        //inline
        requestSpecial: Markup.inlineKeyboard([
            [
                {text: "💰Buyurtmachi",callback_data: 'role_buyer'},
                {text: "👨‍💻Freelancer",callback_data: 'role_freelancer'}
            ]
        ]),
        profile: Markup.inlineKeyboard([
            [
                {text: "👤Ismni o'zgartirish",callback_data: 'edit_name'},
                {text: "☎️Raqamni yangilash",callback_data: 'edit_phone'}
            ],
            [
                // {text: "💳Finanslar",callback_data: 'get_finance'},
                {text: "📨Takliflarim",callback_data: 'get_requests'},
                {text: "🔀Yo'nalishni o'zgartirish",callback_data: 'edit_role'}

            ]
        ]),
        workFreelacer: Markup.inlineKeyboard([
            [
                {text: "💻Barcha loyihalarim",callback_data: 'get_freelancer_work'},
            ],
            [
                {text: "➕Loyiha joylash",callback_data: 'add_freelancer_work'}
            ],
            [
                {text: "📨Rezyume joylash && Taxrirlash",callback_data: 'add_freelancer_resume'}
            ]
        ]),
        workBuyer: Markup.inlineKeyboard([
            [
                {text: "💻Barcha buyurtmalarim",callback_data: 'get_buyer_order'},
            ],
            [
                {text: "➕Buyurtma joylash",callback_data: 'add_buyer_order'}
            ],
            [
                {text: "📮Joylangan vakansiyalarim",callback_data: 'get_buyer_vacancy'}
            ],
            [
                {text: "👨‍💻Vakansiya joylash",callback_data: 'add_buyer_vacancy'}
            ]
        ]),
        about: Markup.inlineKeyboard([
            [
                {text: "❗Qoidalar",callback_data: 'about_rules'},
                {text: "👮Xavfsizlik",callback_data: 'about_security'}
            ],
            [
                {text: "💳Finans qoidalari",callback_data: 'about_finance'},{text: "☎️Aloqa",url: 'https://t.me/saidweb'}
            ]
        ]),

        finans: Markup.inlineKeyboard([
            [{ text: "💳UzCard'ni o'zgartirish", callback_data: "edit_uzcard" }, { text: "💳Humo'ni o'zgartirish", callback_data: "edit_humo" }],
            [{ text: "💰Balansni to'ldirish", callback_data: "onpay" }, { text: "💸Pul yechib olish", callback_data: "offpay" }],
            [{ text: "🔙Ortga", callback_data: "ortga" }]
        ])
    },
    fnc: {
        setStep: function(id,editObj){
            try{
                userModel.findOneAndUpdate(
                    {id},
                    editObj,
                    {new:true, runValidators: true, upsert: true},
                    ()=>{}
                )
                
            }catch(error){
                return false
            }
        }
    }
}