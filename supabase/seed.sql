-- Avtomatik yaratilgan: npm run seed (scripts/gen-seed.ts). Qo‘lda tahrirlamang.
insert into public.daily_questions (id, text) values
  (1, 'Bugun nimani töxtatmay öylayapsan?'),
  (2, 'Oxirgi marta nimadan ilhomlanding?'),
  (3, 'Qaysi odating seni uşlab turibdi?'),
  (4, 'Eslab qolişga arziydigan bir lahzani yoz.'),
  (5, 'Bugun kim bilan haqiqiy suhbat qilding?'),
  (6, 'Qaysi fikringdan hozir ham qaytmaysan?'),
  (7, 'Bir yil oldingi özingga nima deb aytar eding?'),
  (8, 'Seni nima tinçlantiradi?'),
  (9, 'Hozir nimadan qörqayapsan, lekin buni aytmayapsan?'),
  (10, 'Qaysi kitob, film yoki qöşiq seni özgartirgan?'),
  (11, 'Bugun nimani yöqotding yoki nimadan voz keçding?'),
  (12, 'Qaysi işni özing uçun qilding, heç kim uçun emas?'),
  (13, 'Muvaffaqiyat sen uçun nima degani?'),
  (14, 'Kimdan nimani örgandingki, u buni bilmaydi?'),
  (15, 'Nimani endi keçiktirmaslik kerak?'),
  (16, 'Bugun qaysi odatingni kuzatding?'),
  (17, 'Kamroq şovqin bölsa, nimani eşitar eding?'),
  (18, 'Qaysi savolga hali javobing yöq?'),
  (19, 'Odamlar seni nima uçun yaxşi körişini öylaysanmi?'),
  (20, 'Bugungi kuningni bitta jumla bilan ayt.'),
  (21, 'Qaysi qaraşing sönggi yilda özgardi?')
on conflict (id) do update set text = excluded.text;

insert into public.thoughts (category, title, body, read_minutes) values
  ('fikr', 'Ba’zan töğri savol — javobdan muhimroq.', 'Biz javoblarni izlaşga şoşilamiz. Çunki javob aniq, ölçaş mumkin va köpinça xotirjamlik beradi. Savol esa aksinça — fikrimizni bezovta qiladi.

Lekin rivojlaniş köpinça tayyor javobdan emas, töğri qöyilgan savoldan boşlanadi. Savol biz körmayotgan jihatni oçadi.

Balki ba’zan javob topişdan oldin, nimani sörayotganimizni aniqlab olişimiz kerakdir.', 1),
  ('mindset', 'Kamroq şovqin — köproq mazmun.', 'Har kuni bizga minglab xabarlar, fikrlar va tasvirlar yetib keladi. Ularning barçasiga munosabat bildirişga uriniş içki ovozimizni eşitişni qiyinlaştiradi.

Sukut — heç narsa bölmayotgan vaqt emas. U fikrlar joyiga tuşadigan makon bölişi mumkin.', 1),
  ('madaniyat', 'Kitob öqiganda biz muallifni emas, özimizni öqiymiz.', 'Bir xil sahifani ikki kişi öqisa, ikki xil kitob öqiydi. Çunki har kim sahifaga öz tajribasini olib keladi.

Şuning uçun yaxşi kitob javob bermaydi, balki bizdagi savollarni uyğotadi.', 2),
  ('fikr', 'Baxt — bu orzu emas, holatdir.', 'Baxt köpinça katta maqsadlar bilan boğlanadi. Göyoki biror narsaga erişsak, keyin hammasi yaxşi böladigandek.

Ammo baxt ba’zan oddiy lahzada, yaqin inson bilan suhbatda yoki özimizni anglaşda namoyon böladi.', 1);

insert into public.shorts (category, quote, tone, position) values
  ('fikr', 'Köp narsani biliş — dono böliş degani emas. Muhimi, bilganing haqida qanday fikrlaşing.', 'sand', 0),
  ('madaniyat', 'Şahar — xaritadagi köçalar emas. U odamlar bir-biriga qançalik yaqin yaşaşidir.', 'sage', 1),
  ('mindset', 'Ba’zan oldinga yuriş uçun tezlaşiş emas, nimaga şoşilayotganingni anglaş kerak.', 'ink', 2);
