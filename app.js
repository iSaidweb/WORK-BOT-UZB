const { Telegraf, Markup } = require('telegraf');
const { txt, btn, fnc } = require('./cfg');
const categoryModel = require('./models/categoryModel');
const orderModel = require('./models/orderModel');
const reqToOrder = require('./models/reqToOrder');
const reqToVacancy = require('./models/reqToVacancy');
const reqToWork = require('./models/reqToWork');
const userModel = require('./models/userModel');
const vacancyModel = require('./models/vacancyModel');
const workModel = require('./models/workModel');
process.env.NODE_ENV !== 'production' ? require('dotenv').config({ path: '.env' }) : null;
require('mongoose').connect(process.env.MONGO_DB)
const bot = new Telegraf(process.env.TELE_TOKEN);
//Bot start command: /start
bot.start(async msg => {
    const { id, first_name } = msg.from;
    let user = await userModel.findOne({ id });
    if (!user) {
        new userModel({
            id, name: first_name.replaceAll('<', '').replaceAll('>', '').replaceAll('/', '').replaceAll('\\', '')
        }).save().then(() => {
            msg.replyWithHTML(txt.start, { ...btn.start });
        })
    } else {
        msg.replyWithHTML(txt.main, { ...btn.main });
    }
});
//Bot text commands: [buttons]
bot.on('text', async msg => {
    const { id } = msg.from;
    let tx = msg.message.text;
    tx = tx.replace('<', '').replaceAll('/', '').replaceAll('\\', '').replaceAll('>', '')
    let user = await userModel.findOne({ id });
    function sm(text, keyboard = btn.main) {
        msg.replyWithHTML(text, { ...keyboard });
    }
    if (user.block) {
        sm(txt.block, Markup.removeKeyboard())
    } else {
        if (tx == "🔙Ortga") {
            fnc.setStep(id, { step: 'none', etc: {} })
            sm(txt.main, btn.main);
        } else if (tx == "👤Profil") {
            sm(`<b>📋Profilingiz</b>\n\n👤Ismingiz: <b>${user.name}</b>\n☎️Raqamingiz: <b>${user.phone}</b>\n〰️〰️〰️〰️〰️〰️〰️〰️〰️\n<b>💟REYTING:</b>\n❤️Ijobiy: <b>${user.positive}</b>\n💔Salbiy: <b>${user.negative}</b>\n〰️〰️〰️〰️〰️〰️〰️〰️〰️\n💻Yo'nalish: <b>${user.role == 'freelancer' ? "FREELANCER" : "BUYURTMACHI"}</b>`, btn.profile)
            // \n💰Hisobingiz: <b>${user.balance} UZS</b>\n💳UzCard: <b>${user.uzcard}</b>\n💳HUMO: <b>${user.humo}</b>
        } else if (tx == "📚Bot haqida") {
            sm(txt.about, btn.about);
        } else if (tx == "💻Ishlarim") {
            if (user.role == 'buyer') {
                const AllOrders = await orderModel.find({ from: id });
                const AllVacancy = await vacancyModel.find({ from: id });

                sm(`<b>📋Barcha joylashtirgan e'lonlaringiz:</b>\n\n📨Buyurtmalar: <b>${AllOrders.length}</b>\n👨‍💻Joylangan vakansiyalar: <b>${AllVacancy.length}</b>`, btn.workBuyer)
            } else if (user.role == 'freelancer') {
                const AllWorks = await workModel.find({ from: id });

                sm(`<b>📋Barcha joylashtirgan e'lonlaringiz:</b>\n\n📨Sotuvdagi loyihalar: <b>${AllWorks.length}</b>\n\n📮Rezyume: <b>${!user.resume ? "Joylanmagan" : `<b>${user.resume}</b>`}</b>`, btn.workFreelacer)
            }
        } else {
            ///////BUYURTMA///////
            if (user.step == 'order_title') {
                if (tx.length < 5) {
                    sm('<i>📨Buyurtma nomini to\'g\'ri kiriting!</i>\n📋Namuna: <b>Mobil dastur uchun server</b>', btn.back)
                } else {
                    fnc.setStep(id, { step: 'order_about', etc: { from: id, title: tx } })
                    sm('<i>📨Batafsil ma\'lumot yozing minimal 30 ta ishora qatnashsin</i>\n📋Namuna: <b>To\'lov tizimlari bilan ishlovchi server. ExpressJS va MongoDB da bo\'lishi kerak....</b>', btn.back)
                }
            } else if (user.step == 'order_about') {
                if (tx.length < 30) {
                    sm('<i>📨Batafsil ma\'lumotni to\'g\'ri kiriting!</i>\n📋Namuna: <b>To\'lov tizimlari bilan ishlovchi server. ExpressJS va MongoDB da bo\'lishi kerak....</b>', btn.back)
                } else {
                    fnc.setStep(id, { step: 'order_amout', etc: { ...user.etc, about: tx } })
                    sm('<i>💰Buyurtma uchun ajratilgan mablag\'\n<i>❗Kamida 100 000</i></i>\n📋Namuna: <b>2 000 000</b>\n<b>⚠️FAQAT RAQAMLARDA</b>', btn.back)
                }
            } else if (user.step == 'order_amout') {
                if (isNaN(+tx) || +tx < 100000) {
                    sm('<i>💰Buyurtma uchun ajratilgan mablag\'ni to\'g\'ri kiriting!\n<i>❗Kamida 100 000</i></i>\n📋Namuna: <b>2 000 000</b>\n<b>⚠️FAQAT RAQAMLARDA</b>', btn.back)
                } else {
                    fnc.setStep(id, { step: 'order_category', etc: { ...user.etc, amout: tx } });
                    const keyb = []
                    const Categories = await categoryModel.find()
                    Categories.forEach(category => {
                        keyb.push([{ text: `${category.title}`, callback_data: category._id }])
                    })
                    sm('<b>📋Buyurtma kategoriyasini tanlang!</b>', Markup.inlineKeyboard(keyb))
                }
            } else if (user.step == 'msg_to_request') {
                const req = await reqToOrder.findOne({ _id: user.etc.to })
                const { from } = req;
                const order = await orderModel.findOne({ _id: req.orderId })
                if (user.role == 'buyer') {
                    fnc.setStep(from, { step: 'msg_to_request', etc: { to: req._id } })
                    msg.telegram.sendMessage(from, `<b>📮${order.title}</b> - buyurtma uchun yangi habar!\n\n<b>📋Habar:</b> ${tx}\n\n<b>📨Habaringizni yozishingiz mumkin!</b>`, { parse_mode: 'HTML', ...btn.back })
                    fnc.setStep(id, { step: 'msg_to_request', etc: { to: req._id } })
                    sm(`<b>✅${order.title}</b> - buyurtmangiz uchun habar taklif yuboruvchiga yetgazildi!\n<i>📨Yana habar yuborishingiz mumkin!</i>`, btn.back)

                } else if (user.role == 'freelancer') {
                    fnc.setStep(order.from, { step: 'msg_to_request', etc: { to: req._id } })
                    msg.telegram.sendMessage(order.from, `<b>📮${order.title}</b> - buyurtmangiz uchun yangi habar!\n\n<b>📋Habar:</b> ${tx}\n\n<b>📨Habaringizni yozishingiz mumkin!</b>`, { parse_mode: 'HTML', ...btn.back })
                    fnc.setStep(id, { step: 'msg_to_request', etc: { to: req._id } })
                    sm(`<b>✅${order.title}</b> - buyurtma uchun habar buyurtmachiga yetgazildi!\n<i>📨Yana habar yuborishingiz mumkin!</i>`, btn.back)

                }
            }
            ////////VAKANSIYA////////
            else if (user.step == 'vacancy_name') {
                if (tx.length < 20 || tx.length > 50) {
                    sm("<i>📋Vakansiya nomini to'g'ri kiriting kamida 20 ta ko'pi bilan 50 ta ishoradan tashkil topsin!</i>\n\n🗞️Namuna: <b>NodeJS & ExpressJS dasturchi(Middle/Senior)</b>", btn.back)
                } else {
                    fnc.setStep(id, { step: 'vacancy_about', etc: { from: id, title: tx } })
                    sm("<i>📋Vakansiya uchun batafsil ma'lumot kiriting!</i>\n\n🗞️Namuna: <b>Rest api bilan mukammal ishlay oluvchi dasturchi kerak...</b>\n\n📮Kamida 50 ta ishora qatnashgan holda!", btn.back)
                }
            } else if (user.step == 'vacancy_about') {
                if (tx.length < 50) {
                    sm("<i>📋Vakansiya uchun batafsil ma'lumotni to'g'ri kiriting!</i>\n\n🗞️Namuna: <b>Rest api bilan mukammal ishlay oluvchi dasturchi kerak...</b>\n\n📮Kamida 50 ta ishora qatnashgan holda!", btn.back)
                } else {
                    fnc.setStep(id, { step: 'vacancy_amout', etc: { ...user.etc, about: tx } })
                    sm(`<i>💰Oylik maoshni uzs'da kiriting yoki "🤝Suhbat asosida" tugmasini bosing</i>\n\n🗞️Namuna: <b>2 000 000</b>\n\n📮Faqat raqamlarda!`, Markup.inlineKeyboard([
                        [{ text: "🤝Suhbat asosida", callback_data: 'vacancy_conversation' }]
                    ]))
                }
            } else if (user.step == 'vacancy_amout') {
                if (isNaN(+tx.replaceAll(' ', ''))) {
                    sm(`<i>💰Oylik maoshni uzs'da kiriting yoki "🤝Suhbat asosida" tugmasini bosing</i>\n\n🗞️Namuna: <b>2 000 000</b>\n\n📮Faqat raqamlarda!`, Markup.inlineKeyboard([
                        [{ text: "🤝Suhbat asosida", callback_data: 'vacancy_conversation' }]
                    ]))
                } else {
                    fnc.setStep(id, { step: 'vacancy_worktype', etc: { ...user.etc, amout: tx } });
                    sm(`<i>📋Vakansiya uchun ish turini tanlang!</i>`, Markup.inlineKeyboard([
                        [{ text: "🌐Masofaviy", callback_data: 'vacancy_remote' }],
                        [{ text: "🏢Offline & Ofisda", callback_data: 'vacancy_offline' }],
                        [{ text: "🔀Gibrid - Masofaviy | Offline", callback_data: 'vacancy_hybrid' }],
                    ]))
                }
            } else if (user.step == 'vacancy_location') {
                if (tx.length < 10) {
                    sm("<i>🏡Manzilni to'g'ri yuboring!</i>\n📋Namuna: Andijon v. Xojaobod t. ooo SAIDNET MCHJ`")
                } else {
                    fnc.setStep(id, { step: 'vacancy_contacts', etc: { ...user.etc, location: tx } });
                    sm("<i>📧Aloqa manzillarini yuboring!</i>\n📋Namuna: <b>saidnet@mail.uz | +998 90 123 45 67 | 90 123 45 67</b>", btn.back)
                }
            } else if (user.step == 'vacancy_contacts') {
                if (tx.length < 7) {
                    sm("<i>📧Aloqa manzillarini to'g'ri yuboring!</i>\n📋Namuna: <b>saidnet@mail.uz | +998 90 123 45 67 | 90 123 45 67</b>", btn.back)
                } else {
                    fnc.setStep(id, { step: 'vacancy_check', etc: { ...user.etc, contacts: tx } });
                    sm(`<b>📮Barchasi to'g'ri ekanini tekshiring</b>\n\n📨Vakansiya: ${user.etc.title}\n\n📋Batafsil: <i>${user.etc.about}</i>\n\n🏡Manzil: <b>${user.etc.location}</b>\n\n📮Ish turi: <b>${user.etc.worktype == 'remote' ? "🌐Masofaviy" : ""}${user.etc.worktype == 'offline' ? "🏢Offline & Ofisda" : ""}${user.etc.worktype == 'hybrid' ? "🔀Gibrid - Masofaviy | Offline🌐Masofaviy" : ""}</b>\n\n💰Maosh: <b>${(user.etc.amout) + (isNaN(+user.etc.amout) ? "" : " UZS")}</b>\n\n📧Aloqa manzillari: <b>${tx}</b>\n\n🗞️Barchasi to'g'ri bo'lsa <b>✅Joylash</b> tugmasini bosing!`, Markup.inlineKeyboard([
                        [{ text: "✅Joylash", callback_data: "vacancy_post" }]
                    ]))
                }
            } else if (user.step == 'smto_vacancy') {
                const { reqId } = user.etc;
                const request = await reqToVacancy.findOne({ _id: reqId });
                if (user.role == 'buyer') {
                    if (!request) {
                        sm("<b>❗Kechirasiz ariza yuboruvchi arizani bekor qilgan!</b>");
                    } else {
                        const vacancy = await vacancyModel.findOne({ _id: request.vacancyId });
                        const from = await userModel.findOne({ id: request.from });
                        fnc.setStep(from, { step: 'smto_vacancy', etc: { reqId } });

                        msg.telegram.sendMessage(from.id, `<b>📮Yangi habar!</b>\n🗞️Vakansiya: <b>${vacancy.title}</b>\n📋Habar: <i>${tx}</i>`, { parse_mode: "HTML", ...btn.back });

                        sm(`<b>✅Vakansiya: ${vacancy.title}</b>\n📋Habar: <i>${tx}</i>\n\n<b>📮Nomzodga yetgazildi! Nomzod aloqaga chiqishi bilan bot sizga yetgazadi!</b>`, btn.back)
                    }
                } else if (user.role == 'freelancer') {
                    if (!request) {
                        sm("<b>❗Kechirasiz siz arizani bekor qilgansiz!</b>");
                    } else {
                        const vacancy = await vacancyModel.findOne({ _id: request.vacancyId });
                        if (!vacancy) {
                            sm("<b>❗Vakansiya uchun nomzod topilgan!</b>")
                        } else {
                            fnc.setStep(vacancy.from, { step: 'smto_vacancy', etc: { reqId } });

                            msg.telegram.sendMessage(vacancy.from, `<b>📮Yangi habar!</b>\n🗞️Vakansiya: <b>${vacancy.title}</b>\n📋Habar: <i>${tx}</i>`, { parse_mode: "HTML", ...btn.back });

                            sm(`<b>✅Vakansiya: ${vacancy.title}</b>\n📋Habar: <i>${tx}</i>\n\n<b>📮Vakansiya joylovchiga yetgazildi! Vakansiya joylovchi aloqaga chiqishi bilan bot sizga yetgazadi!</b>`, btn.back)
                        }
                    }
                }
            }
            ////////PROFIL////////
            else if (user.step === "edit_name") {
                if (tx.length < 3) {
                    sm(txt.edit_name, btn.back)
                } else {
                    fnc.setStep(id, { step: "none", name: tx })
                    sm(txt.upname, btn.main)
                }
            } else if (user.step === 'edit_phone') {
                fnc.setStep(id, { step: "none" })
                if (tx) {
                    sm(txt.edit_phone, btn.edit_phone)
                }
            } else if (user.step === 'edit_uzcard') {
                if (!tx.includes("8600") || !/^[0-9]{16,16}$/.test(tx)) {
                    sm(txt.err_uzcard, btn.back)
                } else {
                    if (user.uzcard === tx) {
                        sm(txt.card, btn.back)
                    }
                    else {
                        fnc.setStep(id, { step: "none", uzcard: tx })
                        sm(txt.upuzcard, Markup.inlineKeyboard([
                            [{ text: '🔙Ortga', callback_data: 'get_finance' }]
                        ]))

                    }
                }
            } else if (user.step === 'edit_humo') {
                if (!tx.includes("9860") || !/^[0-9]{16,16}$/.test(tx)) {
                    sm(txt.err_humo, btn.back)
                } else {
                    if (user.humo === tx) {
                        sm(txt.card, btn.card)
                    } else {
                        fnc.setStep(id, { step: "none", humo: tx })
                        sm(txt.uphumo, Markup.inlineKeyboard([
                            [{ text: '🔙Ortga', callback_data: 'get_finance' }]
                        ]))
                    }
                }
            } else if (user.step === 'edit_resume' && user.role == 'freelancer') {
                if (tx.length < 30) {
                    sm("<b>❗Rezyumeni to'liq kiriting!</b>\n🗞️Kamida 30 ta ishora(xarf)dan tashkil topsin", btn.back)
                } else {
                    fnc.setStep(id, { step: 'none', resume: tx });
                    msg.editMessageReplyMarkup(Markup.removeKeyboard());
                    sm("<b>✅Rezyume kiritildi!</b>\n🤝Birja orqali vakansiyalarga ariza yuborishingiz mumkin!", btn.back);
                }
            }
            //////FREELANCER-WORK////////
            else if (user.step === 'fw_title') {
                if (tx.length < 10) {
                    sm(`<b>❗Loyiha nomini to'g'ri kiriting!</b>\n🗞️Kamida <b>10</b> ta harf qtnashsin!\n📋Namuna: <b>TikTok dan video yuklovchi telegram bot</b>`, btn.back);
                } else {
                    fnc.setStep(id, { step: 'fw_about', etc: { from: id, title: tx } })
                    sm(`<b>✅Loyiha nomi qabul qilindi!</b>\n<b>🗞️Loyiha haqida batafsil ma'lumot yozing!</b>\n📋Masalan: <i>Tiktok va instagramdan video va musiqa yukovchi bot. PYTHON da tuzulgan va admin paneli bor...</i>\n\n📮Kamida <b>20</b> ta harf`, btn.back)
                }
            } else if (user.step === 'fw_about') {
                if (tx.length < 20) {
                    sm(`<b>❗Loyiha haqida to'g'ri ma'lumot kiriting!</b>\n🗞️Kamida <b>20</b> ta harf qtnashsin!\n📋Namuna: <i>Tiktok va instagramdan video va musiqa yukovchi bot. PYTHON da tuzulgan va admin paneli bor...</i>`, btn.back);
                } else {
                    fnc.setStep(id, { step: 'fw_example', etc: { ...user.etc, about: tx } })
                    sm(`<b>✅Loyiha haqida ma'lumot qabul qilindi!</b>\n🗞️Loyiha <b>demo</b> variantini kiriting!\n📋Masalan: @teworkbot | Sayt: saidnet.uz\n\n<b>📮Agar demo varianti bo'lmasa shunchaki YO'Q deb yozing!</b>`, btn.back);
                }
            } else if (user.step === 'fw_example') {
                fnc.setStep(id, { step: 'fw_amout', etc: { ...user.etc, example: tx } })
                sm(`<b>✅Loyiha demo varianti qabul qilindi!</b>\n<i>💰Loyiha narxini kiriting!</i>\n📋Masalan: <b>500 000</b>\n<b>📮Faqat raqamlarda!</b>`, btn.back);
            } else if (user.step === 'fw_amout') {
                tx = tx.replaceAll(' ', '')
                if (isNaN(+tx)) {
                    sm(`<b>💰Loyiha narxini tog'ri kiriting!</b>\n📋Masalan: <b>500 000</b>\n<b>📮Faqat raqamlarda!</b>`, btn.back);
                } else {
                    fnc.setStep(id, { step: 'fw_category', etc: { ...user.etc, amout: tx } });
                    const Categories = await categoryModel.find();
                    let keyb = []
                    Categories.forEach(category => {
                        keyb.push([{ text: category.title, callback_data: category._id }]);
                    })
                    sm(`<b>✅Loyiha narxi qabul qilindi!</b>\n<i>📋Kategoriyani tanlang!</i>`, Markup.inlineKeyboard(keyb));
                }
            } else if (user.step == 'sm_to_workreq') {
                const { reqId } = user.etc;
                const req = await reqToWork.findOne({ _id: reqId });
                if (!req) {
                    sm('<b>❗Buyurtma bekor qilingan!</b>', btn.back);
                } else {
                    const work = await workModel.findOne({ _id: req.workId });
                    if (!work) {
                        sm("<b>❗Freelancer tomonidan loyiha bekor qilingan!!</b>", btn.back);
                    } else {
                        if (id == req.from) {
                            fnc.setStep(work.from, { step: 'sm_to_workreq', etc: { reqId } });
                            const position = await reqToWork.find({ workId: work._id });
                            let index = 0;
                            for (let i = 0; i < position.length; i++) {
                                if (position[i].from == id) {
                                    index = i + 1;
                                    break;
                                }
                            }
                            msg.telegram.sendMessage(work.from, `<b>📨${work.title}</b> loyihangiz uchun buyurtmachidan habar!\n\n📮Buyurtma raqami: <b>#${index}</b>\n\n🗞️Habar: <i>${tx}</i>\n\n📧Habar yuborishingiz mumkin bot buyurtmachiga yetgazadi!\n<b>📋Habaringiz:</b>`, {
                                parse_mode: "HTML",
                                ...btn.back
                            });

                            sm(`📨Habaringiz <b>${work.title}</b> muallifiga yuborildi!\n📋Yana habar yuborishingiz mumkin!`, btn.back);
                        } else if (id == work.from) {
                            fnc.setStep(req.from, { step: 'sm_to_workreq', etc: { reqId } });

                            msg.telegram.sendMessage(req.from, `<b>📨${work.title}</b> loyihasi uchun buyurtmangizga sotuvchi freelancerdan habar!\n\n🗞️Habar: <i>${tx}</i>\n\n📧Habar yuborishingiz mumkin bot freelancer'ga yetgazadi!\n<b>📋Habaringiz:</b>`, {
                                parse_mode: "HTML",
                                ...btn.back
                            });

                            sm(`📨Habaringiz <b>${work.title}</b> buyurtmachiga yuborildi!\n📋Yana habar yuborishingiz mumkin!`, btn.back);
                        }
                    }
                }
            }
        }
    }
});
//Bot inline commands: [callback_query]
bot.on('callback_query', async msg => {
    const { id } = msg.from;
    const { data } = msg.callbackQuery;
    console.log(data);
    let user = await userModel.findOne({ id });
    function sm(text, keyboard = btn.main) {
        msg.replyWithHTML(text, { ...keyboard });
    }
    if (user.block) {
        sm(txt.block, Markup.removeKeyboard())
    } else {
        if (data === 'ortga') {
            msg.editMessageReplyMarkup(Markup.removeKeyboard());
            sm(`<b>📋Profilingiz</b>\n\n👤Ismingiz: <b>${user.name}</b>\n☎️Raqamingiz: <b>${user.phone}</b>\n〰️〰️〰️〰️〰️〰️〰️〰️〰️\n<b>💟REYTING:</b>\n❤️Ijobiy: <b>${user.positive}</b>\n💔Salbiy: <b>${user.negative}</b>\n〰️〰️〰️〰️〰️〰️〰️〰️〰️\n💻Yo'nalish: <b>${user.role == 'freelancer' ? "FREELANCER" : "BUYURTMACHI"}</b>`, btn.profile)
        } else if (data.includes('role_') && user.step == 'role') {
            msg.editMessageReplyMarkup(Markup.removeKeyboard());
            const dt = data.split('_')[1]
            if (dt == 'buyer') {
                fnc.setStep(id, { step: 'none', role: dt })
                sm(txt.setBuyer);
            } else if (dt == 'freelancer') {
                fnc.setStep(id, { step: 'none', role: dt })
                sm(txt.setFreelancer);
            }
        }
        ///////////BUYURTMA/////////
        else if (data.includes('add')) {
            const dt = data.split('_');
            msg.editMessageReplyMarkup(Markup.removeKeyboard());
            if (dt[1] == 'buyer' && user.role == 'buyer') {
                if (dt[2] == 'order') {
                    fnc.setStep(id, { step: 'order_title' });
                    sm('<i>📨Buyurtma nomini kiriting</i>\n📋Namuna: <b>Mobil dastur uchun server</b>', btn.back)
                } else if (dt[2] == 'vacancy') {
                    fnc.setStep(id, { step: 'vacancy_name' });
                    sm("<i>📋Vakansiya nomini kiriting kamida 20 ta ko'pi bilan 50 ta ishoradan tashkil topsin!!</i>\n\n🗞️Namuna: <b>NodeJS & ExpressJS dasturchi(Middle/Senior)</b>", btn.back)
                }
            } else if (dt[1] == 'freelancer' && user.role == 'freelancer') {
                if (dt[2] == 'resume') {
                    sm("<b>📨DIQQAT REZYUMEYINGIZNI TO'LIQ KIRITIN!</b>\n🔹Chunki vakansiyalar uchun taklif yuborganingizda aynan siz kiritgan rezyume yuboriladi!\n\n📮Rezyume kiritish uchun <b>✅Rezyume kiritish</b> tugmasini bosing!", Markup.inlineKeyboard([
                        [{ text: '✅Rezyume kiritish', callback_data: "edit_resume" }],
                        [{ text: "🔙Ortga", callback_data: "get_my_works" }]
                    ]))
                } else if (dt[2] == 'work') {
                    fnc.setStep(id, { step: "fw_title" });
                    sm(`<b>🗞️Loyiha uchun nom kiriting!</b>\n📋Masalan: <i>TikTok dan video yuklovchi telegram bot</i>`, btn.back)
                }
            }
        } else if (data.includes('order_req') && user.admin) {
            const dt = data.split('_')[1]
            const orderId = data.split('_')[2]
            if (dt == 'reqchecked') {
                const order = await orderModel.findOne({ _id: orderId })
                if (!order || order.status !== 'new') {
                    msg.answerCbQuery("❌Xato!\n📮Buyurtma bazadan topilmadi yoki avval tekshirilgan", { show_alert: true })
                } else {
                    orderModel.findOneAndUpdate(
                        { _id: orderId },
                        { status: 'checked' },
                        { new: true, upsert: true, runValidators: true },
                        (err, docs) => {
                            if (err) {
                                msg.answerCbQuery("❌Xato!", { show_alert: true })
                            } else {
                                const { from, title } = docs;
                                msg.telegram.sendMessage(from, `✅Sizning <b>${title}</b> buyutmangiz tasdiqlandi va birjaga qo'shildi!`, { parse_mode: "HTML", ...btn.main });
                                msg.answerCbQuery("✅Tasdiqlandi!", { show_alert: true });
                                msg.editMessageReplyMarkup(Markup.removeKeyboard());
                            }
                        }
                    )
                }
            }
            else if (dt == 'reqcancel') {
                const order = await orderModel.findOne({ _id: orderId })
                if (!order || order.status !== 'new') {
                    msg.answerCbQuery("❌Xato!\n📮Buyurtma bazadan topilmadi yoki avval tekshirilgan", { show_alert: true })
                } else {
                    orderModel.findOneAndUpdate(
                        { _id: orderId },
                        { status: 'canceled' },
                        { new: true, upsert: true, runValidators: true },
                        (err, docs) => {
                            if (err) {
                                msg.answerCbQuery("❌Xato!", { show_alert: true })
                            } else {
                                const { from, title } = docs;
                                msg.telegram.sendMessage(from, `❗Sizning <b>${title}</b> buyutmangiz bekor qilindi!\n<i>📮Yetarli ma'lumot, taqiqlangan kontent, haqoratli so'z yoki reklama aralashgan bo'lishi mumkin</i>`, { parse_mode: "HTML", ...btn.main });
                                msg.answerCbQuery("❌Bekor qilindi", { show_alert: true })
                                msg.editMessageReplyMarkup(Markup.removeKeyboard());
                            }
                        }
                    )
                }
            }
        } else if (data == "get_my_works") {
            msg.editMessageReplyMarkup(Markup.removeKeyboard());
            if (user.role == 'buyer') {
                const AllOrders = await orderModel.find({ from: id });
                const AllVacancy = await vacancyModel.find({ from: id });

                sm(`<b>📋Barcha joylashtirgan e'lonlaringiz:</b>\n\n📨Buyurtmalar: <b>${AllOrders.length}</b>\n👨‍💻Joylangan vakansiyalar: <b>${AllVacancy.length}</b>`, btn.workBuyer)
            } else if (user.role == 'freelancer') {
                const AllWorks = await workModel.find({ from: id });

                sm(`<b>📋Barcha joylashtirgan e'lonlaringiz:</b>\n\n📨Sotuvdagi loyihalar: <b>${AllWorks.length}</b>\n📮Rezyume: <b>${!user.resume ? "Joylanmagan" : `<b>${user.resume}</b>`}</b>`, btn.workFreelacer)
            }
        } else if (data == 'get_buyer_order') {
            const orders = await orderModel.find({ from: id });
            if (orders.length < 1 || user.role !== 'buyer') {
                msg.answerCbQuery("📮Sizda buyurtmalar mavjud emas!", { show_alert: true })
            } else {
                let text = "<b>📋Barcha buyurtmalaringiz</b>\n\n"
                let keyb = []
                let index = 0
                for (let order of orders) {
                    index++
                    let reqMsg = (await reqToOrder.find({ orderId: order._id })).length
                    text += `#${index} - <b>${order.title}</b> | ${order.amout} UZS | ${order.status == 'new' ? '🕐' : ''}${order.status == 'checked' ? '✅' : ''}${order.status == 'canceled' ? '❗' : ''}\n`
                    keyb.push([{ text: `#${index} - ${order.title} | 📮(${reqMsg})`, callback_data: 'get_orderbyid_' + order._id }]);
                }
                keyb.push([{ text: "🔙Ortga", callback_data: "get_my_works" }])
                msg.editMessageReplyMarkup(Markup.removeKeyboard());
                sm(text, Markup.inlineKeyboard(keyb))
            }
        } else if (data.includes('get_orderbyid_') && user.role == 'buyer') {
            const orderId = data.split('_')[2]
            const order = await orderModel.findOne({ _id: orderId })
            if (!order) {
                msg.answerCbQuery("❗Buyurtma topilmadi!")
            } else {
                msg.editMessageReplyMarkup(Markup.removeKeyboard());
                const category = (await categoryModel.findOne({ _id: order.category })).title;
                let reqMsg = (await reqToOrder.find({ orderId: order._id }))
                sm(`📃Buyurtma: <b>${order.title}</b>\n\n🗞️Batafsil: <b>${order.about}</b>\n\n💰Narxi: <b>${order.amout} so'm</b>\n📋Kategoriya: <b>${category}</b>\n📨Takliflar soni: <b>${reqMsg.length}</b>\n\n📮Status: <b>${order.status == 'new' ? '🕐Yangi' : ''}${order.status == 'checked' ? '✅Tasdiqlangan' : ''}${order.status == 'canceled' ? '❗Bekor qilingan' : ''}</b>`, Markup.inlineKeyboard([
                    [{ text: "📨Takliflarni ko'rish", callback_data: `get_orderreq_${order._id}` }],
                    [{ text: "🗑️O'chirish", callback_data: `delete_order_${order._id}` }],
                    [{ text: "🔙Ortga", callback_data: 'get_buyer_order' }]
                ]))
            }
        } else if (data.includes('get_orderreq_') && user.role == 'buyer') {
            const orderId = data.split("_")[2]
            const requests = await reqToOrder.find({ orderId })
            const order = await orderModel.findOne({ _id: orderId })
            if (requests.length < 1) {
                msg.answerCbQuery("📨Buyurtmangiz uchun takliflar yo'q!", { show_alert: true })
            } else {
                let text = `<b>📨${order.title} - buyurtmangiz uchun takliflar\n\n</b>`
                const keyb = []
                requests.forEach((req, index) => {
                    text += `<b>#${index + 1}</b> - <i>${req.about.length < 60 ? req.about.slice(0, 60) : req.about}</i> | ${req.status == 'new' ? "🕐" : ""}${req.status == 'accept' ? "✅" : ""}${req.status == 'cancel' ? "❗" : ""}\n`
                    keyb.push([{ text: `#${index + 1} | ${req.status == 'new' ? "🕐" : ""}${req.status == 'accept' ? "✅" : ""}${req.status == 'cancel' ? "❗" : ""}`, callback_data: 'get_request_order_' + req._id }])
                })
                keyb.push([{ text: "🔙Ortga", callback_data: `get_orderbyid_${orderId}` }]);
                msg.editMessageReplyMarkup(Markup.removeKeyboard());
                sm(text, Markup.inlineKeyboard(keyb))
            }
        } else if (data.includes('delete_order_') && user.role == 'buyer') {
            const orderId = data.split('_')[2]
            const order = await orderModel.findOne({ _id: orderId })
            if (!order) {
                msg.answerCbQuery("❗Buyurtma topilmadi!")
            } else {
                msg.editMessageReplyMarkup(Markup.removeKeyboard());
                sm(`<b>📮${order.title}</b> - buyurtmangiz o'chirilsinmi`, Markup.inlineKeyboard([
                    [{ text: "🗑️O'chirilsin", callback_data: 'confirm_deleteorder_' + order._id }],
                    [{ text: "🔙Bekor qilish & ortga", callback_data: 'get_orderbyid_' + order._id }]
                ]))
            }
        } else if (data.includes('confirm_deleteorder_') && user.role == 'buyer') {
            const orderId = data.split('_')[2]
            const order = await orderModel.findOne({ _id: orderId })
            if (!order) {
                msg.answerCbQuery("❗Buyurtma topilmadi!")
            } else {
                msg.editMessageReplyMarkup(Markup.removeKeyboard());
                orderModel.findOneAndRemove({ _id: orderId }, (err) => {
                    if (err) {
                        msg.answerCbQuery("❗Xato")
                    } else {
                        sm("<b>✅Buyurtmangiz o'chirildi!</b>")
                    }
                })
            }
        } else if (data.includes('category_select_') && user.role == 'buyer') {
            const category = data.split('_')[2]
            msg.editMessageReplyMarkup(Markup.removeKeyboard());
            fnc.setStep(id, { step: 'order_pending', etc: { ...user.etc, category } });
            const cTitle = ((await categoryModel.findOne({ _id: category }))).title;
            sm(`<b>📨Tekshiring</b>\n\n📃Buyurtma: <b>${user.etc.title}</b>\n\n📚Batafsil: <b>${user.etc.about}</b>\n\n💰Narxi: <b>${user.etc.amout} so'm</b>\n\n📋Kategoriya: <b>${cTitle}</b>\n\n<i>📮Barchasi to'g'ri bo'lsa "✅Tasdiqlash" tugmasini bosing!</i>`, Markup.inlineKeyboard([
                [{ text: '✅Tasdiqlash', callback_data: "order_check" }]
            ]))
        } else if (data == 'order_check' && user.step == 'order_pending') {
            new orderModel(user.etc).save().then(async (order) => {
                fnc.setStep(id, { step: 'none', etc: {} });
                const adminList = await userModel.find({ admin: true });
                msg.editMessageReplyMarkup(Markup.removeKeyboard());
                adminList.forEach(async (admin) => {
                    const category = (await categoryModel.findOne({ _id: order.category })).title
                    msg.telegram.sendMessage(
                        admin.id,
                        `📮Buyurtmachi ID raqami: <code>${order.from}</code>\n\n<b>📨Tekshiring</b>\n\n📃Buyurtma: <b>${order.title}</b>\n\n📚Batafsil: <b>${order.about}</b>\n\n💰Narxi: <b>${order.amout} so'm</b>\n\n📋Kategoriya: <b>${category}</b>\n\n<i>📮Barchasi to'g'ri bo'lsa "✅Tasdiqlash" tugmasini bosing!</i>`,
                        {
                            parse_mode: "HTML",
                            ...Markup.inlineKeyboard([
                                [{ text: "✅Tasdiqlash", callback_data: `order_reqchecked_${order._id}` }],
                                [{ text: "❌Bekor qilish", callback_data: `order_reqcancel_${order._id}` }],
                            ])
                        }
                    )
                });
                sm("<b>✅Buyurtmangiz tekshiruvga yuborildi!</b>\n📮Tasdiqlanishi bilan bot sizga xabar beradi!")
            })
        } else if (data.includes('get_request_order_') && user.role == 'buyer') {
            const reqId = data.split('_')[3];
            const req = await reqToOrder.findOne({ _id: reqId });
            const u = await reqToOrder.findOne({ id: req.from });
            const order = await orderModel.findOne({ _id: req.orderId });
            msg.editMessageReplyMarkup(Markup.removeKeyboard());
            sm(`<b>📨${order.title}</b> buyurtmangiz uchun taklif\n\n<b>🗞️Taklif:</b> ${req.about}\n\n📋Yuboruvchi rezyumesi: <i>${u.resume}</i>\n📮Status: ${req.status == 'new' ? "🕐Yangi" : ""}${req.status == 'accept' ? "✅Qabul qilingan" : ""}${req.status == 'cancel' ? "❗Rad etilgan" : ""}`,
                Markup.inlineKeyboard([
                    [req.status != 'accept' ?
                        { text: "✅Qabul qilish", callback_data: "confirm_request_" + reqId } :
                        { text: "📨Habar yuborish", callback_data: "smto_request_" + reqId }
                    ],
                    req.status !== 'cancel' ?
                        [{ text: "❌Rad etish", callback_data: "cancel_request_" + reqId }]
                        : [],
                    [{ text: "🔙Ortga", callback_data: "get_orderreq_" + order._id }]
                ]));
        } else if (data.includes('confirm_request_') && user.role == 'buyer') {
            const reqId = data.split('_')[2];
            const req = await reqToOrder.findOne({ _id: reqId });
            const order = await orderModel.findOne({ _id: req.orderId })
            const request = await reqToOrder.findOne({ orderId: order._id, status: 'accept' });
            if (!req || req.status == 'accept' || request) {
                msg.answerCbQuery('📮Taklif allaqachon tasdiqlangan yoki boshqa tasdiqlangan taklif bor!', { show_alert: true })
            } else {
                msg.editMessageReplyMarkup(Markup.removeKeyboard());
                reqToOrder.findOneAndUpdate(
                    { _id: reqId },
                    { status: 'accept' },
                    { new: true, upsert: true, runValidators: true },
                    () => {
                        fnc.setStep(id, { step: 'msg_to_request', etc: { to: reqId } });

                        fnc.setStep(req.from, { step: 'msg_to_request', etc: { to: reqId } });

                        msg.telegram.sendMessage(req.from, `<b>✅${order.title}</b> uchun taklifingizni buyurtmachi tasdiqladi!\n📮Hoziroq ishga kirishishingiz yoki kerakli ma'lumotlarni <i>( qancha muddat kerak, tolovni kelishish, ko'rishib savdo qilsih)</i> batafsilroq bilish uchun habar yuborishingiz mumkin!\n\n<i>📨Habaringiz:</i>`, { parse_mode: 'HTML', ...btn.back });

                        sm(`<b>📨${order.title}</b> - buyurtmangiz uchun taklif tasdiqlandi!\n📮Taklif yuboruvchi uchun yanada kop'roq ma'lumot yuborishingiz mumkin!\n<b>📋Masalan: Menga serer taraf kuchli ishlashi va hech qanday hato chiqarmasligi hamda to'liq REST api ni qo'llashi kerak!</b>`, btn.back);
                    }
                )
            }
        } else if (data.includes('cancel_request_') && user.role == 'buyer') {
            const reqId = data.split('_')[2];
            const req = await reqToOrder.findOne({ _id: reqId });
            const order = await orderModel.findOne({ _id: req.orderId })
            if (!req || req.status == 'cancel') {
                msg.answerCbQuery('📮Taklif allaqachon rad etilgan!', { show_alert: true })
            } else {
                msg.editMessageReplyMarkup(Markup.removeKeyboard());
                reqToOrder.findOneAndUpdate(
                    { _id: reqId },
                    { status: 'cancel' },
                    { new: true, upsert: true, runValidators: true },
                    () => {
                        msg.telegram.sendMessage(req.from, `<b>✅${order.title}</b> uchun taklifingizni buyurtmachi rad etdi!`, { parse_mode: 'HTML', ...btn.back });

                        sm(`<b>📨${order.title}</b> - buyurtmangiz uchun taklif rad etildi!`, btn.back);
                    }
                )
            }
        } else if (data.includes('smto_request_') && user.role == 'buyer') {
            const reqId = data.split('_')[2];
            const req = await reqToOrder.findOne({ _id: reqId });
            const order = await orderModel.findOne({ _id: req.orderId });
            fnc.setStep(id, { step: 'msg_to_request', etc: { to: reqId } });
            msg.editMessageReplyMarkup(Markup.removeKeyboard());
            sm(`<b>📮${order.title}</b> - buyurtmangiz uchun kelgan taklifga habar yuborishingiz mumkin!`, btn.back)
        }
        /////////VAKANSIYA///////
        else if (data.includes('vacancy_') && user.role == 'buyer') {
            const dt = data.split('_')[1]
            if (dt == 'conversation' && user.step == 'vacancy_amout') {
                msg.editMessageReplyMarkup(Markup.removeKeyboard());
                fnc.setStep(id, { step: 'vacancy_worktype', etc: { ...user.etc, amout: "🤝Suhbat asosida" } });
                sm(`<i>📋Vakansiya uchun ish turini tanlang!</i>`, Markup.inlineKeyboard([
                    [{ text: "🌐Masofaviy", callback_data: 'vacancy_remote' }],
                    [{ text: "🏢Offline & Ofisda", callback_data: 'vacancy_offline' }],
                    [{ text: "🔀Gibrid - Masofaviy | Offline", callback_data: 'vacancy_hybrid' }],
                ]))
            } else if (user.step == 'vacancy_worktype') {
                msg.editMessageReplyMarkup(Markup.removeKeyboard());
                fnc.setStep(id, { step: 'vacancy_location', etc: { ...user.etc, worktype: dt } })
                sm(`<i>🏡Manzilni yuboring!</i>\n📋Namuna: Andijon v. Xojaobod t. ooo SAIDNET MCHJ`, btn.back)
            } else if (dt == 'post' && user.step == 'vacancy_check') {
                new vacancyModel(user.etc).save().then(async vacancy => {
                    const Admins = await userModel.find({ admin: true });
                    Admins.forEach(admin => {
                        msg.telegram.sendMessage(
                            admin.id,
                            `<b>📮Vakansiya joylash uchun yangi e'lon!</b>\n\n📨Vakansiya: ${vacancy.title}\n\n📋Batafsil: <i>${vacancy.about}</i>\n\n🏡Manzil: <b>${vacancy.location}</b>\n\n📮Ish turi: <b>${vacancy.worktype == 'remote' ? "🌐Masofaviy" : ""}${vacancy.worktype == 'offline' ? "🏢Offline & Ofisda" : ""}${vacancy.worktype == 'hybrid' ? "🔀Gibrid - Masofaviy | Offline🌐Masofaviy" : ""}</b>\n\n💰Maosh: <b>${(vacancy.amout) + (isNaN(+vacancy.amout) ? "" : " UZS")}</b>\n\n📧Aloqa manzillari: <b>${vacancy.contacts}</b>\n\n🗞️Barchasi to'g'ri bo'lsa <b>✅Joylash</b> tugmasini bosing!`, {
                            ...Markup.inlineKeyboard([
                                [{ text: "✅Joylash", callback_data: "vacancy_confirm_" + vacancy._id }],
                                [{ text: "❌Rad etish", callback_data: "vacancy_cancel_" + vacancy._id }],
                            ]),
                            parse_mode: 'HTML'
                        }
                        )
                    })
                    fnc.setStep(id, { step: 'none', etc: {} })
                    msg.editMessageReplyMarkup(Markup.removeKeyboard());
                    sm(`<b>📨Vakansiya joylash uchun arizangiz yuborildi!</b>\n✅Arizangiz ko'rib chiqilgach bot sizga habar beradi!`)
                })
            } else if (dt == 'confirm' && user.admin) {
                const vacancyId = data.split('_')[2];
                const vacancy = await vacancyModel.findOne({ _id: vacancyId });
                if (!vacancy || vacancy.status != 'new') {
                    msg.answerCbQuery("📮Vakansiya allaqachon ko'rib chiqilgan yoki bazadan o'chirib tashlangan!", { show_alert: true })
                } else {
                    vacancyModel.findOneAndUpdate(
                        { _id: vacancyId },
                        { status: 'checked' },
                        { new: true, upsert: true, runValidators: true },
                        () => {
                            msg.editMessageReplyMarkup(Markup.removeKeyboard());
                            msg.answerCbQuery(`✅Vakansiya tasdiqlandi!`);
                            msg.telegram.sendMessage(vacancy.from, `✅Sizning <b>${vacancy.title}</b> vakansiyangiz tasdiqlandi va birjaga qo'shildi!`, { parse_mode: 'HTML' })
                        }
                    );
                }
            } else if (dt == 'reconfirm' && user.admin) {
                const vacancyId = data.split('_')[2];
                const vacancy = await vacancyModel.findOne({ _id: vacancyId });
                if (!vacancy || vacancy.status == 'checked') {
                    msg.answerCbQuery("📮Vakansiya allaqachon ko'rib chiqilgan yoki bazadan o'chirib tashlangan!", { show_alert: true })
                } else {
                    vacancyModel.findOneAndUpdate(
                        { _id: vacancyId },
                        { status: 'checked' },
                        { new: true, upsert: true, runValidators: true },
                        () => {
                            msg.editMessageReplyMarkup(Markup.removeKeyboard());
                            msg.answerCbQuery(`✅Vakansiya tasdiqlandi!`);
                            msg.telegram.sendMessage(vacancy.from, `✅Sizning <b>${vacancy.title}</b> vakansiyangiz tasdiqlandi va birjaga qo'shildi!`, { parse_mode: 'HTML' })
                        }
                    );
                }
            } else if (dt == 'cancel' && user.admin) {
                const vacancyId = data.split('_')[2];
                const vacancy = await vacancyModel.findOne({ _id: vacancyId });
                if (!vacancy || vacancy.status != 'new') {
                    msg.answerCbQuery("📮Vakansiya allaqachon ko'rib chiqilgan yoki bazadan o'chirib tashlangan!", { show_alert: true })
                } else {
                    vacancyModel.findOneAndUpdate(
                        { _id: vacancyId },
                        { status: 'canceled' },
                        { new: true, upsert: true, runValidators: true },
                        () => {
                            msg.editMessageReplyMarkup(Markup.removeKeyboard());
                            msg.answerCbQuery(`📮Vakansiya bekor qilindi!`);
                            msg.telegram.sendMessage(vacancy.from, `📮Sizning <b>${vacancy.title}</b> vakansiyangiz bekor qilindi!\n<i>🗞️Vakansiyada taqiqlangan kontent, haqoratli so'z, reklama, ishga oid bo'lmagan materiallar ishlatilgan bo'lishi mumkin!</i>`, { parse_mode: 'HTML' })
                        }
                    );
                }
            } else if (dt == 'recancel' && user.admin) {
                const vacancyId = data.split('_')[2];
                const vacancy = await vacancyModel.findOne({ _id: vacancyId });
                if (!vacancy) {
                    msg.answerCbQuery("📮Vakansiya bazadan o'chirib tashlangan!", { show_alert: true });

                } else {
                    vacancyModel.findOneAndUpdate(
                        { _id: vacancyId },
                        { status: 'canceled' },
                        { new: true, upsert: true, runValidators: true },
                        () => {
                            msg.editMessageReplyMarkup(Markup.removeKeyboard());
                            msg.answerCbQuery(`📮Vakansiya bekor qilindi!`);
                            msg.telegram.sendMessage(vacancy.from, `📮Sizning <b>${vacancy.title}</b> vakansiyangiz bekor qilindi!\n<i>🗞️Vakansiyada taqiqlangan kontent, haqoratli so'z, reklama, ishga oid bo'lmagan materiallar ishlatilgan bo'lishi mumkin!</i>`, { parse_mode: 'HTML' })
                        }
                    );
                }
            } else if (dt == 'getmy') {
                const vacancyId = data.split('_')[2];
                const vacancy = await vacancyModel.findOne({ _id: vacancyId });
                if (!vacancy) {
                    msg.answerCbQuery("❗Ma'lumotlar bazasidan vakansiya topilmadi!", { show_alert: true })
                } else {
                    msg.editMessageReplyMarkup(Markup.removeKeyboard());
                    const stat = `${vacancy.status == 'new' ? '🕐Yangi!' : ''}${vacancy.status == 'checked' ? '✅Tasdiqlangan!' : ''}${vacancy.status == 'canceled' ? '❗Rad etilgan!' : ''}`
                    const reqs = await reqToVacancy.find({ vacancyId });
                    sm(`📨Vakansiya: <b>${vacancy.title}</b>\n\n📋Batafsil: <i>${vacancy.about}</i>\n\n🏡Manzil: <b>${vacancy.location}</b>\n\n📮Ish turi: <b>${vacancy.worktype == 'remote' ? "🌐Masofaviy" : ""}${vacancy.worktype == 'offline' ? "🏢Offline & Ofisda" : ""}${vacancy.worktype == 'hybrid' ? "🔀Gibrid - Masofaviy | Offline🌐Masofaviy" : ""}</b>\n\n💰Maosh: <b>${(vacancy.amout) + (isNaN(+vacancy.amout) ? "" : " UZS")}</b>\n\n📧Aloqa manzillari: <b>${vacancy.contacts}</b>\n\n🔹Status: <b>${stat}</b>\n\n🗞️Takliflar: <b>${reqs.length}</b>`,

                        Markup.inlineKeyboard([
                            [
                                vacancy.status == 'canceled' ?
                                    {
                                        text: "🔄️Ko'rib chiqish uchun qayta yuborish",
                                        callback_data: "vacancy_rerequest_" + vacancyId
                                    }
                                    :
                                    {
                                        text: "📨Takliflarni ko'rish | " + reqs.length,
                                        callback_data: "vacancy_getreqs_" + vacancyId
                                    }
                            ],
                            [{ text: "🗑️O'chirib tashlash", callback_data: "vacancy_delete_" + vacancyId }],
                            [{ text: "🔙Ortga", callback_data: "get_buyer_vacancy" }]
                        ]));
                }
            } else if (dt == 'delete') {
                const vacancyId = data.split('_')[2];
                const vacancy = await vacancyModel.findOne({ _id: vacancyId });
                if (!vacancy) {
                    msg.answerCbQuery("❗Ma'lumotlar bazasidan vakansiya topilmadi!", { show_alert: true })
                } else {
                    msg.editMessageReplyMarkup(Markup.removeKeyboard());
                    sm(`<b>❗${vacancy.title}</b> vakansiyangiz o'chirilsinmi?`,
                        Markup.inlineKeyboard([
                            [{ text: '🗑️O\'chirilsin', callback_data: 'vacancy_delvac_' + vacancyId }],
                            [{ text: '🔙Ortga', callback_data: 'vacancy_getmy_' + vacancyId }]
                        ])
                    )
                }
            } else if (dt == 'delvac') {
                const vacancyId = data.split('_')[2]
                const vacancy = await vacancyModel.findOne({ _id: vacancyId });
                if (!vacancy) {
                    msg.answerCbQuery('❗Xato: Vakansiya topilmadi!')
                } else {
                    vacancyModel.findOneAndRemove({ _id: vacancyId }, (err) => {
                        if (err) {
                            msg.answerCbQuery('❗Xato: Vakansiya topilmadi!')
                        } else {
                            msg.editMessageReplyMarkup(Markup.removeKeyboard())
                            sm(`<b>✅Vakansiya o'chirildi!</b>`)
                        }
                    })
                }

            } else if (dt == 'rerequest') {
                const vacancyId = data.split('_')[2]
                const vacancy = await vacancyModel.findOne({ _id: vacancyId });
                if (!vacancy) {
                    msg.answerCbQuery('❗Xato: Vakansiya topilmadi!')
                } else {
                    const Admins = await userModel.find({ admin: true });
                    Admins.forEach(admin => {
                        msg.telegram.sendMessage(
                            admin.id,
                            `<b>📮Vakansiya joylash qayta so'rov!</b>\n\n📨Vakansiya: ${vacancy.title}\n\n📋Batafsil: <i>${vacancy.about}</i>\n\n🏡Manzil: <b>${vacancy.location}</b>\n\n📮Ish turi: <b>${vacancy.worktype == 'remote' ? "🌐Masofaviy" : ""}${vacancy.worktype == 'offline' ? "🏢Offline & Ofisda" : ""}${vacancy.worktype == 'hybrid' ? "🔀Gibrid - Masofaviy | Offline🌐Masofaviy" : ""}</b>\n\n💰Maosh: <b>${(vacancy.amout) + (isNaN(+vacancy.amout) ? "" : " UZS")}</b>\n\n📧Aloqa manzillari: <b>${vacancy.contacts}</b>\n\n🗞️Barchasi to'g'ri bo'lsa <b>✅Joylash</b> tugmasini bosing!`, {
                            ...Markup.inlineKeyboard([
                                [{ text: "✅Joylash", callback_data: "vacancy_reconfirm_" + vacancy._id }],
                                [{ text: "❌Rad etish", callback_data: "vacancy_recancel_" + vacancy._id }],
                            ]),
                            parse_mode: 'HTML'
                        }
                        )
                    })
                    msg.editMessageReplyMarkup(Markup.removeKeyboard());
                    fnc.setStep(id, { step: 'none', etc: {} })
                    sm(`<b>📨Vakansiya joylash uchun arizangiz qayta yuborildi!</b>\n✅Arizangiz ko'rib chiqilgach bot sizga habar beradi!`)
                }
            } else if (dt == 'getreqs') {
                const vacancyId = data.split("_")[2]
                const requests = await reqToVacancy.find({ vacancyId });
                const vacancy = await vacancyModel.findOne({ _id: vacancyId });
                if (requests.length < 1) {
                    msg.answerCbQuery(`📮${vacancy.title} uchun takliflar mavjud emas!`, { show_alert: true })
                } else {
                    let text = `<b>📨${vacancy.title}</b> uchun barcha takliflar:\n\n`
                    let keyb = [];
                    let index = 0;
                    for (let req of requests) {
                        index++
                        const stat = `${req.status == 'new' ? '🕐' : ''}${req.status == 'accepted' ? '✅' : ''}${req.status == 'canceled' ? '❗' : ''}`
                        const from = await userModel.findOne({ from: req.from });
                        text += `#${index} - <i>${from.resume.slice(0, 30)}... | ${stat}</i>`
                        keyb.push([{ text: `#${index} | ${stat}`, callback_data: 'vacancy_getsreq_' + req._id }]);
                    }
                    keyb.push([{ text: "🔙Ortga", callback_data: 'vacancy_getmy_' + vacancyId }]);
                    msg.editMessageReplyMarkup(Markup.removeKeyboard())
                    sm(text, Markup.inlineKeyboard(keyb))
                }
            } else if (dt == "getsreq") {
                const reqId = data.split("_")[2];
                const req = await reqToVacancy.findOne({ _id: reqId });
                if (!req) {
                    msg.answerCbQuery("❗Taklif malumotlar bazasidan topilmadi yoki taklif yuboruvchi taklifni rad etgan!", { show_alert: true });
                } else {
                    const from = await userModel.findOne({ id: req.from });
                    const vacancy = await vacancyModel.findOne({ _id: req.vacancyId });
                    msg.editMessageReplyMarkup(Markup.removeKeyboard());
                    sm(`📨Vakansiya: <b>${vacancy.title}</b>\n\n📮Taklif yuboruvchi rezyumesi:\n<i>${from.resume}</i>`, Markup.inlineKeyboard([
                        req.status == 'accepted' ? [] :
                            [{ text: "✅Nomzodni qabul qilish", callback_data: "vacancy_accept_" + reqId }],
                        req.status == 'canceled' ? [] :
                            [{ text: "❌Nomzodni rad etish", callback_data: "vacancy_declare_" + reqId }],
                        [{ text: "🔙Ortga", callback_data: "vacancy_getreqs_" + vacancy._id }]
                    ]));
                }
            } else if (dt == "accept") {
                const reqId = data.split("_")[2];
                const req = await reqToVacancy.findOne({ _id: reqId });
                if (!req) {
                    msg.answerCbQuery("❗Taklif malumotlar bazasidan topilmadi yoki taklif yuboruvchi taklifni rad etgan!", { show_alert: true });
                } else {
                    msg.editMessageReplyMarkup(Markup.removeKeyboard());
                    const from = await userModel.findOne({ id: req.from });
                    const vacancy = await vacancyModel.findOne({ _id: req.vacancyId });
                    reqToVacancy.findOneAndUpdate(
                        { _id: reqId },
                        { status: 'accepted' },
                        { new: true, upsert: true, runValidators: true },
                        () => {
                            fnc.setStep(id, { step: "smto_vacancy", etc: { reqId } });
                            sm(`📮Vakansiya: <b>${vacancy.title}</b>\n\n🤝Nomzod: <b>${from.name}</b>\n\n🗞️Nomzod rezyumesi:\n<i>${from.resume}</i>\n\📨Status: <b>✅Tasdiqlandi!</b>\n\n📧Nomzod uchun habar yuborishingiz mumkin bot nomzodga habaringizni yetkazadi!\n📋Masalan: <i>Siz bilan qanday aloqaga chiqsam bo'ladi?</i>`, btn.back);

                            fnc.setStep(from.id, { step: "smto_vacancy", etc: { reqId } });
                            msg.telegram.sendMessage(from.id, `✅Sizning <b>${vacancy.title}</b> vakansiyasi uchun yuborgan taklifingiz tasdiqlandi!\n📮Vakansiya joylovchi uchun habaringiz bo'lsa yozing bot habaringizni yetkazadi!\n\n📋Masalan: <b>Qachon ish boshlaymiz?</b>`, { ...btn.back, parse_mode: 'HTML' })
                        }
                    )
                }
            } else if (dt == "declare") {
                const reqId = data.split("_")[2];
                const req = await reqToVacancy.findOne({ _id: reqId });
                if (!req) {
                    msg.answerCbQuery("❗Taklif malumotlar bazasidan topilmadi yoki taklif yuboruvchi taklifni rad etgan!", { show_alert: true });
                } else {
                    msg.editMessageReplyMarkup(Markup.removeKeyboard());
                    const from = await userModel.findOne({ id: req.from });
                    const vacancy = await vacancyModel.findOne({ _id: req.vacancyId });
                    reqToVacancy.findOneAndUpdate(
                        { _id: reqId },
                        { status: 'canceled' },
                        { new: true, upsert: true, runValidators: true },
                        () => {
                            sm(`📮Vakansiya: <b>${vacancy.title}</b>\n\n🤝Nomzod: <b>${from.name}</b>\n\n🗞️Nomzod rezyumesi:\n<i>${from.resume}</i>\n\📨Status: <b>❌Rad etildi!</b>`, btn.back);

                            msg.telegram.sendMessage(from.id, `❗Sizning <b>${vacancy.title}</b> vakansiyasi uchun yuborgan taklifingiz rad etildi!`, { ...btn.back, parse_mode: 'HTML' })
                        }
                    )
                }
            }
        } else if (data == 'get_buyer_vacancy' && user.role == 'buyer') {
            const Vacancys = await vacancyModel.find({ from: id });
            if (Vacancys.length < 1) {
                msg.answerCbQuery("📮Siz vakansiya joylamagansiz!");
            } else {
                let text = "<b>📮Barcha vakansiyalaringiz:</b>\n\n";
                let keyb = [];
                let index = 0
                for (let vacancy of Vacancys) {
                    index++
                    const requests = await reqToVacancy.find({ vacancyId: vacancy._id });
                    stat = `${vacancy.status == 'new' ? '🕐' : ''}${vacancy.status == 'checked' ? '✅' : ''}${vacancy.status == 'canceled' ? '❗' : ''}`

                    text += `#${index} - <b>${vacancy.title}</b> | ${stat}\n`
                    keyb.push([{ text: `#${index} | 📮${requests.length}`, callback_data: 'vacancy_getmy_' + vacancy._id }])
                }
                keyb.push([{ text: '🔙Ortga', callback_data: 'get_my_works' }])
                msg.editMessageReplyMarkup(Markup.removeKeyboard());
                sm(text, Markup.inlineKeyboard(keyb))
            }
        }

        ////////F-WORK///////
        else if (data == 'fw_check' && user.step == 'fw_pending') {
            msg.editMessageReplyMarkup(Markup.removeKeyboard());
            new workModel(user.etc).save().then(async work => {
                const adminList = await userModel.find({ admin: true });
                const category = await categoryModel.findOne({ _id: work.category });
                adminList.forEach(admin => {
                    msg.telegram.sendMessage(admin.id, `<b>📨Loyiha joylash uchun yangi e'lon!</b>\n\n🧑‍💻Freelancer: <code>${work.from}</code>\n\n📃Loyiha: <b>${work.title}</b>\n\n📨Batafsil: <b>${work.about}</b>\n\n💰Narxi: <b>${work.amout} so'm</b>\n📋Kategoriya: <b>${category.title}</b>\n🗞️Demo: <b>${work.example}</b>\n\n<i>📮Barchasi to'g'ri bo'lsa "✅Tasdiqlash" tugmasini bosing!</i>`, {
                        ...Markup.inlineKeyboard([
                            [{ text: "✅Tasdiqlash", callback_data: 'fw_reqchecked_' + work._id }],
                            [{ text: "❌Rad etish", callback_data: 'fw_reqcancel_' + work._id }]
                        ]),
                        parse_mode: "HTML"
                    })
                });
                fnc.setStep(id, { step: 'none', etc: {} })
                sm("<i>✅Loyihangiz tekshiruvga yuborildi!</i>\n📮Tekshiruv natijasini bot sizga yuboradi!")
            })
        } else if (data.includes('fw_req')) {
            const dt = data.split('_')[1]
            const workId = data.split('_')[2]
            const work = await workModel.findOne({ _id: workId })
            if (dt == 'reqchecked') {
                if (!work || work.status !== 'new') {
                    msg.answerCbQuery("❌Xato!\n📮Buyurtma bazadan topilmadi yoki avval tekshirilgan", { show_alert: true })
                } else {
                    workModel.findOneAndUpdate(
                        { _id: workId },
                        { status: 'checked' },
                        { new: true, upsert: true, runValidators: true },
                        (err, docs) => {
                            if (err) {
                                msg.answerCbQuery("❌Xato!", { show_alert: true })
                            } else {
                                const { from, title } = docs;
                                msg.telegram.sendMessage(from, `✅Sizning <b>${title}</b> loyihangiz tasdiqlandi va birjaga qo'shildi!`, { parse_mode: "HTML", ...btn.main });
                                msg.answerCbQuery("✅Tasdiqlandi!", { show_alert: true })
                                msg.editMessageReplyMarkup(Markup.removeKeyboard());
                            }
                        }
                    )
                }
            }
            else if (dt == 'reqcancel') {
                if (!work || work.status !== 'new') {
                    msg.answerCbQuery("❌Xato!\n📮Buyurtma bazadan topilmadi yoki avval tekshirilgan", { show_alert: true })
                } else {
                    workModel.findOneAndUpdate(
                        { _id: workId },
                        { status: 'canceled' },
                        { new: true, upsert: true, runValidators: true },
                        (err, docs) => {
                            if (err) {
                                msg.answerCbQuery("❌Xato!", { show_alert: true })
                            } else {
                                const { from, title } = docs;
                                msg.telegram.sendMessage(from, `❗Sizning <b>${title}</b> loyihangiz bekor qilindi!\n<i>📮Yetarli ma'lumot, taqiqlangan kontent, haqoratli so'z yoki reklama aralashgan bo'lishi mumkin</i>`, { parse_mode: "HTML", ...btn.main });
                                msg.answerCbQuery("❌Bekor qilindi", { show_alert: true })
                                msg.editMessageReplyMarkup(Markup.removeKeyboard());

                            }
                        }
                    )
                }
            }
        } else if (data == 'get_freelancer_work') {
            const works = await workModel.find({ from: id });
            if (works.length < 1) {
                msg.answerCbQuery("📮Siz loyiha joylamagansiz!")
            } else {
                msg.editMessageReplyMarkup(Markup.removeKeyboard());
                const keyb = [];
                let text = "<b>📋Barcha loyihalaringiz!</b>\n\n";
                let i = 0;
                for (const work of works) {
                    i++
                    const reqs = await reqToWork.find({ workId: work._id });
                    const stat = work.status == 'new' ? '🕐' : '' + work.status == 'checked' ? '✅' : '' + work.status == 'canceled' ? '❗' : '';
                    text += `#${i} - <b>${work.title} | ${stat}</b>\n`;
                    keyb.push([{ text: `#${i} | 📮${reqs.length}`, callback_data: 'get_fwbyid_' + work._id }]);
                }
                keyb.push([{ text: "🔙Ortga", callback_data: 'freelancer_menu' }]);
                sm(text, Markup.inlineKeyboard(keyb))
            }
        } else if (data == 'freelancer_menu' && user.role == 'freelancer') {
            const AllWorks = await workModel.find({ from: id });
            sm(`<b>📋Barcha joylashtirgan e'lonlaringiz:</b>\n\n📨Sotuvdagi loyihalar: <b>${AllWorks.length}</b>\n\n📮Rezyume: <b>${!user.resume ? "Joylanmagan" : `<b>${user.resume}</b>`}</b>`, btn.workFreelacer)
            msg.editMessageReplyMarkup(Markup.removeKeyboard())
        } else if (data.includes('get_fwbyid_')) {
            const workId = data.split('_')[2];
            const work = await workModel.findOne({ _id: workId });
            const requests = await reqToWork.find({ workId })
            const stat = work.status == 'new' ? '🕐Tekshiruvda' : '' + work.status == 'checked' ? '✅Tasdiqlangan' : '' + work.status == 'canceled' ? '❗Rad etilgan' : '';
            sm(`🗞️Loyiha: <b>${work.title}</b>\n\n📋Batafsil: <i>${work.about}</i>\n\n💰Narxi: <b>${work.amout} UZS</b>\n\n📮Status: ${stat}\n\n🛒Sotib olish uchun takliflar: <b>${requests.length}</b>`,
                Markup.inlineKeyboard([
                    work.status == 'checked' ?
                        [{ text: "📮Takliflarni ko'rish | " + requests.length, callback_data: 'get_reqstofw_' + workId }] : [],
                    work.status == 'canceled' ?
                        [{ text: "🔄️Ko'rib chiqish uchun qayta yuborish", callback_data: 'fw_resend_' + workId }] : [],
                    [{ text: "🗑️O'chirish", callback_data: 'del_fw_' + workId }],
                    [{ text: "🔙Ortga", callback_data: 'get_freelancer_work' }],
                ])
            )
            msg.editMessageReplyMarkup(Markup.removeKeyboard())

        } else if (data.includes('del_fw_')) {
            const workId = data.split('_')[2];
            const work = await workModel.findOne({ _id: workId });
            if (!work) {
                msg.answerCbQuery("❗Loyiha topilmadi!", { show_alert: true });
            } else {
                msg.editMessageReplyMarkup(Markup.removeKeyboard());
                fnc.setStep(id, { step: 'del_work' });
                sm(`<b>❗DIQQAT❗</b>\n📮Chindan ham <b>${work.title}</b> loyiha o'chirilishini hohlaysizmi?\n\n<b>⚠️Keyinchalik uni tiklab bo'lmaydi!</b>`, Markup.inlineKeyboard([
                    [{ text: "🗑️O'chirilsin", callback_data: 'fw_del_' + workId }],
                    [{ text: "🔙Ortga", callback_data: "get_fwbyid_" + workId }]
                ]));
            }
        } else if (data.includes('fw_del') && user.step == "del_work") {
            const workId = data.split('_')[2];
            const work = await workModel.findOne({ _id: workId });
            if (!work) {
                msg.answerCbQuery("❗Loyiha topilmadi!", { show_alert: true });
            } else {
                workModel.findOneAndRemove({ _id: workId }, {}, (err, docs) => {
                    if (err) {
                        msg.answerCbQuery("❗Xato");
                    } else {
                        msg.editMessageReplyMarkup(Markup.removeKeyboard());
                        sm(`❗Loyiha: <b>${docs.title}</b> o'chirildi!`)
                    }
                })
            }
        } else if (data.includes('fw_resend_')) {
            const workId = data.split('_')[2];
            const work = await workModel.findOne({ _id: workId });
            if (!work) {
                msg.answerCbQuery("❗Loyiha topilmadi!", { show_alert: true });
            } else {
                const adminList = await userModel.find({ admin: true });
                const category = await categoryModel.findOne({ _id: work.category });
                adminList.forEach(admin => {
                    msg.telegram.sendMessage(admin.id, `<b>📨Loyiha joylash uchun qayta so'rov!</b>\n\n🧑‍💻Freelancer: <code>${work.from}</code>\n\n📃Loyiha: <b>${work.title}</b>\n\n📨Batafsil: <b>${work.about}</b>\n\n💰Narxi: <b>${work.amout} so'm</b>\n📋Kategoriya: <b>${category.title}</b>\n🗞️Demo: <b>${work.example}</b>\n\n<i>📮Barchasi to'g'ri bo'lsa "✅Tasdiqlash" tugmasini bosing!</i>`, {
                        ...Markup.inlineKeyboard([
                            [{ text: "✅Tasdiqlash", callback_data: 'fw_rereqchecked_' + work._id }],
                            [{ text: "❌Rad etish", callback_data: 'fw_rereqcancel_' + work._id }]
                        ]),
                        parse_mode: "HTML"
                    })
                });
                fnc.setStep(id, { step: 'none', etc: {} })
                sm("<i>✅Loyihangiz tekshiruvga yuborildi!</i>\n📮Tekshiruv natijasini bot sizga yuboradi!")
            }
        } else if (data.includes('fw_rereq') && user.admin) {
            const dt = data.split('_')[1]
            const workId = data.split('_')[2]
            const work = await workModel.findOne({ _id: workId })
            if (dt == 'rereqchecked') {
                if (!work) {
                    msg.answerCbQuery("❌Xato!\nLoyihaBuyurtma bazadan topilmadi yoki avval tekshirilgan", { show_alert: true })
                } else {
                    workModel.findOneAndUpdate(
                        { _id: workId },
                        { status: 'checked' },
                        { new: true, upsert: true, runValidators: true },
                        (err, docs) => {
                            if (err) {
                                msg.answerCbQuery("❌Xato!", { show_alert: true })
                            } else {
                                const { from, title } = docs;
                                msg.telegram.sendMessage(from, `✅Sizning <b>${title}</b> loyihangiz tasdiqlandi va birjaga qo'shildi!`, { parse_mode: "HTML", ...btn.main });
                                msg.answerCbQuery("✅Tasdiqlandi!", { show_alert: true })
                                msg.editMessageReplyMarkup(Markup.removeKeyboard());
                            }
                        }
                    )
                }
            }
            else if (dt == 'rereqcancel') {
                if (!work) {
                    msg.answerCbQuery("❌Xato!\n📮Buyurtma bazadan topilmadi yoki avval tekshirilgan", { show_alert: true })
                } else {
                    workModel.findOneAndUpdate(
                        { _id: workId },
                        { status: 'canceled' },
                        { new: true, upsert: true, runValidators: true },
                        (err, docs) => {
                            if (err) {
                                msg.answerCbQuery("❌Xato!", { show_alert: true })
                            } else {
                                const { from, title } = docs;
                                msg.telegram.sendMessage(from, `❗Sizning <b>${title}</b> loyihangiz bekor qilindi!\n<i>📮Yetarli ma'lumot, taqiqlangan kontent, haqoratli so'z yoki reklama aralashgan bo'lishi mumkin</i>`, { parse_mode: "HTML", ...btn.main });
                                msg.answerCbQuery("❌Bekor qilindi", { show_alert: true })
                                msg.editMessageReplyMarkup(Markup.removeKeyboard());

                            }
                        }
                    )
                }
            }
        } else if (data.includes('get_reqstofw_')) {
            const workId = data.split('_')[2];
            const work = await workModel.findOne({ _id: workId });
            if (!work) {
                msg.answerCbQuery("❗Loyiha topilmadi!", { show_alert: true });
            } else {
                const requests = await reqToWork.find({ workId });
                if (requests.length < 1) {
                    msg.answerCbQuery("❗Loyiha uchun buyurtmalar topilmadi!", { show_alert: true });
                } else {
                    let text = `📮Loyiha <b>${work.title}</b> uchun barcha takliflar!\n\n`;
                    const keyb = [];
                    let i = 0;
                    for (const req of requests) {
                        const stat = req.status == 'new' ? '🕐' : '' + req.status == 'checked' ? '✅' : '' + req.status == 'canceled' ? '❗' : '' + req.status == 'success' || req.status == 'reject' ? '🏁' : '';
                        i++
                        text += `#${i} - <i>${req.about.slice(0, 40)}... | ${stat}</i>\n`;
                        keyb.push([{ text: `#${i} | ${stat}`, callback_data: 'get_fwreq_' + req._id }]);
                    }
                    keyb.push([{ text: '🔙Ortga', callback_data: 'get_fwbyid_' + workId }]);
                    sm(text, Markup.inlineKeyboard(keyb));
                    msg.editMessageReplyMarkup(Markup.removeKeyboard())
                }
            }
        } else if (data.includes('get_fwreq_')) {
            const reqId = data.split('_')[2];
            const req = await reqToWork.findOne({ _id: reqId });
            if (!req) {
                msg.answerCbQuery("❗Loyiha topilmadi!", { show_alert: true });
            } else {
                const stat = req.status == 'new' ? '🕐Yangi' : '' + req.status == 'checked' ? '✅Tasdiqlangan' : '' + req.status == 'canceled' ? '❗Rad etilgan' : '' + req.status == 'success' ? '🏁Yakunlangan - ❤️Loyiha topshirilgan!' : '' + req.status == 'reject' ? '🏁Yakunlangan - 💔Loyiha topshirilmagan' : '';
                const work = await workModel.findOne({ _id: req.workId });
                sm(`📮Loyiha: <b>${work.title}</b>\n\n📋Taklif: <i>${req.about}</i>\n\n🗞️Status: <b>${stat}</b>`, Markup.inlineKeyboard([
                    req.status == "checked" ?
                        [{ text: "📨Habar yuborish", callback_data: "fw_smtoreq_" + req._id }] :
                        req.status == 'success' || req.status == 'reject' ? [] : [{ text: "✅Qabul qilish", callback_data: "fw_checkedreq_" + req._id }],
                    req.status == "checked" ?
                        [{ text: "✅Buyurtma topshirildi!", callback_data: "fw_successtoreq_" + req._id }] : [],
                    req.status == 'canceled' || req.status == 'success' || req.status == 'reject' ? [] :
                        [{ text: "❌Rad etish", callback_data: "fw_canceledreq_" + req._id }],
                    [{ text: "🔙Ortga", callback_data: `get_reqstofw_${work._id}` }]
                ]));
                msg.editMessageReplyMarkup(Markup.removeKeyboard())

            }
        } else if (data.includes('fw_checkedreq_')) {
            const reqId = data.split('_')[2];
            const req = await reqToWork.findOne({ _id: reqId });
            if (!req) {
                msg.answerCbQuery("❗Taklif - yuboruvchi tomondan o'chirilgan!")
            } else {
                const work = await workModel.findOne({ _id: req.workId });
                reqToWork.findOneAndUpdate({ _id: reqId }, { status: 'checked' }, { upsert: true, runValidators: true, new: true }, () => {
                    fnc.setStep(id, { step: "sm_to_workreq", etc: { reqId } });
                    fnc.setStep(req.from, { step: "sm_to_workreq", etc: { reqId } });

                    msg.telegram.sendMessage(req.from, `<b>📨${work.title}</b> loyihasini sotib olish uchun yuborgan buyurtmangiz tasdiqlandi!\n\n📮Sotuvchi freelancer'ga habar yuborishingiz mumkin!\n\n📋Masalan: <i>Siz bilan telefon orqali savdolashsak bo'ladimi? yoki O'rtaga admin ni qo'yamizmi?...</i>\n\n<b>❗DIQQAT❗</b>\n⚠️AVVAL TO'LOV QILMANG! KO'RISHIB ISHONCH HOSIL QILGACH YOKI ADMIN ORQALI YOKI LOYIHANI ISHLATIB KO'RGACH SO'NG TO'LOV QILING!\n\n🗞️Habaringizni yozing bot sotuvchi <b>freelancer</b>'ga yetgazadi!\n<b>📧Habaringiz:</b>`, { parse_mode: "HTML", ...btn.back });

                    sm(`<b>📨${work.title}</b> loyihasini sotib olish uchun buyurtmani tasdiqladingiz!\n\n📮Haridor buyurtmachiga habar yuborishingiz mumkin!\n\n📋Masalan: <i>Siz bilan telefon orqali savdolashsak bo'ladimi? yoki O'rtaga admin ni qo'yamizmi?...</i>\n\n<b>❗DIQQAT❗</b>\n⚠️AVVAL LOYIHANI BERIB QO'YMANG! KO'RISHIB ISHONCH HOSIL QILGACH YOKI ADMIN ORQALI SAVDO QILING!\n\n🗞️Habaringizni yozing bot haridor <b>buyurtmachi</b>'ga yetgazadi!\n<b>📧Habaringiz:</b>`, btn.back);
                    msg.editMessageReplyMarkup(Markup.removeKeyboard());
                })
            }
        } else if (data.includes('fw_smtoreq_')) {
            const reqId = data.split('_')[2];
            const req = await reqToWork.findOne({ _id: reqId });
            if (!req) {
                sm('<b>❗Buyurtma bekor qilingan!</b>', btn.back);
            } else {
                const work = await workModel.findOne({ _id: req.workId });
                if (!work) {
                    msg.answerCbQuery("<b>❗Siz loyihani bekor qilgansiz!!</b>", { show_alert: true });
                } else {
                    msg.editMessageReplyMarkup(Markup.removeKeyboard())
                    fnc.setStep(work.from, { step: "sm_to_workreq", etc: { reqId } });
                    fnc.setStep(req.from, { step: "sm_to_workreq", etc: { reqId } });
                    sm(`🗞️Habaringizni yozing bot haridor <b>buyurtmachi</b>'ga yetgazadi!\n<b>📧Habaringiz:</b>`, btn.back)
                }
            }
        } else if (data.includes('fw_canceledreq_')) {
            const reqId = data.split('_')[2];
            const req = await reqToWork.findOne({ _id: reqId });
            if (!req) {
                sm('<b>❗Buyurtma bekor qilingan!</b>', btn.back);
            } else {
                const work = await workModel.findOne({ _id: req.workId });
                if (!work) {
                    msg.answerCbQuery("<b>❗Siz loyihani bekor qilgansiz!!</b>", { show_alert: true });
                } else {
                    // msg.editMessageReplyMarkup(Markup.removeKeyboard())
                    const position = await reqToWork.find({ workId: work._id });
                    let index = 0;
                    for (let i = 0; i < position.length; i++) {
                        if (position[i].from == req.from) {
                            index = i + 1;
                            break;
                        }
                    }
                    sm(`📮<b>${work.title}</b> uchun <b>#${index}</b> raqamli buyurtmani bekor qilishni hohlaysizmi?`, Markup.inlineKeyboard([
                        [{ text: "✅Bekor qilish", callback_data: "req_fwcancel_" + reqId }],
                        [{ text: "🔙Ortga", callback_data: 'get_fwreq_' + reqId }]
                    ]));
                    msg.editMessageReplyMarkup(Markup.removeKeyboard())
                }
            }
        } else if (data.includes('req_fwcancel_')) {
            const reqId = data.split('_')[2];
            const req = await reqToWork.findOne({ _id: reqId });
            if (!req) {
                msg.answerCbQuery("📮Bekor qilish uchun taklif topilmadi!")
            } else {
                const work = await workModel.findOne({ _id: req.workId });
                if (!work) {
                    msg.answerCbQuery("📮Taklif yuborilgan loyiha topilmadi!")
                } else {
                    if (req.status !== 'new') {
                        msg.telegram.sendMessage(req.from, `<b>📮${work.title}</b> loyihasi uchun buyurtmangizni freelancer bekor qilmoqchi!\n\n❗Agar loyiha <b>muddatida tugatilmagan bo'lsa</b> yoki <b>freelancer (haqoratli so'z aytgan, loyihani o'g'irlagan)</b> bo'lsa freelancer <b>reytingini tushurishingiz</b> mumkin!\n📨Agar loyiha yakunlangan bo'lsa va loyihani olgan bo'lsangiz <b>✅Loyiha yakunlandi</b> tugmasini bosing!`, {
                            parse_mode: "HTML",
                            ...Markup.inlineKeyboard([
                                [{ text: "✅Loyiha yakunlandi", callback_data: "req_tofwsuccess_" + reqId }],
                                [{ text: "🔄️Yakunlash uchun qaytarish", callback_data: "req_tofwresend_" + reqId }],
                                [{ text: "💔Salbiy reyting & yakunlash", callback_data: "req_tofwnegative_" + reqId }],
                                [{ text: "❗Reytingni baholamasdan yakunlash", callback_data: "req_tofwnorating_" + reqId }],
                            ])
                        })
                        sm(`<b>📮${work.title}</b> loyihasi uchun buyurtmani yakunlash to'g'risida so'rov buyurtmachi haridorga yuborildi!\n\n📨Haridor so'rovga javob bergach bot sizga yetgazadi!`, btn.back);
                    } else {
                        reqToWork.findOneAndUpdate({ _id: reqId }, { status: 'reject' }, { new: true, upsert: true, runValidators: true }, async (err, docs) => {
                            if (err) {
                                msg.answerCbQuery("❗Xato", { show_alert: true });
                            } else {
                                const position = await reqToWork.find({ workId: work._id });
                                let index = 0;
                                for (let i = 0; i < position.length; i++) {
                                    if (position[i].from == id) {
                                        index = i + 1;
                                        break;
                                    }
                                }
                                msg.telegram.sendMessage(req.from, `<b>📮${work.title}</b> loyihasi uchun buyurtmangizni freelancer bekor qildi!\n`, {
                                    parse_mode: "HTML",
                                })
                                sm(`<b>📮${work.title}</b> loyihasi uchun buyurtma bekor qilindi!`, btn.back);
                            }
                        });
                    }
                    msg.editMessageReplyMarkup(Markup.removeKeyboard());
                }
            }
        } else if (data.includes('req_tofw')) {
            const dt = data.split('_')[1];
            const reqId = data.split('_')[2];
            const req = await reqToWork.findOne({ _id: reqId });
            if (!req) {
                msg.answerCbQuery("📮Taklif topilmadi!", { show_alert: true })
            } else {
                const work = await workModel.findOne({ _id: req.workId });
                if (!work) {
                    msg.answerCbQuery("📮Loyiha freelancer tomonidan o'chirilgan!", { show_alert: true });
                } else {
                    const freelancer = await userModel.findOne({ id: work.from });
                    if (dt == 'tofwsuccess') {
                        reqToWork.findOneAndUpdate({ _id: reqId }, { status: 'success' }, { new: true, upsert: true, runValidators: true }, (err, docs) => {
                            if (err) {
                                msg.answerCbQuery("❗Xato", { show_alert: true });
                            } else {
                                userModel.findOneAndUpdate({ id: work.from }, { positive: freelancer.positive + 1 }, { new: true, upsert: true, runValidators: true }, async (err, docs) => {
                                    if (err) {
                                        msg.answerCbQuery('❗Xato', { show_alert: true });
                                    } else {
                                        const position = await reqToWork.find({ workId: work._id });
                                        let index = 0;
                                        for (let i = 0; i < position.length; i++) {
                                            if (position[i].from == id) {
                                                index = i + 1;
                                                break;
                                            }
                                        }
                                        sm(`<b>📮Loyiha yakunlandi!</b>\n📨Loyiha: <b>${work.title}</b>\n📋Status: <b>✅Yakunlandi!</b>\n\n❤️Buyurtmangiz uchun rahmat!`);

                                        msg.telegram.sendMessage(work.from, `<b>📮${work.title}</b> - Loyihasi uchun buyurtmani muvoffaqqiyatli topshirdingiz!\n📨Buyurtma raqami: <b>#${index}</b>\n📋Status: <b>✅Yakunlandi</b>\n❤️Status: <b>+1</b>`, { parse_mode: "HTML" });
                                        msg.editMessageReplyMarkup(Markup.removeKeyboard());
                                    }
                                });
                            }
                        });
                    } else if (dt == 'tofwresend') {
                        const position = await reqToWork.find({ workId: work._id });
                        let index = 0;
                        for (let i = 0; i < position.length; i++) {
                            if (position[i].from == id) {
                                index = i + 1;
                                break;
                            }
                        }
                        msg.telegram.sendMessage(freelancer.id, `<b>🔄️${work.title} - loyihangiz uchun <b>#${index}</b> raqamli taklifni bekor qilish rad etildi va qayta loyihani tugallashingiz uchun imkon berildi!</b>\n\n❗Agar loyihani vaqtida tugatmasangiz reytingingiz pastlaydi!`, { parse_mode: "HTML", ...btn.back });

                        sm(`<b>📮${work.title}</b> loyihani yakunlash uchun buyurtma qayta yuborildi!\n<i>❗Agarda freelancer o'z vaqtida loyihani tugatmasa uning reytingini tushurishingiz mumkin!</i>`);
                        msg.editMessageReplyMarkup(Markup.removeKeyboard());
                    } else if (dt == 'tofwnegative') {
                        reqToWork.findOneAndUpdate({ _id: reqId }, { status: 'reject' }, { new: true, upsert: true, runValidators: true }, (err, docs) => {
                            if (err) {
                                msg.answerCbQuery("❗Xato", { show_alert: true });
                            } else {
                                userModel.findOneAndUpdate({ id: work.from }, { negative: freelancer.negative + 1 }, { new: true, upsert: true, runValidators: true }, async (err, docs) => {
                                    if (err) {
                                        msg.answerCbQuery('❗Xato', { show_alert: true });
                                    } else {
                                        const position = await reqToWork.find({ workId: work._id });
                                        let index = 0;
                                        for (let i = 0; i < position.length; i++) {
                                            if (position[i].from == id) {
                                                index = i + 1;
                                                break;
                                            }
                                        }
                                        sm(`<b>📮Loyiha yakunlandi!</b>\n📨Loyiha: ${work.title}\n📋Status: <b>❗Bekor qlindi!</b>\n\n<b>💔Freelancer o'z vazifasini qila olmagani uchun afsusdamiz!!!</b>`);

                                        msg.telegram.sendMessage(work.from, `<b>📮${work.title}</b> - Loyihasi uchun buyurtmani topshirmadingiz!\n📨Buyurtma raqami: <b>#${index}</b>\n📋Status: <b>❗Bekor qlindi!</b>\n💔Reyting: <b>-1</b>`, { parse_mode: "HTML" });
                                        msg.editMessageReplyMarkup(Markup.removeKeyboard());
                                    }
                                });
                            }
                        });
                    } else if (dt == 'tofwnorating') {
                        reqToWork.findOneAndUpdate({ _id: reqId }, { status: 'reject' }, { new: true, upsert: true, runValidators: true }, async (err, docs) => {
                            if (err) {
                                msg.answerCbQuery("❗Xato", { show_alert: true });
                            } else {
                                const position = await reqToWork.find({ workId: work._id });
                                let index = 0;
                                for (let i = 0; i < position.length; i++) {
                                    if (position[i].from == id) {
                                        index = i + 1;
                                        break;
                                    }
                                }
                                sm(`<b>📮Loyiha yakunlandi!</b>\n📨Loyiha: ${work.title}\n📋Status: <b>❗Bekor qlindi!</b>\n\n<b>💔Freelancer o'z vazifasini qila olmagani uchun afsusdamiz!!!</b>`);

                                msg.telegram.sendMessage(work.from, `<b>📮${work.title}</b> - Loyihasi uchun buyurtmani topshirmadingiz!\n📨Buyurtma raqami: <b>#${index}</b>\n📋Status: <b>❗Bekor qlindi!</b>\n💔Reyting: <b>+0</b>`, { parse_mode: "HTML" });
                                msg.editMessageReplyMarkup(Markup.removeKeyboard());

                            }
                        });
                    }
                }
            }
        } else if (data.includes('fw_successtoreq_')) {
            const reqId = data.split("_")[2];
            const req = await reqToWork.findOne({ _id: reqId });
            if (!req) {
                msg.answerCbQuery("📮Buyurtma uchun taklif topilmadi!")
            } else {
                const work = await workModel.findOne({ _id: req.workId });
                if (!work) {
                    msg.answerCbQuery("📮Taklif yuborilgan loyiha topilmadi!");
                } else {
                    const work = await workModel.findOne({ _id: req.workId });
                    if (!work) {
                        msg.answerCbQuery("📮Taklif yuborilgan loyiha topilmadi!")
                    } else {
                        if (req.status === 'checked') {
                            msg.telegram.sendMessage(req.from, `<b>📮${work.title}</b> loyihasi uchun buyurtmangizni freelancer sizga topshirganini takidlamoqda!\n\n❗Agar loyiha <b>muddatida tugatilmagan bo'lsa</b> yoki <b>freelancer (haqoratli so'z aytgan, loyihani o'g'irlagan)</b> bo'lsa freelancer <b>reytingini tushurishingiz</b> mumkin!\n📨Agar loyiha yakunlangan bo'lsa va loyihani olgan bo'lsangiz <b>✅Loyiha yakunlandi</b> tugmasini bosing!`, {
                                parse_mode: "HTML",
                                ...Markup.inlineKeyboard([
                                    [{ text: "✅Loyiha yakunlandi", callback_data: "req_tofwsuccess_" + reqId }],
                                    [{ text: "🔄️Yakunlash uchun qaytarish", callback_data: "req_tofwresend_" + reqId }],
                                    [{ text: "💔Salbiy reyting & yakunlash", callback_data: "req_tofwnegative_" + reqId }],
                                    [{ text: "❗Reytingni baholamasdan yakunlash", callback_data: "req_tofwnorating_" + reqId }],
                                ])
                            })
                            sm(`<b>📮${work.title}</b> loyihasi uchun buyurtmani yakunlash to'g'risida so'rov buyurtmachi haridorga yuborildi!\n\n📨Haridor so'rovga javob bergach bot sizga yetgazadi!`, btn.back);
                            msg.editMessageReplyMarkup(Markup.removeKeyboard());
                        }
                    }
                }
            }
        } else if (data.includes('get_reqtofwork_') && user.role == 'buyer') {
            const reqId = data.split("_")[2];
            const req = await reqToWork.findOne({ _id: reqId });
            if (!req) {
                msg.answerCbQuery("📮Buyurtma uchun taklif topilmadi!", { show_alert: true })
            } else {
                const work = await workModel.findOne({ _id: req.workId });
                if (!work) {
                    msg.answerCbQuery("📮Taklif yuborilgan loyiha topilmadi!", { show_alert: true });
                } else {
                    msg.editMessageReplyMarkup(Markup.removeKeyboard());
                    const stat = req.status == 'new' ? '🕐Yangi' : '' + req.status == 'checked' ? '✅Tasdiqlangan' : '' + req.status == 'canceled' ? '❗Rad etilgan' : '' + req.status == 'success' ? '🏁Yakunlangan - ❤️Loyiha topshirilgan!' : '' + req.status == 'reject' ? '🏁Yakunlangan - 💔Loyiha topshirilmagan' : '';
                    sm(`<b>📨${work.title}</b> - loyihasi uchun taklif!\n\n📋Taklifingiz: <i>${req.about}</i>\n\n📮Status: <b>${stat}</b>`, Markup.inlineKeyboard([
                        req.status == 'checked' ?
                            [{ text: "📨Habar yuborish", callback_data: 'sm_fromreq_' + reqId }] : [],
                        req.status == 'new' ?
                            [{ text: "❌Bekor qilish", callback_data: 'del_fromreq_' + reqId }] : [],
                        [{ text: "🔙Ortga", callback_data: "get_requests" }]
                    ]))
                }
            }
        } else if (data.includes('del_fromreq_') && user.role == 'buyer') {
            const reqId = data.split("_")[2];
            const req = await reqToWork.findOne({ _id: reqId });
            if (!req) {
                msg.answerCbQuery("📮O'chirish uchun taklif topilmadi!");
            } else {
                const work = await workModel.findOne({ _id: req.workId });
                msg.editMessageReplyMarkup(Markup.removeKeyboard());
                reqToWork.findOneAndRemove({ _id: reqId }, () => {
                    sm(`<b>📨${work?work.title:"O'chirilgan loyiha"}</b> uchun buyurtma o'chirildi!`)
                })

            }
        }
        /////////PROFIL//////////
        else if (data === 'edit_name') {
            fnc.setStep(id, { step: "edit_name" })
            msg.editMessageReplyMarkup(Markup.removeKeyboard());
            sm(txt.edit_name, btn.back)
        } else if (data === 'edit_phone') {
            fnc.setStep(id, { step: "edit_phone" })
            msg.editMessageReplyMarkup(Markup.removeKeyboard());
            sm(txt.edit_phone, btn.edit_phone)
        } else if (data === "edit_role") {
            fnc.setStep(id, { step: "role" })
            msg.editMessageReplyMarkup(Markup.removeKeyboard());
            sm(txt.requestSpecial, btn.requestSpecial)
        } else if (data === "get_finance") {
            sm(`💰Hisobingiz: <b>${user.balance} UZS</b>\n💳UzCard: <b>${user.uzcard}</b>\n💳HUMO: <b>${user.humo}</b>`, btn.finans)
            msg.editMessageReplyMarkup(Markup.removeKeyboard());
        } else if (data === 'edit_uzcard') {
            sm(txt.edit_uzcard, btn.back)
            msg.editMessageReplyMarkup(Markup.removeKeyboard());
            fnc.setStep(id, { step: "edit_uzcard" })
        } else if (data === 'edit_humo') {
            fnc.setStep(id, { step: "edit_humo" })
            msg.editMessageReplyMarkup(Markup.removeKeyboard());
            sm(txt.edit_humo, btn.back)
        } else if (data === "edit_resume") {
            msg.editMessageReplyMarkup(Markup.removeKeyboard());
            fnc.setStep(id, { step: 'edit_resume' });
            sm(txt.reqResume, btn.back)
        } else if (data === "get_requests") {
            if (user.role === "buyer") {
                const reqsWork = await reqToWork.find({ from: id });
                if (reqsWork.length < 1) {
                    msg.answerCbQuery("📨Sizda loyiha uchun buyurtmalar yo'q!", { show_alert: true, cache_time: 1 });
                } else {
                    let text = `<b>📨 Loyiha sotib olish uchun takliflaringiz:</b>\n\n`;
                    const keyb = [];
                    let index = 0
                    for (const req of reqsWork) {
                        index++;
                        const work = await workModel.findOne({ _id: req.workId });
                        const stat = req.status == 'new' ? '🕐' : '' + req.status == 'checked' ? '✅' : '' + req.status == 'canceled' ? '❗' : '' + req.status == 'success' ? '❤️' : '' + req.status == 'reject' ? '💔' : '';

                        text += `#${index} - <b>${work ? work.title : "💔O'chirilgan loyiha"} | ${work ? work.amout + " UZS" : "❗Narxni aniqlab bo'lmadi!"} | ${stat}</b>\n〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`
                        keyb.push([{ text: `#${index} | ${stat}`, callback_data: "get_reqtofwork_" + req._id }]);
                    }
                    keyb.push([{ text: `🔙Ortga`, callback_data: "ortga" }])
                    sm(text, Markup.inlineKeyboard(keyb))
                    msg.editMessageReplyMarkup(Markup.removeKeyboard());
                }
            } else if (user.role === "freelancer") {
                const reqsVacancy = await reqToVacancy.find({ from: id });
                const reqsOrder = await reqToOrder.find({ from: id });
                msg.editMessageReplyMarkup(Markup.removeKeyboard());
                sm(`<b>📨Barcha takliflaringiz</b>\n\n📮Buyurtma uchun: <b>${reqsOrder.length}</b>\n📋Vakansiya uchun: <b>${reqsVacancy.length}</b>`,Markup.inlineKeyboard([
                    [{text: "📮Buyurtma uchun",callback_data: "get_reqfororder"}],
                    [{text: "📋Vakansiya uchun",callback_data: "get_reqforvacancy"}],
                    [{text: "🔙Ortga",callback_data: 'ortga'}]
                ]));
            }
        }else if(data === "get_reqfororder" && user.role === 'freelancer'){
            const reqsOrder = await reqToOrder.find({ from: id });
            if(reqsOrder.length<1){
                msg.answerCbQuery("📮Siz buyurtma uchun taklif yubormagansiz!",{show_alert: true})
            }
        }
        else {
            if (user.role == 'buyer' && user.step == 'order_category') {
                fnc.setStep(id, { step: 'order_pending', etc: { ...user.etc, category: data } })
                const Category = await categoryModel.findOne({ _id: data })
                msg.editMessageReplyMarkup(Markup.removeKeyboard());
                sm(`<b>📨Tekshiring</b>\n\n📃Buyurtma: <b>${user.etc.title}</b>\n\n📨Batafsil: <b>${user.etc.about}</b>\n\n💰Narxi: <b>${user.etc.amout} so'm</b>\n📋Kategoriya: ${Category.title}\n\n<i>📮Barchasi to'g'ri bo'lsa "✅Tasdiqlash" tugmasini bosing!</i>`, Markup.inlineKeyboard([
                    [{ text: "✅Tasdiqlash", callback_data: "order_check" }]
                ]));
            } else if (user.role == 'freelancer' && user.step == 'fw_category') {
                fnc.setStep(id, { step: 'fw_pending', etc: { ...user.etc, category: data } });
                const Category = await categoryModel.findOne({ _id: data })
                msg.editMessageReplyMarkup(Markup.removeKeyboard());
                sm(`<b>📨Tekshiring</b>\n\n📃Loyiha: <b>${user.etc.title}</b>\n\n📨Batafsil: <b>${user.etc.about}</b>\n\n💰Narxi: <b>${user.etc.amout} so'm</b>\n📋Kategoriya: <b>${Category.title}</b>\n🗞️Demo: <b>${user.etc.example}</b>\n\n<i>📮Barchasi to'g'ri bo'lsa "✅Tasdiqlash" tugmasini bosing!</i>`, Markup.inlineKeyboard([
                    [{ text: "✅Tasdiqlash", callback_data: "fw_check" }]
                ]))
            }
        }


    }
})
//Contact
bot.on('contact', async msg => {
    const { phone_number } = msg.message.contact;
    const { id } = msg.from;
    function sm(text, keyboard = btn.main) {
        msg.replyWithHTML(text, { ...keyboard });
    }
    let user = await userModel.findOne({ id });
    if (user.step == 'phone') {
        fnc.setStep(id, { step: 'role', phone: !phone_number.includes('+') ? `+${phone_number}` : phone_number });

        sm(txt.setContact, Markup.removeKeyboard());

        sm(txt.requestSpecial, btn.requestSpecial);
    } else if (user.step == 'edit_phone') {
        fnc.setStep(id, { step: "none", phone: !phone_number.includes("+") ? `+${phone_number}` : phone_number })
        sm(txt.upphone, btn.main)
    }
});
//Deploy bot
bot.launch();