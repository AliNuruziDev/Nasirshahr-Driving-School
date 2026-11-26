
const { useState, useEffect, useRef } = React;


// تصاویر ویترین در اندازه مناسب موبایل، با خروجی WebP و فشرده‌سازی دریافت می‌شوند.
// wsrv.nl نسخه تبدیل‌شده را در CDN خود نگه می‌دارد؛ Service Worker نیز آن را روی دستگاه کش می‌کند.
function nasajGetOriginalFabricPhotoUrl(source) {
    if (!source || typeof source !== 'string') return '';
    try {
        const parsed = new URL(source, window.location.href);
        if ((parsed.hostname === 'wsrv.nl' || parsed.hostname === 'images.weserv.nl') && parsed.searchParams.get('url')) {
            return parsed.searchParams.get('url');
        }
        return `${parsed.origin}${parsed.pathname}`;
    } catch (error) {
        return source.split('#')[0].split('?')[0];
    }
}

function nasajOptimizedFabricPhotoUrl(source, width = 720) {
    if (!source || typeof source !== 'string' || !/^https?:\/\//i.test(source)) return source;
    const original = nasajGetOriginalFabricPhotoUrl(source);
    const encoded = encodeURIComponent(original);
    return `https://wsrv.nl/?url=${encoded}&w=${width}&output=webp&q=74&maxage=1y`;
}

// مسیر جایگزین در صورت اختلال CDN اصلی؛ هر دو مسیر نیز WebP سبک تحویل می‌دهند.
function nasajFabricPhotoFallbacks(source) {
    if (!source || typeof source !== 'string' || !/^https?:\/\//i.test(source)) return [];
    const original = nasajGetOriginalFabricPhotoUrl(source);
    const encodedSource = encodeURIComponent(original);
    return [
        `https://images.weserv.nl/?url=${encodedSource}&w=720&output=webp&q=72`,
        `https://wsrv.nl/?url=${encodedSource}&w=640&output=webp&q=68&maxage=1y`
    ];
}

// ==========================================
// ۱. محله‌ها و قطب‌های نساجی تهران
// ==========================================
const TEHRAN_NEIGHBORHOODS = [
    { id: 'all', name: 'همه تهران', lat: 35.6950, lng: 51.4000, zoom: 11, radius: 0 },
    { id: 'bazar', name: 'بازار بزرگ', lat: 35.6762, lng: 51.4185, zoom: 15, radius: 700 },
    { id: 'molavi', name: 'مولوی', lat: 35.6675, lng: 51.4255, zoom: 15, radius: 700 },
    { id: 'abdolabad', name: 'عبدل‌آباد', lat: 35.6355, lng: 51.3685, zoom: 15, radius: 800 },
    { id: 'jomhouri', name: 'جمهوری و ولیعصر', lat: 35.6985, lng: 51.4085, zoom: 15, radius: 750 },
    { id: 'zartosht', name: 'زرتشت و کریم‌خان', lat: 35.7120, lng: 51.4090, zoom: 15, radius: 700 },
    { id: 'tajrish', name: 'تجریش و شریعتی', lat: 35.8045, lng: 51.4275, zoom: 14, radius: 950 },
    { id: 'tehranpars', name: 'تهرانپارس', lat: 35.7360, lng: 51.5310, zoom: 14, radius: 1100 },
    { id: 'sadeghiyeh', name: 'صادقیه و ستارخان', lat: 35.7220, lng: 51.3350, zoom: 14, radius: 1100 },
    { id: 'chahardangeh', name: 'شهرک صنعتی چهاردانگه', lat: 35.6050, lng: 51.3180, zoom: 14, radius: 1300 }
];

const TEHRAN_CITY_BOUNDARY = [
    [35.785, 51.285],
    [35.822, 51.375],
    [35.825, 51.445],
    [35.798, 51.525],
    [35.755, 51.578],
    [35.660, 51.515],
    [35.595, 51.445],
    [35.592, 51.355],
    [35.595, 51.295],
    [35.695, 51.265]
];

const TEHRAN_MAJOR_ROADS = [
    { name: 'خیابان ولیعصر', coords: [[35.658, 51.398], [35.698, 51.408], [35.712, 51.409], [35.755, 51.415], [35.806, 51.428]] },
    { name: 'آزادی - انقلاب', coords: [[35.700, 51.335], [35.701, 51.391], [35.701, 51.425], [35.703, 51.475]] },
    { name: 'خیابان جمهوری', coords: [[35.696, 51.375], [35.698, 51.408], [35.695, 51.432]] },
    { name: 'پانزده خرداد (بازار)', coords: [[35.677, 51.402], [35.676, 51.420], [35.675, 51.440]] },
    { name: 'خیابان مولوی', coords: [[35.668, 51.400], [35.667, 51.426], [35.666, 51.448]] },
    { name: 'بزرگراه همت', coords: [[35.752, 51.280], [35.748, 51.360], [35.745, 51.435], [35.742, 51.555]] },
    { name: 'حکیم - رسالت', coords: [[35.730, 51.290], [35.728, 51.380], [35.735, 51.460], [35.738, 51.555]] },
    { name: 'نواب - چمران', coords: [[35.642, 51.382], [35.698, 51.383], [35.745, 51.388], [35.792, 51.395]] },
    { name: 'بزرگراه آزادگان', coords: [[35.600, 51.305], [35.635, 51.368], [35.625, 51.430], [35.630, 51.495]] },
    { name: 'خیابان شریعتی', coords: [[35.703, 51.445], [35.745, 51.438], [35.774, 51.434], [35.805, 51.428]] }
];

// ==========================================
// ۲. تولید بافت‌های پارچه، تصاویر فروشگاه‌ها و کاورهای ادیتوریال مجله
// ==========================================
function generateFabricWeaveDataUrl(baseColor, threadColor, patternType = 'twill') {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 400, 400);

    ctx.strokeStyle = threadColor;
    ctx.globalAlpha = 0.28;

    if (patternType === 'twill') {
        ctx.lineWidth = 2;
        for (let i = -400; i < 800; i += 6) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + 400, 400);
            ctx.stroke();
        }
        ctx.lineWidth = 1;
        for (let y = 0; y < 400; y += 4) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(400, y);
            ctx.stroke();
        }
    } else if (patternType === 'linen') {
        ctx.lineWidth = 1.5;
        for (let x = 0; x < 400; x += 5) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 400);
            ctx.stroke();
        }
        for (let y = 0; y < 400; y += 5) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(400, y);
            ctx.stroke();
        }
    } else {
        for (let y = 0; y < 400; y += 6) {
            for (let x = 0; x < 400; x += 6) {
                ctx.fillStyle = (x + y) % 12 === 0 ? '#ffffff' : '#000000';
                ctx.fillRect(x, y, 2.5, 2.5);
            }
        }
    }
    return canvas.toDataURL('image/png');
}

function generatePlacePhotoDataUrl(type, palette = ['#1e293b', '#ea580c', '#0284c7', '#16a34a']) {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');

    if (type === 'shop') {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, 480, 240);

        ctx.fillStyle = '#334155';
        ctx.fillRect(0, 74, 480, 8);
        ctx.fillRect(0, 154, 480, 8);
        ctx.fillRect(0, 232, 480, 8);

        for (let i = 0; i < 14; i++) {
            const color = palette[i % palette.length];
            const x = 14 + i * 33;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(x, 14, 26, 60, 5);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.22)';
            ctx.fillRect(x + 4, 16, 6, 56);
        }

        for (let col = 0; col < 4; col++) {
            for (let row = 0; row < 4; row++) {
                const color = palette[(col + row) % palette.length];
                const x = 16 + col * 114;
                const y = 88 + row * 16;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.roundRect(x, y, 102, 13, 6);
                ctx.fill();
                ctx.fillStyle = '#e2e8f0';
                ctx.beginPath();
                ctx.arc(x + 95, y + 6.5, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        for (let i = 0; i < 14; i++) {
            const color = palette[(i + 2) % palette.length];
            const x = 14 + i * 33;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(x, 168, 26, 64, 5);
            ctx.fill();
        }
    } else {
        const grad = ctx.createLinearGradient(0, 0, 0, 240);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#1e293b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 480, 240);

        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(40, 12, 120, 8);
        ctx.fillRect(310, 12, 120, 8);

        ctx.fillStyle = '#475569';
        ctx.fillRect(30, 55, 250, 145);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(42, 70, 226, 16);

        ctx.strokeStyle = palette[0];
        ctx.lineWidth = 2;
        for (let x = 48; x < 262; x += 5) {
            ctx.beginPath();
            ctx.moveTo(x, 86);
            ctx.lineTo(x, 140);
            ctx.stroke();
        }

        ctx.fillStyle = palette[1] || '#ea580c';
        ctx.beginPath();
        ctx.roundRect(42, 138, 226, 36, 14);
        ctx.fill();

        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = palette[i % palette.length];
            ctx.beginPath();
            ctx.roundRect(305, 65 + i * 34, 145, 28, 12);
            ctx.fill();
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.arc(318, 79 + i * 34, 7, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    return canvas.toDataURL('image/png');
}

// تولید تصویر هنری و ادیتوریال اختصاصی برای هر مقاله مجله
function generateArticleCoverDataUrl(styleType = 'silk') {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 340;
    const ctx = canvas.getContext('2d');

    if (styleType === 'market') {
        // کاور اخبار بازار نساجی: ترکیب سرمه‌ای لوکس و خطوط طلایی موج‌دار
        const grad = ctx.createLinearGradient(0, 0, 640, 340);
        grad.addColorStop(0, '#090d16');
        grad.addColorStop(0.55, '#1e293b');
        grad.addColorStop(1, '#334155');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 340);

        // شبکه ظریف تار و پود در پس‌زمینه
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let x = 0; x < 640; x += 24) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 340);
            ctx.stroke();
        }
        for (let y = 0; y < 340; y += 24) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(640, y);
            ctx.stroke();
        }

        // امواج ابریشمی طلایی و نارنجی
        for (let k = 0; k < 5; k++) {
            ctx.beginPath();
            ctx.strokeStyle = k === 0 ? '#f59e0b' : 'rgba(234, 88, 12, 0.45)';
            ctx.lineWidth = k === 0 ? 4 : 2;
            for (let x = 0; x <= 640; x += 10) {
                const y = 180 + Math.sin(x * 0.012 + k * 0.7) * 55 - x * 0.08;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    } else if (styleType === 'crepe') {
        // کاور شناخت کرپ و بافت‌های ریزش‌دار: چین‌های مواج پارچه لوکس
        const grad = ctx.createLinearGradient(0, 0, 640, 340);
        grad.addColorStop(0, '#450a0a');
        grad.addColorStop(0.5, '#7f1d1d');
        grad.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 340);

        for (let i = 0; i < 14; i++) {
            const x = i * 50;
            const foldGrad = ctx.createLinearGradient(x, 0, x + 50, 0);
            foldGrad.addColorStop(0, 'rgba(0,0,0,0.45)');
            foldGrad.addColorStop(0.5, 'rgba(255,255,255,0.16)');
            foldGrad.addColorStop(1, 'rgba(0,0,0,0.45)');
            ctx.fillStyle = foldGrad;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.quadraticCurveTo(x + 25, 170, x - 15, 340);
            ctx.lineTo(x + 40, 340);
            ctx.quadraticCurveTo(x + 75, 170, x + 50, 0);
            ctx.closePath();
            ctx.fill();
        }
    } else if (styleType === 'gsm') {
        // کاور راهنمای گرماژ و مهندسی بافت: دایره‌های هم‌مرکز ذره‌بین روی تار و پود
        const grad = ctx.createLinearGradient(0, 0, 640, 340);
        grad.addColorStop(0, '#064e3b');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 340);

        // بافت درشت‌نمایی‌شده در دایره مرکزی
        ctx.save();
        ctx.beginPath();
        ctx.arc(320, 170, 115, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = '#047857';
        ctx.fillRect(200, 50, 240, 240);
        ctx.strokeStyle = '#a7f3d0';
        ctx.lineWidth = 3;
        for (let x = 200; x <= 440; x += 14) {
            ctx.beginPath();
            ctx.moveTo(x, 50);
            ctx.lineTo(x, 290);
            ctx.stroke();
        }
        for (let y = 50; y <= 290; y += 14) {
            ctx.beginPath();
            ctx.moveTo(200, y);
            ctx.lineTo(440, y);
            ctx.stroke();
        }
        ctx.restore();

        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(320, 170, 115, 0, Math.PI * 2);
        ctx.stroke();
    } else if (styleType === 'cotton') {
        // کاور الیاف طبیعی پنبه و لینن
        const grad = ctx.createLinearGradient(0, 0, 640, 340);
        grad.addColorStop(0, '#78350f');
        grad.addColorStop(0.5, '#92400e');
        grad.addColorStop(1, '#1e293b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 340);

        ctx.strokeStyle = 'rgba(254, 243, 199, 0.22)';
        ctx.lineWidth = 2.5;
        for (let i = -300; i < 640; i += 18) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + 300, 340);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(i + 300, 0);
            ctx.lineTo(i, 340);
            ctx.stroke();
        }
    } else {
        // کاور ترندهای مزونی و ژاکارد
        const grad = ctx.createLinearGradient(0, 0, 640, 340);
        grad.addColorStop(0, '#3b0764');
        grad.addColorStop(0.5, '#581c87');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 340);

        ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
        ctx.lineWidth = 2;
        for (let x = 40; x < 640; x += 80) {
            for (let y = 40; y < 340; y += 80) {
                ctx.beginPath();
                ctx.moveTo(x, y - 28);
                ctx.lineTo(x + 28, y);
                ctx.lineTo(x, y + 28);
                ctx.lineTo(x - 28, y);
                ctx.closePath();
                ctx.stroke();
            }
        }
    }

    return canvas.toDataURL('image/png');
}

// ==========================================
// ۳. بانک مقالات و اخبار تخصصی صنعت پارچه و نساجی
// ==========================================
const RAW_ARTICLES = [
    {
        id: 'art-1',
        category: 'اخبار بازار نساجی',
        badgeColor: 'bg-amber-500 text-slate-950',
        featured: true,
        title: 'تحلیل بازار پارچه تهران در پاییز و زمستان ۱۴۰۵؛ وضعیت قیمت نخ پنبه و پیش‌بینی بازار کرپ',
        subtitle: 'گزارش میدانی از بازار بزرگ تهران، مولوی و شهرک صنعتی چهاردانگه برای تولیدکنندگان پوشاک',
        author: 'تحریریه اقتصادی نساج‌یار',
        date: '۲۲ آبان ۱۴۰۵',
        readTime: '۴ دقیقه مطالعه',
        coverStyle: 'market',
        relatedFabricId: 1,
        goldenTip: 'برای سفارش‌های تیراژ بالای زمستانه، خرید طاقه‌ای دورس سه نخ و کرپ‌های گرماژ بالای ۲۸۰ گرم پیش از اوج‌گیری تقاضای شب عید، حاشیه سود تولیدی شما را تا ۱۸٪ حفظ می‌کند.',
        sections: [
            {
                heading: 'روند قیمت نخ پنبه و پلی‌استر در کارخانجات داخلی',
                body: 'بررسی معاملات هفته اخیر در قطب‌های نساجی تهران نشان می‌دهد ثبات نسبی نرخ نخ فیلامنت باعث شده قیمت انواع کرپ مازراتی و باربی تولید داخل در محدوده رقابتی باقی بماند. در مقابل، پارچه‌های دارای درصد بالای نخ پنبه سوپر (به‌ویژه دورس سه نخ و کتان کج‌راه) به دلیل افزایش تقاضای کارگاه‌های هودی و پالتودوزی با رشد ملایم تقاضا روبه‌رو شده‌اند.'
            },
            {
                heading: 'چرا تولیدکنندگان به سمت پارچه‌های تکمیل‌شده داخلی رفته‌اند؟',
                body: 'ارتقای خطوط رنگرزی و کامپکت در شهرک صنعتی چهاردانگه و کارخانجات یزد باعث شده کیفیت ثبات رنگ و صفر شدن آبرفت پارچه‌های ایرانی با نمونه‌های وارداتی ترکیه رقابت کند. امروز بسیاری از مزون‌های خیابان زرتشت و تولیدی‌های بازار بزرگ، ترکیبی از بافت داخلی باکیفیت و خرج‌کار وارداتی را انتخاب می‌کنند.'
            }
        ]
    },
    {
        id: 'art-2',
        category: 'شناخت جنس پارچه',
        badgeColor: 'bg-rose-600 text-white',
        featured: false,
        title: 'تفاوت واقعی کرپ مازراتی، کرپ باربی و کرپ حریر چیست؟ راهنمای تشخیص بافت باکیفیت',
        subtitle: 'چگونه از روی تراکم بافت، ریزش و میزان لاکرا، کرپ درجه یک را از نمونه‌های پرزده تشخیص دهیم؟',
        author: 'مهندس سارا کیانی | کارشناس نساجی',
        date: '۱۹ آبان ۱۴۰۵',
        readTime: '۵ دقیقه مطالعه',
        coverStyle: 'crepe',
        relatedFabricId: 1,
        goldenTip: 'پارچه کرپ را در نور مستقیم بکشید؛ اگر روزنه‌های بین تار و پود بیش از حد باز شد و سایه انداخت، تراکم بافت پایین است و پس از چند بار شستشو در ناحیه زانو و آرنج تغییر فرم می‌دهد.',
        sections: [
            {
                heading: '۱. کرپ مازراتی (بافت دانه اناری برجسته)',
                body: 'سطح این پارچه دارای برجستگی‌های بسیار ریز و منظمی است که نور را به صورت مات منعکس می‌کند. گرماژ استاندارد کرپ مازراتی بین ۲۷۰ تا ۳۱۰ گرم بر متر مربع است و به دلیل داشتن ۱۰ تا ۱۵ درصد لاکرا در عرض، بهترین گزینه برای مانتوهای کتی، شلوارهای راسته و لباس‌های فرم اداری محسوب می‌شود.'
            },
            {
                heading: '۲. کرپ باربی (سطح صاف، لطیف و آهاردار)',
                body: 'برخلاف مازراتی، سطح کرپ باربی کاملاً صیقلی و یکدست است. این پارچه چروک‌پذیری بسیار پایینی دارد و ایستایی شیک و خوش‌فرمی به کت‌وشلوارهای زنانه و مانتوهای مجلسی می‌دهد.'
            },
            {
                heading: '۳. کرپ حریر (سبک، لطیف و ریزش‌دار)',
                body: 'با گرماژ حدود ۱۳۰ تا ۱۷۰ گرم، بسیار سبک و خنک است و برای دوخت شومیز، پیراهن‌های مجلسی لایه‌دار و شال کاربرد دارد. در دوخت کرپ حریر استفاده از سوزن ظریف شماره ۶۵ یا ۷۰ برای جلوگیری از نخ‌کش شدن ضروری است.'
            }
        ]
    },
    {
        id: 'art-3',
        category: 'راهنمای گرماژ و دوخت',
        badgeColor: 'bg-emerald-600 text-white',
        featured: false,
        title: 'گرماژ (GSM) پارچه چیست و چطور بدون لمس پارچه، ضخامت و ریزش آن را تشخیص دهیم؟',
        subtitle: 'جدول استاندارد انتخاب گرماژ مناسب برای تیشرت، شومیز، مانتو، شلوار و هودی زمستانی',
        author: 'واحد کنترل کیفیت نساج‌یار',
        date: '۱۵ آبان ۱۴۰۵',
        readTime: '۴ دقیقه مطالعه',
        coverStyle: 'gsm',
        relatedFabricId: 5,
        goldenTip: 'گرماژ (GSM) وزن یک متر مربع از پارچه را نشان می‌دهد، نه وزن یک متر طول! برای محاسبه وزن هر متر طول طاقه، عدد گرماژ را در عرض پارچه (بر حسب متر) ضرب کنید.',
        sections: [
            {
                heading: 'دسته‌بندی پارچه‌ها بر اساس عدد گرماژ (GSM)',
                body: '• پارچه‌های سبک (زیر ۱۷۰ گرم): مناسب شومیز، پیراهن مردانه، لینن تابستانه و حریر.\n• پارچه‌های نیمه‌سنگین (۱۸۰ تا ۲۶۰ گرم): مناسب تیشرت پنبه سوپر، کتان مانتویی، فلامنت ورزشی و ترگال.\n• پارچه‌های سنگین و ضخیم (۲۷۰ تا ۴۰۰ گرم): مناسب کرپ مازراتی مجلسی، دورس سه نخ هودی، فاستونی پشمی و فوتر.'
            },
            {
                heading: 'آیا گرماژ بالاتر همیشه به معنای کیفیت بهتر است؟',
                body: 'خیر؛ گرماژ فقط شاخص تراکم و وزن است. برای مثال یک پارچه لینن تابستانه با گرماژ ۱۶۰ گرم اگر از الیاف طبیعی پنبه و کتان بافته شده باشد، بسیار باکیفیت‌تر و خنک‌تر از یک پارچه پلی‌استر ۳۰۰ گرمی برای فصل تابستان است.'
            }
        ]
    },
    {
        id: 'art-4',
        category: 'شناخت جنس پارچه',
        badgeColor: 'bg-amber-700 text-white',
        featured: false,
        title: 'لینن، نخ پنبه یا ویسکوز؟ بررسی تخصصی الیاف خنک و روش کنترل آبرفت در کارگاه',
        subtitle: 'همه چیز درباره الیاف طبیعی و سلولزی و ترفندهای پیش‌شستشو قبل از برش طاقه',
        author: 'امیرحسین راد | مشاور تولید پوشاک',
        date: '۱۰ آبان ۱۴۰۵',
        readTime: '۶ دقیقه مطالعه',
        coverStyle: 'cotton',
        relatedFabricId: 2,
        goldenTip: 'همیشه پیش از برش انبوه پارچه‌های لینن و نخی، یک تکه مربع ۲۰ در ۲۰ سانتی‌متری از سر طاقه ببرید، بشویید و اتو کنید تا درصد دقیق آبرفت طولی و عرضی در الگوی برش لحاظ شود.',
        sections: [
            {
                heading: 'تفاوت ساختاری پنبه (Cotton) و لینن (Linen)',
                body: 'الیاف پنبه از غوزه گیاه پنبه به دست می‌آیند و بافتی نرم، مات و بدون گره‌های برجسته دارند. در مقابل، لینن از ساقه گیاه کتان تولید می‌شود؛ به همین دلیل رشته‌های آن استحکام کششی بالاتری دارند، سریع‌تر رطوبت را تبخیر می‌کنند و گره‌های طبیعی ظریفی (Slub) روی سطح پارچه ایجاد می‌کنند.'
            },
            {
                heading: 'نقش ویسکوز در لطافت و کاهش چروک لینن',
                body: 'در پارچه‌های مدرن بازار مولوی و بازار بزرگ، معمولاً ۳۰٪ الیاف ویسکوز را با ۷۰٪ پنبه و کتان ترکیب می‌کنند. این ترکیب علاوه بر حفظ خنکی، زبری کتان خالص را از بین برده و ریزش بسیار زیباتری به مانتو و شومیز می‌دهد.'
            }
        ]
    },
    {
        id: 'art-5',
        category: 'ترندهای ۱۴۰۵',
        badgeColor: 'bg-purple-700 text-white',
        featured: false,
        title: 'ترندهای رنگ و بافت پارچه در مزون‌های تهران؛ بازگشت ژاکارد برجسته و مخمل کبریتی',
        subtitle: 'پرفروش‌ترین کالیته‌های رنگی و بافت‌های محبوب طراحان لباس در سال ۱۴۰۵',
        author: 'استودیو مد و پارچه نساج‌یار',
        date: '۵ آبان ۱۴۰۵',
        readTime: '۳ دقیقه مطالعه',
        coverStyle: 'trend',
        relatedFabricId: 4,
        goldenTip: 'رنگ‌های خاکی گرم (موکا، شتری، سبز زیتونی تیره و سرمه‌ای جوهرى) بیشترین سفارش طاقه‌ای را در نیمه دوم سال بین مزون‌های شمال و مرکز تهران داشته‌اند.',
        sections: [
            {
                heading: 'بافت‌های برجسته و سه‌بعدی در کانون توجه طراحان',
                body: 'طراحان مزونی به جای پارچه‌های چاپی ساده، به سراغ پارچه‌هایی رفته‌اند که خودِ تار و پود آن‌ها دارای نقش برجسته است؛ از جمله ژاکاردهای ابریشمی، کرپ‌های جناغی و مخمل‌های کبریتی ریز که بدون نیاز به تزئینات اضافی، فرم لباس را لوکس نشان می‌دهند.'
            }
        ]
    }
];

const INITIAL_ARTICLES = RAW_ARTICLES.map((art) => ({
    ...art,
    coverImage: generateArticleCoverDataUrl(art.coverStyle)
}));

// ==========================================
// ۴. داده‌های کامل پارچه‌ها همراه با شناسنامه فنی جامع
// ==========================================
const INITIAL_FABRICS = [
    {
        id: 1,
        name: 'کرپ مازراتی چاپ گل‌ریز آبی',
        code: 'CR-402',
        producer: 'نساجی اطلس بافت تهران',
        producerType: 'manufacturer',
        neighborhoodId: 'bazar',
        area: 'بازار بزرگ',
        features: ['ضدچروک', 'ریزش‌دار و لخت', 'عدم پرزدهی', 'بدون سایه‌انداختن', 'مات و خوش‌دوخت'],
        suitableFor: ['مانتو مجلسی و اداری', 'شلوار راسته و بگ', 'کت‌وشلوار زنانه', 'اورال (سرهمی)', 'لباس فرم'],
        originCountry: '🇮🇷 ایران (تولید تهران)',
        gsm: 290,
        width: 150,
        rollLength: 45,
        stretch: 'کش از عرض (۲۵٪ لاکرا)',
        fabricType: 'کرپ مازراتی (بافت دانه اناری)',
        rawMaterials: '۸۵٪ الیاف پلی‌استر میکرو، ۱۵٪ نخ اسپندکس (لاکرا)',
        drapeAndThickness: 'ریزش‌دار و خوش‌فرم | ضخامت متوسط',
        season: 'چهارفصل',
        shrinkage: 'تکمیل‌شده (بدون آبرفت) | ثبات رنگ بالا',
        careInstructions: 'شستشو با آب ۳۰ درجه، اتوکشی از پشت با بخار ملایم',
        minOrder: '۱ طاقه (حدود ۴۵ متر)',
        pricePerMeter: '۱۸۵,۰۰۰ تومان',
        colors: ['#1e293b', '#991b1b', '#065f46', '#d97706'],
        pattern: 'twill',
        imageUrl: 'https://images.pexels.com/photos/16132470/pexels-photo-16132470.jpeg?auto=compress&cs=tinysrgb&w=1400',
        videoUrl: null
    },
    {
        id: 2,
        name: 'لینن نخی طرح‌دار گل‌ریز',
        code: 'LN-118',
        producer: 'بنکداری پارچه آریا',
        producerType: 'shop',
        neighborhoodId: 'molavi',
        area: 'مولوی',
        features: ['بسیار خنک و تنفس‌پذیر', 'ضدحساسیت', 'جذب رطوبت بالا', 'بافت طبیعی اسلاب', 'سبک و راحت'],
        suitableFor: ['شومیز و پیراهن ساحلی', 'مانتو تابستانه', 'شلوار لینن آزاد', 'ست راحتی و کژوال', 'پیراهن مردانه'],
        originCountry: '🇹🇷 ترکیه',
        gsm: 165,
        width: 145,
        rollLength: 50,
        stretch: 'بدون کش',
        fabricType: 'لینن نخی (بافت حصیری سبک)',
        rawMaterials: '۷۰٪ الیاف طبیعی پنبه و کتان، ۳۰٪ الیاف ویسکوز گیاهی',
        drapeAndThickness: 'ایستایی نیمه‌آزاد | نازک و خنک',
        season: 'بهار و تابستان',
        shrinkage: 'آبرفت جزئی (حدود ۲٪ قبل از دوخت)',
        careInstructions: 'شستشو با آب سرد و شوینده ملایم، خشک شدن در سایه',
        minOrder: '۱۰ متر (خرده و عمده)',
        pricePerMeter: '۱۴۲,۰۰۰ تومان',
        colors: ['#d6d3d1', '#78716c', '#0369a1', '#b45309'],
        pattern: 'linen',
        imageUrl: 'https://images.pexels.com/photos/7640758/pexels-photo-7640758.jpeg?auto=compress&cs=tinysrgb&w=1400',
        videoUrl: null
    },
    {
        id: 3,
        name: 'فلامنت طرح انتزاعی آبی و نارنجی',
        code: 'SP-905',
        producer: 'کارخانه بافندگی سپهر',
        producerType: 'manufacturer',
        neighborhoodId: 'abdolabad',
        area: 'عبدل‌آباد',
        features: ['تنفس سریع و ضدتعریق', 'کشسانی بالا بدون تغییر فرم', 'خشک شدن سریع', 'مقاوم در برابر سایش', 'ضدچروک'],
        suitableFor: ['لگ و شلوارک ورزشی', 'تیشرت و تاپ باشگاه', 'لباس تیمی و فوتبالی', 'لباس شنا و اسکی', 'لباس کار سبک'],
        originCountry: '🇮🇷 ایران (تولید تهران)',
        gsm: 220,
        width: 160,
        rollLength: 40,
        stretch: 'کش چهارجهته (فول کش ۴۰٪)',
        fabricType: 'گردباف میکروفلامنت لاکرادار',
        rawMaterials: '۸۸٪ نخ میکروفلامنت پلی‌استر، ۱۲٪ الیاف لاکرا کره',
        drapeAndThickness: 'جذب بدن و منعطف | ضخامت متوسط',
        season: 'چهارفصل',
        shrinkage: 'صفر درصد (کاملاً تثبیت‌شده)',
        careInstructions: 'شستشو با ماشین لباسشویی (۳۰ درجه)، عدم استفاده از سفیدکننده',
        minOrder: '۱ طاقه (حدود ۴۰ متر / ۱۴ کیلوگرم)',
        pricePerMeter: '۱۵۸,۰۰۰ تومان',
        colors: ['#0f172a', '#2563eb', '#dc2626', '#16a34a'],
        pattern: 'knit',
        imageUrl: 'https://images.pexels.com/photos/36455706/pexels-photo-36455706.jpeg?auto=compress&cs=tinysrgb&w=1400',
        videoUrl: null
    },
    {
        id: 4,
        name: 'ژاکارد نقش سنتی آذری',
        code: 'JK-310',
        producer: 'سرای پارچه نگین زرتشت',
        producerType: 'shop',
        neighborhoodId: 'zartosht',
        area: 'زرتشت و کریم‌خان',
        features: ['طرح برجسته و لوکس', 'درخشش ملایم ابریشمی', 'ایستایی شیک و مجلسی', 'بدون نیاز به آسترکشی', 'مقاوم در برابر نخ‌کش شدن'],
        suitableFor: ['کت و دامن مجلسی', 'مانتو عید و تشریفاتی', 'پیراهن شب و مزونی', 'خرج‌کار و یقه لباس'],
        originCountry: '🇰🇷 کره جنوبی',
        gsm: 310,
        width: 150,
        rollLength: 35,
        stretch: 'بدون کش',
        fabricType: 'ژاکارد طرح‌دار برجسته',
        rawMaterials: '۶۵٪ ابریشم مصنوعی (ریون)، ۳۵٪ پلی‌استر فشرده',
        drapeAndThickness: 'ایستایی آهاردار و مجلسی | نیمه‌ضخیم',
        season: 'پاییز، زمستان و بهار',
        shrinkage: 'بدون آبرفت',
        careInstructions: 'خشکشویی یا شستشوی دستی ملایم، اتو بخار از فاصله',
        minOrder: '۵ متر',
        pricePerMeter: '۲۶۵,۰۰۰ تومان',
        colors: ['#4c1d95', '#be185d', '#0f766e', '#1e293b'],
        pattern: 'twill',
        imageUrl: 'https://images.pexels.com/photos/18087336/pexels-photo-18087336.jpeg?auto=compress&cs=tinysrgb&w=1400',
        videoUrl: null
    },
    {
        id: 5,
        name: 'دورس چاپی هندسی رنگی',
        code: 'DR-770',
        producer: 'کارخانه نساجی و گردباف آفتاب',
        producerType: 'manufacturer',
        neighborhoodId: 'chahardangeh',
        area: 'شهرک صنعتی چهاردانگه',
        features: ['گرمای بالا و لطافت داخل کار', 'عدم پرزدهی (خارخورده باکیفیت)', 'تنفس‌پذیر', 'ثبات رنگ در شستشو', 'دوام طولانی'],
        suitableFor: ['هودی و سویشرت', 'دورس و بلوز پاییزه', 'شلوار جاگر و اسلش', 'ست گرمکن زمستانی', 'پوشاک بچگانه'],
        originCountry: '🇮🇷 ایران (تولید شهرک صنعتی چهاردانگه)',
        gsm: 340,
        width: 180,
        rollLength: 30,
        stretch: 'کش از عرض (۱۵٪)',
        fabricType: 'گردباف دورس سه نخ (داخل کرکی / خارخورده)',
        rawMaterials: '۹۰٪ نخ پنبه سوپر شانه، ۱۰٪ پلی‌استر تقویتی',
        drapeAndThickness: 'ایستایی گرم و نرم | ضخیم',
        season: 'پاییز و زمستان',
        shrinkage: 'کامپکت‌شده (آبرفت زیر ۱٪)',
        careInstructions: 'شستشو با آب ۳۰ درجه به صورت پشت‌ورو',
        minOrder: '۱ عدل / طاقه (حدود ۳۰ متر)',
        pricePerMeter: '۲۱۰,۰۰۰ تومان',
        colors: ['#18181b', '#3f6212', '#1d4ed8', '#9a3412'],
        pattern: 'knit',
        imageUrl: 'https://images.pexels.com/photos/35197102/pexels-photo-35197102.jpeg?auto=compress&cs=tinysrgb&w=1400',
        videoUrl: null
    },
    {
        id: 6,
        name: 'کتان طرح هندسی مدرن',
        code: 'KT-512',
        producer: 'تولیدی فاستونی و کتان پارس',
        producerType: 'manufacturer',
        neighborhoodId: 'bazar',
        area: 'بازار بزرگ',
        features: ['ایستایی مرتب و اتوپذیری عالی', 'تنفس‌پذیر و ضدحساسیت', 'مقاوم در برابر سایش', 'کشسانی راحت برای حرکت'],
        suitableFor: ['مانتو اداری و دانشجویی', 'شلوار کتان و اسلش', 'کت تک و بارانی سبک', 'لباس کار مهندسی و فرم'],
        originCountry: '🇮🇷 ایران (تولید تهران)',
        gsm: 260,
        width: 150,
        rollLength: 45,
        stretch: 'کش از عرض (۲۰٪)',
        fabricType: 'کتان کج‌راه (Twill)',
        rawMaterials: '۹۵٪ نخ پنبه طبیعی، ۵٪ الیاف لاکرا',
        drapeAndThickness: 'ایستایی خوش‌فرم | ضخامت متوسط',
        season: 'چهارفصل',
        shrinkage: 'تکمیل‌شده (بدون آبرفت)',
        careInstructions: 'شستشو با آب ۳۰ تا ۴۰ درجه، اتوکشی با دمای متوسط',
        minOrder: '۱ طاقه (۴۵ متر)',
        pricePerMeter: '۱۷۵,۰۰۰ تومان',
        colors: ['#713f12', '#1e3a8a', '#374151', '#065f46'],
        pattern: 'twill',
        imageUrl: 'https://images.pexels.com/photos/6044450/pexels-photo-6044450.jpeg?auto=compress&cs=tinysrgb&w=1400',
        videoUrl: null
    },
    {
        id: 7,
        name: 'ساتن موج‌دار چندرنگ',
        code: 'ST-720',
        producer: 'نمونه نمایشی نساج‌یار',
        producerType: 'shop',
        neighborhoodId: 'all',
        area: 'نمونه نمایشی',
        features: ['سطح براق و لطیف', 'ریزش نرم', 'مناسب دوخت ظریف', 'سطح نسبتاً صاف'],
        suitableFor: ['لباس شب', 'بلوز و شومیز', 'دامن مجلسی', 'آستر لباس'],
        originCountry: 'نمونه نمایشی',
        gsm: 145,
        width: 150,
        rollLength: 40,
        stretch: 'بدون کش',
        fabricType: 'ساتن پلی‌استر براق',
        rawMaterials: '۱۰۰٪ پلی‌استر (اطلاعات نمونه)',
        drapeAndThickness: 'ریزش‌دار و روان | سبک',
        season: 'چهارفصل',
        shrinkage: 'نیازمند تست شستشو',
        careInstructions: 'شستشوی ملایم با آب سرد و اتوکشی از پشت',
        minOrder: 'استعلام از فروشنده',
        pricePerMeter: 'استعلام',
        colors: ['#7f1d1d', '#111827', '#d4af37', '#7c3aed'],
        pattern: 'satin',
        imageUrl: 'https://images.pexels.com/photos/36208817/pexels-photo-36208817.jpeg?auto=compress&cs=tinysrgb&w=1400',
        videoUrl: null
    },
    {
        id: 8,
        name: 'دنیم پچ‌ورک طرح‌دار',
        code: 'DN-430',
        producer: 'نمونه نمایشی نساج‌یار',
        producerType: 'shop',
        neighborhoodId: 'all',
        area: 'نمونه نمایشی',
        features: ['بافت جناغی متراکم', 'مقاومت سایشی مناسب', 'قابل استفاده روزمره', 'در نسخه کشی انعطاف‌پذیر'],
        suitableFor: ['شلوار جین', 'کت جین', 'دامن', 'کیف پارچه‌ای'],
        originCountry: 'نمونه نمایشی',
        gsm: 320,
        width: 150,
        rollLength: 35,
        stretch: 'در نمونه‌های مختلف متفاوت است',
        fabricType: 'دنیم پچ‌ورک (Denim Patchwork)',
        rawMaterials: 'ترکیب نمونه: پنبه با درصد کمی الاستین',
        drapeAndThickness: 'ایستایی محکم | متوسط تا ضخیم',
        season: 'چهارفصل',
        shrinkage: 'پیش از برش تست آبرفت انجام شود',
        careInstructions: 'شستشو پشت‌ورو با رنگ‌های مشابه',
        minOrder: 'استعلام از فروشنده',
        pricePerMeter: 'استعلام',
        colors: ['#1e3a8a', '#1d4ed8', '#334155', '#0f172a'],
        pattern: 'twill',
        imageUrl: 'https://images.pexels.com/photos/6764690/pexels-photo-6764690.jpeg?auto=compress&cs=tinysrgb&w=1400',
        videoUrl: null
    },
    {
        id: 9,
        name: 'پارچه چاپی طرح پلنگی',
        code: 'VL-215',
        producer: 'نمونه نمایشی نساج‌یار',
        producerType: 'shop',
        neighborhoodId: 'all',
        area: 'نمونه نمایشی',
        features: ['سطح پرزدار نرم', 'جذب نور و رنگ عمیق', 'ظاهر لوکس', 'نیازمند برش در جهت خواب'],
        suitableFor: ['کت و دامن', 'پیراهن مجلسی', 'مانتو خاص', 'اکسسوری پارچه‌ای'],
        originCountry: 'نمونه نمایشی',
        gsm: 280,
        width: 145,
        rollLength: 30,
        stretch: 'وابسته به زیرساخت پارچه',
        fabricType: 'پارچه چاپی طرح حیوانی',
        rawMaterials: 'ترکیب الیاف در این نمونه نمایشی تأیید نشده است',
        drapeAndThickness: 'نرم و نسبتاً ایستاده | متوسط',
        season: 'پاییز و زمستان',
        shrinkage: 'خشکشویی یا تست محدود پیش از شستشو',
        careInstructions: 'برس‌کشی در جهت خواب پرز و پرهیز از اتوی مستقیم',
        minOrder: 'استعلام از فروشنده',
        pricePerMeter: 'استعلام',
        colors: ['#111111', '#7f1d1d', '#1e3a8a', '#166534'],
        pattern: 'velvet',
        imageUrl: 'https://images.pexels.com/photos/6440479/pexels-photo-6440479.jpeg?auto=compress&cs=tinysrgb&w=1400',
        videoUrl: null
    },
    {
        id: 10,
        name: 'پارچه چهارخانه رنگی',
        code: 'CRD-108',
        producer: 'نمونه نمایشی نساج‌یار',
        producerType: 'shop',
        neighborhoodId: 'all',
        area: 'نمونه نمایشی',
        features: ['راه‌راه برجسته طولی', 'بافت گرم و مقاوم', 'دارای خواب پارچه', 'مناسب استایل پاییزی'],
        suitableFor: ['شلوار', 'کت اسپرت', 'دامن', 'لباس کودک'],
        originCountry: 'نمونه نمایشی',
        gsm: 270,
        width: 145,
        rollLength: 35,
        stretch: 'در نمونه‌های کشی موجود است',
        fabricType: 'پارچه طرح‌دار چهارخانه',
        rawMaterials: 'ترکیب نمونه: پنبه / پلی‌استر',
        drapeAndThickness: 'ایستایی متوسط | متوسط تا ضخیم',
        season: 'پاییز و زمستان',
        shrinkage: 'قبل از برش تست شود',
        careInstructions: 'شستشوی پشت‌ورو و خشک‌کردن در سایه',
        minOrder: 'استعلام از فروشنده',
        pricePerMeter: 'استعلام',
        colors: ['#b45309', '#166534', '#7f1d1d', '#1e3a8a'],
        pattern: 'corduroy',
        imageUrl: 'https://images.pexels.com/photos/36605387/pexels-photo-36605387.jpeg?auto=compress&cs=tinysrgb&w=1400',
        videoUrl: null
    },
    {
        id: 11,
        name: 'حریر گل‌دار آبی',
        code: 'CH-061',
        producer: 'نمونه نمایشی نساج‌یار',
        producerType: 'shop',
        neighborhoodId: 'all',
        area: 'نمونه نمایشی',
        features: ['بسیار سبک و نیمه‌شفاف', 'ریزش آزاد', 'لطافت بالا', 'نیازمند آستر در بعضی مدل‌ها'],
        suitableFor: ['شال و روسری', 'شومیز', 'آستین پفی', 'لایه‌های لباس مجلسی'],
        originCountry: 'نمونه نمایشی',
        gsm: 65,
        width: 150,
        rollLength: 45,
        stretch: 'بدون کش',
        fabricType: 'حریر چاپی گل‌دار',
        rawMaterials: 'ترکیب الیاف در این نمونه نمایشی تأیید نشده است',
        drapeAndThickness: 'بسیار ریزش‌دار | نازک و شفاف',
        season: 'بهار و تابستان',
        shrinkage: 'شستشوی آزمایشی توصیه می‌شود',
        careInstructions: 'شستشوی دستی سرد و اتوکشی بسیار ملایم',
        minOrder: 'استعلام از فروشنده',
        pricePerMeter: 'استعلام',
        colors: ['#f8fafc', '#fbcfe8', '#bfdbfe', '#ddd6fe'],
        pattern: 'chiffon',
        imageUrl: 'https://images.pexels.com/photos/8752502/pexels-photo-8752502.jpeg?auto=compress&cs=tinysrgb&w=1400',
        videoUrl: null
    },
    {
        id: 12,
        name: 'دانتل گل‌دار مشبک',
        code: 'LC-502',
        producer: 'نمونه نمایشی نساج‌یار',
        producerType: 'shop',
        neighborhoodId: 'all',
        area: 'نمونه نمایشی',
        features: ['طرح گل‌دار مشبک', 'جزئیات ظریف', 'ظاهر رسمی و مجلسی', 'اغلب نیازمند آستر'],
        suitableFor: ['لباس شب', 'لباس عروس', 'خرج‌کار', 'آستین و یقه تزئینی'],
        originCountry: 'نمونه نمایشی',
        gsm: 95,
        width: 140,
        rollLength: 25,
        stretch: 'معمولاً بدون کش؛ مدل وابسته به بافت',
        fabricType: 'دانتل گل‌دار',
        rawMaterials: 'ترکیب الیاف در این نمونه نمایشی تأیید نشده است',
        drapeAndThickness: 'سبک و تزئینی | نازک',
        season: 'چهارفصل',
        shrinkage: 'شستشو و ثبات تزئینات باید بررسی شود',
        careInstructions: 'شستشوی دستی و خشک‌کردن مسطح',
        minOrder: 'استعلام از فروشنده',
        pricePerMeter: 'استعلام',
        colors: ['#f8fafc', '#111827', '#be123c', '#e7d5b5'],
        pattern: 'lace',
        imageUrl: 'https://images.pexels.com/photos/12715938/pexels-photo-12715938.jpeg?auto=compress&cs=tinysrgb&w=1400',
        videoUrl: null
    },
    {
        id: 13,
        name: 'فاستونی چهارخانه اسکاتلندی',
        code: 'WS-304',
        producer: 'نمونه نمایشی نساج‌یار',
        producerType: 'shop',
        neighborhoodId: 'all',
        area: 'نمونه نمایشی',
        features: ['بافت متراکم و رسمی', 'ایستایی مرتب', 'مناسب برش دقیق', 'ظاهر کلاسیک'],
        suitableFor: ['کت‌وشلوار', 'کت تک', 'دامن رسمی', 'جلیقه'],
        originCountry: 'نمونه نمایشی',
        gsm: 290,
        width: 150,
        rollLength: 40,
        stretch: 'بدون کش',
        fabricType: 'فاستونی چهارخانه (Tartan)',
        rawMaterials: 'ترکیب نمونه: الیاف پشمی و/یا مصنوعی؛ نیازمند تأیید فروشنده',
        drapeAndThickness: 'ایستایی رسمی | متوسط',
        season: 'پاییز، زمستان و بهار',
        shrinkage: 'خشکشویی و تست ثبات ابعادی توصیه می‌شود',
        careInstructions: 'خشکشویی؛ اتوکشی با بخار غیرمستقیم',
        minOrder: 'استعلام از فروشنده',
        pricePerMeter: 'استعلام',
        colors: ['#334155', '#475569', '#1f2937', '#a8a29e'],
        pattern: 'wool',
        imageUrl: 'https://images.pexels.com/photos/36605392/pexels-photo-36605392.jpeg?auto=compress&cs=tinysrgb&w=1400',
        videoUrl: null
    },
    {
        id: 14,
        name: 'نخی چاپی گل‌دار صورتی',
        code: 'CT-144',
        producer: 'نمونه نمایشی نساج‌یار',
        producerType: 'shop',
        neighborhoodId: 'all',
        area: 'نمونه نمایشی',
        features: ['سطح چاپی رنگارنگ', 'تنفس‌پذیر', 'مناسب دوخت روزمره', 'سبک و خوش‌دوخت'],
        suitableFor: ['پیراهن تابستانی', 'شومیز', 'لباس کودک', 'تونیک'],
        originCountry: 'نمونه نمایشی',
        gsm: 120,
        width: 150,
        rollLength: 45,
        stretch: 'بدون کش',
        fabricType: 'پارچه نخی چاپی',
        rawMaterials: 'نمونه پیشنهادی: ۱۰۰٪ پنبه؛ نیازمند تأیید فروشنده',
        drapeAndThickness: 'نرم و سبک | نازک تا متوسط',
        season: 'بهار و تابستان',
        shrinkage: 'آبرفت احتمالی؛ پیش‌شستشو پیشنهاد می‌شود',
        careInstructions: 'شستشو با آب سرد و شوینده ملایم',
        minOrder: 'استعلام از فروشنده',
        pricePerMeter: 'استعلام',
        colors: ['#be123c', '#1d4ed8', '#15803d', '#f59e0b'],
        pattern: 'printed',
        imageUrl: 'https://images.pexels.com/photos/16132522/pexels-photo-16132522.jpeg?auto=compress&cs=tinysrgb&w=1400',
        videoUrl: null
    },
    {
        id: 15,
        name: 'جرسی تای‌دای چندرنگ',
        code: 'JS-208',
        producer: 'نمونه نمایشی نساج‌یار',
        producerType: 'shop',
        neighborhoodId: 'all',
        area: 'نمونه نمایشی',
        features: ['بافت گردباف نرم', 'انعطاف‌پذیر', 'راحت و تنفس‌پذیر', 'مناسب لباس راحتی'],
        suitableFor: ['تیشرت', 'لباس راحتی', 'پیراهن جذب', 'لباس کودک'],
        originCountry: 'نمونه نمایشی',
        gsm: 190,
        width: 160,
        rollLength: 35,
        stretch: 'کش عرضی طبیعی',
        fabricType: 'جرسی چاپ تای‌دای',
        rawMaterials: 'نمونه پیشنهادی: پنبه؛ نیازمند تأیید فروشنده',
        drapeAndThickness: 'نرم و منعطف | متوسط',
        season: 'چهارفصل',
        shrinkage: 'پیش از برش پیش‌شستشو توصیه می‌شود',
        careInstructions: 'شستشو با آب ۳۰ درجه و خشک‌کردن در سایه',
        minOrder: 'استعلام از فروشنده',
        pricePerMeter: 'استعلام',
        colors: ['#e5e7eb', '#111827', '#1d4ed8', '#be123c'],
        pattern: 'knit',
        imageUrl: 'https://images.pexels.com/photos/2933650/pexels-photo-2933650.jpeg?auto=compress&cs=tinysrgb&w=1400',
        videoUrl: null
    },
    {
        id: 16,
        name: 'پوپلین خال‌دار سیاه‌وسفید',
        code: 'PP-118',
        producer: 'نمونه نمایشی نساج‌یار',
        producerType: 'shop',
        neighborhoodId: 'all',
        area: 'نمونه نمایشی',
        features: ['بافت ساده و منظم', 'سطح صاف', 'خنک و تنفس‌پذیر', 'مناسب دوخت تمیز'],
        suitableFor: ['پیراهن', 'شومیز', 'لباس کودک', 'ملحفه و محصولات خانگی'],
        originCountry: 'نمونه نمایشی',
        gsm: 125,
        width: 150,
        rollLength: 45,
        stretch: 'بدون کش',
        fabricType: 'پوپلین چاپ خال‌دار',
        rawMaterials: 'نمونه پیشنهادی: ۱۰۰٪ پنبه؛ نیازمند تأیید فروشنده',
        drapeAndThickness: 'ایستایی تمیز | سبک تا متوسط',
        season: 'بهار و تابستان',
        shrinkage: 'آبرفت احتمالی؛ پیش‌شستشو پیشنهاد می‌شود',
        careInstructions: 'شستشو با آب سرد تا ولرم و اتوکشی متوسط',
        minOrder: 'استعلام از فروشنده',
        pricePerMeter: 'استعلام',
        colors: ['#f8fafc', '#dbeafe', '#fef3c7', '#fecdd3'],
        pattern: 'plain',
        imageUrl: 'https://images.pexels.com/photos/4862953/pexels-photo-4862953.jpeg?auto=compress&cs=tinysrgb&w=1400',
        videoUrl: null
    },
    {
        id: 17,
        name: 'ساتن خال‌دار صورتی',
        code: 'SS-217',
        producer: 'نمونه نمایشی نساج‌یار',
        producerType: 'shop',
        neighborhoodId: 'all',
        area: 'نمونه نمایشی',
        features: ['درخشش لطیف', 'سطح نرم و لغزنده', 'ریزش زیبا', 'ظاهر مینیمال و مجلسی'],
        suitableFor: ['پیراهن', 'دامن فون', 'شومیز', 'لباس خواب'],
        originCountry: 'نمونه نمایشی',
        gsm: 115,
        width: 145,
        rollLength: 40,
        stretch: 'بدون کش',
        fabricType: 'ساتن چاپی خال‌دار',
        rawMaterials: 'ترکیب الیاف در این نمونه نمایشی تأیید نشده است',
        drapeAndThickness: 'ریزش‌دار و لطیف | سبک',
        season: 'چهارفصل',
        shrinkage: 'طبق دستور تولیدکننده شستشو شود',
        careInstructions: 'شستشوی دستی و اتوکشی از پشت با دمای کم',
        minOrder: 'استعلام از فروشنده',
        pricePerMeter: 'استعلام',
        colors: ['#f5e6d3', '#d6b59c', '#a78bfa', '#1f2937'],
        pattern: 'satin',
        imageUrl: 'https://images.pexels.com/photos/36344802/pexels-photo-36344802.jpeg?auto=compress&cs=tinysrgb&w=1400',
        videoUrl: null
    },
    {
        id: 18,
        name: 'ژاکارد طرح پیزلی رنگی',
        code: 'JC-618',
        producer: 'نمونه نمایشی نساج‌یار',
        producerType: 'shop',
        neighborhoodId: 'all',
        area: 'نمونه نمایشی',
        features: ['نقش برجسته در ساختار بافت', 'سطح تزئینی و چشم‌گیر', 'مناسب لباس رسمی', 'جزئیات بافت قابل لمس'],
        suitableFor: ['کت و دامن مجلسی', 'لباس شب', 'مانتو تشریفاتی', 'اکسسوری دکوراتیو'],
        originCountry: 'نمونه نمایشی',
        gsm: 240,
        width: 150,
        rollLength: 30,
        stretch: 'اغلب بدون کش',
        fabricType: 'ژاکارد نقش پیزلی',
        rawMaterials: 'ترکیب الیاف در این نمونه نمایشی تأیید نشده است',
        drapeAndThickness: 'ایستایی رسمی | متوسط تا ضخیم',
        season: 'پاییز، زمستان و بهار',
        shrinkage: 'خشکشویی یا تست مراقبت پیش از شستشو',
        careInstructions: 'شستشوی ملایم طبق دستور تولیدکننده؛ اتوی غیرمستقیم',
        minOrder: 'استعلام از فروشنده',
        pricePerMeter: 'استعلام',
        colors: ['#1e3a8a', '#d4af37', '#7f1d1d', '#0f766e'],
        pattern: 'jacquard',
        imageUrl: 'https://images.pexels.com/photos/16132469/pexels-photo-16132469.jpeg?auto=compress&cs=tinysrgb&w=1400',
        videoUrl: null
    }
].map((fabric) => ({
    ...fabric,
    imageUrl: nasajOptimizedFabricPhotoUrl(fabric.imageUrl, 720)
}));

// ==========================================
// ۵. لیست ۲۴ تولیدی و پارچه‌فروشی در سراسر تهران همراه با امتیاز اولیه مشتریان
// ==========================================
const RAW_PLACES = [
    {
        id: 101,
        name: 'نساجی اطلس بافت تهران',
        type: 'manufacturer',
        neighborhoodId: 'bazar',
        neighborhoodName: 'بازار بزرگ',
        lat: 35.6768,
        lng: 51.4182,
        address: 'بازار بزرگ تهران، سرای امیر، پلاک ۴۲',
        phone: '02155620011',
        specialty: 'تولید انواع کرپ، فاستونی و پارچه‌های مانتویی',
        palette: ['#1e293b', '#991b1b', '#065f46', '#d97706'],
        rating: 4.8,
        reviewCount: 42,
        sampleReview: 'کیفیت بافت کرپ مازراتی و ثبات رنگ عالی بود.'
    },
    {
        id: 102,
        name: 'تولیدی فاستونی و کتان پارس',
        type: 'manufacturer',
        neighborhoodId: 'bazar',
        neighborhoodName: 'بازار بزرگ',
        lat: 35.6745,
        lng: 51.4215,
        address: 'بازار عباس‌آباد، پاساژ المهدی، طبقه دوم',
        phone: '02155638810',
        specialty: 'بافت تخصصی کتان کش، جین و فاستونی',
        palette: ['#713f12', '#1e3a8a', '#374151', '#065f46'],
        rating: 4.6,
        reviewCount: 29,
        sampleReview: 'تحویل به‌موقع طاقه‌ها و گرماژ دقیق طبق شناسنامه.'
    },
    {
        id: 103,
        name: 'بنکداری پارچه حجاز و پسران',
        type: 'shop',
        neighborhoodId: 'bazar',
        neighborhoodName: 'بازار بزرگ',
        lat: 35.6780,
        lng: 51.4160,
        address: 'بازار کفاش‌ها، سرای مشیرخلوت، پلاک ۱۸',
        phone: '02155614490',
        specialty: 'پخش عمده چادر مشکی، حریر و ابریشم',
        palette: ['#09090b', '#334155', '#64748b', '#94a3b8'],
        rating: 4.9,
        reviewCount: 64,
        sampleReview: 'تنوع بی‌نظیر پارچه‌های مشکی و قیمت منصفانه بنکداری.'
    },
    {
        id: 104,
        name: 'گروه نساجی زرین‌تار',
        type: 'manufacturer',
        neighborhoodId: 'bazar',
        neighborhoodName: 'بازار بزرگ',
        lat: 35.6752,
        lng: 51.4150,
        address: 'پانزده خرداد، سرای شکروی، پلاک ۹',
        phone: '02155609922',
        specialty: 'تولید انواع تترون، ترگال و کج‌راه بیمارستانی',
        palette: ['#0284c7', '#10b981', '#f8fafc', '#1e40af'],
        rating: 4.5,
        reviewCount: 19,
        sampleReview: 'تترون بدون آبرفت برای تولیدی پیراهن ازشون خریدیم، راضی هستیم.'
    },
    {
        id: 105,
        name: 'بنکداری پارچه آریا',
        type: 'shop',
        neighborhoodId: 'molavi',
        neighborhoodName: 'مولوی',
        lat: 35.6685,
        lng: 51.4250,
        address: 'خیابان مولوی، نرسیده به میدان محمدیه، پلاک ۲۱۰',
        phone: '02155804422',
        specialty: 'پخش عمده لینن، نخ و پارچه‌های بهاره',
        palette: ['#d6d3d1', '#78716c', '#0369a1', '#b45309'],
        rating: 4.7,
        reviewCount: 37,
        sampleReview: 'رنگ‌بندی لینن‌هاشون همیشه کامله و ارسال سریع دارن.'
    },
    {
        id: 106,
        name: 'نساجی و رنگرزی بهارستان',
        type: 'manufacturer',
        neighborhoodId: 'molavi',
        neighborhoodName: 'مولوی',
        lat: 35.6660,
        lng: 51.4280,
        address: 'چهارراه مولوی، کوچه باغ فردوس، پلاک ۱۵',
        phone: '02155812290',
        specialty: 'تولید و تکمیل پارچه‌های نخی و ملحفه‌ای',
        palette: ['#ec4899', '#8b5cf6', '#06b6d4', '#f59e0b'],
        rating: 4.4,
        reviewCount: 15,
        sampleReview: 'رنگرزی سفارشی با تیراژ بالا رو دقیق انجام میدن.'
    },
    {
        id: 107,
        name: 'پخش پارچه پرده‌ای و دکوراتیو شوش',
        type: 'shop',
        neighborhoodId: 'molavi',
        neighborhoodName: 'مولوی',
        lat: 35.6645,
        lng: 51.4230,
        address: 'میدان محمدیه، ابتدای خیابان خیام جنوبی، پلاک ۷۴',
        phone: '02155693310',
        specialty: 'انواع حریر، مخمل کالیفرنیا و هازان پرده‌ای',
        palette: ['#92400e', '#b45309', '#fef3c7', '#475569'],
        rating: 4.6,
        reviewCount: 23,
        sampleReview: 'مخمل‌های پرده‌ای ضخیم و خوش‌دوخت دارن.'
    },
    {
        id: 108,
        name: 'کارخانه بافندگی سپهر',
        type: 'manufacturer',
        neighborhoodId: 'abdolabad',
        neighborhoodName: 'عبدل‌آباد',
        lat: 35.6350,
        lng: 51.3680,
        address: 'بازار پارچه عبدل‌آباد، خیابان احسانی، پلاک ۱۸',
        phone: '02155849900',
        specialty: 'بافت تخصصی پارچه‌های گردباف، تریکو و ورزشی',
        palette: ['#0f172a', '#2563eb', '#dc2626', '#16a34a'],
        rating: 4.8,
        reviewCount: 51,
        sampleReview: 'فلامنت لاکرادارشون کشسانی و کیفیت دوخت فوق‌العاده‌ای داره.'
    },
    {
        id: 109,
        name: 'پخش عمده پارچه مبلی البرز',
        type: 'shop',
        neighborhoodId: 'abdolabad',
        neighborhoodName: 'عبدل‌آباد',
        lat: 35.6375,
        lng: 51.3710,
        address: 'عبدل‌آباد، خیابان انقلاب، پلاک ۹۴',
        phone: '02155851140',
        specialty: 'انواع مخمل، شانل، مازراتی و پارچه‌های رومبلی',
        palette: ['#065f46', '#1e3a8a', '#7c2d12', '#d97706'],
        rating: 4.5,
        reviewCount: 28,
        sampleReview: 'کالیته رنگ پارچه‌های مبلی بسیار متنوع و به‌روزه.'
    },
    {
        id: 110,
        name: 'تولیدی و پخش پارچه نگین جنوب',
        type: 'manufacturer',
        neighborhoodId: 'abdolabad',
        neighborhoodName: 'عبدل‌آباد',
        lat: 35.6335,
        lng: 51.3655,
        address: 'شهرک شریعتی، خیابان مهران، پلاک ۳۱',
        phone: '02155862280',
        specialty: 'تولید پارچه‌های مانتویی، بابوس و شانتون',
        palette: ['#be123c', '#1d4ed8', '#047857', '#334155'],
        rating: 4.3,
        reviewCount: 14,
        sampleReview: 'قیمت مستقیم کارخانه برای تولیدی‌های مانتو بسیار به‌صرفه‌ست.'
    },
    {
        id: 111,
        name: 'بازارچه پارچه و خرج‌کار جمهوری',
        type: 'shop',
        neighborhoodId: 'jomhouri',
        neighborhoodName: 'جمهوری و ولیعصر',
        lat: 35.6982,
        lng: 51.4080,
        address: 'تقاطع جمهوری و ولیعصر، پاساژ توکل، پلاک ۱۲',
        phone: '02166403311',
        specialty: 'پارچه‌های پیراهنی، تترون، لایی و خرج‌کار تولیدی',
        palette: ['#ffffff', '#38bdf8', '#1e293b', '#94a3b8'],
        rating: 4.7,
        reviewCount: 33,
        sampleReview: 'هر نوع لایی چسب و پارچه پیراهنی بخواید یکجا پیدا میشه.'
    },
    {
        id: 112,
        name: 'دفتر فروش کارخانجات نساجی ایران‌مهر',
        type: 'manufacturer',
        neighborhoodId: 'jomhouri',
        neighborhoodName: 'جمهوری و ولیعصر',
        lat: 35.6965,
        lng: 51.4125,
        address: 'خیابان جمهوری، نرسیده به بهارستان، پلاک ۴۱۲',
        phone: '02133904455',
        specialty: 'فروش مستقیم عمده فاستونی، پشمی و پارچه کت‌وشلواری',
        palette: ['#0f172a', '#334155', '#1e3a8a', '#475569'],
        rating: 4.9,
        reviewCount: 48,
        sampleReview: 'فاستونی پشمی درجه یک با ضمانت کارخانه.'
    },
    {
        id: 113,
        name: 'گالری پارچه ابریشم ولیعصر',
        type: 'shop',
        neighborhoodId: 'jomhouri',
        neighborhoodName: 'جمهوری و ولیعصر',
        lat: 35.7010,
        lng: 51.4065,
        address: 'خیابان ولیعصر، بالاتر از چهارراه طالقانی، پلاک ۱۱۰۲',
        phone: '02166467788',
        specialty: 'ساتن آمریکایی، کرپ حریر و پارچه‌های لباس شب',
        palette: ['#9d174d', '#6d28d9', '#b45309', '#0f766e'],
        rating: 4.6,
        reviewCount: 21,
        sampleReview: 'ساتن‌های مات و براقشون برای مزون‌دوزی عالیه.'
    },
    {
        id: 114,
        name: 'سرای پارچه نگین زرتشت',
        type: 'shop',
        neighborhoodId: 'zartosht',
        neighborhoodName: 'زرتشت و کریم‌خان',
        lat: 35.7115,
        lng: 51.4090,
        address: 'خیابان ولیعصر، تقاطع زرتشت، پاساژ نگین',
        phone: '02188901122',
        specialty: 'پارچه‌های مجلسی، ژاکارد، گیپور و مزونی',
        palette: ['#4c1d95', '#be185d', '#0f766e', '#1e293b'],
        rating: 4.8,
        reviewCount: 39,
        sampleReview: 'ژاکاردهای کره‌ای بسیار خاص و باکیفیت دارن.'
    },
    {
        id: 115,
        name: 'مزون پارچه و ابریشم گاندی',
        type: 'shop',
        neighborhoodId: 'zartosht',
        neighborhoodName: 'زرتشت و کریم‌خان',
        lat: 35.7145,
        lng: 51.4135,
        address: 'خیابان کریم‌خان زند، نبش ویلا، پلاک ۸۸',
        phone: '02188805544',
        specialty: 'پارچه‌های وارداتی، پشمی فوتر و کشمیر پاییزه',
        palette: ['#78350f', '#991b1b', '#1e293b', '#d97706'],
        rating: 4.7,
        reviewCount: 26,
        sampleReview: 'فوترهای پشمی بسیار لطیف و بدون پرزدهی.'
    },
    {
        id: 116,
        name: 'سرای پارچه قائم تجریش',
        type: 'shop',
        neighborhoodId: 'tajrish',
        neighborhoodName: 'تجریش و شریعتی',
        lat: 35.8055,
        lng: 51.4285,
        address: 'میدان تجریش، مجتمع تجاری قائم، طبقه پارچه‌فروشان',
        phone: '02122714499',
        specialty: 'پارچه‌های مزونی، دانتل، لینن و ابریشم طبیعی',
        palette: ['#059669', '#0284c7', '#db2777', '#d97706'],
        rating: 4.8,
        reviewCount: 44,
        sampleReview: 'برخورد حرفه‌ای و تنوع بالای پارچه‌های ابریشمی و لینن.'
    },
    {
        id: 117,
        name: 'خانه پارچه قلهک و شریعتی',
        type: 'shop',
        neighborhoodId: 'tajrish',
        neighborhoodName: 'تجریش و شریعتی',
        lat: 35.7740,
        lng: 51.4340,
        address: 'خیابان شریعتی، بالاتر از مترو قلهک، پلاک ۱۴۲۰',
        phone: '02122603311',
        specialty: 'انواع پارچه‌های مانتویی، کتان و کشمیر',
        palette: ['#334155', '#b91c1c', '#0f766e', '#ca8a04'],
        rating: 4.5,
        reviewCount: 17,
        sampleReview: 'دسترسی راحت و کیفیت خوب پارچه‌های مانتویی.'
    },
    {
        id: 118,
        name: 'خانه پارچه شرق تهران',
        type: 'shop',
        neighborhoodId: 'tehranpars',
        neighborhoodName: 'تهرانپارس',
        lat: 35.7365,
        lng: 51.5315,
        address: 'فلکه اول تهرانپارس، خیابان امیری طائمه، پلاک ۵۵',
        phone: '02177704512',
        specialty: 'پارچه‌های مانتویی، لینن و مجلسی شرق تهران',
        palette: ['#0284c7', '#ea580c', '#16a34a', '#1e293b'],
        rating: 4.6,
        reviewCount: 31,
        sampleReview: 'بهترین انتخاب در شرق تهران برای خرید متری و طاقه‌ای.'
    },
    {
        id: 119,
        name: 'تولیدی و پخش تریکو شرق (اتحاد)',
        type: 'manufacturer',
        neighborhoodId: 'tehranpars',
        neighborhoodName: 'تهرانپارس',
        lat: 35.7430,
        lng: 51.5520,
        address: 'منطقه صنعتی اتحاد، خیابان هفتم شرقی، پلاک ۲۴',
        phone: '02177338810',
        specialty: 'تولید عمده پارچه جودون، ملانژ و ویسکوز لاکرادار',
        palette: ['#475569', '#1d4ed8', '#dc2626', '#15803d'],
        rating: 4.7,
        reviewCount: 22,
        sampleReview: 'پنبه سوپر و جودون یکدست بدون تابیدگی.'
    },
    {
        id: 120,
        name: 'بورس پارچه غرب (ستارخان)',
        type: 'shop',
        neighborhoodId: 'sadeghiyeh',
        neighborhoodName: 'صادقیه و ستارخان',
        lat: 35.7215,
        lng: 51.3360,
        address: 'فلکه دوم صادقیه، ابتدای ستارخان، مجتمع الماس غرب',
        phone: '02144208899',
        specialty: 'عرضه مستقیم پارچه‌های مزونی، پرده‌ای و خانگی',
        palette: ['#7c3aed', '#db2777', '#0284c7', '#d97706'],
        rating: 4.6,
        reviewCount: 27,
        sampleReview: 'تنوع پارچه‌های مجلسی و کتان در غرب تهران عالیه.'
    },
    {
        id: 121,
        name: 'پخش پارچه و منسوجات آریاشهر',
        type: 'shop',
        neighborhoodId: 'sadeghiyeh',
        neighborhoodName: 'صادقیه و ستارخان',
        lat: 35.7250,
        lng: 51.3310,
        address: 'بلوار فردوس شرق، نبش خیابان ولیعصر، پلاک ۶۲',
        phone: '02144081122',
        specialty: 'پارچه‌های نخی، ملحفه‌ای و کتان مانتویی',
        palette: ['#0d9488', '#2563eb', '#e11d48', '#ca8a04'],
        rating: 4.4,
        reviewCount: 16,
        sampleReview: 'پارچه‌های نخی باکیفیت و قیمت مناسب.'
    },
    {
        id: 122,
        name: 'کارخانه نساجی و گردباف آفتاب',
        type: 'manufacturer',
        neighborhoodId: 'chahardangeh',
        neighborhoodName: 'شهرک صنعتی چهاردانگه',
        lat: 35.6055,
        lng: 51.3185,
        address: 'شهرک صنعتی چهاردانگه، خیابان ۲۴ فلزتراش، پلاک ۸',
        phone: '02155246677',
        specialty: 'تولید عمده پارچه دورس، فانریپ و پنبه سوپر',
        palette: ['#18181b', '#3f6212', '#1d4ed8', '#9a3412'],
        rating: 4.9,
        reviewCount: 58,
        sampleReview: 'دورس سه نخ خارخورده فوق‌العاده باکیفیت بدون پرزدهی.'
    },
    {
        id: 123,
        name: 'مجتمع ریسندگی و بافندگی البرز بافت',
        type: 'manufacturer',
        neighborhoodId: 'chahardangeh',
        neighborhoodName: 'شهرک صنعتی چهاردانگه',
        lat: 35.6020,
        lng: 51.3240,
        address: 'چهاردانگه، خیابان هفدهم صنایع، پلاک ۴۵',
        phone: '02155259900',
        specialty: 'تولید پارچه‌های مبلی، شانل و مخمل صنعتی',
        palette: ['#78350f', '#065f46', '#1e3a8a', '#b45309'],
        rating: 4.7,
        reviewCount: 34,
        sampleReview: 'تراکم بافت بالا و ارسال منظم به کل کشور.'
    },
    {
        id: 124,
        name: 'کارخانه تکمیل و چاپ پارچه پایتخت',
        type: 'manufacturer',
        neighborhoodId: 'chahardangeh',
        neighborhoodName: 'شهرک صنعتی چهاردانگه',
        lat: 35.6085,
        lng: 51.3130,
        address: 'چهاردانگه، بلوار صنایع، کوچه دوازدهم، پلاک ۱۹',
        phone: '02155264411',
        specialty: 'چاپ دیجیتال و روتاری روی انواع پارچه نخی و کرپ',
        palette: ['#be185d', '#0284c7', '#16a34a', '#ea580c'],
        rating: 4.8,
        reviewCount: 41,
        sampleReview: 'وضوح چاپ دیجیتال روی کرپ و حریر بی‌نظیر بود.'
    }
];

const INITIAL_PLACES = RAW_PLACES.map((place) => ({
    ...place,
    userRating: null,
    reviews: [
        {
            id: `init-${place.id}`,
            author: 'خریدار عمده تاییدشده',
            stars: Math.round(place.rating),
            comment: place.sampleReview
        }
    ],
    coverImage: generatePlacePhotoDataUrl(place.type, place.palette),
    sampleThumbs: place.palette.slice(0, 3).map((c, idx) =>
        generateFabricWeaveDataUrl(c, '#ffffff', idx === 0 ? 'twill' : idx === 1 ? 'linen' : 'knit')
    )
}));

// ==========================================
// ۶. نمایشگر پارچه با چرخش مستقیم لمسی (بالا، پایین، چپ، راست)
// ==========================================
function Fabric2DViewer({ fabric, activeColor }) {
    const [mode, setMode] = useState('2d');
    const [touchMode, setTouchMode] = useState('tilt');
    const [imageFailed, setImageFailed] = useState(false);
    const [imageAttempt, setImageAttempt] = useState(0);
    const imageFallbacks = nasajFabricPhotoFallbacks(fabric.imageUrl);
    useEffect(() => { setImageFailed(false); setImageAttempt(0); }, [fabric.id, fabric.imageUrl]);

    const [scale, setScale] = useState(1.22);
    const [rotX, setRotX] = useState(0);
    const [rotY, setRotY] = useState(0);
    const [rotZ, setRotZ] = useState(0);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isInteracting, setIsInteracting] = useState(false);

    const stageRef = useRef(null);
    const lastPointer = useRef({ x: 0, y: 0 });
    const lastAngleRef = useRef(0);
    const pinchStartDist = useRef(null);
    const pinchStartScale = useRef(1.22);

    const textureSrc = fabric.imageUrl && !imageFailed
        ? (imageAttempt === 0 ? fabric.imageUrl : imageFallbacks[imageAttempt - 1])
        : generateFabricWeaveDataUrl(activeColor, '#ffffff', fabric.pattern);

    const handleReset = () => {
        setScale(1.22);
        setRotX(0);
        setRotY(0);
        setRotZ(0);
        setPosition({ x: 0, y: 0 });
    };

    const getAngleFromCenter = (clientX, clientY) => {
        if (!stageRef.current) return 0;
        const rect = stageRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
    };

    const getTouchDistance = (t1, t2) => {
        return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    };

    const handleTouchStart = (e) => {
        if (e.touches && e.touches.length === 2) {
            pinchStartDist.current = getTouchDistance(e.touches[0], e.touches[1]);
            pinchStartScale.current = scale;
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            lastPointer.current = { x: midX, y: midY };
            setIsInteracting(true);
            return;
        }

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        lastPointer.current = { x: clientX, y: clientY };
        lastAngleRef.current = getAngleFromCenter(clientX, clientY);
        pinchStartDist.current = null;
        setIsInteracting(true);
    };

    const handleTouchMove = (e) => {
        if (!isInteracting) return;

        if (e.touches && e.touches.length === 2 && pinchStartDist.current) {
            const dist = getTouchDistance(e.touches[0], e.touches[1]);
            const ratio = dist / pinchStartDist.current;
            setScale(Math.min(Math.max(0.8, pinchStartScale.current * ratio), 4.5));

            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const dx = midX - lastPointer.current.x;
            const dy = midY - lastPointer.current.y;
            lastPointer.current = { x: midX, y: midY };
            setPosition((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
            return;
        }

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const dx = clientX - lastPointer.current.x;
        const dy = clientY - lastPointer.current.y;
        lastPointer.current = { x: clientX, y: clientY };

        if (touchMode === 'tilt') {
            setRotY((prev) => Math.max(-68, Math.min(68, prev + dx * 0.55)));
            setRotX((prev) => Math.max(-68, Math.min(68, prev - dy * 0.55)));
        } else if (touchMode === 'spin') {
            const currentAngle = getAngleFromCenter(clientX, clientY);
            const deltaAngle = currentAngle - lastAngleRef.current;
            lastAngleRef.current = currentAngle;
            setRotZ((prev) => Math.round((prev + deltaAngle + 360) % 360));
        } else {
            setPosition((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        }
    };

    const handleTouchEnd = () => {
        setIsInteracting(false);
        pinchStartDist.current = null;
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.2 : 0.2;
        setScale((prev) => Math.min(Math.max(0.8, prev + delta), 4.5));
    };

    const lightX = 50 + (rotY / 68) * 40;
    const lightY = 50 - (rotX / 68) * 40;

    return (
        <div className="relative w-full h-80 bg-slate-900 overflow-hidden select-none">
            <div className="absolute top-3 right-3 z-20 flex bg-slate-950/80 backdrop-blur-md p-1 rounded-xl border border-white/15">
                <button
                    onClick={() => setMode('2d')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${mode === '2d' ? 'bg-orange-600 text-white shadow' : 'text-slate-300 hover:text-white'
                        }`}
                >
                    🔍 نمایش بافت
                </button>
                <button
                    onClick={() => setMode('video')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${mode === 'video' ? 'bg-orange-600 text-white shadow' : 'text-slate-300 hover:text-white'
                        }`}
                >
                    🎥 ویدیو ریزش پارچه
                </button>
            </div>

            {mode === '2d' ? (
                <>
                    <div
                        ref={stageRef}
                        onMouseDown={handleTouchStart}
                        onMouseMove={handleTouchMove}
                        onMouseUp={handleTouchEnd}
                        onMouseLeave={handleTouchEnd}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onDoubleClick={handleReset}
                        onWheel={handleWheel}
                        className="fabric-touch-stage w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                    >
                        <div
                            style={{
                                transform: `translate3d(${position.x}px, ${position.y}px, 0px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${scale})`,
                                transition: isInteracting ? 'none' : 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)'
                            }}
                            className="relative w-64 h-64 rounded-2xl shadow-2xl border border-white/20 overflow-hidden"
                        >
                            <img
                                src={textureSrc}
                                alt={fabric.name}
                                draggable="false"
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover"
                                onError={() => {
                                    if (imageAttempt < imageFallbacks.length) setImageAttempt(attempt => attempt + 1);
                                    else setImageFailed(true);
                                }}
                            />
                            <div
                                style={{
                                    background: `radial-gradient(circle at ${lightX}% ${lightY}%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.04) 45%, rgba(0,0,0,0.32) 100%)`
                                }}
                                className="absolute inset-0 pointer-events-none"
                            />
                        </div>
                    </div>

                    <div className="absolute top-3 left-3 z-20 bg-black/65 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-white/15 text-white text-[10px]">
                        <div className="flex items-center gap-1 mb-0.5">
                            <span>مقیاس بافت:</span>
                            <span className="font-bold text-orange-400">{(1 / scale).toFixed(1)} cm</span>
                        </div>
                        <div className="w-16 h-1.5 border-x border-b border-white/80"></div>
                    </div>

                    <div className="absolute bottom-2.5 inset-x-3 z-20 bg-slate-950/85 backdrop-blur-md p-2 rounded-2xl border border-white/15 flex flex-col gap-1.5">
                        <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-xl text-[10px] font-bold">
                            <button
                                onClick={() => setTouchMode('tilt')}
                                className={`py-1.5 rounded-lg transition ${touchMode === 'tilt' ? 'bg-orange-600 text-white shadow' : 'text-slate-300 hover:text-white'
                                    }`}
                            >
                                🔄 چرخش همه‌جهته
                            </button>
                            <button
                                onClick={() => setTouchMode('spin')}
                                className={`py-1.5 rounded-lg transition ${touchMode === 'spin' ? 'bg-orange-600 text-white shadow' : 'text-slate-300 hover:text-white'
                                    }`}
                            >
                                🔃 چرخش ۳۶۰°
                            </button>
                            <button
                                onClick={() => setTouchMode('pan')}
                                className={`py-1.5 rounded-lg transition ${touchMode === 'pan' ? 'bg-orange-600 text-white shadow' : 'text-slate-300 hover:text-white'
                                    }`}
                            >
                                ✋ جابه‌جایی بافت
                            </button>
                        </div>

                        <div className="flex items-center justify-between px-1 text-[10px] text-slate-300">
                            <span>
                                {touchMode === 'tilt' && '👆 دست را بالا، پایین، چپ یا راست بکشید'}
                                {touchMode === 'spin' && `👆 دست را دور پارچه بچرخانید (${rotZ}°)`}
                                {touchMode === 'pan' && '👆 انگشت را برای دیدن نقاط دیگر بافت بکشید'}
                            </span>

                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    onClick={() => setScale((s) => Math.max(0.8, s - 0.35))}
                                    className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 font-bold text-white text-xs"
                                >
                                    −
                                </button>
                                <span className="font-bold text-white min-w-[34px] text-center">
                                    {Math.round(scale * 100)}٪
                                </span>
                                <button
                                    onClick={() => setScale((s) => Math.min(4.5, s + 0.35))}
                                    className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 font-bold text-white text-xs"
                                >
                                    +
                                </button>
                                <button
                                    onClick={handleReset}
                                    className="bg-white/15 hover:bg-white/25 text-white px-2 py-1 rounded-lg font-bold mr-0.5"
                                >
                                    بازنشانی
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white relative">
                    {fabric.videoUrl ? (
                        <video
                            src={fabric.videoUrl}
                            controls
                            autoPlay
                            loop
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center p-6 text-center">
                            <div
                                style={{ backgroundColor: activeColor }}
                                className="w-36 h-44 rounded-2xl shadow-2xl mb-3 animate-pulse relative overflow-hidden border border-white/20"
                            >
                                <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/30"></div>
                            </div>
                            <p className="text-xs font-bold text-slate-200">پیش‌نمایش حرکت و ریزش پارچه</p>
                            <p className="text-[11px] text-slate-400 mt-1">
                                با ثبت محصول جدید از دکمه (+) می‌توانید ویدیوی واقعی MP4 آپلود کنید.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ==========================================
// ۷. کامپوننت مجله تخصصی، مقالات و اخبار صنعت پارچه
// ==========================================
function TextileMagazine({
    articles,
    fabrics,
    bookmarkedIds,
    onToggleBookmark,
    onOpenFabricById
}) {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [articleSearch, setArticleSearch] = useState('');
    const [activeArticle, setActiveArticle] = useState(null);
    const [readProgress, setReadProgress] = useState(0);
    const readerRef = useRef(null);

    const categories = [
        { id: 'all', label: 'همه مطالب' },
        { id: 'اخبار بازار نساجی', label: '📈 اخبار بازار' },
        { id: 'شناخت جنس پارچه', label: '🧵 شناخت جنس پارچه' },
        { id: 'راهنمای گرماژ و دوخت', label: '📐 گرماژ و دوخت' },
        { id: 'ترندهای ۱۴۰۵', label: '✨ ترندهای ۱۴۰۵' },
        { id: 'saved', label: `🔖 نشان‌شده‌ها (${bookmarkedIds.length})` }
    ];

    const filteredArticles = articles.filter((art) => {
        const matchCat =
            selectedCategory === 'all'
                ? true
                : selectedCategory === 'saved'
                    ? bookmarkedIds.includes(art.id)
                    : art.category === selectedCategory;

        const matchSearch =
            art.title.includes(articleSearch) ||
            art.subtitle.includes(articleSearch) ||
            art.category.includes(articleSearch);

        return matchCat && matchSearch;
    });

    const featuredArticle = articles.find((a) => a.featured) || articles[0];

    const handleReaderScroll = () => {
        if (!readerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = readerRef.current;
        const totalScrollable = scrollHeight - clientHeight;
        if (totalScrollable <= 0) {
            setReadProgress(100);
            return;
        }
        setReadProgress(Math.min(100, Math.round((scrollTop / totalScrollable) * 100)));
    };

    // نمای مطالعه کامل یک مقاله
    if (activeArticle) {
        const isBookmarked = bookmarkedIds.includes(activeArticle.id);
        const relatedFabric = fabrics.find((f) => f.id === activeArticle.relatedFabricId);

        return (
            <div className="h-full flex flex-col bg-white relative animate-fade-in">
                {/* نوار پیشرفت مطالعه در بالاترین نقطه */}
                <div className="w-full h-1 bg-slate-100 shrink-0">
                    <div
                        style={{ width: `${readProgress}%` }}
                        className="h-full bg-orange-600 transition-all duration-150"
                    />
                </div>

                {/* نوار ابزار بالای مقاله */}
                <div className="px-4 py-2.5 bg-white/95 backdrop-blur border-b border-slate-100 flex items-center justify-between shrink-0">
                    <button
                        onClick={() => {
                            setActiveArticle(null);
                            setReadProgress(0);
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-orange-600 transition"
                    >
                        <span>→</span>
                        <span>بازگشت به مجله</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-medium">{activeArticle.readTime}</span>
                        <button
                            onClick={() => onToggleBookmark(activeArticle.id)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition ${isBookmarked
                                ? 'bg-amber-50 text-amber-700 border-amber-300'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}
                        >
                            {isBookmarked ? '🔖 ذخیره شد' : '🔖 ذخیره مقاله'}
                        </button>
                    </div>
                </div>

                {/* متن کامل و صفحه‌آرایی ادیتوریال مقاله */}
                <div
                    ref={readerRef}
                    onScroll={handleReaderScroll}
                    className="flex-1 overflow-y-auto pb-24 no-scrollbar"
                >
                    {/* تصویر کاور ادیتوریال */}
                    <div className="relative h-48 w-full bg-slate-900">
                        <img
                            src={activeArticle.coverImage}
                            alt={activeArticle.title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                        <div className="absolute bottom-3.5 right-4 left-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-black mb-2 ${activeArticle.badgeColor}`}>
                                {activeArticle.category}
                            </span>
                            <h1 className="text-white font-black text-base leading-relaxed">
                                {activeArticle.title}
                            </h1>
                        </div>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* مشخصات نویسنده و تاریخ انتشار */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-black text-xs">
                                    ن
                                </div>
                                <div>
                                    <span className="font-bold text-slate-800 block">{activeArticle.author}</span>
                                    <span className="text-[10px] text-slate-400">منتشر شده در {activeArticle.date}</span>
                                </div>
                            </div>
                            <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold text-[10px]">
                                ⏱ {activeArticle.readTime}
                            </span>
                        </div>

                        {/* چکیده / لید مقاله */}
                        <p className="text-xs font-bold text-slate-700 bg-slate-50 p-3.5 rounded-2xl border-r-4 border-orange-600 leading-relaxed">
                            {activeArticle.subtitle}
                        </p>

                        {/* بخش‌های محتوایی مقاله */}
                        <div className="space-y-4">
                            {activeArticle.sections.map((sec, idx) => (
                                <div key={idx} className="space-y-1.5">
                                    <h2 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                                        <span className="w-1.5 h-4 bg-slate-900 rounded-full inline-block" />
                                        <span>{sec.heading}</span>
                                    </h2>
                                    <p className="article-prose text-xs text-slate-700 whitespace-pre-line">
                                        {sec.body}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* باکس نکته طلایی خریداران و تولیدی‌ها */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-2xl shadow-lg border border-slate-700">
                            <div className="flex items-center gap-1.5 text-amber-400 font-black text-xs mb-1.5">
                                <span>💡</span>
                                <span>نکته طلایی کارشناسان نساج‌یار</span>
                            </div>
                            <p className="text-xs text-slate-200 leading-relaxed">
                                {activeArticle.goldenTip}
                            </p>
                        </div>

                        {/* کارت اتصال مستقیم به پارچه مرتبط در ویترین */}
                        {relatedFabric && (
                            <div className="bg-orange-50/80 border border-orange-200 rounded-2xl p-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                    <img
                                        src={
                                            relatedFabric.imageUrl ||
                                            generateFabricWeaveDataUrl(relatedFabric.colors[0], '#ffffff', relatedFabric.pattern)
                                        }
                                        alt={relatedFabric.name}
                                        className="w-12 h-12 rounded-xl object-cover border border-white shadow-sm shrink-0"
                                    />
                                    <div>
                                        <span className="text-[10px] font-bold text-orange-700 block">
                                            بررسی بافت این پارچه:
                                        </span>
                                        <h4 className="font-black text-xs text-slate-900">{relatedFabric.name}</h4>
                                        <span className="text-[10px] text-slate-500">
                                            {relatedFabric.gsm} گرم | {relatedFabric.originCountry}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onOpenFabricById(relatedFabric.id)}
                                    className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap shadow-sm transition"
                                >
                                    مشاهده بافت ←
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // نمای فهرست اصلی مجله و اخبار نساجی
    return (
        <div className="h-full overflow-y-auto pb-24 no-scrollbar bg-slate-50">
            {/* هدر ادیتوریال بالای صفحه */}
            <div className="bg-white px-4 pt-3.5 pb-3 border-b border-slate-200">
                <div className="flex items-center justify-between mb-2.5">
                    <div>
                        <h2 className="font-black text-base text-slate-900 tracking-tight">
                            مجله و اخبار تخصصی نساجی
                        </h2>
                        <p className="text-[11px] text-slate-500">
                            دانشنامه شناخت جنس پارچه، تحلیل بازار تهران و راهنمای دوخت
                        </p>
                    </div>
                    <span className="bg-slate-900 text-amber-400 text-[10px] font-black px-2.5 py-1 rounded-xl">
                        نساج‌یار مگ
                    </span>
                </div>

                {/* جستجو در مقالات */}
                <input
                    type="text"
                    placeholder="جستجو در مقالات (کرپ، گرماژ، آبرفت، بازار تهران...)"
                    value={articleSearch}
                    onChange={(e) => setArticleSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3.5 text-xs focus:outline-none focus:border-slate-900 mb-2.5"
                />

                {/* تب‌های دسته‌بندی موضوعی */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition ${selectedCategory === cat.id
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-3.5 space-y-4">
                {/* کارت بزرگ سرمقاله ویژه (فقط در حالت نمایش همه و بدون سرچ) */}
                {selectedCategory === 'all' && !articleSearch && featuredArticle && (
                    <div
                        onClick={() => setActiveArticle(featuredArticle)}
                        className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-slate-900 cursor-pointer group"
                    >
                        <img
                            src={featuredArticle.coverImage}
                            alt={featuredArticle.title}
                            className="w-full h-48 object-cover opacity-90 group-hover:scale-105 transition duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-transparent" />

                        <div className="absolute top-3 right-3 left-3 flex justify-between items-center">
                            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-lg shadow">
                                🔥 خبر ویژه بازار نساجی
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleBookmark(featuredArticle.id);
                                }}
                                className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center text-xs hover:bg-black"
                            >
                                {bookmarkedIds.includes(featuredArticle.id) ? '🔖' : '🤍'}
                            </button>
                        </div>

                        <div className="absolute bottom-3.5 right-4 left-4 text-white">
                            <h3 className="font-black text-sm leading-snug mb-1.5">
                                {featuredArticle.title}
                            </h3>
                            <div className="flex items-center justify-between text-[10px] text-slate-300">
                                <span>{featuredArticle.date} • {featuredArticle.readTime}</span>
                                <span className="text-amber-400 font-bold">مطالعه گزارش ←</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* لیست کارت‌های مقالات و راهنماهای پارچه */}
                <div className="space-y-3">
                    {filteredArticles.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
                            <p className="text-xs font-bold text-slate-600">مقاله‌ای با این مشخصات پیدا نشد.</p>
                        </div>
                    ) : (
                        filteredArticles.map((article) => {
                            const isSaved = bookmarkedIds.includes(article.id);
                            return (
                                <div
                                    key={article.id}
                                    onClick={() => setActiveArticle(article)}
                                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition cursor-pointer flex flex-col"
                                >
                                    <div className="flex">
                                        <div className="w-28 h-28 shrink-0 bg-slate-900 relative">
                                            <img
                                                src={article.coverImage}
                                                alt={article.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        <div className="p-3 flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center justify-between gap-1 mb-1">
                                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black ${article.badgeColor}`}>
                                                        {article.category}
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onToggleBookmark(article.id);
                                                        }}
                                                        className="text-xs text-slate-400 hover:text-amber-600 px-1"
                                                        title="ذخیره مقاله"
                                                    >
                                                        {isSaved ? '🔖' : '☆'}
                                                    </button>
                                                </div>

                                                <h3 className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                                                    {article.title}
                                                </h3>
                                            </div>

                                            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-1.5 border-t border-slate-100">
                                                <span>⏱ {article.readTime}</span>
                                                <span className="font-bold text-orange-600">خواندن مقاله ←</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

// ==========================================
// ۸. کامپوننت نقشه تهران همراه با سیستم امتیازدهی ستاره‌ای به فروشگاه‌ها و تولیدی‌ها
// ==========================================
const STAR_LABELS = {
    1: 'ضعیف',
    2: 'متوسط',
    3: 'خوب',
    4: 'بسیار خوب',
    5: 'عالی و حرفه‌ای'
};

function TehranMap({ places, onRatePlace, onViewProducerFabrics }) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const tileLayerRef = useRef(null);
    const markersLayerRef = useRef(null);
    const zoneLayerRef = useRef(null);

    const [selectedNeighborhood, setSelectedNeighborhood] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [sortByRating, setSortByRating] = useState(false);
    const [mapStyle, setMapStyle] = useState('street');
    const [selectedPinId, setSelectedPinId] = useState(null);

    const [hoverStar, setHoverStar] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [ratingToast, setRatingToast] = useState(false);

    const selectedPin = places.find((p) => p.id === selectedPinId) || null;

    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: [35.6950, 51.4000],
            zoom: 11,
            zoomControl: false
        });

        const baseVectorGroup = L.layerGroup().addTo(map);

        L.polygon(TEHRAN_CITY_BOUNDARY, {
            color: '#94a3b8',
            weight: 1.5,
            dashArray: '5, 5',
            fillColor: '#ffffff',
            fillOpacity: 0.45
        }).addTo(baseVectorGroup);

        TEHRAN_MAJOR_ROADS.forEach((road) => {
            L.polyline(road.coords, {
                color: '#cbd5e1',
                weight: 3.5,
                opacity: 0.9
            }).addTo(baseVectorGroup);
        });

        TEHRAN_NEIGHBORHOODS.filter((h) => h.id !== 'all').forEach((hood) => {
            const labelIcon = L.divIcon({
                className: '',
                html: `<div class="tehran-hood-label">${hood.name}</div>`,
                iconSize: [90, 22],
                iconAnchor: [45, -18]
            });
            L.marker([hood.lat, hood.lng], { icon: labelIcon, interactive: false }).addTo(baseVectorGroup);
        });

        zoneLayerRef.current = L.layerGroup().addTo(map);
        markersLayerRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;

        const resizeObserver = new ResizeObserver(() => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.invalidateSize();
            }
        });
        resizeObserver.observe(mapContainerRef.current);

        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 120);

        return () => {
            clearTimeout(timer);
            resizeObserver.disconnect();
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (tileLayerRef.current) {
            map.removeLayer(tileLayerRef.current);
            tileLayerRef.current = null;
        }

        if (mapStyle === 'vector') {
            map.invalidateSize();
            return;
        }

        const tileUrl =
            mapStyle === 'satellite'
                ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

        const layer = L.tileLayer(tileUrl, {
            maxZoom: 19,
            crossOrigin: true
        });

        layer.addTo(map);
        tileLayerRef.current = layer;
        map.invalidateSize();
    }, [mapStyle]);

    const handleSelectNeighborhood = (hoodId) => {
        setSelectedNeighborhood(hoodId);
        setSelectedPinId(null);

        const hood = TEHRAN_NEIGHBORHOODS.find((h) => h.id === hoodId);
        if (!hood || !mapInstanceRef.current || !zoneLayerRef.current) return;

        zoneLayerRef.current.clearLayers();
        mapInstanceRef.current.flyTo([hood.lat, hood.lng], hood.zoom, { duration: 0.9 });

        if (hood.id !== 'all' && hood.radius > 0) {
            L.circle([hood.lat, hood.lng], {
                radius: hood.radius,
                color: '#ea580c',
                weight: 2,
                fillColor: '#ea580c',
                fillOpacity: 0.12
            }).addTo(zoneLayerRef.current);
        }
    };

    const visiblePlaces = places
        .filter((p) => {
            const matchHood = selectedNeighborhood === 'all' ? true : p.neighborhoodId === selectedNeighborhood;
            const matchType = filterType === 'all' ? true : p.type === filterType;
            return matchHood && matchType;
        })
        .sort((a, b) => (sortByRating ? b.rating - a.rating : 0));

    useEffect(() => {
        if (!mapInstanceRef.current || !markersLayerRef.current) return;
        markersLayerRef.current.clearLayers();

        visiblePlaces.forEach((place) => {
            const isManufacturer = place.type === 'manufacturer';
            const isActive = selectedPin && selectedPin.id === place.id;

            const customIcon = L.divIcon({
                className: '',
                html: `
          <div class="custom-map-pin ${isActive ? 'active-pin' : ''}" style="
            width: 38px;
            height: 38px;
            background-color: ${isManufacturer ? '#0f172a' : '#ea580c'};
            font-size: 18px;
            position: relative;
          ">
            ${isManufacturer ? '🏭' : '🏪'}
            <span style="
              position: absolute;
              bottom: -6px;
              background: #f59e0b;
              color: #0f172a;
              font-family: Vazirmatn, sans-serif;
              font-size: 9px;
              font-weight: 800;
              padding: 0 4px;
              border-radius: 6px;
              border: 1px solid #fff;
              line-height: 13px;
            ">★${place.rating.toFixed(1)}</span>
          </div>
        `,
                iconSize: [38, 38],
                iconAnchor: [19, 19]
            });

            const marker = L.marker([place.lat, place.lng], { icon: customIcon });
            marker.on('click', () => {
                setSelectedPinId(place.id);
                setHoverStar(0);
                setReviewText('');
                mapInstanceRef.current.flyTo([place.lat, place.lng], 15, { duration: 0.7 });
            });

            markersLayerRef.current.addLayer(marker);
        });
    }, [visiblePlaces, selectedPin]);

    const handleStarClick = (stars) => {
        if (!selectedPin) return;
        onRatePlace(selectedPin.id, stars, reviewText.trim());
        setRatingToast(true);
        setTimeout(() => setRatingToast(false), 2500);
    };

    const handleCommentSubmit = (e) => {
        e.preventDefault();
        if (!selectedPin || !reviewText.trim()) return;
        const starsToSubmit = selectedPin.userRating || 5;
        onRatePlace(selectedPin.id, starsToSubmit, reviewText.trim());
        setReviewText('');
        setRatingToast(true);
        setTimeout(() => setRatingToast(false), 2500);
    };

    const currentHoodObj = TEHRAN_NEIGHBORHOODS.find((h) => h.id === selectedNeighborhood);

    return (
        <div className="relative w-full h-full flex flex-col">
            <div className="bg-white border-b border-slate-200 px-3 py-2.5 z-[500] shadow-sm shrink-0">
                <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">📍 محله شما:</span>
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                        {TEHRAN_NEIGHBORHOODS.map((hood) => (
                            <button
                                key={hood.id}
                                onClick={() => handleSelectNeighborhood(hood.id)}
                                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition ${selectedNeighborhood === hood.id
                                    ? 'bg-orange-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                            >
                                {hood.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-1.5">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold transition ${filterType === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                    >
                        همه ({visiblePlaces.length})
                    </button>
                    <button
                        onClick={() => setFilterType('manufacturer')}
                        className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold transition ${filterType === 'manufacturer' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                    >
                        🏭 تولیدکنندگان ({visiblePlaces.filter((p) => p.type === 'manufacturer').length})
                    </button>
                    <button
                        onClick={() => setFilterType('shop')}
                        className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold transition ${filterType === 'shop' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                    >
                        🏪 پارچه‌فروشی‌ها ({visiblePlaces.filter((p) => p.type === 'shop').length})
                    </button>
                </div>
            </div>

            <div className="relative flex-1 min-h-0 w-full">
                <div id="tehran-map-canvas" ref={mapContainerRef} />

                <div className="absolute top-3 left-3 z-[500] flex flex-col gap-1.5">
                    <button
                        onClick={() => mapInstanceRef.current?.zoomIn()}
                        className="w-8 h-8 bg-white/95 backdrop-blur rounded-xl shadow border border-slate-200 font-black text-slate-800 hover:bg-slate-100"
                    >
                        +
                    </button>
                    <button
                        onClick={() => mapInstanceRef.current?.zoomOut()}
                        className="w-8 h-8 bg-white/95 backdrop-blur rounded-xl shadow border border-slate-200 font-black text-slate-800 hover:bg-slate-100"
                    >
                        −
                    </button>
                    <button
                        onClick={() => handleSelectNeighborhood('all')}
                        className="w-8 h-8 bg-white/95 backdrop-blur rounded-xl shadow border border-slate-200 text-xs hover:bg-slate-100"
                    >
                        🎯
                    </button>
                </div>

                <div className="absolute top-3 right-3 z-[500] flex bg-white/95 backdrop-blur p-1 rounded-xl shadow border border-slate-200 text-[10px] font-bold">
                    <button
                        onClick={() => setMapStyle('street')}
                        className={`px-2 py-1 rounded-lg transition ${mapStyle === 'street' ? 'bg-slate-900 text-white' : 'text-slate-600'
                            }`}
                    >
                        خیابانی
                    </button>
                    <button
                        onClick={() => setMapStyle('satellite')}
                        className={`px-2 py-1 rounded-lg transition ${mapStyle === 'satellite' ? 'bg-slate-900 text-white' : 'text-slate-600'
                            }`}
                    >
                        ماهواره
                    </button>
                    <button
                        onClick={() => setMapStyle('vector')}
                        className={`px-2 py-1 rounded-lg transition ${mapStyle === 'vector' ? 'bg-orange-600 text-white' : 'text-slate-600'
                            }`}
                    >
                        برداری تهران
                    </button>
                </div>

                {!selectedPin && visiblePlaces.length > 0 && (
                    <div className="absolute bottom-3 inset-x-3 z-[500]">
                        <div className="bg-slate-900/95 backdrop-blur-md text-white text-[11px] px-3 py-1.5 rounded-t-2xl flex justify-between items-center">
                            <span>
                                مراکز <b className="text-orange-400">{currentHoodObj?.name}</b> ({visiblePlaces.length})
                            </span>
                            <button
                                onClick={() => setSortByRating((s) => !s)}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${sortByRating
                                    ? 'bg-amber-400 text-slate-950'
                                    : 'bg-white/15 text-slate-200 hover:bg-white/25'
                                    }`}
                            >
                                {sortByRating ? '⭐ مرتب‌شده: برترین‌ها' : '⭐ مرتب‌سازی امتیاز'}
                            </button>
                        </div>

                        <div className="flex gap-2.5 overflow-x-auto no-scrollbar bg-white/95 backdrop-blur-md p-2.5 rounded-b-2xl shadow-xl border border-slate-200">
                            {visiblePlaces.map((place) => (
                                <div
                                    key={place.id}
                                    onClick={() => {
                                        setSelectedPinId(place.id);
                                        setHoverStar(0);
                                        setReviewText('');
                                        mapInstanceRef.current?.flyTo([place.lat, place.lng], 15, { duration: 0.7 });
                                    }}
                                    className="w-[210px] bg-white hover:bg-orange-50/60 border border-slate-200 rounded-xl overflow-hidden shadow-sm cursor-pointer transition shrink-0 flex flex-col"
                                >
                                    <div className="relative h-20 w-full bg-slate-200">
                                        <img
                                            src={place.coverImage}
                                            alt={place.name}
                                            className="w-full h-full object-cover"
                                        />
                                        <span
                                            className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white shadow ${place.type === 'manufacturer' ? 'bg-slate-900/90' : 'bg-orange-600/90'
                                                }`}
                                        >
                                            {place.type === 'manufacturer' ? '🏭 تولیدی' : '🏪 فروشگاه'}
                                        </span>

                                        <span className="absolute top-1.5 left-1.5 bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-md shadow flex items-center gap-0.5">
                                            <span>★</span>
                                            <span>{place.rating.toFixed(1)}</span>
                                            <span className="text-[8px] font-normal text-slate-800">({place.reviewCount})</span>
                                        </span>

                                        <span className="absolute bottom-1.5 left-1.5 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded">
                                            {place.neighborhoodName}
                                        </span>
                                    </div>

                                    <div className="p-2">
                                        <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{place.name}</h4>
                                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{place.specialty}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {selectedPin && (
                    <div className="absolute bottom-2.5 inset-x-3 z-[500] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200 animate-fade-in max-h-[78%] flex flex-col">
                        <div className="relative h-24 w-full bg-slate-900 shrink-0">
                            <img
                                src={selectedPin.coverImage}
                                alt={selectedPin.name}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>

                            <button
                                onClick={() => setSelectedPinId(null)}
                                className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/60 text-white hover:bg-black flex items-center justify-center text-base font-bold"
                            >
                                ×
                            </button>

                            <div className="absolute bottom-2 right-3 left-3 text-white flex justify-between items-end">
                                <div>
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <span
                                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${selectedPin.type === 'manufacturer' ? 'bg-slate-900 border border-white/20' : 'bg-orange-600'
                                                }`}
                                        >
                                            {selectedPin.type === 'manufacturer' ? '🏭 تولیدکننده' : '🏪 پارچه‌فروشی'}
                                        </span>
                                        <span className="text-[10px] bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-md">
                                            📍 {selectedPin.neighborhoodName}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-sm leading-snug">{selectedPin.name}</h3>
                                </div>

                                <div className="bg-amber-400 text-slate-950 px-2.5 py-1 rounded-xl text-center shadow">
                                    <div className="font-black text-xs leading-none flex items-center gap-0.5">
                                        <span>★</span>
                                        <span>{selectedPin.rating.toFixed(1)}</span>
                                    </div>
                                    <span className="text-[9px] font-bold block mt-0.5">{selectedPin.reviewCount} رای</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-3 overflow-y-auto no-scrollbar space-y-2.5">
                            <div>
                                <p className="text-xs text-slate-700 font-medium">{selectedPin.specialty}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">🏠 {selectedPin.address}</p>
                            </div>

                            <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-800">
                                        {selectedPin.userRating
                                            ? `✅ امتیاز ثبت‌شده شما: ${selectedPin.userRating} ستاره`
                                            : '⭐ به این مجموعه امتیاز دهید:'}
                                    </span>
                                    <span className="text-[10px] font-bold text-amber-700">
                                        {STAR_LABELS[hoverStar || selectedPin.userRating || 0] || 'ستاره را لمس کنید'}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between mt-1.5">
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => {
                                            const activeScore = hoverStar || selectedPin.userRating || 0;
                                            const isFilled = star <= activeScore;
                                            return (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onMouseEnter={() => setHoverStar(star)}
                                                    onMouseLeave={() => setHoverStar(0)}
                                                    onClick={() => handleStarClick(star)}
                                                    className={`text-2xl leading-none transition-transform hover:scale-125 active:scale-95 ${isFilled ? 'text-amber-400 drop-shadow-xs' : 'text-slate-300'
                                                        }`}
                                                    title={`${star} ستاره - ${STAR_LABELS[star]}`}
                                                >
                                                    ★
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {ratingToast && (
                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg animate-fade-in">
                                            امتیاز شما ثبت شد!
                                        </span>
                                    )}
                                </div>

                                <form onSubmit={handleCommentSubmit} className="flex gap-1.5 mt-2">
                                    <input
                                        type="text"
                                        placeholder="تجربه خرید یا کیفیت پارچه را بنویسید (اختیاری)..."
                                        value={reviewText}
                                        onChange={(e) => setReviewText(e.target.value)}
                                        className="flex-1 bg-white border border-amber-200 rounded-lg px-2.5 py-1.5 text-[10px] focus:outline-none focus:border-amber-500"
                                    />
                                    <button
                                        type="submit"
                                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1.5 rounded-lg text-[10px] whitespace-nowrap transition"
                                    >
                                        ثبت نظر
                                    </button>
                                </form>

                                {selectedPin.reviews && selectedPin.reviews.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-amber-200/70 space-y-1">
                                        {selectedPin.reviews.slice(0, 2).map((rev) => (
                                            <div key={rev.id} className="text-[10px] text-slate-700 flex items-start justify-between gap-2">
                                                <span className="line-clamp-1">
                                                    <b className="text-slate-900">{rev.author}:</b> {rev.comment}
                                                </span>
                                                <span className="text-amber-600 font-bold whitespace-nowrap shrink-0">
                                                    ★{rev.stars}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedPin.sampleThumbs && selectedPin.sampleThumbs.length > 0 && (
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 block mb-1">
                                        نمونه بافت‌های موجود:
                                    </span>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {selectedPin.sampleThumbs.map((imgSrc, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => onViewProducerFabrics(selectedPin.name)}
                                                className="h-11 rounded-lg overflow-hidden border border-slate-200 cursor-pointer relative group"
                                            >
                                                <img src={imgSrc} alt="نمونه پارچه" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition flex items-center justify-center">
                                                    <span className="text-[9px] text-white opacity-0 group-hover:opacity-100 font-bold">
                                                        بررسی ۲D
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-1.5 pt-1">
                                <button
                                    onClick={() => onViewProducerFabrics(selectedPin.name)}
                                    className="flex-1 bg-orange-600 text-white text-center py-2 rounded-xl text-[11px] font-bold hover:bg-orange-700"
                                >
                                    🧵 مشاهده پارچه‌ها
                                </button>
                                <a
                                    href={`tel:${selectedPin.phone}`}
                                    className="flex-1 bg-slate-900 text-white text-center py-2 rounded-xl text-[11px] font-bold hover:bg-slate-800"
                                >
                                    📞 تماس
                                </a>
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPin.lat},${selectedPin.lng}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-1 bg-slate-100 text-slate-800 border border-slate-200 text-center py-2 rounded-xl text-[11px] font-bold hover:bg-slate-200"
                                >
                                    🧭 مسیریابی
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ==========================================
// ۹. فرم جامع ثبت پارچه جدید توسط تولیدکننده
// ==========================================
const PRESET_FEATURES = [
    'ضدچروک',
    'ریزش‌دار و لخت',
    'تنفس‌پذیر و خنک',
    'بدون آبرفت',
    'عدم پرزدهی',
    'ضدتعریق',
    'ایستایی آهاردار',
    'بدون سایه‌انداختن'
];

const PRESET_GARMENTS = [
    'مانتو',
    'شلوار',
    'کت‌وشلوار',
    'لباس مجلسی',
    'شومیز و پیراهن',
    'هودی و دورس',
    'لباس ورزشی',
    'پالتو و بارانی'
];

function AddFabricForm({ onAddSuccess, onCancel }) {
    const [name, setName] = useState('');
    const [fabricType, setFabricType] = useState('');
    const [rawMaterials, setRawMaterials] = useState('');
    const [originCountry, setOriginCountry] = useState('🇮🇷 ایران (تولید تهران)');
    const [producer, setProducer] = useState('');
    const [producerType, setProducerType] = useState('manufacturer');
    const [gsm, setGsm] = useState('260');
    const [width, setWidth] = useState('150');
    const [rollLength, setRollLength] = useState('45');
    const [stretch, setStretch] = useState('کش از عرض');
    const [selectedFeatures, setSelectedFeatures] = useState(['ضدچروک', 'بدون آبرفت']);
    const [selectedGarments, setSelectedGarments] = useState(['مانتو', 'شلوار']);
    const [drapeAndThickness, setDrapeAndThickness] = useState('ریزش‌دار و خوش‌فرم | ضخامت متوسط');
    const [season, setSeason] = useState('چهارفصل');
    const [shrinkage, setShrinkage] = useState('تکمیل‌شده (بدون آبرفت)');
    const [careInstructions, setCareInstructions] = useState('شستشو با آب ۳۰ درجه، اتوکشی با بخار ملایم');
    const [minOrder, setMinOrder] = useState('۱ طاقه (۴۵ متر)');
    const [price, setPrice] = useState('');
    const [discountPercent, setDiscountPercent] = useState('0');
    const [discountEndDate, setDiscountEndDate] = useState('');
    const [color, setColor] = useState('#1e3a8a');
    const [hub, setHub] = useState('bazar');
    const [imageUrl, setImageUrl] = useState(null);
    const [videoUrl, setVideoUrl] = useState(null);

    const toggleTag = (list, setList, item) => {
        if (list.includes(item)) {
            setList(list.filter((i) => i !== item));
        } else {
            setList([...list, item]);
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) setImageUrl(URL.createObjectURL(file));
    };

    const handleVideoUpload = (e) => {
        const file = e.target.files[0];
        if (file) setVideoUrl(URL.createObjectURL(file));
    };

    const calculatedWeightPerMeter = Math.round((Number(gsm || 0) * Number(width || 0)) / 100);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name || !producer) return alert('لطفاً نام پارچه و نام تولیدی/فروشگاه را وارد کنید.');

        const selectedHood = TEHRAN_NEIGHBORHOODS.find((h) => h.id === hub) || TEHRAN_NEIGHBORHOODS[1];
        const lat = selectedHood.lat + (Math.random() - 0.5) * 0.006;
        const lng = selectedHood.lng + (Math.random() - 0.5) * 0.006;

        const generatedCover =
            imageUrl || generatePlacePhotoDataUrl(producerType, [color, '#334155', '#ea580c', '#0f766e']);

        const newFabric = {
            id: Date.now(),
            name,
            code: 'NEW-' + Math.floor(100 + Math.random() * 900),
            producer,
            producerType,
            neighborhoodId: selectedHood.id,
            area: selectedHood.name,
            features: selectedFeatures.length > 0 ? selectedFeatures : ['کیفیت بافت تضمینی'],
            suitableFor: selectedGarments.length > 0 ? selectedGarments : ['انواع پوشاک'],
            originCountry,
            gsm: Number(gsm),
            width: Number(width),
            rollLength: Number(rollLength),
            stretch,
            fabricType: fabricType || name,
            rawMaterials: rawMaterials || 'الیاف ترکیبی پنبه و پلی‌استر',
            drapeAndThickness,
            season,
            shrinkage,
            careInstructions,
            minOrder,
            pricePerMeter: price ? `${price} تومان` : 'تماس بگیرید',
            discountPercent: Math.min(90, Math.max(0, Number(discountPercent) || 0)),
            discountEndDate: discountEndDate || '',
            colors: [color, '#334155', '#b91c1c'],
            pattern: 'twill',
            imageUrl,
            videoUrl
        };

        const newPlace = {
            id: Date.now() + 1,
            name: producer,
            type: producerType,
            neighborhoodId: selectedHood.id,
            neighborhoodName: selectedHood.name,
            lat,
            lng,
            address: `تهران، محله ${selectedHood.name}`,
            phone: '02155000000',
            specialty: `عرضه‌کننده ${name} (${gsm} گرم)`,
            rating: 5.0,
            reviewCount: 1,
            userRating: null,
            reviews: [
                {
                    id: `new-${Date.now()}`,
                    author: 'ثبت جدید در نساج‌یار',
                    stars: 5,
                    comment: `تولید و عرضه مستقیم ${name} با تضمین کیفیت`
                }
            ],
            coverImage: generatedCover,
            sampleThumbs: [
                imageUrl || generateFabricWeaveDataUrl(color, '#ffffff', 'twill'),
                generateFabricWeaveDataUrl('#334155', '#ffffff', 'linen'),
                generateFabricWeaveDataUrl('#b91c1c', '#ffffff', 'knit')
            ]
        };

        onAddSuccess(newFabric, newPlace);
    };

    return (
        <div className="p-4 pb-24 overflow-y-auto h-full no-scrollbar bg-slate-50">
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-base text-slate-900">➕ ثبت پارچه و تکمیل شناسنامه فنی</h2>
                <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-800">انصراف</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-2.5">
                    <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-slate-300 rounded-2xl bg-white cursor-pointer hover:border-orange-500 overflow-hidden relative">
                        {imageUrl ? (
                            <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
                        ) : (
                            <>
                                <span className="text-2xl mb-1">📸</span>
                                <span className="font-bold text-slate-700">آپلود عکس بافت</span>
                                <span className="text-[10px] text-slate-400">نمای نزدیک تار و پود</span>
                            </>
                        )}
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>

                    <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-slate-300 rounded-2xl bg-white cursor-pointer hover:border-orange-500 overflow-hidden relative">
                        {videoUrl ? (
                            <div className="text-center p-2">
                                <span className="text-2xl">✅</span>
                                <p className="font-bold text-emerald-700 mt-1">ویدیو انتخاب شد</p>
                            </div>
                        ) : (
                            <>
                                <span className="text-2xl mb-1">🎥</span>
                                <span className="font-bold text-slate-700">آپلود ویدیو پارچه</span>
                                <span className="text-[10px] text-slate-400">نمایش ریزش و ضخامت</span>
                            </>
                        )}
                        <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                    </label>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-3">
                    <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-1.5">۱. معرفی و کشور تولیدکننده</h3>
                    <div>
                        <label className="block font-bold text-slate-700 mb-1">نام پارچه *</label>
                        <input
                            type="text"
                            placeholder="مثلاً: کرپ باربی درجه یک"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">جنس پارچه</label>
                            <input
                                type="text"
                                placeholder="مثلاً: کرپ، کتان، مخمل..."
                                value={fabricType}
                                onChange={(e) => setFabricType(e.target.value)}
                                className="w-full p-2.5 rounded-xl border border-slate-200"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">تولید کدام کشور است؟</label>
                            <select
                                value={originCountry}
                                onChange={(e) => setOriginCountry(e.target.value)}
                                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                            >
                                <option value="🇮🇷 ایران (تولید تهران)">🇮🇷 ایران (تهران)</option>
                                <option value="🇮🇷 ایران (نساجی یزد / اصفهان)">🇮🇷 ایران (یزد / اصفهان)</option>
                                <option value="🇹🇷 ترکیه">🇹🇷 ترکیه</option>
                                <option value="🇰🇷 کره جنوبی">🇰🇷 کره جنوبی</option>
                                <option value="🇨🇳 چین">🇨🇳 چین</option>
                                <option value="🇮🇹 ایتالیا">🇮🇹 ایتالیا</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block font-bold text-slate-700 mb-1">ساخته شده با چه موادی است؟ (ترکیب الیاف)</label>
                        <input
                            type="text"
                            placeholder="مثلاً: ۸۰٪ نخ پنبه، ۱۵٪ پلی‌استر، ۵٪ اسپندکس"
                            value={rawMaterials}
                            onChange={(e) => setRawMaterials(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-200"
                        />
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-3">
                    <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-1.5">۲. وزن، ابعاد و میزان کشسانی</h3>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">وزن مترمربع (GSM)</label>
                            <input
                                type="number"
                                value={gsm}
                                onChange={(e) => setGsm(e.target.value)}
                                className="w-full p-2 rounded-xl border border-slate-200 text-center font-bold"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">عرض (سانتی‌متر)</label>
                            <input
                                type="number"
                                value={width}
                                onChange={(e) => setWidth(e.target.value)}
                                className="w-full p-2 rounded-xl border border-slate-200 text-center font-bold"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">طول طاقه (متر)</label>
                            <input
                                type="number"
                                value={rollLength}
                                onChange={(e) => setRollLength(e.target.value)}
                                className="w-full p-2 rounded-xl border border-slate-200 text-center font-bold"
                            />
                        </div>
                    </div>

                    <div className="bg-slate-50 px-3 py-2 rounded-xl flex justify-between items-center text-[11px] text-slate-600">
                        <span>وزن محاسبه‌شده هر متر طول:</span>
                        <b className="text-slate-900">{calculatedWeightPerMeter} گرم در متر</b>
                    </div>

                    <div>
                        <label className="block font-bold text-slate-700 mb-1">میزان کشسانی پارچه</label>
                        <div className="grid grid-cols-3 gap-1.5">
                            {['بدون کش', 'کش از عرض', 'کش چهارجهته'].map((item) => (
                                <button
                                    type="button"
                                    key={item}
                                    onClick={() => setStretch(item)}
                                    className={`py-2 rounded-xl font-bold border text-[11px] transition ${stretch === item
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-slate-50 text-slate-600 border-slate-200'
                                        }`}
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-3">
                    <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-1.5">۳. ویژگی‌ها و کاربرد دوخت</h3>

                    <div>
                        <label className="block font-bold text-slate-700 mb-1.5">ویژگی‌های شاخص پارچه (انتخاب کنید):</label>
                        <div className="flex flex-wrap gap-1.5">
                            {PRESET_FEATURES.map((feat) => (
                                <button
                                    type="button"
                                    key={feat}
                                    onClick={() => toggleTag(selectedFeatures, setSelectedFeatures, feat)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${selectedFeatures.includes(feat)
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'bg-slate-50 text-slate-600 border-slate-200'
                                        }`}
                                >
                                    {selectedFeatures.includes(feat) ? '✓ ' : '+ '}
                                    {feat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block font-bold text-slate-700 mb-1.5">مناسب برای دوخت چه لباس‌هایی است؟</label>
                        <div className="flex flex-wrap gap-1.5">
                            {PRESET_GARMENTS.map((garment) => (
                                <button
                                    type="button"
                                    key={garment}
                                    onClick={() => toggleTag(selectedGarments, setSelectedGarments, garment)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${selectedGarments.includes(garment)
                                        ? 'bg-orange-600 text-white border-orange-600'
                                        : 'bg-slate-50 text-slate-600 border-slate-200'
                                        }`}
                                >
                                    {selectedGarments.includes(garment) ? '✂️ ' : '+ '}
                                    {garment}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">فصل مناسب</label>
                            <select
                                value={season}
                                onChange={(e) => setSeason(e.target.value)}
                                className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                            >
                                <option value="چهارفصل">چهارفصل</option>
                                <option value="بهار و تابستان">بهار و تابستان</option>
                                <option value="پاییز و زمستان">پاییز و زمستان</option>
                            </select>
                        </div>
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">وضعیت آبرفت</label>
                            <input
                                type="text"
                                value={shrinkage}
                                onChange={(e) => setShrinkage(e.target.value)}
                                className="w-full p-2 rounded-xl border border-slate-200"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">ایستایی و ضخامت</label>
                            <input
                                type="text"
                                value={drapeAndThickness}
                                onChange={(e) => setDrapeAndThickness(e.target.value)}
                                className="w-full p-2 rounded-xl border border-slate-200"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">حداقل متراژ سفارش</label>
                            <input
                                type="text"
                                value={minOrder}
                                onChange={(e) => setMinOrder(e.target.value)}
                                className="w-full p-2 rounded-xl border border-slate-200"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block font-bold text-slate-700 mb-1">نحوه شستشو و نگهداری</label>
                        <input
                            type="text"
                            value={careInstructions}
                            onChange={(e) => setCareInstructions(e.target.value)}
                            className="w-full p-2 rounded-xl border border-slate-200"
                        />
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-3">
                    <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-1.5">۴. اطلاعات تولیدکننده و موقعیت تهران</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">نام تولیدی / فروشگاه *</label>
                            <input
                                type="text"
                                placeholder="مثلاً: نساجی پارس"
                                value={producer}
                                onChange={(e) => setProducer(e.target.value)}
                                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">نوع مرکز (نقشه)</label>
                            <select
                                value={producerType}
                                onChange={(e) => setProducerType(e.target.value)}
                                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                            >
                                <option value="manufacturer">🏭 تولیدکننده / کارخانه</option>
                                <option value="shop">🏪 پارچه‌فروشی / بنکدار</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">محله تهران</label>
                            <select
                                value={hub}
                                onChange={(e) => setHub(e.target.value)}
                                className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                            >
                                {TEHRAN_NEIGHBORHOODS.filter((h) => h.id !== 'all').map((hood) => (
                                    <option key={hood.id} value={hood.id}>
                                        {hood.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">قیمت هر متر</label>
                            <input
                                type="text"
                                placeholder="۱۷۰,۰۰۰"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full p-2 rounded-xl border border-slate-200"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">رنگ اصلی</label>
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="w-full h-9 p-1 rounded-xl border border-slate-200 cursor-pointer"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">درصد تخفیف (اختیاری)</label>
                            <input
                                type="number"
                                min="0"
                                max="90"
                                value={discountPercent}
                                onChange={(e) => setDiscountPercent(e.target.value === '' ? '' : String(Math.min(90, Math.max(0, Number(e.target.value) || 0))))}
                                className="w-full p-2 rounded-xl border border-slate-200"
                                placeholder="مثلاً ۱۵"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">اعتبار تخفیف تا</label>
                            <input
                                type="date"
                                value={discountEndDate}
                                onChange={(e) => setDiscountEndDate(e.target.value)}
                                className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                            />
                        </div>
                        <p className="col-span-2 text-[10px] text-slate-400 leading-5">
                            با واردکردن درصد تخفیف، پارچه در بخش تخفیف‌ها نمایش داده می‌شود. قیمت واردشده، قیمت قبل از تخفیف است.
                        </p>
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-2xl shadow-lg transition text-sm"
                >
                    ✅ انتشار در ویترین و ثبت روی نقشه تهران
                </button>
            </form>
        </div>
    );
}

// ==========================================
// کتابخانه کالیته‌ها و راهنمای رنگ پارچه
// ==========================================
const COLOR_PALETTE_LIBRARY = [
    {
        id: 'quiet-neutrals',
        title: 'خنثیِ لوکس',
        category: 'خنثی',
        season: 'چهارفصل',
        mood: 'مینیمال، آرام و ماندگار',
        description: 'ترکیبی متعادل از رنگ‌های روشن و خاکستری‌های گرم؛ انتخابی امن و شیک برای طراحی‌هایی که قرار نیست زود از مد بیفتند. این کالیته به‌خوبی با چوب طبیعی، چرم و جزئیات فلزی هماهنگ می‌شود.',
        suitableFor: 'مانتو و کت روزمره، پارچه مبلی، پرده و کالکشن‌های مینیمال',
        colors: [
            { name: 'عاجی', hex: '#F2E9DC' },
            { name: 'شن گرم', hex: '#D5C0A1' },
            { name: 'گریژ', hex: '#A79A8B' },
            { name: 'زغالی', hex: '#34363A' }
        ]
    },
    {
        id: 'earth-notes',
        title: 'یادداشت‌های زمین',
        category: 'گرم',
        season: 'پاییز و زمستان',
        mood: 'طبیعی، صمیمی و اصیل',
        description: 'الهام‌گرفته از خاک، سفال و چرم طبیعی. کنار هم قرار گرفتن بژ نخودی، شتری، سفالی و قهوه‌ای عمق بصری ایجاد می‌کند و برای بافت‌های مات و دارای برجستگی بسیار دلنشین است.',
        suitableFor: 'پالتو، مانتوهای پاییزه، جیر و چرم مصنوعی، پارچه‌های دکوراتیو',
        colors: [
            { name: 'نخودی', hex: '#DCC7A1' },
            { name: 'شتری', hex: '#B78355' },
            { name: 'سفالی', hex: '#B76545' },
            { name: 'قهوه‌ای', hex: '#604538' }
        ]
    },
    {
        id: 'botanical-sage',
        title: 'باغِ سبز آرام',
        category: 'طبیعی',
        season: 'بهار و تابستان',
        mood: 'تازه، متعادل و ارگانیک',
        description: 'از سبز مریم‌گلی روشن تا سبز جنگلی عمیق حرکت می‌کند. این مجموعه حس طبیعت و آرامش دارد؛ برای پارچه‌های لینن، پنبه‌ای و بافت‌های طبیعی انتخابی هماهنگ است.',
        suitableFor: 'لینن، شومیز، لباس راحتی، کالکشن‌های طبیعت‌گرا و دکوراسیون',
        colors: [
            { name: 'سبز مه‌آلود', hex: '#DCE5D6' },
            { name: 'مریم‌گلی', hex: '#A4B69F' },
            { name: 'زیتونی', hex: '#687B54' },
            { name: 'جنگلی', hex: '#294B3A' }
        ]
    },
    {
        id: 'blue-horizon',
        title: 'افق آبی',
        category: 'سرد',
        season: 'بهار و تابستان',
        mood: 'خنک، مطمئن و حرفه‌ای',
        description: 'از آبی مه‌آلود و روشن شروع می‌شود و به آبی نفتی و سرمه‌ای می‌رسد. اختلاف روشنایی رنگ‌ها باعث می‌شود بتوان از یک خانواده رنگی برای ساخت مجموعه‌ای هماهنگ با عمق کافی استفاده کرد.',
        suitableFor: 'پیراهن، شلوار پارچه‌ای، یونیفرم، جین و پارچه‌های رسمی',
        colors: [
            { name: 'آبی یخی', hex: '#DCEAF3' },
            { name: 'آبی دودی', hex: '#89AFC5' },
            { name: 'نفتی', hex: '#35647A' },
            { name: 'سرمه‌ای', hex: '#172F4A' }
        ]
    },
    {
        id: 'rose-story',
        title: 'داستان رز',
        category: 'گرم',
        season: 'چهارفصل',
        mood: 'ظریف، لطیف و زنانه',
        description: 'صورتی‌های ملایم در کنار رز چرک و آلویی، کالیته‌ای ظریف اما نه بیش‌ازحد شیرین می‌سازند. برای پارچه‌های لطیف و ریزش‌دار، از حریر تا کرپ و ساتن، ترکیب چشم‌نوازی است.',
        suitableFor: 'شال و روسری، پیراهن، کرپ، ساتن، حریر و لباس مجلسی',
        colors: [
            { name: 'صورتی پودری', hex: '#F5DCE2' },
            { name: 'رز چرک', hex: '#D7A0AE' },
            { name: 'رز خشک', hex: '#A85B73' },
            { name: 'آلویی', hex: '#5C293F' }
        ]
    },
    {
        id: 'soft-pastels',
        title: 'پاستلِ روشن',
        category: 'پاستلی',
        season: 'بهار و تابستان',
        mood: 'شاد، سبک و لطیف',
        description: 'چهار رنگ روشن با اشباع کنترل‌شده که در کنار هم حس سبک و سرزنده‌ای می‌سازند. بهتر است در پارچه‌های لطیف و لباس‌های روزانه استفاده شوند تا حال‌وهوای روشن کالیته حفظ شود.',
        suitableFor: 'لباس کودک، شومیز، مانتو تابستانی، پنبه و پارچه‌های سبک',
        colors: [
            { name: 'کره‌ای', hex: '#F7E9A7' },
            { name: 'نعنایی', hex: '#CFE9DC' },
            { name: 'آسمانی', hex: '#CDE3F5' },
            { name: 'یاسی', hex: '#DBD1F0' }
        ]
    },
    {
        id: 'timeless-classics',
        title: 'کلاسیکِ رسمی',
        category: 'کلاسیک',
        season: 'چهارفصل',
        mood: 'رسمی، قدرتمند و ماندگار',
        description: 'رنگ‌های شاخص پوشاک رسمی؛ کرم روشن برای تعادل، سرمه‌ای برای وقار، زرشکی برای تأکید و خاکستری تیره برای عمق. این مجموعه در کنار پارچه‌های باکیفیت و بافت‌های ظریف جلوه خوبی دارد.',
        suitableFor: 'کت‌وشلوار، مانتو اداری، پارچه فاستونی، یونیفرم و اکسسوری',
        colors: [
            { name: 'مرواریدی', hex: '#F1E6D2' },
            { name: 'سرمه‌ای', hex: '#142C4E' },
            { name: 'زرشکی', hex: '#7B263F' },
            { name: 'گرافیتی', hex: '#474B53' }
        ]
    },
    {
        id: 'jewel-tones',
        title: 'جواهرات عمیق',
        category: 'جواهری',
        season: 'پاییز و زمستان',
        mood: 'غنی، شاخص و مجلل',
        description: 'رنگ‌های اشباع و عمیق با الهام از سنگ‌های قیمتی. بهتر است یکی از این رنگ‌ها نقش اصلی را داشته باشد و بقیه برای جزئیات یا ترکیب‌های محدود استفاده شوند تا نتیجه شلوغ نشود.',
        suitableFor: 'مخمل، ژاکارد، لباس شب، مانتو مجلسی و پارچه‌های لوکس',
        colors: [
            { name: 'زمردی', hex: '#0D6B56' },
            { name: 'یاقوت کبود', hex: '#2454A6' },
            { name: 'یاقوتی', hex: '#8D243D' },
            { name: 'آمتیست', hex: '#6B4B91' }
        ]
    }
];

function ColorPaletteLibrary() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('همه');
    const categories = ['همه', 'خنثی', 'طبیعی', 'گرم', 'سرد', 'پاستلی', 'کلاسیک', 'جواهری'];
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('fa');

    const visiblePalettes = COLOR_PALETTE_LIBRARY.filter(palette => {
        const matchesCategory = selectedCategory === 'همه' || palette.category === selectedCategory;
        const searchableText = [
            palette.title,
            palette.category,
            palette.season,
            palette.mood,
            palette.description,
            palette.suitableFor,
            ...palette.colors.flatMap(color => [color.name, color.hex])
        ].join(' ').toLocaleLowerCase('fa');
        return matchesCategory && (!normalizedQuery || searchableText.includes(normalizedQuery));
    });

    const totalColors = COLOR_PALETTE_LIBRARY.reduce((sum, palette) => sum + palette.colors.length, 0);

    return (
        <div className="nasaj-palettes-page h-full overflow-y-auto no-scrollbar p-3.5 pb-24">
            <section className="nasaj-palette-hero rounded-3xl p-4 mb-4 text-white">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[10px] tracking-widest font-bold text-amber-200">NASAJ YAR · COLOR LIBRARY</div>
                        <h2 className="text-xl font-black mt-2">کتابخانه رنگ و کالیته‌ها</h2>
                        <p className="text-[11px] text-slate-200 mt-1.5 leading-6">
                            مجموعه‌های رنگی منتخب، همراه با توضیح حال‌وهوا و کاربرد پیشنهادی برای پارچه و پوشاک.
                        </p>
                    </div>
                    <div className="nasaj-palette-hero-icon" aria-hidden="true">▦</div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                    <span className="nasaj-palette-stat">{nasajFormatNumber(COLOR_PALETTE_LIBRARY.length, 0)} کالیته</span>
                    <span className="nasaj-palette-stat">{nasajFormatNumber(totalColors, 0)} نمونه رنگ</span>
                </div>
            </section>

            <section className="nasaj-palette-tools mb-4">
                <div className="nasaj-palette-search-wrap" role="search" aria-label="جستجو در کالیته‌ها">
                    <span aria-hidden="true">⌕</span>
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={event => setSearchQuery(event.target.value)}
                        placeholder="جستجوی رنگ، کالیته یا کاربرد..."
                        className="nasaj-palette-search"
                    />
                    {searchQuery && (
                        <button type="button" onClick={() => setSearchQuery('')} aria-label="پاک کردن جستجو" className="nasaj-palette-clear">×</button>
                    )}
                </div>
                <div className="nasaj-palette-filters" role="group" aria-label="دسته‌بندی کالیته‌ها">
                    {categories.map(category => (
                        <button
                            key={category}
                            type="button"
                            onClick={() => setSelectedCategory(category)}
                            className={`nasaj-palette-filter ${selectedCategory === category ? 'is-active' : ''}`}
                            aria-pressed={selectedCategory === category}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </section>

            <div className="flex items-center justify-between gap-2 mb-3 px-1">
                <h3 className="font-black text-sm text-slate-900">کالیته‌های پیشنهادی</h3>
                <span className="text-[10px] text-slate-500">{nasajFormatNumber(visiblePalettes.length, 0)} مجموعه</span>
            </div>

            {visiblePalettes.length > 0 ? (
                <div className="nasaj-palette-list">
                    {visiblePalettes.map((palette, index) => (
                        <article className="nasaj-palette-card" key={palette.id}>
                            <div className="nasaj-palette-swatches" aria-label={`نمونه رنگ‌های کالیته ${palette.title}`}>
                                {palette.colors.map(color => (
                                    <div className="nasaj-palette-color" key={color.hex}>
                                        <span className="nasaj-palette-color-chip" style={{ backgroundColor: color.hex }} />
                                        <span className="nasaj-palette-color-name">{color.name}</span>
                                        <code className="nasaj-palette-color-hex" dir="ltr">{color.hex}</code>
                                    </div>
                                ))}
                            </div>
                            <div className="nasaj-palette-copy">
                                <div className="flex items-center flex-wrap gap-1.5 mb-2">
                                    <span className="nasaj-palette-category">{palette.category}</span>
                                    <span className="nasaj-palette-season">{palette.season}</span>
                                </div>
                                <h4 className="text-sm font-black text-slate-900">{nasajFormatNumber(index + 1, 0)}. {palette.title}</h4>
                                <p className="nasaj-palette-description">{palette.description}</p>
                                <div className="nasaj-palette-usage">
                                    <span>کاربرد پیشنهادی</span>
                                    <p>{palette.suitableFor}</p>
                                </div>
                                <div className="nasaj-palette-mood">حال‌وهوا: {palette.mood}</div>
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <div className="nasaj-empty-state">
                    <span>⌕</span>
                    <strong>کالیته‌ای پیدا نشد</strong>
                    <p>عبارت جستجو یا دسته‌بندی انتخاب‌شده را تغییر دهید.</p>
                    <button
                        type="button"
                        onClick={() => { setSearchQuery(''); setSelectedCategory('همه'); }}
                        className="mt-2 rounded-xl bg-orange-600 text-white px-4 py-2 text-xs font-bold"
                    >
                        نمایش همه کالیته‌ها
                    </button>
                </div>
            )}

            <p className="nasaj-palette-note">
                نمونه‌ها و کدهای HEX برای راهنمایی بصری هستند. نمایش رنگ روی صفحه با رنگ واقعی پارچه یکسان نیست؛ برای انتخاب نهایی، نمونه فیزیکی را زیر نور مناسب بررسی کنید.
            </p>
        </div>
    );
}

// ==========================================
// تصویر پروفایل توسعه‌دهنده نساج‌یار
// ==========================================
const DEVELOPER_AVATAR = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA4KCw0LCQ4NDA0QDw4RFiQXFhQUFiwgIRokNC43NjMuMjI6QVNGOj1OPjIySGJJTlZYXV5dOEVmbWVabFNbXVn/2wBDAQ8QEBYTFioXFypZOzI7WVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVn/wgARCADIAMgDASIAAhEBAxEB/8QAGQAAAwEBAQAAAAAAAAAAAAAAAAIDAQQF/8QAFgEBAQEAAAAAAAAAAAAAAAAAAAEC/9oADAMBAAIQAxAAAAHldHl3c0A00MNIzOk41O44WTtOWi2zcDQAAw0MNCDo6buaoHOV45ySmS2mwwNMGpLDv6fJrHp7x2WxmgAABB0dGDnDh6OOs3A0TRtno4rGMmF68rHVvMHQ/KR2txVO4QVaI6ZxdvmklMoM0BgUpgmvY5jqmRZ9JjzDVCleZjvOQj0XR1l5nf56LmlFSxJnYnldlnd6CZSYmYBGrHDnRlk9o5IoHcyPHJw+l5tI2VK0q0sdpglFoOaSqllsV50WXMdCQ3p5Cu64FASiOmeR7PmnN38PoLXHnLTEqQc2x9wld0qTpVjy97Im8nbpHWLAAk6ObC4eL0Jtnok7Z1C2oKCWXxGld5udNeXoVodHnheGpSfVzWABF0dN3BeTm9HgTpbKriOioYya83GpJpbX5bnT53TM4sStnRoAASdGRgFOLtgM2NLkbRqTyZLYoUaWlmiy81OhyGdXOVZXTBiXnZHuWU4C1c6lhuEuyqhx5eVg0sOmnKx015Ogvz9vJLK3LWujZEUJhkeaesuhh2et4PuRvN2i+fnVzLKdsTmTpiSXcs23MHov5ry9xMKNPRTnCIFmAB7IHY4S5MDgwDIgc6gl9AKAagLugIAf/8QAJBAAAgIBBAIDAQEBAAAAAAAAAAECERADEiAhEzEiMEEEQFD/2gAIAQEAAQUC/wCC9SI9U8rPIeRnlZ5SMr/wSmkpSbL42WWRmbl9s5duXd8qKxYpCnQp/U5tkn9N5VG43G5HkFqMWoJ3w1GblZfO7+iyzsjwn8f8NllkWKTy/U5XxrFFCRtNhRRRXJPCNR0nwoorFCQkUUbShxHHKwveNUeYorNFCjlss7N9G5MaKKo27is6w8IRXBcNokWiVM2iRVOSIe0rzqrp4ihaZtNpWFxZGDZ3vRR7n+x6I5kri8aS6GhO8rKxtF0OPZ7hXdFcdZVNGk/jEbsiUPisyiSiR6HGuerG4mm6ZVHp3ZIXBEc6nRZHslGuc47ZIi6Q8SwuCFibuW0TotSjy11iPr0bj9eFxR+akXGW5nyZG1zmriR9YfNCZ5KJaiqXuMvprtZlhYTxYhuk2Jo6blFfT+5nhPH6fiH2KCFGJsjI2vfybpKUpuPrMhosTLLysSdEdVifFDdGpPcfzenDgxlDPRYpCZETRrRIrssQ5ViWrQ5N4/nfyHFSHFx4PhZYpEZm+8I/Tek3JvhB1KPrEtPhQ1xsUiPqLG+36a5aUrjmUFIaaeGMUTxWeE8B41Feo1UX2expo//EABQRAQAAAAAAAAAAAAAAAAAAAHD/2gAIAQMBAT8BKf/EABQRAQAAAAAAAAAAAAAAAAAAAHD/2gAIAQIBAT8BKf/EACQQAAAFAwQCAwAAAAAAAAAAAAABESFAECAwAjFBUSJhUGCR/9oACAEBAAY/Avgth1Gf8jpIaCw2uLoapCL9dSi8yTB3uYY8W6A3qY02mVVo2M6thSnoJlUub16r6osVJJHnXgb4TgkUkjKR0Yfi9THi0kwpRWcPRIB4Ss8YxWvcxjcb1WiBx//EACUQAAICAgICAgMAAwAAAAAAAAABESEQMUFRIGFxgTCRsUDR8P/aAAgBAQABPyEX+SvJ0JUrfo6S+QN/+Yu4QL0X7JG1+NePsReP8CcVCNDJROC9UIwexdiJT/AvCO2OzjL4HJkk5hMYoi/YoHYQNokehOfJYbSUsqK0WNTz5JkdElBMTGTcED4sU0v+i7K6IWhJxkLFHssSnP4HhJPgnBRY0TBIj7PsgghTE06NMIduBJA5/DHgmOxNoksUVfAo5VrCKBz3teKEGsrIQfQrsea00SfAti3sYvAj3lCoKxQShmxB4Q1EZSAaErOsSQpgTR4Q+vjJYNMNDCCBY6hs6UiSj5EyDhUA9k2UQoS28I2vqvAWEdiKxAl5ZDkQRbFWOOh0jsdFyfYtXBEWOcI3cmtqNlWoacDwoheGBoZ8D6430OKLQ4LIUVJL6CHLV0pYlmat9vCPcAsMRb56QlfZdNCFYyLEwsInCSQW7XMiodyWyMEvsXf7FksTkad4SdyOTJOwt8JHA2FlMYSGlBJSIRQpuDxLHug5GIZ7WxV2OUc0KBPvBhPCKDDsSLLKjQgZ8fBYiUyZFT4gUPRKI2acdG2HlCYhDQOaslyDWySJmvBZ/gHJpL0PiS5Njm4ZthCYnI5sMSWxI9EJM239EDwWYAJSJhBQ5FaOsK5NIbA0DDckHQjl8VlnD4HJscbhTgTuzQa8Q18kBSxaiQpIhzoWhWNYXhFxZ0JKCeBcDg0NziGFYhpIatVdETJq1Fe9CZrCwviB/UEVmltz4nI6FCYpOcFo1jDxptaOVm8c5ISXSGN0lwR+0/1PhYTgc2JAngsJXeh1YxRJo0Oha+xwQwjBFbh7YZG3YR6h9m413hjEgasuRsoIxkJYcuaIeoxNJti234Tb2NOHEPRyfoNRhodCJElQQJkyMeXbJIIDuKJ8pgLKjp9kawYtCDmxRJ0v0TCbkJ49uCBTI/YokSfsF1K7R//aAAgBAQAGPwL4LYdRn/I6SGgsNri6GqQi/XUovMkwd7mGPFugN6mNNplVaNjOrYUp6CZVLm9eq+qLFSSh514G+E4JFJIykdGH4vUx4tJMKUVnD0SAeErPGMVr3MY3G9Vogcf/xAAlEAACAgICAgIDAMAAAAAAAAABEREhAxQVGEYUwkQaGxQNHw/9oACAEBAAE/IRf5K8nQlSt+jpL5A3/5i7hAvRfs kbX414+xF4/wJxUI0MlE4L1QjB7F2IlP8C8I7Y7OMvggmSTmExiiL9igdhA2h6E58lhtJSyorRY1PPkmR0SUExMZNwQPixTS/6LsrohaEnGQsUeyxKc/geEk+CcFFjRMEiPs+yCCFM TTo0wh24EkDn8MeCY7E2iSxRV8CjlWsIoHPe14oQayshB9Cux5rTRJ8C2Lewi8CPeUKgrFBKGbEHhDURL9iBEAaErOsSQpgTR4Q+vjJYNMNDCCBY6hs6UiSj5EyDhUA9k2UQoS28I2vqvAWEdiKxAl5ZDkQRbFWOOh0jsdFyfYtXBEWOcI3cmtqNlWoacDwoheGBoZ8D6430OKLQ4LIUVJL6CHLV0pYlmat9vCPcAsMRb56QlfZdNCFYyLEwsInCSQW7XMiodyWyMEvsXf7FksTkad4SdyOTJOwt8JHA2FlMYSGlBJSIRQpuDxLHug5GIZ7WxV2OUc0KBPvBhPCKDDsSLLKjQgZ8fBYiUyZFT4gUPRKI2acdG2HlCYhDQOaslyDWySJmvBZ/gHJpL0PiS5Njm4ZthCYnI5sMSWxI9EJM239EDwWYAJSJhBQ5FaOsK5NIbA0DDckHQjl8VlnD4HJscbhTgTuzQa8Q18kBSxaiQpIhzoWhWNYXhFxZ0JKCeBcDg0NziGFYhpIatVdETJq1Fe9CZrCwviB/UEVmltz4nI6FCYpOcFo1jDxptaOVm8c5ISXSGN0lwR+0/1PhYTgc2JAngsJXeh1YxRJo0Oha+xwQwjBFbh7YZG3YR6h9m413hjEgasuRsoIxkJYcuaIeoxNJti234Tb2NOHEPRyfoNRhodCJElQQJkyMeXbJIIDuKJ8pgLKjp9kawYtCDmxRJ0v0TCbkJ49uCBTI/YokSfsF1K7R//9k=";

// ==========================================
// ابزارهای تکمیلی: قیمت، علاقه‌مندی، ماشین‌حساب و تخفیف
// ==========================================
function nasajToEnglishDigits(value) {
    return String(value == null ? '' : value)
        .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
        .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}

function nasajParseNumber(value) {
    const normalized = nasajToEnglishDigits(value).replace(/[٬،,\s]/g, '').replace(/[^0-9.]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

function nasajFormatNumber(value, maximumFractionDigits = 1) {
    return new Intl.NumberFormat('fa-IR', { maximumFractionDigits }).format(Number(value) || 0);
}

function nasajLocalDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function nasajHasActiveDiscount(fabric) {
    if (!fabric) return false;
    const percent = Math.min(90, Math.max(0, Number(fabric.discountPercent) || 0));
    const original = nasajParseNumber(fabric.pricePerMeter);
    const notExpired = !fabric.discountEndDate || fabric.discountEndDate >= nasajLocalDateString();
    return percent > 0 && original > 0 && notExpired;
}

function nasajPriceWithDiscount(fabric) {
    const original = nasajParseNumber(fabric && fabric.pricePerMeter);
    const percent = Math.min(90, Math.max(0, Number(fabric && fabric.discountPercent) || 0));
    return nasajHasActiveDiscount(fabric) ? Math.round(original * (1 - percent / 100)) : original;
}

function NasajFavoriteButton({ active, onClick, compact = false }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={active ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
            aria-pressed={!!active}
            className={`${compact ? 'w-8 h-8' : 'w-9 h-9'} rounded-full bg-white/95 text-pink-600 shadow-lg border border-pink-100 flex items-center justify-center text-lg transition active:scale-90`}
            title={active ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
        >
            {active ? '♥' : '♡'}
        </button>
    );
}

function FavoritesPage({ fabrics, favoriteIds, favoriteFolders, favoriteAssignments, onCreateFolder, onAssignFolder, onToggleFavorite, onOpenFabric, onBack }) {
    const [folderFilter, setFolderFilter] = useState('همه');
    const [newFolderName, setNewFolderName] = useState('');
    const favorites = fabrics.filter(fabric => favoriteIds.includes(String(fabric.id)));
    const visibleFavorites = favorites.filter(fabric => folderFilter === 'همه' || (favoriteAssignments[String(fabric.id)] || 'بدون پوشه') === folderFilter);
    const handleCreateFolder = (event) => {
        event.preventDefault();
        const created = onCreateFolder(newFolderName);
        if (created) {
            setFolderFilter(created);
            setNewFolderName('');
        }
    };

    return (
        <div className="nasaj-subpage h-full overflow-y-auto p-3.5 pb-24 no-scrollbar">
            <div className="nasaj-page-heading">
                <div>
                    <span className="nasaj-eyebrow">مجموعه‌های شخصی</span>
                    <h2>علاقه‌مندی‌های من</h2>
                    <p>{nasajFormatNumber(favorites.length, 0)} پارچه ذخیره‌شده در کتابخانه شما</p>
                </div>
                <button onClick={onBack} className="nasaj-ghost-button">بازگشت</button>
            </div>

            <form className="nasaj-folder-create" onSubmit={handleCreateFolder}>
                <div className="nasaj-folder-create-copy"><strong>ساخت پوشه جدید</strong><span>پارچه‌ها را برای خرید یا پروژه‌ها مرتب کنید.</span></div>
                <div className="nasaj-inline-controls">
                    <input value={newFolderName} onChange={event => setNewFolderName(event.target.value)} maxLength="28" placeholder="مثلاً پارچه‌های مانتو" aria-label="نام پوشه جدید" />
                    <button type="submit" disabled={!newFolderName.trim()}>+ ساخت</button>
                </div>
            </form>

            <div className="nasaj-folder-chips" role="group" aria-label="فیلتر پوشه‌های علاقه‌مندی">
                <button type="button" className={folderFilter === 'همه' ? 'is-active' : ''} onClick={() => setFolderFilter('همه')}>همه ({favorites.length})</button>
                {favoriteFolders.map(folder => (
                    <button type="button" key={folder} className={folderFilter === folder ? 'is-active' : ''} onClick={() => setFolderFilter(folder)}>{folder} ({favorites.filter(f => favoriteAssignments[String(f.id)] === folder).length})</button>
                ))}
                <button type="button" className={folderFilter === 'بدون پوشه' ? 'is-active' : ''} onClick={() => setFolderFilter('بدون پوشه')}>بدون پوشه ({favorites.filter(f => !favoriteAssignments[String(f.id)]).length})</button>
            </div>

            {visibleFavorites.length === 0 ? (
                <div className="nasaj-empty-state nasaj-empty-card">
                    <span>♡</span>
                    <strong>{favorites.length ? 'این پوشه هنوز خالی است' : 'هنوز پارچه‌ای ذخیره نکرده‌اید'}</strong>
                    <p>{favorites.length ? 'از منوی هر پارچه، آن را به این پوشه اضافه کنید.' : 'در ویترین روی قلب هر پارچه بزنید تا به کتابخانه شما اضافه شود.'}</p>
                    <button onClick={onBack} className="nasaj-primary-button">رفتن به ویترین</button>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 nasaj-favorite-grid">
                    {visibleFavorites.map(fabric => {
                        const image = fabric.imageUrl || generateFabricWeaveDataUrl(fabric.colors?.[0] || '#cbd5e1', '#ffffff', fabric.pattern);
                        const discounted = nasajHasActiveDiscount(fabric);
                        return (
                            <article key={fabric.id} onClick={() => onOpenFabric(fabric)} className="nasaj-favorite-card cursor-pointer">
                                <div className="nasaj-favorite-image">
                                    <img src={image} alt={fabric.name} />
                                    <div className="absolute top-2 left-2" onClick={event => event.stopPropagation()}>
                                        <NasajFavoriteButton active onClick={() => onToggleFavorite(fabric.id)} compact />
                                    </div>
                                    {discounted && <span className="nasaj-favorite-discount">{nasajFormatNumber(fabric.discountPercent, 0)}٪ تخفیف</span>}
                                </div>
                                <div className="p-3">
                                    <h3>{fabric.name}</h3>
                                    <p>{nasajFormatNumber(fabric.gsm, 0)} GSM · عرض {nasajFormatNumber(fabric.width, 0)} سانتی‌متر</p>
                                    <div className="nasaj-favorite-price">
                                        {discounted && <del>{nasajFormatNumber(nasajParseNumber(fabric.pricePerMeter), 0)}</del>}
                                        <strong>{nasajFormatNumber(nasajPriceWithDiscount(fabric) || nasajParseNumber(fabric.pricePerMeter), 0)} تومان</strong>
                                    </div>
                                    <label className="nasaj-favorite-folder-select" onClick={event => event.stopPropagation()}>
                                        <span>پوشه</span>
                                        <select value={favoriteAssignments[String(fabric.id)] || ''} onChange={event => onAssignFolder(fabric.id, event.target.value)} aria-label={`پوشه پارچه ${fabric.name}`}>
                                            <option value="">بدون پوشه</option>
                                            {favoriteFolders.map(folder => <option key={folder} value={folder}>{folder}</option>)}
                                        </select>
                                    </label>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// مقایسه کنارهمی حداکثر سه پارچه برای تصمیم‌گیری دقیق‌تر خریدار
function FabricCompareModal({ fabrics, compareIds, onRemove, onClose }) {
    const selected = compareIds
        .map(id => fabrics.find(fabric => String(fabric.id) === String(id)))
        .filter(Boolean);

    const rows = [
        { label: 'نوع پارچه', value: fabric => fabric.fabricType || '—' },
        { label: 'ترکیب الیاف', value: fabric => fabric.rawMaterials || '—' },
        { label: 'گرماژ', value: fabric => `${nasajFormatNumber(fabric.gsm, 0)} گرم` },
        { label: 'عرض', value: fabric => `${nasajFormatNumber(fabric.width, 0)} سانتی‌متر` },
        { label: 'کشسانی', value: fabric => fabric.stretch || '—' },
        { label: 'فصل مناسب', value: fabric => fabric.season || '—' },
        { label: 'ایستایی و ضخامت', value: fabric => fabric.drapeAndThickness || '—' },
        { label: 'کشور تولید', value: fabric => fabric.originCountry || '—' },
        { label: 'کاربردها', value: fabric => Array.isArray(fabric.suitableFor) ? fabric.suitableFor.join('، ') : (fabric.suitableFor || '—') },
        { label: 'قیمت هر متر', value: fabric => `${nasajFormatNumber(nasajPriceWithDiscount(fabric) || nasajParseNumber(fabric.pricePerMeter), 0)} تومان` },
        { label: 'حداقل سفارش', value: fabric => fabric.minOrder || '—' },
        { label: 'نگهداری', value: fabric => fabric.careInstructions || '—' }
    ];

    if (!selected.length) return null;

    return (
        <div className="nasaj-compare-overlay" role="dialog" aria-modal="true" aria-label="مقایسه پارچه‌ها">
            <section className="nasaj-compare-modal">
                <div className="nasaj-compare-modal-head">
                    <div>
                        <span className="nasaj-eyebrow">انتخاب دقیق‌تر، خرید مطمئن‌تر</span>
                        <h2>مقایسه پارچه‌ها</h2>
                        <p>مشخصات فنی و قیمت را کنار هم بررسی کنید.</p>
                    </div>
                    <button type="button" onClick={onClose} className="nasaj-modal-close" aria-label="بستن">×</button>
                </div>

                <div className="nasaj-compare-products" style={{ gridTemplateColumns: `repeat(${selected.length}, minmax(0, 1fr))` }}>
                    {selected.map(fabric => {
                        const image = fabric.imageUrl || generateFabricWeaveDataUrl(fabric.colors?.[0] || '#94a3b8', '#ffffff', fabric.pattern);
                        return (
                            <article className="nasaj-compare-product" key={fabric.id}>
                                <img src={image} alt={fabric.name} />
                                <div className="nasaj-compare-product-copy">
                                    <strong>{fabric.name}</strong>
                                    <span>{nasajFormatNumber(nasajPriceWithDiscount(fabric) || nasajParseNumber(fabric.pricePerMeter), 0)} تومان / متر</span>
                                </div>
                                <button type="button" onClick={() => onRemove(fabric.id)} className="nasaj-compare-remove">حذف از مقایسه</button>
                            </article>
                        );
                    })}
                </div>

                <div className="nasaj-compare-table-wrap">
                    <table className="nasaj-compare-table">
                        <tbody>
                            {rows.map(row => (
                                <tr key={row.label}>
                                    <th scope="row">{row.label}</th>
                                    {selected.map(fabric => (
                                        <td key={`${fabric.id}-${row.label}`}>{row.value(fabric)}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="nasaj-compare-modal-foot">
                    <span>اطلاعات بر اساس مشخصات ثبت‌شده هر پارچه نمایش داده می‌شود.</span>
                    <button type="button" onClick={onClose}>بازگشت به ویترین</button>
                </div>
            </section>
        </div>
    );
}

const NASAJ_GARMENT_CONSUMPTION = {
    'مانتو': 2.4,
    'شلوار': 1.7,
    'شومیز': 1.6,
    'پیراهن زنانه': 2.3,
    'کت و شلوار': 3.4,
    'لباس مجلسی': 3.6,
    'دامن': 1.2,
    'هودی و دورس': 1.9,
    'لباس کودک': 1.1,
    'چادر': 5.5
};

function FabricCalculator({ fabrics, onBack, history = [], onSaveHistory, onDeleteHistory }) {
    const firstFabric = fabrics[0] || null;
    const [fabricId, setFabricId] = useState(firstFabric ? String(firstFabric.id) : 'manual');
    const [garment, setGarment] = useState('مانتو');
    const [quantity, setQuantity] = useState('1');
    const [baseMeters, setBaseMeters] = useState(String(NASAJ_GARMENT_CONSUMPTION['مانتو']));
    const [sizeFactor, setSizeFactor] = useState('1');
    const [width, setWidth] = useState(String(firstFabric ? firstFabric.width : 150));
    const [gsm, setGsm] = useState(String(firstFabric ? firstFabric.gsm : 200));
    const [pattern, setPattern] = useState('plain');
    const [shrinkagePercent, setShrinkagePercent] = useState('2');
    const [wastePercent, setWastePercent] = useState('5');
    const [price, setPrice] = useState(firstFabric ? String(nasajParseNumber(firstFabric.pricePerMeter) || '') : '');
    const [saveNotice, setSaveNotice] = useState('');

    const selectedFabric = fabrics.find(fabric => String(fabric.id) === String(fabricId));

    useEffect(() => {
        if (!selectedFabric) return;
        setWidth(String(selectedFabric.width || 150));
        setGsm(String(selectedFabric.gsm || 200));
        setPrice(String(nasajPriceWithDiscount(selectedFabric) || nasajParseNumber(selectedFabric.pricePerMeter) || ''));
    }, [fabricId]);

    const changeGarment = (nextGarment) => {
        setGarment(nextGarment);
        setBaseMeters(String(NASAJ_GARMENT_CONSUMPTION[nextGarment] || 2));
    };

    const count = Math.max(0, nasajParseNumber(quantity));
    const widthValue = Math.max(1, nasajParseNumber(width));
    const gsmValue = Math.max(0, nasajParseNumber(gsm));
    const baseValue = Math.max(0, nasajParseNumber(baseMeters));
    const patternExtra = pattern === 'stripe' ? 0.08 : pattern === 'repeat' ? 0.15 : 0;
    const sizeMultiplier = Math.max(0.5, nasajParseNumber(sizeFactor) || 1);
    const shrinkageMultiplier = 1 + Math.max(0, nasajParseNumber(shrinkagePercent)) / 100;
    const wasteMultiplier = 1 + Math.max(0, nasajParseNumber(wastePercent)) / 100;
    const rawMeters = baseValue * count * (150 / widthValue) * sizeMultiplier * (1 + patternExtra) * shrinkageMultiplier * wasteMultiplier;
    const purchaseMeters = rawMeters > 0 ? Math.ceil(rawMeters * 10) / 10 : 0;
    const weightPerMeter = gsmValue * widthValue / 100;
    const totalWeightKg = purchaseMeters * weightPerMeter / 1000;
    const totalCost = purchaseMeters * nasajParseNumber(price);

    const handleSaveCalculation = () => {
        if (!purchaseMeters || !count) {
            setSaveNotice('برای ذخیره، تعداد لباس و متراژ را بررسی کنید.');
            return;
        }
        const entry = {
            id: `calc-${Date.now()}`,
            createdAt: new Date().toISOString(),
            garment,
            quantity: count,
            fabricName: selectedFabric ? selectedFabric.name : 'پارچه با مشخصات دستی',
            width: widthValue,
            gsm: gsmValue,
            purchaseMeters,
            totalWeightKg,
            totalCost,
            pricePerMeter: nasajParseNumber(price),
            sizeFactor,
            shrinkagePercent: nasajParseNumber(shrinkagePercent),
            wastePercent: nasajParseNumber(wastePercent),
            pattern
        };
        if (onSaveHistory) onSaveHistory(entry);
        setSaveNotice('محاسبه با موفقیت در تاریخچه ذخیره شد.');
    };

    return (
        <div className="h-full overflow-y-auto p-3.5 pb-24 no-scrollbar bg-slate-50">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h2 className="font-black text-base text-slate-900">🧮 ماشین‌حساب حرفه‌ای پارچه</h2>
                    <p className="text-[10px] text-slate-500 mt-1">برآورد متراژ، وزن و هزینه سفارش</p>
                </div>
                <button onClick={onBack} className="text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl px-3 py-2">بازگشت</button>
            </div>

            <section className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-3">
                <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">انتخاب پارچه از ویترین</label>
                    <select value={fabricId} onChange={event => setFabricId(event.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs">
                        {fabrics.map(fabric => <option key={fabric.id} value={String(fabric.id)}>{fabric.name}</option>)}
                        <option value="manual">ورود مشخصات به‌صورت دستی</option>
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع لباس</label>
                        <select value={garment} onChange={event => changeGarment(event.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs">
                            {Object.keys(NASAJ_GARMENT_CONSUMPTION).map(item => <option key={item} value={item}>{item}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">تعداد لباس</label>
                        <input type="number" min="1" value={quantity} onChange={event => setQuantity(event.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 text-center" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">مصرف پایه هر لباس (متر)</label>
                        <input type="number" min="0" step="0.1" value={baseMeters} onChange={event => setBaseMeters(event.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 text-center" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">گروه سایز</label>
                        <select value={sizeFactor} onChange={event => setSizeFactor(event.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs">
                            <option value="0.8">کوچک / کودک (۰٫۸)</option>
                            <option value="1">معمولی (۱)</option>
                            <option value="1.15">بزرگ / آزاد (۱٫۱۵)</option>
                        </select>
                    </div>
                </div>
            </section>

            <section className="bg-white rounded-2xl border border-slate-200 p-3.5 mt-3 space-y-3">
                <h3 className="text-xs font-black text-slate-900">مشخصات فنی و پرت برش</h3>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">عرض پارچه (cm)</label>
                        <input type="number" min="1" value={width} onChange={event => setWidth(event.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 text-center" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">گرماژ (GSM)</label>
                        <input type="number" min="0" value={gsm} onChange={event => setGsm(event.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 text-center" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع طرح</label>
                        <select value={pattern} onChange={event => setPattern(event.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs">
                            <option value="plain">ساده (بدون اضافه)</option>
                            <option value="stripe">راه‌راه / یک‌طرفه (+۸٪)</option>
                            <option value="repeat">طرح تکرارشونده (+۱۵٪)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">آبرفت احتمالی (%)</label>
                        <input type="number" min="0" max="50" value={shrinkagePercent} onChange={event => setShrinkagePercent(event.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 text-center" />
                    </div>
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">پرت و خطای برش (%)</label>
                    <input type="number" min="0" max="50" value={wastePercent} onChange={event => setWastePercent(event.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 text-center" />
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">قیمت هر متر (تومان، اختیاری)</label>
                    <input type="text" inputMode="numeric" value={price} onChange={event => setPrice(event.target.value)} placeholder="مثلاً ۱۸۵۰۰۰" className="w-full p-2.5 rounded-xl border border-slate-200 text-center" />
                </div>
            </section>

            <section className="bg-slate-900 text-white rounded-2xl p-4 mt-3 shadow-lg">
                <p className="text-[11px] text-slate-300">متراژ پیشنهادی برای خرید</p>
                <div className="flex items-end gap-2 mt-1">
                    <strong className="text-4xl font-black">{nasajFormatNumber(purchaseMeters, 1)}</strong>
                    <span className="text-sm text-slate-300 mb-1">متر پارچه</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="rounded-xl bg-white/10 p-3">
                        <p className="text-[10px] text-slate-300">وزن تقریبی سفارش</p>
                        <p className="font-black text-base mt-1">{nasajFormatNumber(totalWeightKg, 2)} کیلوگرم</p>
                    </div>
                    <div className="rounded-xl bg-white/10 p-3">
                        <p className="text-[10px] text-slate-300">وزن هر متر طول</p>
                        <p className="font-black text-base mt-1">{nasajFormatNumber(weightPerMeter, 0)} گرم</p>
                    </div>
                    {nasajParseNumber(price) > 0 && (
                        <div className="rounded-xl bg-white/10 p-3 col-span-2">
                            <p className="text-[10px] text-slate-300">هزینه تقریبی کل</p>
                            <p className="font-black text-lg mt-1">{nasajFormatNumber(totalCost, 0)} تومان</p>
                        </div>
                    )}
                </div>
                <button type="button" onClick={handleSaveCalculation} className="nasaj-save-calculation">ذخیره این محاسبه در تاریخچه</button>
                {saveNotice && <p className="nasaj-save-notice" role="status">{saveNotice}</p>}
            </section>
            <section className="nasaj-history-panel">
                <div className="nasaj-section-heading"><div><span className="nasaj-eyebrow">سوابق شما</span><h3>تاریخچه محاسبات</h3></div><span>{nasajFormatNumber(history.length, 0)} مورد</span></div>
                {history.length === 0 ? (
                    <p className="nasaj-history-empty">پس از انجام محاسبه، آن را ذخیره کنید تا اینجا باقی بماند.</p>
                ) : (
                    <div className="nasaj-history-list">
                        {history.map(item => (
                            <article className="nasaj-history-item" key={item.id}>
                                <div><strong>{item.garment} · {item.fabricName}</strong><span>{nasajFormatNumber(item.quantity, 0)} لباس · {nasajFormatNumber(item.width, 0)}cm · {nasajFormatNumber(item.gsm, 0)} GSM</span><small>{new Date(item.createdAt).toLocaleDateString('fa-IR')}</small></div>
                                <div className="nasaj-history-result"><b>{nasajFormatNumber(item.purchaseMeters, 1)} متر</b>{item.totalCost > 0 && <span>{nasajFormatNumber(item.totalCost, 0)} تومان</span>}</div>
                                <button type="button" onClick={() => onDeleteHistory && onDeleteHistory(item.id)} aria-label="حذف محاسبه از تاریخچه">×</button>
                            </article>
                        ))}
                    </div>
                )}
            </section>
            <p className="text-[10px] text-slate-500 leading-6 mt-3 px-1">این عدد برآورد اولیه است. مصرف واقعی به الگوی برش، سایزبندی، مدل لباس، خواب پارچه و مهارت برشکار بستگی دارد. مصرف پایه را می‌توانید دستی اصلاح کنید.</p>
        </div>
    );
}

const NASAJ_PROFILE_TONES = ['copper', 'blue', 'emerald', 'plum', 'graphite'];

function nasajReadLocalProfiles() {
    try {
        const saved = JSON.parse(localStorage.getItem('nasaj_yar_profiles_v2') || 'null');
        if (Array.isArray(saved) && saved.length) {
            const validProfiles = saved.filter(item => item && item.id).map((item, index) => ({
                id: String(item.id),
                name: String(item.name || `کاربر ${index + 1}`).slice(0, 40),
                city: String(item.city || 'تهران').slice(0, 40),
                role: String(item.role || 'خریدار'),
                phone: String(item.phone || '').slice(0, 20),
                avatarTone: NASAJ_PROFILE_TONES.includes(item.avatarTone) ? item.avatarTone : NASAJ_PROFILE_TONES[index % NASAJ_PROFILE_TONES.length],
                createdAt: item.createdAt || Date.now()
            }));
            if (validProfiles.length) return validProfiles;
        }
    } catch { }

    let legacy = {};
    try { legacy = JSON.parse(localStorage.getItem('nasaj_yar_profile') || '{}') || {}; } catch { }
    return [{
        id: 'local-owner',
        name: String(legacy.name || 'کاربر نساج‌یار').slice(0, 40),
        city: String(legacy.city || 'تهران').slice(0, 40),
        role: String(legacy.role || 'خریدار'),
        phone: String(legacy.phone || '').slice(0, 20),
        avatarTone: NASAJ_PROFILE_TONES.includes(legacy.avatarTone) ? legacy.avatarTone : 'copper',
        createdAt: Date.now()
    }];
}

function nasajProfileStorageKey(baseKey, profileId) {
    const safeId = String(profileId || 'local-owner').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${baseKey}__${safeId}`;
}

function nasajReadProfileStorage(baseKey, profileId, fallbackValue) {
    try {
        let raw = localStorage.getItem(nasajProfileStorageKey(baseKey, profileId));
        if (raw === null && String(profileId) === 'local-owner') raw = localStorage.getItem(baseKey);
        return raw === null ? fallbackValue : JSON.parse(raw);
    } catch { return fallbackValue; }
}

function NasajUserAvatar({ profile, compact = false }) {
    const tone = NASAJ_PROFILE_TONES.includes(profile && profile.avatarTone) ? profile.avatarTone : 'copper';
    const initial = String((profile && profile.name) || 'ن').trim().slice(0, 1) || 'ن';
    return (
        <span className={`nasaj-user-avatar tone-${tone} ${compact ? 'is-compact' : ''}`} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="3.4" />
                <path d="M5.2 19.2c.65-3.15 3.15-5.05 6.8-5.05s6.15 1.9 6.8 5.05" />
            </svg>
            <b>{initial}</b>
            <i />
        </span>
    );
}

function ProfileSettings({ profile, profiles, activeProfileId, onSwitchProfile, onCreateProfile, onSaveProfile, theme, onChangeTheme, stats, onBack }) {
    const [form, setForm] = useState(profile || { name: '', city: 'تهران', role: 'خریدار', phone: '', avatarTone: 'copper' });
    const [notice, setNotice] = useState('');
    const [newProfileName, setNewProfileName] = useState('');
    useEffect(() => setForm(profile || { name: '', city: 'تهران', role: 'خریدار', phone: '', avatarTone: 'copper' }), [profile]);
    const update = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
    const save = (event) => {
        event.preventDefault();
        onSaveProfile({ ...form, name: String(form.name || '').trim() });
        setNotice('تغییرات پروفایل ذخیره شد.');
    };
    const createProfile = (event) => {
        event.preventDefault();
        const cleanName = newProfileName.trim();
        if (!cleanName) { setNotice('برای ساخت پروفایل، نام را وارد کن.'); return; }
        onCreateProfile({ name: cleanName });
        setNewProfileName('');
        setNotice(`پروفایل «${cleanName}» ساخته و فعال شد.`);
    };

    return (
        <div className="nasaj-subpage h-full overflow-y-auto p-3.5 pb-24 no-scrollbar">
            <div className="nasaj-page-heading"><div><span className="nasaj-eyebrow">حساب و شخصی‌سازی</span><h2>پروفایل و تنظیمات</h2><p>هر نفر می‌تواند پروفایل جداگانه‌ای روی این دستگاه داشته باشد.</p></div><button onClick={onBack} className="nasaj-ghost-button">بازگشت</button></div>

            <section className="nasaj-profile-hero"><NasajUserAvatar profile={form} /><div><span>پروفایل فعال</span><strong>{form.name || 'کاربر نساج‌یار'}</strong><small>{form.role || 'کاربر'} · {form.city || 'تهران'}</small></div><em className="nasaj-profile-online-dot" title="فعال روی این دستگاه" /></section>

            <section className="nasaj-account-switcher">
                <div className="nasaj-section-heading"><div><span className="nasaj-eyebrow">MULTI PROFILE</span><h3>پروفایل‌های این دستگاه</h3></div><span>{nasajFormatNumber(profiles.length, 0)} پروفایل</span></div>
                <div className="nasaj-account-list">
                    {profiles.map(item => (
                        <button key={item.id} type="button" onClick={() => { if (item.id !== activeProfileId) { onSwitchProfile(item.id); setNotice(`پروفایل ${item.name} فعال شد.`); } }} className={`nasaj-account-option ${item.id === activeProfileId ? 'is-active' : ''}`} aria-pressed={item.id === activeProfileId}>
                            <NasajUserAvatar profile={item} compact />
                            <span className="nasaj-account-option-copy"><strong>{item.name || 'کاربر نساج‌یار'}</strong><small>{item.role || 'خریدار'} · {item.city || 'تهران'}</small></span>
                            <em>{item.id === activeProfileId ? 'فعال' : 'انتخاب'}</em>
                        </button>
                    ))}
                </div>
                <form className="nasaj-create-profile-form" onSubmit={createProfile}>
                    <label htmlFor="nasaj-new-profile-name">ساخت پروفایل جدید</label>
                    <div><input id="nasaj-new-profile-name" value={newProfileName} onChange={event => setNewProfileName(event.target.value)} placeholder="نام شخص جدید" maxLength="40" /><button type="submit">+ ایجاد پروفایل</button></div>
                </form>
            </section>

            <form className="nasaj-profile-form" onSubmit={save}>
                <label>نام نمایشی<input value={form.name || ''} onChange={event => update('name', event.target.value)} placeholder="نام شما" maxLength="40" /></label>
                <label>شهر<input value={form.city || ''} onChange={event => update('city', event.target.value)} placeholder="مثلاً تهران" maxLength="40" /></label>
                <label>نقش شما<select value={form.role || 'خریدار'} onChange={event => update('role', event.target.value)}><option>خریدار</option><option>فروشنده</option><option>تولیدکننده</option><option>طراح لباس</option><option>دانشجو یا هنرجو</option><option>خیاط یا مزون</option></select></label>
                <label>شماره تماس (اختیاری)<input type="tel" inputMode="tel" value={form.phone || ''} onChange={event => update('phone', event.target.value)} placeholder="شماره تماس" maxLength="20" /></label>
                <label>رنگ آواتار<select value={form.avatarTone || 'copper'} onChange={event => update('avatarTone', event.target.value)}><option value="copper">مسی</option><option value="blue">آبی</option><option value="emerald">سبز زمردی</option><option value="plum">ارغوانی</option><option value="graphite">ذغالی</option></select></label>
                <button type="submit" className="nasaj-primary-button">ذخیره اطلاعات پروفایل</button>
                {notice && <p className="nasaj-save-notice" role="status">{notice}</p>}
            </form>

            <section className="nasaj-settings-card">
                <div className="nasaj-section-heading"><div><span className="nasaj-eyebrow">شخصی‌سازی ظاهر</span><h3>پوسته برنامه</h3></div></div>
                <div className="nasaj-theme-options">
                    <button type="button" className={theme === 'light' ? 'is-active' : ''} onClick={() => onChangeTheme('light')}><i className="theme-dot theme-light"></i><span>سفید</span></button>
                    <button type="button" className={theme === 'dark' ? 'is-active' : ''} onClick={() => onChangeTheme('dark')}><i className="theme-dot theme-dark"></i><span>دارک</span></button>
                    <button type="button" className={theme === 'pink' ? 'is-active' : ''} onClick={() => onChangeTheme('pink')}><i className="theme-dot theme-pink"></i><span>صورتی</span></button>
                </div>
            </section>
            <section className="nasaj-profile-stats">
                <div><strong>{nasajFormatNumber(stats.favorites, 0)}</strong><span>علاقه‌مندی</span></div>
                <div><strong>{nasajFormatNumber(stats.projects, 0)}</strong><span>پروژه طراحی</span></div>
                <div><strong>{nasajFormatNumber(stats.calculations, 0)}</strong><span>محاسبه ذخیره‌شده</span></div>
            </section>
            <p className="nasaj-local-note">پروفایل‌ها و اطلاعات شخصی هرکدام جداگانه روی همین گوشی یا مرورگر ذخیره می‌شوند. برای ورود امن از گوشی‌های مختلف و همگام‌سازی حساب‌ها، اتصال به سرور و سامانه ورود آنلاین لازم است.</p>
        </div>
    );
}

function DiscountsPage({ fabrics, alertsEnabled, notificationPermission, onToggleAlerts, onOpenFabric, onBack }) {
    const deals = fabrics.filter(nasajHasActiveDiscount).sort((a, b) => Number(b.discountPercent) - Number(a.discountPercent));

    const permissionText = notificationPermission === 'granted'
        ? 'اعلان مرورگر مجاز است.'
        : notificationPermission === 'denied'
            ? 'مجوز اعلان مرورگر رد شده؛ فهرست تخفیف‌ها همچنان داخل برنامه در دسترس است.'
            : notificationPermission === 'unsupported'
                ? 'این مرورگر اعلان سیستمی را پشتیبانی نمی‌کند؛ فهرست تخفیف‌ها داخل برنامه فعال است.'
                : 'برای نمایش اعلان روی دستگاه، مجوز مرورگر لازم است.';

    return (
        <div className="h-full overflow-y-auto p-3.5 pb-24 no-scrollbar bg-slate-50">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h2 className="font-black text-base text-slate-900">🔔 اعلان و تخفیف‌ها</h2>
                    <p className="text-[10px] text-slate-500 mt-1">پیشنهادهای تخفیف‌دار ثبت‌شده در ویترین</p>
                </div>
                <button onClick={onBack} className="text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl px-3 py-2">بازگشت</button>
            </div>
            <section className="bg-white border border-slate-200 rounded-2xl p-3.5 mb-3">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <h3 className="text-xs font-black text-slate-900">دریافت اعلان تخفیف جدید</h3>
                        <p className="text-[10px] leading-5 text-slate-500 mt-1">هنگام ثبت تخفیف جدید روی همین دستگاه، در صورت پشتیبانی و اجازه مرورگر اعلان نمایش داده می‌شود.</p>
                    </div>
                    <button onClick={onToggleAlerts} className={`shrink-0 px-3 py-2 rounded-xl text-[10px] font-black ${alertsEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                        {alertsEnabled ? 'فعال است ✓' : 'فعال‌سازی'}
                    </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">{permissionText}</p>
            </section>

            {deals.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-6 text-center mt-5">
                    <div className="text-4xl mb-2">🏷️</div>
                    <h3 className="font-bold text-sm text-slate-800">فعلاً تخفیف فعالی ثبت نشده</h3>
                    <p className="text-[11px] text-slate-500 mt-2 leading-6">وقتی فروشنده هنگام ثبت پارچه درصد تخفیف وارد کند، پیشنهادش در این بخش نمایش داده می‌شود.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {deals.map(fabric => {
                        const image = fabric.imageUrl || generateFabricWeaveDataUrl(fabric.colors[0], '#ffffff', fabric.pattern);
                        const originalPrice = nasajParseNumber(fabric.pricePerMeter);
                        return (
                            <article key={fabric.id} onClick={() => onOpenFabric(fabric)} className="bg-white rounded-2xl border border-rose-100 overflow-hidden shadow-sm flex cursor-pointer">
                                <img src={image} alt={fabric.name} className="w-28 h-28 object-cover shrink-0" />
                                <div className="p-3 min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="bg-rose-600 text-white text-[10px] font-black rounded-lg px-2 py-1">{nasajFormatNumber(fabric.discountPercent, 0)}٪ تخفیف</span>
                                        <span className="text-[9px] text-slate-400">{fabric.discountEndDate ? `تا ${fabric.discountEndDate}` : 'بدون تاریخ پایان'}</span>
                                    </div>
                                    <h3 className="font-bold text-xs text-slate-900 mt-2 line-clamp-1">{fabric.name}</h3>
                                    <p className="text-[10px] text-slate-500 mt-1">{fabric.producer}</p>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <span className="font-black text-sm text-rose-600">{nasajFormatNumber(nasajPriceWithDiscount(fabric), 0)} تومان</span>
                                        <span className="text-[9px] line-through text-slate-400">{nasajFormatNumber(originalPrice, 0)} تومان</span>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
            <p className="text-[10px] text-slate-400 leading-6 mt-3">توجه: اعلان فوری بین کاربران و هنگام بسته‌بودن برنامه، به سرور و سرویس Push نیاز دارد؛ نسخه فعلی تخفیف‌های ثبت‌شده در همین دستگاه را مدیریت می‌کند.</p>
        </div>
    );
}

// ==========================================
// ابزار شناسه یکتا و پیوند مستقیم پارچه
// ==========================================
function nasajFabricCode(id) {
    return `NSJ-FAB-${String(id).replace(/[^a-zA-Z0-9-]/g, '').toUpperCase()}`;
}

function nasajBuildFabricPublicUrl(id, batchCode = '') {
    try {
        if (window.location.protocol !== 'https:') return '';
        const url = new URL(window.location.href);
        url.search = '';
        url.hash = '';
        url.searchParams.set('fabric', String(id));
        if (batchCode) url.searchParams.set('batch', String(batchCode));
        return url.toString();
    } catch (error) {
        return '';
    }
}

function nasajFindFabricFromIncomingUrl() {
    try {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('fabric');
        if (!id) return null;
        const saved = JSON.parse(localStorage.getItem('nasaj_yar_fabrics') || '[]');
        const localItems = Array.isArray(saved) ? saved : [];
        return [...localItems, ...INITIAL_FABRICS].find(item => item && String(item.id) === String(id)) || null;
    } catch (error) {
        return null;
    }
}

function nasajRenderQrCanvas(mount, payload, cssSize = 72) {
    if (!mount || !payload || typeof window.NasajQRCode !== 'function') return false;
    mount.innerHTML = '';
    const qr = new window.NasajQRCode(0, window.NasajQRCode.CorrectLevel.M);
    qr.addData(String(payload));
    qr.make();
    const moduleCount = qr.getModuleCount();
    const quietZone = 4;
    const cellSize = 5;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = (moduleCount + quietZone * 2) * cellSize;
    const context = canvas.getContext('2d');
    if (!context) return false;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#17243a';
    for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
            if (qr.isDark(row, col)) {
                context.fillRect((col + quietZone) * cellSize, (row + quietZone) * cellSize, cellSize, cellSize);
            }
        }
    }
    canvas.style.width = `${cssSize}px`;
    canvas.style.height = `${cssSize}px`;
    canvas.setAttribute('aria-label', 'QR برای مشاهده همین پارچه');
    mount.appendChild(canvas);
    return true;
}

function FabricCardQr({ fabric }) {
    const mountRef = useRef(null);
    const publicUrl = nasajBuildFabricPublicUrl(fabric.id);
    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;
        mount.innerHTML = '';
        if (!publicUrl) return;
        try {
            if (!nasajRenderQrCanvas(mount, publicUrl, 70)) {
                mount.innerHTML = '<span class="nasaj-card-qr-offline">QR در دسترس نیست</span>';
            }
        } catch (error) {
            mount.innerHTML = '<span class="nasaj-card-qr-offline">خطا در ساخت QR</span>';
        }
    }, [publicUrl]);

    return (
        <div className="nasaj-fabric-qr-panel" onClick={event => event.stopPropagation()} aria-label={`QR پارچه ${fabric.name}`}>
            <div ref={mountRef} className="nasaj-fabric-qr-canvas">
                {!publicUrl && <span className="nasaj-card-qr-offline">پس از انتشار HTTPS</span>}
            </div>
            <span className="nasaj-fabric-qr-label">اسکن و مشاهده</span>
            <small dir="ltr">{nasajFabricCode(fabric.id)}</small>
        </div>
    );
}

// ==========================================
// ۱۱. شناسنامه و QR اختصاصی پارچه
// ==========================================
function FabricQrPage({ fabrics, initialFabricId }) {
    const [selectedId, setSelectedId] = useState(String(initialFabricId || (fabrics[0] && fabrics[0].id) || ''));
    const [batchCode, setBatchCode] = useState('');
    const [notice, setNotice] = useState('');
    const qrMountRef = useRef(null);

    const selectedFabric = fabrics.find(item => String(item.id) === String(selectedId)) || fabrics[0] || null;
    const fabricCode = selectedFabric ? nasajFabricCode(selectedFabric.id) : '';
    const qrPayload = selectedFabric ? nasajBuildFabricPublicUrl(selectedFabric.id, batchCode.trim()) : '';

    useEffect(() => {
        const mount = qrMountRef.current;
        if (!mount) return;
        mount.innerHTML = '';
        if (!selectedFabric) return;
        if (!qrPayload) {
            mount.innerHTML = '<div class="nasaj-qr-fallback">برای ساخت QR قابل اسکن، برنامه را روی نشانی عمومی HTTPS منتشر کنید.</div>';
            return;
        }
        try {
            if (!nasajRenderQrCanvas(mount, qrPayload, 260)) {
                mount.innerHTML = '<div class="nasaj-qr-fallback">کتابخانه ساخت QR بارگذاری نشد.</div>';
            }
        } catch (error) {
            console.error('Fabric QR generation failed:', error);
            mount.innerHTML = '<div class="nasaj-qr-fallback">ساخت کد انجام نشد؛ اطلاعات انتخابی را بررسی کنید.</div>';
        }
    }, [selectedId, batchCode, fabrics]);

    const downloadQr = () => {
        const mount = qrMountRef.current;
        if (!mount) return;
        const canvas = mount.querySelector('canvas');
        const image = mount.querySelector('img');
        const source = canvas ? canvas.toDataURL('image/png') : (image ? image.src : '');
        if (!source) { setNotice('کد QR هنوز آماده نشده است.'); return; }
        const link = document.createElement('a');
        link.href = source;
        link.download = `${fabricCode || 'nasajyar-qr'}${batchCode.trim() ? `-${batchCode.trim()}` : ''}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setNotice('تصویر QR آماده و ذخیره شد.');
    };

    const printLabel = () => {
        const mount = qrMountRef.current;
        const canvas = mount && mount.querySelector('canvas');
        if (!canvas || !selectedFabric) { setNotice('ابتدا کد QR را آماده کن.'); return; }
        const popup = window.open('', '_blank', 'width=760,height=720');
        if (!popup) { setNotice('پنجره چاپ توسط مرورگر مسدود شد؛ اجازه بازشدن پنجره را فعال کن.'); return; }
        const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[char]));
        const imageUrl = canvas.toDataURL('image/png');
        const detailRows = [
            ['ترکیب الیاف', selectedFabric.rawMaterials || 'ثبت نشده'],
            ['گرماژ', selectedFabric.gsm ? `${selectedFabric.gsm} g/m²` : 'ثبت نشده'],
            ['عرض', selectedFabric.width ? `${selectedFabric.width} cm` : 'ثبت نشده'],
            ['کد بچ / طاقه', batchCode.trim() || '—']
        ];
        const detailsHtml = detailRows.map(row => `<div class="spec"><span>${escapeHtml(row[0])}</span><b>${escapeHtml(row[1])}</b></div>`).join('');
        popup.document.open();
        popup.document.write(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>برچسب پارچه ${escapeHtml(fabricCode)}</title><style>@page{size:100mm 125mm;margin:5mm}*{box-sizing:border-box}body{margin:0;padding:0;font-family:Vazirmatn,Tahoma,Arial,sans-serif;color:#17243a;background:#fff}.label{width:90mm;min-height:112mm;margin:0 auto;padding:7mm;border:1px solid #d8dde4;border-radius:5mm}.head{display:flex;justify-content:space-between;align-items:center;padding-bottom:4mm;border-bottom:1px solid #e6e9ed}.brand{font-size:14pt;font-weight:900}.sub{font-family:Arial,sans-serif;font-size:6pt;letter-spacing:1px;color:#987458}.tag{font-size:7pt;color:#987458}.qr{display:block;width:61mm;height:61mm;object-fit:contain;margin:5mm auto 3mm}.name{text-align:center;font-size:12pt;font-weight:900;line-height:1.7}.code{text-align:center;margin-top:1mm;font-family:monospace;font-size:8pt;letter-spacing:1px;color:#a47755}.specs{display:grid;grid-template-columns:1fr 1fr;gap:2mm;margin-top:5mm}.spec{padding:2.5mm;border:1px solid #e7eaed;border-radius:2mm}.spec span{display:block;color:#778292;font-size:6pt}.spec b{display:block;margin-top:1mm;font-size:7pt;line-height:1.5}.foot{margin-top:4mm;padding-top:3mm;border-top:1px solid #e6e9ed;text-align:center;color:#87909c;font-family:Arial,sans-serif;font-size:6pt;letter-spacing:1px}@media screen{body{padding:20px;background:#edf0f3}.label{box-shadow:0 12px 30px rgba(20,30,45,.12)}}@media print{.label{border:0;border-radius:0}}</style></head><body><main class="label"><header class="head"><div><div class="brand">نساج‌یار</div><div class="sub">TEXTILE DIGITAL PASSPORT</div></div><div class="tag">شناسه دیجیتال پارچه</div></header><img class="qr" src="${imageUrl}" alt="QR پارچه"><div class="name">${escapeHtml(selectedFabric.name)}</div><div class="code">${escapeHtml(fabricCode)}</div><section class="specs">${detailsHtml}</section><footer class="foot">SCAN · IDENTIFY · CREATE</footer></main><script>window.onload=function(){setTimeout(function(){window.focus();window.print();},450)};<\/script></body></html>`);
        popup.document.close();
        setNotice('برچسب آماده چاپ است.');
    };

    const copyCode = async () => {
        try {
            await navigator.clipboard.writeText(fabricCode);
            setNotice('شناسه پارچه کپی شد.');
        } catch {
            setNotice(`شناسه پارچه: ${fabricCode}`);
        }
    };

    return (
        <div className="nasaj-newpage-scroll h-full overflow-y-auto no-scrollbar p-3.5 pb-28">
            <section className="nasaj-qr-hero">
                <div className="nasaj-qr-hero-top"><span className="nasaj-pro-kicker">TEXTILE IDENTITY · 01</span><span className="nasaj-qr-chip"><i></i> شناسنامه دیجیتال</span></div>
                <div className="nasaj-qr-hero-copy">
                    <div><h2>هویت اختصاصی<br /><em>برای هر پارچه</em></h2><p>QR را اسکن کن تا صفحه جزئیات، تصویر و شناسه دقیق همان پارچه در نساج‌یار باز شود.</p></div>
                    <div className="nasaj-qr-hero-mark" aria-hidden="true"><span>QR</span><i></i><b></b></div>
                </div>
                <div className="nasaj-qr-hero-foot"><span>شناسه یکتا</span><strong>{fabricCode || 'NSJ-FAB-——'}</strong></div>
            </section>

            <section className="nasaj-qr-layout">
                <div className="nasaj-qr-config nasaj-pro-card">
                    <div className="nasaj-pro-card-heading"><div><span className="nasaj-pro-eyebrow">01 / انتخاب محصول</span><h3>پارچه موردنظر را انتخاب کن</h3></div><span className="nasaj-pro-step">۱</span></div>
                    {fabrics.length ? (
                        <>
                            <label className="nasaj-pro-field"><span>نام پارچه</span><select value={selectedFabric ? String(selectedFabric.id) : ''} onChange={event => { setSelectedId(event.target.value); setNotice(''); }}>
                                {fabrics.map(fabric => <option key={fabric.id} value={String(fabric.id)}>{fabric.name}</option>)}
                            </select></label>
                            {selectedFabric && <div className="nasaj-qr-fabric-summary">
                                <div className="nasaj-qr-fabric-swatches">{(selectedFabric.colors || []).slice(0, 4).map((color, index) => <i key={`${color}-${index}`} style={{ background: color }} />)}</div>
                                <div className="nasaj-qr-fabric-copy"><strong>{selectedFabric.name}</strong><small>{selectedFabric.producer || 'تولیدکننده ثبت نشده'}</small></div>
                                <span className="nasaj-qr-fabric-code">{selectedFabric.code || `#${selectedFabric.id}`}</span>
                            </div>}
                            <label className="nasaj-pro-field"><span>کد بچ / شماره طاقه <small>اختیاری</small></span><input value={batchCode} onChange={event => setBatchCode(event.target.value.slice(0, 32))} placeholder="مثلاً LOT-1405-018" dir="ltr" /></label>
                            <div className="nasaj-qr-spec-grid">
                                <div><small>گرماژ</small><strong>{selectedFabric && selectedFabric.gsm ? `${nasajFormatNumber(selectedFabric.gsm, 0)} g/m²` : 'ثبت نشده'}</strong></div>
                                <div><small>عرض پارچه</small><strong>{selectedFabric && selectedFabric.width ? `${nasajFormatNumber(selectedFabric.width, 0)} cm` : 'ثبت نشده'}</strong></div>
                                <div><small>فصل مصرف</small><strong>{selectedFabric && selectedFabric.season || 'ثبت نشده'}</strong></div>
                                <div><small>نوع بافت</small><strong>{selectedFabric && selectedFabric.fabricType || 'ثبت نشده'}</strong></div>
                            </div>
                        </>
                    ) : <div className="nasaj-pro-empty">هنوز پارچه‌ای برای ساخت QR ثبت نشده است.</div>}
                </div>

                <div className="nasaj-qr-output-card">
                    <div className="nasaj-qr-output-head"><div><span>NASAJYAR · FABRIC PASSPORT</span><strong>کد شناسایی پارچه</strong></div><b>نساج‌یار</b></div>
                    <div className="nasaj-qr-code-frame"><div className="nasaj-qr-code-mount" ref={qrMountRef}></div><div className="nasaj-qr-code-caption"><span>SCAN TO KNOW THE FABRIC</span><i></i></div></div>
                    <strong className="nasaj-qr-output-name">{selectedFabric ? selectedFabric.name : 'پارچه‌ای انتخاب نشده'}</strong>
                    <span className="nasaj-qr-output-id">{fabricCode}</span>
                    <div className="nasaj-qr-output-actions"><button type="button" onClick={downloadQr} disabled={!selectedFabric}>↓ دانلود QR</button><button type="button" onClick={printLabel} disabled={!selectedFabric}>چاپ برچسب</button><button type="button" onClick={copyCode} disabled={!selectedFabric}>کپی شناسه</button></div>
                    {notice && <p className="nasaj-qr-notice" role="status">{notice}</p>}
                </div>
            </section>

            <section className="nasaj-qr-benefits nasaj-pro-card">
                <div className="nasaj-pro-card-heading"><div><span className="nasaj-pro-eyebrow">02 / اطلاعات داخل QR</span><h3>چه چیزی با اسکن کد نمایش داده می‌شود؟</h3></div><span className="nasaj-qr-lock">⌑</span></div>
                <div className="nasaj-qr-benefit-list">
                    <div><i>01</i><span><b>پیوند مستقیم</b><small>بازشدن صفحه جزئیات همان شناسه در اپ</small></span><em>✓</em></div>
                    <div><i>02</i><span><b>تصویر و هویت</b><small>عکس پارچه همراه کد یکتای NSJ-FAB</small></span><em>✓</em></div>
                    <div><i>03</i><span><b>اطلاعات طاقه</b><small>کد بچ اختیاری در صورت ثبت</small></span><em>✓</em></div>
                    <div><i>04</i><span><b>مشخصات کامل</b><small>مشخصات فنی و راهنمای نگهداری در صفحه پارچه</small></span><em>✓</em></div>
                </div>
                <p className="nasaj-qr-disclaimer">QR به نشانی مستقیم همان پارچه وصل است و با اسکن آن تصویر و شناسنامه همان شناسه باز می‌شود. این قابلیت به انتشار برنامه روی HTTPS نیاز دارد. پارچه‌های نمونه اولیه در همه دستگاه‌ها در دسترس‌اند؛ پارچه‌ای که کاربر خودش ثبت کرده فعلاً فقط در همان مرورگر ذخیره می‌شود و برای مشاهده آن روی گوشی دیگر باید پایگاه داده مشترک به اپ اضافه شود.</p>
            </section>
        </div>
    );
}

// ویرایشگر تصویری محلی؛ پردازش تمام تصاویر روی Canvas و داخل مرورگر انجام می‌شود.
function DesignImageEditor({ onUseImage }) {
    const [imageData, setImageData] = useState('');
    const [imageInfo, setImageInfo] = useState(null);
    const [rotation, setRotation] = useState(0);
    const [flipX, setFlipX] = useState(false);
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [saturation, setSaturation] = useState(100);
    const [panel, setPanel] = useState('image');
    const [backgroundMode, setBackgroundMode] = useState('transparent');
    const [backgroundImage, setBackgroundImage] = useState('');
    const [backgroundColor, setBackgroundColor] = useState('#F2EDE6');
    const [gradientStart, setGradientStart] = useState('#F5E9DD');
    const [gradientEnd, setGradientEnd] = useState('#D7E0E8');
    const [removeBackground, setRemoveBackground] = useState(false);
    const [keyColor, setKeyColor] = useState('#FFFFFF');
    const [keyTolerance, setKeyTolerance] = useState(42);
    const [sampleMode, setSampleMode] = useState(false);
    const [cropMode, setCropMode] = useState(false);
    const [cropRect, setCropRect] = useState({ x: 9, y: 9, w: 82, h: 82 });
    const [textDraft, setTextDraft] = useState('نام یا عنوان طراحی');
    const [textColor, setTextColor] = useState('#17243A');
    const [textSize, setTextSize] = useState(54);
    const [shapeColor, setShapeColor] = useState('#C58C68');
    const [notice, setNotice] = useState('');
    const [layers, setLayers] = useState([]);
    const [selectedLayerId, setSelectedLayerId] = useState('');
    const stageRef = useRef(null);
    const canvasRef = useRef(null);
    const imageInputRef = useRef(null);
    const layerImageInputRef = useRef(null);
    const backgroundInputRef = useRef(null);
    const imageElementRef = useRef(null);
    const transformedCanvasRef = useRef(null);
    const filteredCanvasRef = useRef(null);
    const layerImageCacheRef = useRef({});
    const cropDragRef = useRef(null);
    const renderTokenRef = useRef(0);
    const [canvasSize, setCanvasSize] = useState({ width: 900, height: 600 });

    useEffect(() => {
        if (!imageData) {
            imageElementRef.current = null;
            setImageInfo(null);
            return undefined;
        }
        let cancelled = false;
        const image = new Image();
        image.onload = () => {
            if (cancelled) return;
            imageElementRef.current = image;
            setImageInfo({ width: image.naturalWidth || image.width, height: image.naturalHeight || image.height });
        };
        image.onerror = () => setNotice('بازکردن این تصویر ممکن نشد. یک فایل تصویری دیگر انتخاب کن.');
        image.src = imageData;
        return () => { cancelled = true; };
    }, [imageData]);

    useEffect(() => {
        let cancelled = false;
        const token = ++renderTokenRef.current;
        const source = imageElementRef.current;
        if (!source || !imageInfo || !canvasRef.current) return undefined;

        const render = async () => {
            const swap = Math.abs(rotation % 180) === 90;
            const width = Math.max(1, Math.round(swap ? imageInfo.height : imageInfo.width));
            const height = Math.max(1, Math.round(swap ? imageInfo.width : imageInfo.height));

            const transformed = document.createElement('canvas');
            transformed.width = width;
            transformed.height = height;
            const transformedContext = transformed.getContext('2d');
            transformedContext.translate(width / 2, height / 2);
            transformedContext.rotate((rotation * Math.PI) / 180);
            transformedContext.scale(flipX ? -1 : 1, 1);
            transformedContext.drawImage(source, -imageInfo.width / 2, -imageInfo.height / 2, imageInfo.width, imageInfo.height);
            transformedCanvasRef.current = transformed;

            const filtered = document.createElement('canvas');
            filtered.width = width;
            filtered.height = height;
            const filteredContext = filtered.getContext('2d', { willReadFrequently: true });
            filteredContext.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
            filteredContext.drawImage(transformed, 0, 0);
            filteredContext.filter = 'none';

            if (removeBackground) {
                const pixels = filteredContext.getImageData(0, 0, width, height);
                const data = pixels.data;
                const target = keyColor.match(/[\da-f]{2}/gi).map(value => parseInt(value, 16));
                for (let index = 0; index < data.length; index += 4) {
                    if (data[index + 3] === 0) continue;
                    const red = data[index] - target[0];
                    const green = data[index + 1] - target[1];
                    const blue = data[index + 2] - target[2];
                    const distance = Math.sqrt(red * red + green * green + blue * blue);
                    if (distance <= keyTolerance) data[index + 3] = 0;
                    else if (distance < keyTolerance + 28) data[index + 3] = Math.round(data[index + 3] * ((distance - keyTolerance) / 28));
                }
                filteredContext.putImageData(pixels, 0, 0);
            }
            filteredCanvasRef.current = filtered;

            const output = document.createElement('canvas');
            output.width = width;
            output.height = height;
            const context = output.getContext('2d');
            if (backgroundMode === 'solid') {
                context.fillStyle = backgroundColor;
                context.fillRect(0, 0, width, height);
            } else if (backgroundMode === 'gradient') {
                const gradient = context.createLinearGradient(0, 0, width, height);
                gradient.addColorStop(0, gradientStart);
                gradient.addColorStop(1, gradientEnd);
                context.fillStyle = gradient;
                context.fillRect(0, 0, width, height);
            } else if (backgroundMode === 'image' && backgroundImage) {
                let backgroundElement = layerImageCacheRef.current.background;
                if (!backgroundElement || backgroundElement.src !== backgroundImage) {
                    backgroundElement = new Image();
                    backgroundElement.src = backgroundImage;
                    layerImageCacheRef.current.background = backgroundElement;
                    if (!backgroundElement.complete) await new Promise(resolve => {
                        backgroundElement.onload = resolve;
                        backgroundElement.onerror = resolve;
                    });
                }
                if (backgroundElement.naturalWidth) {
                    const scale = Math.max(width / backgroundElement.naturalWidth, height / backgroundElement.naturalHeight);
                    const drawWidth = backgroundElement.naturalWidth * scale;
                    const drawHeight = backgroundElement.naturalHeight * scale;
                    context.drawImage(backgroundElement, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
                } else {
                    context.fillStyle = backgroundColor;
                    context.fillRect(0, 0, width, height);
                }
            }
            context.drawImage(filtered, 0, 0);

            for (const layer of layers) {
                if (!layer.visible) continue;
                const x = (Number(layer.x) || 50) * width / 100;
                const y = (Number(layer.y) || 50) * height / 100;
                context.save();
                context.globalAlpha = Math.max(0, Math.min(1, Number(layer.opacity ?? 1)));
                if (layer.type === 'text') {
                    const fontSize = Math.max(8, Number(layer.size) || 54);
                    context.font = `${layer.bold ? '900' : '600'} ${fontSize}px ${layer.font || 'Vazirmatn, sans-serif'}`;
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    context.direction = 'rtl';
                    if (layer.shadow) {
                        context.shadowColor = 'rgba(0,0,0,.22)';
                        context.shadowBlur = 8;
                        context.shadowOffsetY = 3;
                    }
                    context.fillStyle = layer.color || '#17243A';
                    context.fillText(layer.text || '', x, y, width * 0.84);
                } else if (layer.type === 'rect' || layer.type === 'circle') {
                    const shapeWidth = Math.max(10, Number(layer.width) || 28) * width / 100;
                    const shapeHeight = Math.max(10, Number(layer.height) || 18) * height / 100;
                    context.fillStyle = layer.color || '#C58C68';
                    if (layer.type === 'circle') {
                        context.beginPath();
                        context.ellipse(x, y, shapeWidth / 2, shapeHeight / 2, 0, 0, Math.PI * 2);
                        context.fill();
                    } else {
                        context.fillRect(x - shapeWidth / 2, y - shapeHeight / 2, shapeWidth, shapeHeight);
                    }
                } else if (layer.type === 'image' && layer.src) {
                    let overlayImage = layerImageCacheRef.current[layer.id];
                    if (!overlayImage) {
                        overlayImage = new Image();
                        overlayImage.src = layer.src;
                        layerImageCacheRef.current[layer.id] = overlayImage;
                        if (!overlayImage.complete) await new Promise(resolve => {
                            overlayImage.onload = resolve;
                            overlayImage.onerror = resolve;
                        });
                    }
                    const layerWidth = Math.max(5, Number(layer.width) || 32) * width / 100;
                    const layerHeight = layerWidth * ((overlayImage.naturalHeight || 1) / (overlayImage.naturalWidth || 1));
                    context.drawImage(overlayImage, x - layerWidth / 2, y - layerHeight / 2, layerWidth, layerHeight);
                }
                context.restore();
            }
            if (cancelled || token !== renderTokenRef.current || !canvasRef.current) return;
            const visibleCanvas = canvasRef.current;
            visibleCanvas.width = width;
            visibleCanvas.height = height;
            visibleCanvas.getContext('2d').clearRect(0, 0, width, height);
            visibleCanvas.getContext('2d').drawImage(output, 0, 0);
            setCanvasSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
        };
        render().catch(error => {
            console.error('خطا در رندر ویرایشگر تصویر:', error);
            setNotice('پردازش تصویر انجام نشد. ممکن است تصویر برای حافظه این دستگاه بزرگ باشد.');
        });
        return () => { cancelled = true; };
    }, [imageData, imageInfo, rotation, flipX, brightness, contrast, saturation, backgroundMode, backgroundImage, backgroundColor, gradientStart, gradientEnd, removeBackground, keyColor, keyTolerance, layers]);

    const readImageFile = (file, done) => {
        if (!file || !file.type.startsWith('image/')) {
            setNotice('لطفاً یک فایل تصویری انتخاب کن.');
            return;
        }
        if (file.size > 18 * 1024 * 1024) {
            setNotice('حجم تصویر باید کمتر از ۱۸ مگابایت باشد.');
            return;
        }
        const reader = new FileReader();
        reader.onerror = () => setNotice('خواندن فایل تصویر انجام نشد.');
        reader.onload = () => {
            const image = new Image();
            image.onload = () => {
                const maxSide = 1800;
                const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
                const temp = document.createElement('canvas');
                temp.width = Math.max(1, Math.round(image.width * scale));
                temp.height = Math.max(1, Math.round(image.height * scale));
                const context = temp.getContext('2d');
                context.drawImage(image, 0, 0, temp.width, temp.height);
                const data = file.type === 'image/png' ? temp.toDataURL('image/png') : temp.toDataURL('image/jpeg', 0.91);
                done(data);
            };
            image.onerror = () => setNotice('بازکردن فایل انتخاب‌شده ممکن نشد.');
            image.src = String(reader.result || '');
        };
        reader.readAsDataURL(file);
    };

    const handleMainImage = event => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        readImageFile(file, data => {
            setImageData(data);
            setRotation(0);
            setFlipX(false);
            setLayers([]);
            setSelectedLayerId('');
            setBrightness(100);
            setContrast(100);
            setSaturation(100);
            setRemoveBackground(false);
            setSampleMode(false);
            setCropMode(false);
            setBackgroundMode('transparent');
            setNotice('تصویر آماده ویرایش است. از ابزارهای بالای بوم یا پنل کناری استفاده کن.');
        });
        event.target.value = '';
    };

    const handleLayerImage = event => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        readImageFile(file, data => {
            const id = `layer-${Date.now()}`;
            setLayers(previous => [...previous, { id, type: 'image', name: file.name || 'تصویر افزوده‌شده', src: data, x: 50, y: 50, width: 34, opacity: 1, visible: true }]);
            setSelectedLayerId(id);
            setPanel('layers');
            setNotice('تصویر به‌عنوان یک لایه تازه اضافه شد.');
        });
        event.target.value = '';
    };

    const handleBackgroundImage = event => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        readImageFile(file, data => {
            setBackgroundImage(data);
            setBackgroundMode('image');
            setPanel('background');
            setNotice('تصویر پس‌زمینه اضافه شد؛ برای دیده‌شدن آن، با قطره‌چکان رنگ پس‌زمینه قبلی را حذف کن.');
        });
        event.target.value = '';
    };

    const addTextLayer = () => {
        if (!textDraft.trim()) return;
        const id = `layer-${Date.now()}`;
        setLayers(previous => [...previous, { id, type: 'text', name: textDraft.trim().slice(0, 32), text: textDraft.trim(), color: textColor, size: textSize, font: 'Vazirmatn, sans-serif', bold: true, shadow: false, x: 50, y: 82, opacity: 1, visible: true }]);
        setSelectedLayerId(id);
        setPanel('layers');
        setNotice('متن روی بوم اضافه شد. از بخش لایه‌ها می‌توانی اندازه و جای آن را تنظیم کنی.');
    };

    const addShapeLayer = type => {
        const id = `layer-${Date.now()}`;
        setLayers(previous => [...previous, { id, type, name: type === 'circle' ? 'دایره' : 'مستطیل', color: shapeColor, width: 28, height: 18, x: 50, y: 50, opacity: 0.72, visible: true }]);
        setSelectedLayerId(id);
        setPanel('layers');
    };

    const updateSelectedLayer = (key, value) => {
        setLayers(previous => previous.map(layer => layer.id === selectedLayerId ? { ...layer, [key]: value } : layer));
    };
    const selectedLayer = layers.find(layer => layer.id === selectedLayerId) || null;

    const getStagePoint = event => {
        const bounds = stageRef.current.getBoundingClientRect();
        return {
            x: Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)),
            y: Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100))
        };
    };
    const handleStagePointerDown = event => {
        if (!cropMode) return;
        event.preventDefault();
        const point = getStagePoint(event);
        cropDragRef.current = { x: point.x, y: point.y };
        setCropRect({ x: point.x, y: point.y, w: 0, h: 0 });
        if (stageRef.current.setPointerCapture) stageRef.current.setPointerCapture(event.pointerId);
    };
    const handleStagePointerMove = event => {
        if (!cropMode || !cropDragRef.current) return;
        const point = getStagePoint(event);
        const start = cropDragRef.current;
        setCropRect({ x: Math.min(start.x, point.x), y: Math.min(start.y, point.y), w: Math.abs(point.x - start.x), h: Math.abs(point.y - start.y) });
    };
    const handleStagePointerUp = () => { cropDragRef.current = null; };

    const applyCrop = () => {
        const source = transformedCanvasRef.current;
        if (!source) return;
        const x = Math.max(0, Math.round((cropRect.x / 100) * source.width));
        const y = Math.max(0, Math.round((cropRect.y / 100) * source.height));
        const width = Math.max(1, Math.min(source.width - x, Math.round((cropRect.w / 100) * source.width)));
        const height = Math.max(1, Math.min(source.height - y, Math.round((cropRect.h / 100) * source.height)));
        if (width < 20 || height < 20) {
            setNotice('ناحیه برش خیلی کوچک است؛ یک محدوده بزرگ‌تر روی تصویر بکش.');
            return;
        }
        const cropped = document.createElement('canvas');
        cropped.width = width;
        cropped.height = height;
        cropped.getContext('2d').drawImage(source, x, y, width, height, 0, 0, width, height);
        setImageData(cropped.toDataURL('image/png'));
        setRotation(0);
        setFlipX(false);
        setCropMode(false);
        setCropRect({ x: 9, y: 9, w: 82, h: 82 });
        setNotice('برش تصویر اعمال شد. سایر تنظیمات و لایه‌ها حفظ شدند.');
    };

    const sampleBackground = event => {
        if (!sampleMode) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min((filteredCanvasRef.current?.width || 1) - 1, Math.floor(((event.clientX - bounds.left) / bounds.width) * (filteredCanvasRef.current?.width || 1))));
        const y = Math.max(0, Math.min((filteredCanvasRef.current?.height || 1) - 1, Math.floor(((event.clientY - bounds.top) / bounds.height) * (filteredCanvasRef.current?.height || 1))));
        const pixel = filteredCanvasRef.current?.getContext('2d', { willReadFrequently: true }).getImageData(x, y, 1, 1).data;
        if (!pixel || pixel[3] === 0) {
            setNotice('این نقطه شفاف است؛ یک قسمت رنگی از پس‌زمینه را انتخاب کن.');
            return;
        }
        const hex = `#${[pixel[0], pixel[1], pixel[2]].map(value => value.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
        setKeyColor(hex);
        setRemoveBackground(true);
        setSampleMode(false);
        setPanel('background');
        setNotice(`رنگ ${hex} انتخاب شد؛ میزان حذف را با نوار حساسیت تنظیم کن.`);
    };

    const downloadPng = () => {
        if (!canvasRef.current) return;
        const link = document.createElement('a');
        link.href = canvasRef.current.toDataURL('image/png');
        link.download = 'nasajyar-design.png';
        link.click();
        setNotice('خروجی PNG آماده شد.');
    };
    const useInProject = () => {
        if (!canvasRef.current || !imageData) return;
        const flattened = document.createElement('canvas');
        const scale = Math.min(1, 1400 / Math.max(canvasRef.current.width, canvasRef.current.height));
        flattened.width = Math.max(1, Math.round(canvasRef.current.width * scale));
        flattened.height = Math.max(1, Math.round(canvasRef.current.height * scale));
        const context = flattened.getContext('2d');
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, flattened.width, flattened.height);
        context.drawImage(canvasRef.current, 0, 0, flattened.width, flattened.height);
        onUseImage(flattened.toDataURL('image/jpeg', 0.82));
        setNotice('تصویر ویرایش‌شده به پیش‌نمایش پروژه اضافه شد. حالا می‌توانی مشخصات پروژه را ذخیره کنی.');
    };
    const resetAdjustments = () => {
        setRotation(0);
        setFlipX(false);
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
        setRemoveBackground(false);
        setSampleMode(false);
        setCropMode(false);
        setBackgroundMode('transparent');
        setLayers([]);
        setSelectedLayerId('');
        setNotice('تنظیمات و لایه‌ها به حالت اولیه برگشتند.');
    };
    const moveLayer = (index, direction) => {
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= layers.length) return;
        setLayers(previous => {
            const copy = [...previous];
            [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
            return copy;
        });
    };

    return (
        <section className="nasaj-editor-shell">
            <div className="nasaj-editor-heading">
                <div><span className="nasaj-pro-eyebrow">PIXEL STUDIO / IMAGE LAB</span><h3>میز کار ویرایش تصویر</h3><p>تصویرت را وارد کن، ویرایش کن و خروجی نهایی را به پروژه طراحی اضافه کن.</p></div>
                <span className="nasaj-editor-status"><i></i> پردازش محلی</span>
            </div>
            <input ref={imageInputRef} type="file" accept="image/*" className="nasaj-editor-hidden-input" onChange={handleMainImage} />
            <input ref={layerImageInputRef} type="file" accept="image/*" className="nasaj-editor-hidden-input" onChange={handleLayerImage} />
            <input ref={backgroundInputRef} type="file" accept="image/*" className="nasaj-editor-hidden-input" onChange={handleBackgroundImage} />
            {!imageData ? (
                <div className="nasaj-editor-empty">
                    <div className="nasaj-editor-empty-icon">✧</div>
                    <strong>برای شروع، یک تصویر وارد کن</strong>
                    <p>عکس لباس، اسکچ دستی، طرح پارچه یا تصویر دلخواهت را از گوشی یا کامپیوتر انتخاب کن.</p>
                    <button type="button" onClick={() => imageInputRef.current?.click()}>＋ انتخاب تصویر از دستگاه</button>
                    <small>JPG · PNG · WEBP · حداکثر ۱۸ مگابایت؛ تصویر برای ویرایش به اندازه مناسب تبدیل می‌شود.</small>
                </div>
            ) : (
                <>
                    <div className="nasaj-editor-toolbar">
                        <button type="button" className={cropMode ? 'is-active' : ''} onClick={() => { setCropMode(value => !value); setSampleMode(false); setCropRect({ x: 9, y: 9, w: 82, h: 82 }); }}><b>⌗</b> برش تصویر</button>
                        {cropMode ? <><button type="button" className="nasaj-editor-toolbar-primary" onClick={applyCrop}>تأیید برش</button><button type="button" onClick={() => setCropMode(false)}>لغو</button></> : <>
                            <button type="button" title="چرخش پادساعت‌گرد" onClick={() => setRotation(value => (value + 270) % 360)}>↶ چرخش</button>
                            <button type="button" title="قرینه‌سازی افقی" onClick={() => setFlipX(value => !value)} className={flipX ? 'is-active' : ''}>⇋ قرینه</button>
                            <button type="button" onClick={() => imageInputRef.current?.click()}>＋ تصویر جدید</button>
                        </>}
                        <span className="nasaj-editor-toolbar-spacer"></span>
                        <button type="button" className="nasaj-editor-download" onClick={downloadPng}>↓ دانلود PNG</button>
                        <button type="button" className="nasaj-editor-use" onClick={useInProject}>استفاده در پروژه ✓</button>
                    </div>

                    <div className="nasaj-editor-layout">
                        <div className="nasaj-editor-workspace">
                            <div className={`nasaj-editor-stage-wrap ${sampleMode ? 'is-sampling' : ''} ${cropMode ? 'is-cropping' : ''}`}>
                                <div
                                    className="nasaj-editor-stage"
                                    ref={stageRef}
                                    style={{ aspectRatio: `${canvasSize.width} / ${canvasSize.height}`, width: `min(100%, ${Math.round(420 * canvasSize.width / canvasSize.height)}px)` }}
                                    onPointerDown={handleStagePointerDown}
                                    onPointerMove={handleStagePointerMove}
                                    onPointerUp={handleStagePointerUp}
                                    onPointerCancel={handleStagePointerUp}
                                >
                                    <canvas ref={canvasRef} onClick={sampleBackground} />
                                    {cropMode && <div className="nasaj-editor-crop-box" style={{ left: `${cropRect.x}%`, top: `${cropRect.y}%`, width: `${cropRect.w}%`, height: `${cropRect.h}%` }}><span>ناحیه برش</span></div>}
                                    {sampleMode && <div className="nasaj-editor-sample-hint">روی رنگ پس‌زمینه ضربه بزن</div>}
                                </div>
                            </div>
                            <div className="nasaj-editor-canvas-meta"><span>{imageInfo ? `${imageInfo.width} × ${imageInfo.height} px` : '—'}</span><span>{layers.length} لایه</span><span>{rotation ? `${rotation}°` : 'بدون چرخش'}</span></div>
                            {cropMode && <p className="nasaj-editor-help">با لمس و کشیدن روی تصویر، محدوده دلخواه برش را مشخص کن؛ سپس «تأیید برش» را بزن.</p>}
                            {sampleMode && <p className="nasaj-editor-help">یک قسمت یکنواخت از پس‌زمینه را انتخاب کن؛ رنگ انتخابی شفاف می‌شود.</p>}
                        </div>

                        <aside className="nasaj-editor-sidebar">
                            <div className="nasaj-editor-panel-tabs" role="tablist" aria-label="ابزارهای ویرایش">
                                <button type="button" className={panel === 'image' ? 'is-active' : ''} onClick={() => setPanel('image')}>تصویر</button>
                                <button type="button" className={panel === 'background' ? 'is-active' : ''} onClick={() => setPanel('background')}>پس‌زمینه</button>
                                <button type="button" className={panel === 'text' ? 'is-active' : ''} onClick={() => setPanel('text')}>متن و شکل</button>
                                <button type="button" className={panel === 'layers' ? 'is-active' : ''} onClick={() => setPanel('layers')}>لایه‌ها</button>
                            </div>

                            {panel === 'image' && <div className="nasaj-editor-controls">
                                <div className="nasaj-editor-panel-title"><strong>تنظیمات تصویر</strong><button type="button" onClick={resetAdjustments}>بازنشانی</button></div>
                                <label className="nasaj-editor-range"><span>روشنایی <b>{brightness}%</b></span><input type="range" min="40" max="180" value={brightness} onChange={event => setBrightness(Number(event.target.value))} /></label>
                                <label className="nasaj-editor-range"><span>کنتراست <b>{contrast}%</b></span><input type="range" min="40" max="180" value={contrast} onChange={event => setContrast(Number(event.target.value))} /></label>
                                <label className="nasaj-editor-range"><span>اشباع رنگ <b>{saturation}%</b></span><input type="range" min="0" max="200" value={saturation} onChange={event => setSaturation(Number(event.target.value))} /></label>
                                <div className="nasaj-editor-quick-filters"><button type="button" onClick={() => { setBrightness(108); setContrast(112); setSaturation(118); }}>زنده و شفاف</button><button type="button" onClick={() => { setBrightness(100); setContrast(82); setSaturation(0); }}>سیاه‌وسفید</button><button type="button" onClick={() => { setBrightness(96); setContrast(112); setSaturation(82); }}>گرم و سینمایی</button></div>
                                <div className="nasaj-editor-divider"></div>
                                <strong className="nasaj-editor-subtitle">تغییر جهت و اندازه</strong>
                                <div className="nasaj-editor-button-grid"><button type="button" onClick={() => setRotation(value => (value + 90) % 360)}>چرخش ۹۰° راست</button><button type="button" onClick={() => setRotation(value => (value + 270) % 360)}>چرخش ۹۰° چپ</button><button type="button" onClick={() => setFlipX(value => !value)}>قرینه افقی</button><button type="button" onClick={() => { setRotation(0); setFlipX(false); }}>حالت اولیه</button></div>
                            </div>}

                            {panel === 'background' && <div className="nasaj-editor-controls">
                                <strong className="nasaj-editor-subtitle">پس‌زمینه خروجی</strong>
                                <div className="nasaj-editor-background-choices">
                                    <button type="button" className={backgroundMode === 'transparent' ? 'is-active' : ''} onClick={() => setBackgroundMode('transparent')}><span className="nasaj-editor-checker"></span>شفاف</button>
                                    <button type="button" className={backgroundMode === 'solid' ? 'is-active' : ''} onClick={() => setBackgroundMode('solid')}><span style={{ background: backgroundColor }}></span>رنگ ساده</button>
                                    <button type="button" className={backgroundMode === 'gradient' ? 'is-active' : ''} onClick={() => setBackgroundMode('gradient')}><span style={{ background: `linear-gradient(135deg,${gradientStart},${gradientEnd})` }}></span>گرادیانت</button>
                                    <button type="button" className={backgroundMode === 'image' ? 'is-active' : ''} onClick={() => { setBackgroundMode('image'); backgroundInputRef.current?.click(); }}><span className="nasaj-editor-background-image-swatch">▧</span>تصویر</button>
                                </div>
                                {backgroundMode === 'image' && <div className="nasaj-editor-background-image-row"><span>{backgroundImage ? 'تصویر پس‌زمینه انتخاب شده' : 'هنوز تصویری انتخاب نشده'}</span><button type="button" onClick={() => backgroundInputRef.current?.click()}>انتخاب تصویر</button></div>}
                                {backgroundMode === 'solid' && <label className="nasaj-editor-color-field"><span>رنگ پس‌زمینه</span><input type="color" value={backgroundColor} onChange={event => setBackgroundColor(event.target.value)} /></label>}
                                {backgroundMode === 'gradient' && <div className="nasaj-editor-gradient-fields"><label><span>رنگ اول</span><input type="color" value={gradientStart} onChange={event => setGradientStart(event.target.value)} /></label><label><span>رنگ دوم</span><input type="color" value={gradientEnd} onChange={event => setGradientEnd(event.target.value)} /></label></div>}
                                <div className="nasaj-editor-divider"></div>
                                <div className="nasaj-editor-panel-title"><strong>حذف پس‌زمینه رنگی</strong><span className={removeBackground ? 'is-on' : ''}>{removeBackground ? 'فعال' : 'خاموش'}</span></div>
                                <p className="nasaj-editor-small-copy">برای پس‌زمینه‌های ساده و یک‌رنگ، رنگ پس‌زمینه را نمونه‌برداری کن تا شفاف شود.</p>
                                <button type="button" className="nasaj-editor-sample-button" onClick={() => { setSampleMode(true); setCropMode(false); setNotice('روی رنگ پس‌زمینه در تصویر کلیک کن.'); }}>◎ انتخاب رنگ با قطره‌چکان</button>
                                <label className="nasaj-editor-color-field"><span>رنگ نمونه <b dir="ltr">{keyColor}</b></span><input type="color" value={keyColor} onChange={event => { setKeyColor(event.target.value); setRemoveBackground(true); }} /></label>
                                <label className="nasaj-editor-range"><span>حساسیت حذف <b>{keyTolerance}</b></span><input type="range" min="5" max="150" value={keyTolerance} onChange={event => setKeyTolerance(Number(event.target.value))} /></label>
                                <div className="nasaj-editor-button-grid"><button type="button" onClick={() => setRemoveBackground(true)}>اعمال حذف رنگ</button><button type="button" onClick={() => setRemoveBackground(false)}>بازگردانی پس‌زمینه</button></div>
                                <p className="nasaj-editor-footnote">این ابزار رنگ‌های نزدیک به رنگ انتخابی را شفاف می‌کند؛ برای عکس‌هایی با پس‌زمینه پیچیده، برش دستی یا ابزار تخصصی حذف سوژه نتیجه دقیق‌تری می‌دهد.</p>
                            </div>}

                            {panel === 'text' && <div className="nasaj-editor-controls">
                                <strong className="nasaj-editor-subtitle">افزودن نوشته</strong>
                                <label className="nasaj-editor-input-field"><span>متن روی تصویر</span><input value={textDraft} onChange={event => setTextDraft(event.target.value)} maxLength="70" placeholder="عنوان، نام کالکشن یا توضیح…" /></label>
                                <div className="nasaj-editor-gradient-fields"><label><span>رنگ نوشته</span><input type="color" value={textColor} onChange={event => setTextColor(event.target.value)} /></label><label><span>اندازه متن</span><input type="number" min="12" max="180" value={textSize} onChange={event => setTextSize(Math.max(12, Math.min(180, Number(event.target.value) || 12)))} /></label></div>
                                <button type="button" className="nasaj-editor-add-button" onClick={addTextLayer}>＋ افزودن متن به بوم</button>
                                <div className="nasaj-editor-divider"></div>
                                <strong className="nasaj-editor-subtitle">افزودن شکل</strong>
                                <label className="nasaj-editor-color-field"><span>رنگ شکل</span><input type="color" value={shapeColor} onChange={event => setShapeColor(event.target.value)} /></label>
                                <div className="nasaj-editor-button-grid"><button type="button" onClick={() => addShapeLayer('rect')}>＋ مستطیل</button><button type="button" onClick={() => addShapeLayer('circle')}>＋ دایره</button></div>
                                <div className="nasaj-editor-divider"></div>
                                <strong className="nasaj-editor-subtitle">افزودن تصویر یا لوگو</strong>
                                <button type="button" className="nasaj-editor-add-button is-light" onClick={() => layerImageInputRef.current?.click()}>＋ انتخاب تصویر به‌عنوان لایه</button>
                            </div>}

                            {panel === 'layers' && <div className="nasaj-editor-controls">
                                <div className="nasaj-editor-panel-title"><strong>مدیریت لایه‌ها</strong><span>{layers.length} مورد</span></div>
                                {layers.length ? <div className="nasaj-editor-layer-list">{layers.map((layer, index) => <div key={layer.id} className={`nasaj-editor-layer ${selectedLayerId === layer.id ? 'is-selected' : ''}`}>
                                    <button type="button" className="nasaj-editor-layer-name" onClick={() => setSelectedLayerId(layer.id)}><span>{layer.type === 'text' ? 'T' : layer.type === 'image' ? '▧' : '◇'}</span><b>{layer.name}</b></button>
                                    <button type="button" title={layer.visible ? 'پنهان کردن' : 'نمایش'} onClick={() => setLayers(previous => previous.map(item => item.id === layer.id ? { ...item, visible: !item.visible } : item))}>{layer.visible ? '◉' : '○'}</button>
                                    <button type="button" title="بالا بردن لایه" onClick={() => moveLayer(index, 1)}>↑</button>
                                    <button type="button" title="پایین بردن لایه" onClick={() => moveLayer(index, -1)}>↓</button>
                                    <button type="button" title="حذف لایه" onClick={() => { setLayers(previous => previous.filter(item => item.id !== layer.id)); if (selectedLayerId === layer.id) setSelectedLayerId(''); }}>×</button>
                                </div>)}</div> : <p className="nasaj-editor-empty-layers">هنوز لایه‌ای اضافه نشده. از بخش «متن و شکل» شروع کن.</p>}
                                {selectedLayer && <div className="nasaj-editor-layer-settings">
                                    <strong>تنظیم لایه انتخاب‌شده</strong>
                                    {selectedLayer.type === 'text' && <><label className="nasaj-editor-input-field"><span>متن</span><input value={selectedLayer.text || ''} onChange={event => updateSelectedLayer('text', event.target.value)} /></label><label className="nasaj-editor-color-field"><span>رنگ نوشته</span><input type="color" value={selectedLayer.color || '#17243A'} onChange={event => updateSelectedLayer('color', event.target.value)} /></label><label className="nasaj-editor-range"><span>اندازه <b>{selectedLayer.size}px</b></span><input type="range" min="12" max="180" value={selectedLayer.size || 54} onChange={event => updateSelectedLayer('size', Number(event.target.value))} /></label><label className="nasaj-editor-check"><input type="checkbox" checked={!!selectedLayer.shadow} onChange={event => updateSelectedLayer('shadow', event.target.checked)} /> سایه نوشته</label></>}
                                    {(selectedLayer.type === 'rect' || selectedLayer.type === 'circle') && <><label className="nasaj-editor-color-field"><span>رنگ شکل</span><input type="color" value={selectedLayer.color || '#C58C68'} onChange={event => updateSelectedLayer('color', event.target.value)} /></label><label className="nasaj-editor-range"><span>عرض <b>{selectedLayer.width}%</b></span><input type="range" min="5" max="90" value={selectedLayer.width || 28} onChange={event => updateSelectedLayer('width', Number(event.target.value))} /></label><label className="nasaj-editor-range"><span>ارتفاع <b>{selectedLayer.height}%</b></span><input type="range" min="5" max="90" value={selectedLayer.height || 18} onChange={event => updateSelectedLayer('height', Number(event.target.value))} /></label></>}
                                    {selectedLayer.type === 'image' && <label className="nasaj-editor-range"><span>اندازه تصویر <b>{selectedLayer.width}%</b></span><input type="range" min="5" max="90" value={selectedLayer.width || 34} onChange={event => updateSelectedLayer('width', Number(event.target.value))} /></label>}
                                    <label className="nasaj-editor-range"><span>موقعیت افقی <b>{selectedLayer.x}%</b></span><input type="range" min="0" max="100" value={selectedLayer.x ?? 50} onChange={event => updateSelectedLayer('x', Number(event.target.value))} /></label>
                                    <label className="nasaj-editor-range"><span>موقعیت عمودی <b>{selectedLayer.y}%</b></span><input type="range" min="0" max="100" value={selectedLayer.y ?? 50} onChange={event => updateSelectedLayer('y', Number(event.target.value))} /></label>
                                    <label className="nasaj-editor-range"><span>شفافیت <b>{Math.round((selectedLayer.opacity ?? 1) * 100)}٪</b></span><input type="range" min="10" max="100" value={Math.round((selectedLayer.opacity ?? 1) * 100)} onChange={event => updateSelectedLayer('opacity', Number(event.target.value) / 100)} /></label>
                                </div>}
                            </div>}
                        </aside>
                    </div>
                </>
            )}
            <div className="nasaj-editor-footer">
                <span>✓ تغییرات روی همین دستگاه انجام می‌شود؛ فایل اصلی شما روی سرور آپلود نمی‌شود.</span>
                {imageData && <button type="button" onClick={resetAdjustments}>پاک‌کردن لایه‌ها و تنظیمات</button>}
            </div>
            {notice && <p className="nasaj-editor-notice" role="status">{notice}</p>}
        </section>
    );
}


// ==========================================
// ۱۲. استودیوی طراحی و شبکه خیاط‌ها
// ==========================================
function ProfessionalStudioPage({ fabrics, profile, profileId }) {
    const [section, setSection] = useState('design');
    const projectsStorageKey = nasajProfileStorageKey('nasaj_yar_design_projects', profileId);
    const tailorsStorageKey = nasajProfileStorageKey('nasaj_yar_tailor_profiles', profileId);
    const [projects, setProjects] = useState(() => nasajReadProfileStorage('nasaj_yar_design_projects', profileId, []));
    const [tailors, setTailors] = useState(() => nasajReadProfileStorage('nasaj_yar_tailor_profiles', profileId, []));
    const [projectName, setProjectName] = useState('');
    const [projectType, setProjectType] = useState('مانتو و کت');
    const [projectFabricId, setProjectFabricId] = useState(fabrics[0] ? String(fabrics[0].id) : '');
    const [projectNotes, setProjectNotes] = useState('');
    const [projectImage, setProjectImage] = useState('');
    const [editorSession, setEditorSession] = useState(0);
    const [formNotice, setFormNotice] = useState('');
    const [tailorFormOpen, setTailorFormOpen] = useState(false);
    const [tailorSearch, setTailorSearch] = useState('');
    const [tailorCity, setTailorCity] = useState('');
    const [tailorForm, setTailorForm] = useState({ name: '', city: profile && profile.city ? profile.city : '', phone: '', specialty: 'خیاطی زنانه', experience: '', bio: '' });

    useEffect(() => { try { localStorage.setItem(projectsStorageKey, JSON.stringify(projects.slice(0, 8))); } catch { } }, [projects, projectsStorageKey]);
    useEffect(() => { try { localStorage.setItem(tailorsStorageKey, JSON.stringify(tailors)); } catch { } }, [tailors, tailorsStorageKey]);

    const saveProject = event => {
        event.preventDefault();
        if (!projectName.trim()) { setFormNotice('برای پروژه یک نام وارد کن.'); return; }
        const chosenFabric = fabrics.find(item => String(item.id) === String(projectFabricId));
        const project = {
            id: `design-${Date.now()}`, name: projectName.trim(), type: projectType,
            fabricId: projectFabricId, fabricName: chosenFabric ? chosenFabric.name : '',
            notes: projectNotes.trim(), image: projectImage, createdAt: new Date().toISOString()
        };
        setProjects(previous => [project, ...previous].slice(0, 8));
        setProjectName(''); setProjectNotes(''); setProjectImage(''); setEditorSession(value => value + 1);
        setFormNotice('پروژه طراحی با موفقیت روی همین دستگاه ذخیره شد.');
    };

    const updateTailorForm = (key, value) => setTailorForm(previous => ({ ...previous, [key]: value }));
    const saveTailorProfile = event => {
        event.preventDefault();
        const phone = String(tailorForm.phone || '').trim();
        const digits = phone.replace(/\D/g, '');
        if (!tailorForm.name.trim() || !tailorForm.city.trim() || digits.length < 8) {
            setFormNotice('نام، شهر و شماره تماس معتبر را کامل کن.'); return;
        }
        const item = { ...tailorForm, id: `tailor-${Date.now()}`, name: tailorForm.name.trim(), city: tailorForm.city.trim(), phone, specialty: tailorForm.specialty.trim(), experience: tailorForm.experience.trim(), bio: tailorForm.bio.trim(), createdAt: new Date().toISOString() };
        setTailors(previous => [item, ...previous]);
        setTailorFormOpen(false);
        setTailorForm({ name: '', city: profile && profile.city ? profile.city : '', phone: '', specialty: 'خیاطی زنانه', experience: '', bio: '' });
        setFormNotice('پروفایل خیاط در فهرست همین دستگاه ثبت شد.');
    };

    const visibleTailors = tailors.filter(item => {
        const query = tailorSearch.trim().toLowerCase();
        const searchMatch = !query || [item.name, item.city, item.specialty, item.bio].join(' ').toLowerCase().includes(query);
        const cityMatch = !tailorCity || item.city === tailorCity;
        return searchMatch && cityMatch;
    });
    const whatsappLink = phone => {
        const digits = String(phone || '').replace(/\D/g, '');
        return digits ? `https://wa.me/${digits}` : '#';
    };

    return (
        <div className="nasaj-newpage-scroll h-full overflow-y-auto no-scrollbar p-3.5 pb-28">
            <section className="nasaj-studio-hero">
                <div className="nasaj-studio-hero-top"><span className="nasaj-pro-kicker">DESIGN & TAILORING STUDIO</span><span className="nasaj-studio-live"><i></i> فضای تخصصی دوخت</span></div>
                <div className="nasaj-studio-hero-body"><div><h2>ایده را طراحی کن،<br /><em>به دوخت بسپار.</em></h2><p>فضای کاری طراحان لباس، خیاطان و مزون‌ها؛ از ثبت ایده تا ارتباط مستقیم برای اجرای سفارش.</p></div><div className="nasaj-studio-hero-icon" aria-hidden="true"><span>✂</span><i></i><b></b></div></div>
                <div className="nasaj-studio-hero-stats"><div><strong>{nasajFormatNumber(projects.length, 0)}</strong><small>پروژه طراحی</small></div><i></i><div><strong>{nasajFormatNumber(tailors.length, 0)}</strong><small>پروفایل خیاط</small></div><i></i><div><strong>{nasajFormatNumber(fabrics.length, 0)}</strong><small>پارچه قابل انتخاب</small></div></div>
            </section>

            <div className="nasaj-studio-tabs" role="tablist" aria-label="بخش‌های استودیو">
                <button type="button" role="tab" aria-selected={section === 'design'} className={section === 'design' ? 'is-active' : ''} onClick={() => { setSection('design'); setFormNotice(''); }}>✦ استودیوی طراحی</button>
                <button type="button" role="tab" aria-selected={section === 'tailors'} className={section === 'tailors' ? 'is-active' : ''} onClick={() => { setSection('tailors'); setFormNotice(''); }}>✂ خیاط‌ها و مزون‌ها</button>
            </div>

            {section === 'design' && <>
                <section className="nasaj-pro-card nasaj-design-workspace">
                    <div className="nasaj-pro-card-heading"><div><span className="nasaj-pro-eyebrow">DESIGN DESK / 01</span><h3>ساخت پروژه طراحی جدید</h3><p>اسکچ، پارچه منتخب و توضیحات فنی را کنار هم نگه دار.</p></div><span className="nasaj-design-stamp">STUDIO</span></div>
                    <form onSubmit={saveProject} className="nasaj-design-form">
                        <label className="nasaj-pro-field"><span>نام پروژه</span><input value={projectName} onChange={event => setProjectName(event.target.value)} placeholder="مثلاً کالکشن پاییزه ۱۴۰۵" maxLength="60" /></label>
                        <div className="nasaj-design-form-row">
                            <label className="nasaj-pro-field"><span>نوع طراحی</span><select value={projectType} onChange={event => setProjectType(event.target.value)}><option>مانتو و کت</option><option>لباس مجلسی</option><option>لباس مردانه</option><option>لباس کودک</option><option>لباس راحتی</option><option>لباس ورزشی</option><option>طراحی پارچه</option></select></label>
                            <label className="nasaj-pro-field"><span>پارچه مرتبط</span><select value={projectFabricId} onChange={event => setProjectFabricId(event.target.value)}><option value="">بدون انتخاب</option>{fabrics.map(fabric => <option key={fabric.id} value={String(fabric.id)}>{fabric.name}</option>)}</select></label>
                        </div>
                        <DesignImageEditor key={editorSession} onUseImage={image => { setProjectImage(image); setFormNotice('خروجی ویرایشگر به پروژه اضافه شد.'); }} />
                        {projectImage && <div className="nasaj-design-preview"><img src={projectImage} alt="پیش‌نمایش طرح پروژه" /><button type="button" onClick={() => setProjectImage('')} aria-label="حذف تصویر">×</button></div>}
                        <label className="nasaj-pro-field"><span>توضیحات و نکات دوخت</span><textarea rows="3" value={projectNotes} onChange={event => setProjectNotes(event.target.value)} placeholder="فرم لباس، جزئیات برش، نوع آستر یا نکات موردنظر برای خیاط…" maxLength="700" /></label>
                        <button type="submit" className="nasaj-design-save">ذخیره پروژه در دفتر طراحی <span>←</span></button>
                    </form>
                    {formNotice && section === 'design' && <p className="nasaj-pro-notice" role="status">{formNotice}</p>}
                </section>

                <section className="nasaj-pro-projects">
                    <div className="nasaj-pro-section-heading"><div><span className="nasaj-pro-eyebrow">YOUR COLLECTION</span><h3>دفتر پروژه‌های من</h3></div><span>{projects.length} پروژه</span></div>
                    {projects.length ? <div className="nasaj-project-grid">{projects.map(project => <article className="nasaj-project-card" key={project.id}>
                        <div className="nasaj-project-image">{project.image ? <img src={project.image} alt={project.name} /> : <div className="nasaj-project-placeholder"><span>✦</span><small>DESIGN NOTE</small></div>}<span>{project.type}</span></div>
                        <div className="nasaj-project-info"><strong>{project.name}</strong><small>{project.fabricName || 'بدون پارچه منتخب'}</small>{project.notes && <p>{project.notes}</p>}<div className="nasaj-project-actions"><button type="button" onClick={() => { setSection('tailors'); setFormNotice(`برای اجرای «${project.name}»، خیاط مناسب را جست‌وجو کن یا پروفایل خیاط جدید ثبت کن.`); }}>یافتن خیاط برای این پروژه</button><button type="button" className="nasaj-project-delete" onClick={() => { setProjects(previous => previous.filter(item => item.id !== project.id)); setFormNotice('پروژه از دفتر طراحی حذف شد.'); }}>حذف</button></div></div>
                    </article>)}</div> : <div className="nasaj-pro-empty nasaj-pro-empty-large"><span>✦</span><strong>دفتر طراحی هنوز خالی است</strong><small>اولین ایده‌ات را ثبت کن تا اینجا نگه‌داری شود.</small></div>}
                </section>
            </>}

            {section === 'tailors' && <>
                <section className="nasaj-tailor-intro"><div><span className="nasaj-pro-eyebrow">TAILOR NETWORK / 02</span><h3>خیاط مناسب پروژه‌ات را پیدا کن.</h3><p>پروفایل خیاط‌ها و مزون‌ها را ببین و از طریق تماس یا واتساپ درباره سفارش صحبت کن.</p></div><div className="nasaj-tailor-intro-icon">✂</div></section>
                <div className="nasaj-tailor-toolbar"><label className="nasaj-tailor-search"><span>⌕</span><input value={tailorSearch} onChange={event => setTailorSearch(event.target.value)} placeholder="جست‌وجوی نام، مهارت یا شهر…" /></label><button type="button" onClick={() => { setTailorFormOpen(value => !value); setFormNotice(''); }}>{tailorFormOpen ? 'بستن فرم' : '+ ثبت پروفایل'}</button></div>
                {tailorFormOpen && <form onSubmit={saveTailorProfile} className="nasaj-pro-card nasaj-tailor-form">
                    <div className="nasaj-pro-card-heading"><div><span className="nasaj-pro-eyebrow">JOIN THE NETWORK</span><h3>ثبت پروفایل خیاط یا مزون</h3><p>اطلاعات تماس را دقیق وارد کن تا مشتری بتواند مستقیم ارتباط بگیرد.</p></div></div>
                    <div className="nasaj-design-form-row"><label className="nasaj-pro-field"><span>نام خیاط / مزون</span><input value={tailorForm.name} onChange={event => updateTailorForm('name', event.target.value)} placeholder="نام یا عنوان کسب‌وکار" maxLength="50" /></label><label className="nasaj-pro-field"><span>شهر</span><input value={tailorForm.city} onChange={event => updateTailorForm('city', event.target.value)} placeholder="مثلاً تهران" maxLength="35" /></label></div>
                    <div className="nasaj-design-form-row"><label className="nasaj-pro-field"><span>شماره تماس با پیش‌شماره کشور</span><input value={tailorForm.phone} onChange={event => updateTailorForm('phone', event.target.value)} placeholder="+98912… یا +994…" dir="ltr" inputMode="tel" /></label><label className="nasaj-pro-field"><span>تخصص اصلی</span><select value={tailorForm.specialty} onChange={event => updateTailorForm('specialty', event.target.value)}><option>خیاطی زنانه</option><option>خیاطی مردانه</option><option>لباس مجلسی و عروس</option><option>مانتو و پالتو</option><option>لباس کودک</option><option>لباس فرم و سازمانی</option><option>تعمیر و اصلاح لباس</option><option>الگوسازی و برش</option></select></label></div>
                    <label className="nasaj-pro-field"><span>سابقه کار</span><input value={tailorForm.experience} onChange={event => updateTailorForm('experience', event.target.value)} placeholder="مثلاً ۸ سال" maxLength="30" /></label>
                    <label className="nasaj-pro-field"><span>معرفی کوتاه و خدمات</span><textarea rows="3" value={tailorForm.bio} onChange={event => updateTailorForm('bio', event.target.value)} placeholder="چه نوع سفارش‌هایی می‌پذیری؟ ظرفیت یا زمان تحویل؟" maxLength="360" /></label>
                    <button type="submit" className="nasaj-design-save">ثبت پروفایل خیاط <span>←</span></button>
                </form>}
                {formNotice && section === 'tailors' && <p className="nasaj-pro-notice" role="status">{formNotice}</p>}
                <div className="nasaj-pro-section-heading nasaj-tailor-list-heading"><div><span className="nasaj-pro-eyebrow">LOCAL DIRECTORY</span><h3>فهرست خیاط‌ها و مزون‌ها</h3></div><span>{visibleTailors.length} نتیجه</span></div>
                {tailors.length > 0 && <label className="nasaj-pro-field nasaj-tailor-city-filter"><span>فیلتر شهر</span><select value={tailorCity} onChange={event => setTailorCity(event.target.value)}><option value="">همه شهرها</option>{Array.from(new Set(tailors.map(item => item.city))).map(city => <option key={city} value={city}>{city}</option>)}</select></label>}
                {visibleTailors.length ? <div className="nasaj-tailor-list">{visibleTailors.map((tailor, index) => <article className="nasaj-tailor-card" key={tailor.id}>
                    <div className="nasaj-tailor-card-top"><div className="nasaj-tailor-avatar">{(tailor.name || 'خ').trim().slice(0, 1)}</div><div className="nasaj-tailor-main"><strong>{tailor.name}</strong><span>{tailor.specialty}</span></div><span className="nasaj-tailor-index">{String(index + 1).padStart(2, '0')}</span></div>
                    <div className="nasaj-tailor-meta"><span>⌖ {tailor.city}</span>{tailor.experience && <span>✦ {tailor.experience} سابقه</span>}</div>
                    {tailor.bio && <p className="nasaj-tailor-bio">{tailor.bio}</p>}
                    <div className="nasaj-tailor-actions"><a href={`tel:${tailor.phone.replace(/[^+\d]/g, '')}`}><span>☎</span> تماس مستقیم</a><a href={whatsappLink(tailor.phone)} target="_blank" rel="noopener noreferrer"><span>◉</span> گفتگو در واتساپ</a></div>
                    <button type="button" className="nasaj-tailor-remove" onClick={() => setTailors(previous => previous.filter(item => item.id !== tailor.id))}>حذف پروفایل از این دستگاه</button>
                </article>)}</div> : <div className="nasaj-pro-empty nasaj-pro-empty-large"><span>✂</span><strong>{tailors.length ? 'نتیجه‌ای پیدا نشد' : 'هنوز خیاطی در فهرست ثبت نشده'}</strong><small>{tailors.length ? 'عبارت جست‌وجو یا فیلتر شهر را تغییر بده.' : 'اولین خیاط یا مزون را ثبت کن تا امکان تماس مستقیم در این فهرست فعال شود.'}</small><button type="button" onClick={() => setTailorFormOpen(true)}>ثبت اولین پروفایل خیاط</button></div>}
                <p className="nasaj-tailor-local-note">پروفایل‌ها در حال حاضر فقط روی همین دستگاه ذخیره می‌شوند. برای اینکه خیاط‌ها از گوشی‌های مختلف ثبت شوند و همه کاربران آن‌ها را ببینند، این بخش باید به حساب کاربری و سرور نساج‌یار متصل شود.</p>
            </>}
        </div>
    );
}


// ==========================================
// ۱۰. بدنه اصلی اپلیکیشن اندروید (App)
// ==========================================
function App() {
    const [incomingFabricId] = useState(() => new URLSearchParams(window.location.search).get('fabric') || '');
    const [incomingBatchCode] = useState(() => new URLSearchParams(window.location.search).get('batch') || '');
    const [initialDeepLinkedFabric] = useState(() => nasajFindFabricFromIncomingUrl());
    const [unavailableDeepLink] = useState(Boolean(incomingFabricId && !initialDeepLinkedFabric));
    const [activeTab, setActiveTab] = useState(initialDeepLinkedFabric ? 'detail' : 'explore'); // صفحات ویترین، ثبت، علاقه‌مندی، محاسبه، تخفیف و ابزارهای دیگر
    useEffect(() => { try { localStorage.removeItem('nasaj_yar_moodboards'); } catch { } }, []);
    const [theme, setTheme] = useState(() => {
        try {
            const savedTheme = localStorage.getItem('nasaj_yar_theme');
            return ['light', 'dark', 'pink'].includes(savedTheme) ? savedTheme : 'light';
        } catch {
            return 'light';
        }
    });
    const [fabrics, setFabrics] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('nasaj_yar_fabrics') || '[]');
            const defaultIds = new Set(INITIAL_FABRICS.map(fabric => String(fabric.id)));
            const extra = Array.isArray(saved) ? saved.filter(fabric => fabric && fabric.id != null && !defaultIds.has(String(fabric.id))) : [];
            return [...extra, ...INITIAL_FABRICS];
        } catch {
            return INITIAL_FABRICS;
        }
    });
    const [profiles, setProfiles] = useState(() => nasajReadLocalProfiles());
    const [activeProfileId, setActiveProfileId] = useState(() => {
        const initialProfiles = nasajReadLocalProfiles();
        try {
            const savedId = localStorage.getItem('nasaj_yar_active_profile_v2');
            return initialProfiles.some(item => item.id === savedId) ? savedId : initialProfiles[0].id;
        } catch { return initialProfiles[0].id; }
    });
    const profile = profiles.find(item => item.id === activeProfileId) || profiles[0];
    const [places, setPlaces] = useState(() => {
        const saved = nasajReadProfileStorage('nasaj_yar_ratings', activeProfileId, {});
        return INITIAL_PLACES.map((p) => (saved[p.id] ? { ...p, ...saved[p.id] } : p));
    });
    const [favoriteFabricIds, setFavoriteFabricIds] = useState(() => nasajReadProfileStorage('nasaj_yar_favorites', activeProfileId, []).map(String));
    const [favoriteFolders, setFavoriteFolders] = useState(() => nasajReadProfileStorage('nasaj_yar_favorite_folders', activeProfileId, ['خرید و بررسی', 'ایده‌های دوخت', 'پارچه‌های خاص']));
    const [favoriteAssignments, setFavoriteAssignments] = useState(() => nasajReadProfileStorage('nasaj_yar_favorite_assignments', activeProfileId, {}));
    const [calculatorHistory, setCalculatorHistory] = useState(() => nasajReadProfileStorage('nasaj_yar_calculator_history', activeProfileId, []));
    const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState({ fabricType: 'all', country: 'all', season: 'all', minGsm: '', maxGsm: '', minPrice: '', maxPrice: '', minWidth: '', maxWidth: '' });
    const [discountAlertsEnabled, setDiscountAlertsEnabled] = useState(() => {
        try { return localStorage.getItem('nasaj_yar_discount_alerts') === 'true'; }
        catch { return false; }
    });
    const [pdfExporting, setPdfExporting] = useState(false);
    const [imageExporting, setImageExporting] = useState(false);
    const [notificationPermission, setNotificationPermission] = useState(() => {
        try { return ('Notification' in window) ? Notification.permission : 'unsupported'; }
        catch { return 'unsupported'; }
    });
    const [bookmarkedArticles, setBookmarkedArticles] = useState(() => nasajReadProfileStorage('nasaj_yar_bookmarks', activeProfileId, []));

    const [selectedFabric, setSelectedFabric] = useState(initialDeepLinkedFabric || INITIAL_FABRICS[0]);
    const [activeColor, setActiveColor] = useState((initialDeepLinkedFabric || INITIAL_FABRICS[0]).colors[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [stretchFilter, setStretchFilter] = useState('all');
    const [sortMode, setSortMode] = useState('featured');
    const [compareIds, setCompareIds] = useState([]);
    const [compareOpen, setCompareOpen] = useState(false);

    // ذخیره تم انتخابی و هماهنگ‌سازی رنگ نوار مرورگر/PWA
    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
        try {
            localStorage.setItem('nasaj_yar_theme', theme);
        } catch { }

        const themeColor = theme === 'dark'
            ? '#0b1120'
            : theme === 'pink'
                ? '#fdf2f8'
                : '#ffffff';
        const themeMeta = document.querySelector('meta[name="theme-color"]');
        if (themeMeta) themeMeta.setAttribute('content', themeColor);
    }, [theme]);

    // نگه‌داری فهرست پارچه‌های تازه، علاقه‌مندی‌ها و تنظیم اعلان در همین دستگاه
    useEffect(() => {
        try {
            const defaultIds = new Set(INITIAL_FABRICS.map(fabric => String(fabric.id)));
            const customFabrics = fabrics
                .filter(fabric => !defaultIds.has(String(fabric.id)))
                .map(fabric => ({
                    ...fabric,
                    // آدرس‌های blob پس از بستن مرورگر معتبر نیستند؛ تصویر بافت جایگزین می‌شود.
                    imageUrl: (fabric.imageUrl && fabric.imageUrl.startsWith('data:')) ? fabric.imageUrl : null,
                    videoUrl: null
                }));
            localStorage.setItem('nasaj_yar_fabrics', JSON.stringify(customFabrics));
        } catch (error) {
            console.warn('ذخیره پارچه‌ها انجام نشد؛ احتمالاً فضای ذخیره‌سازی مرورگر پر شده است.', error);
        }
    }, [fabrics]);

    useEffect(() => { try { localStorage.setItem('nasaj_yar_profiles_v2', JSON.stringify(profiles)); } catch { } }, [profiles]);
    useEffect(() => { try { localStorage.setItem('nasaj_yar_active_profile_v2', activeProfileId); } catch { } }, [activeProfileId]);
    useEffect(() => { try { localStorage.setItem(nasajProfileStorageKey('nasaj_yar_favorites', activeProfileId), JSON.stringify(favoriteFabricIds)); } catch { } }, [favoriteFabricIds, activeProfileId]);
    useEffect(() => { try { localStorage.setItem(nasajProfileStorageKey('nasaj_yar_favorite_folders', activeProfileId), JSON.stringify(favoriteFolders)); } catch { } }, [favoriteFolders, activeProfileId]);
    useEffect(() => { try { localStorage.setItem(nasajProfileStorageKey('nasaj_yar_favorite_assignments', activeProfileId), JSON.stringify(favoriteAssignments)); } catch { } }, [favoriteAssignments, activeProfileId]);
    useEffect(() => { try { localStorage.setItem(nasajProfileStorageKey('nasaj_yar_calculator_history', activeProfileId), JSON.stringify(calculatorHistory.slice(0, 40))); } catch { } }, [calculatorHistory, activeProfileId]);
    useEffect(() => { try { localStorage.setItem(nasajProfileStorageKey('nasaj_yar_bookmarks', activeProfileId), JSON.stringify(bookmarkedArticles)); } catch { } }, [bookmarkedArticles, activeProfileId]);
    useEffect(() => {
        try { localStorage.setItem('nasaj_yar_discount_alerts', String(discountAlertsEnabled)); } catch { }
    }, [discountAlertsEnabled]);

    const openFabricStudio = (fabric) => {
        setSelectedFabric(fabric);
        setActiveColor(fabric.colors[0]);
        setActiveTab('detail');
    };

    const handleOpenFabricById = (fabricId) => {
        const found = fabrics.find((f) => f.id === fabricId);
        if (found) {
            openFabricStudio(found);
        } else {
            setActiveTab('explore');
        }
    };

    const handleToggleBookmark = (articleId) => {
        setBookmarkedArticles((prev) => {
            const next = prev.includes(articleId)
                ? prev.filter((id) => id !== articleId)
                : [articleId, ...prev];
            try {
                localStorage.setItem(nasajProfileStorageKey('nasaj_yar_bookmarks', activeProfileId), JSON.stringify(next));
            } catch { }
            return next;
        });
    };

    const handleToggleFavorite = (fabricId) => {
        const key = String(fabricId);
        setFavoriteFabricIds(previous => previous.includes(key)
            ? previous.filter(id => id !== key)
            : [key, ...previous]);
    };
    const handleCreateFavoriteFolder = (folderName) => {
        const cleanName = String(folderName || '').trim().slice(0, 28);
        if (!cleanName) return null;
        if (favoriteFolders.includes(cleanName)) return cleanName;
        setFavoriteFolders(previous => [...previous, cleanName]);
        return cleanName;
    };

    const handleAssignFavoriteFolder = (fabricId, folderName) => {
        const key = String(fabricId);
        setFavoriteAssignments(previous => {
            const next = { ...previous };
            if (!folderName) delete next[key];
            else next[key] = folderName;
            return next;
        });
    };

    const handleSaveCalculatorHistory = (entry) => setCalculatorHistory(previous => [entry, ...previous].slice(0, 40));
    const handleDeleteCalculatorHistory = (entryId) => setCalculatorHistory(previous => previous.filter(entry => entry.id !== entryId));
    const handleSaveProfile = (nextProfile) => {
        setProfiles(previous => previous.map(item => item.id === activeProfileId
            ? { ...item, ...nextProfile, id: item.id, name: String(nextProfile.name || '').trim().slice(0, 40), avatarTone: NASAJ_PROFILE_TONES.includes(nextProfile.avatarTone) ? nextProfile.avatarTone : item.avatarTone }
            : item));
    };
    const handleSwitchProfile = (nextId) => {
        const target = profiles.find(item => item.id === nextId);
        if (!target || target.id === activeProfileId) return;
        setFavoriteFabricIds(nasajReadProfileStorage('nasaj_yar_favorites', nextId, []).map(String));
        setFavoriteFolders(nasajReadProfileStorage('nasaj_yar_favorite_folders', nextId, ['خرید و بررسی', 'ایده‌های دوخت', 'پارچه‌های خاص']));
        setFavoriteAssignments(nasajReadProfileStorage('nasaj_yar_favorite_assignments', nextId, {}));
        setCalculatorHistory(nasajReadProfileStorage('nasaj_yar_calculator_history', nextId, []));
        setBookmarkedArticles(nasajReadProfileStorage('nasaj_yar_bookmarks', nextId, []));
        const savedRatings = nasajReadProfileStorage('nasaj_yar_ratings', nextId, {});
        setPlaces(INITIAL_PLACES.map(item => savedRatings[item.id] ? { ...item, ...savedRatings[item.id] } : item));
        setActiveProfileId(nextId);
    };
    const handleCreateProfile = (details) => {
        const id = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        const nextProfile = {
            id,
            name: String(details.name || 'کاربر جدید').trim().slice(0, 40),
            city: 'تهران', role: 'خریدار', phone: '',
            avatarTone: NASAJ_PROFILE_TONES[profiles.length % NASAJ_PROFILE_TONES.length],
            createdAt: Date.now()
        };
        setProfiles(previous => [...previous, nextProfile]);
        setFavoriteFabricIds([]);
        setFavoriteFolders(['خرید و بررسی', 'ایده‌های دوخت', 'پارچه‌های خاص']);
        setFavoriteAssignments({});
        setCalculatorHistory([]);
        setBookmarkedArticles([]);
        setPlaces(INITIAL_PLACES);
        setActiveProfileId(id);
    };
    const updateAdvancedFilter = (key, value) => setAdvancedFilters(previous => ({ ...previous, [key]: value }));
    const resetAdvancedFilters = () => setAdvancedFilters({ fabricType: 'all', country: 'all', season: 'all', minGsm: '', maxGsm: '', minPrice: '', maxPrice: '', minWidth: '', maxWidth: '' });

    const handleToggleDiscountAlerts = async () => {
        const nextEnabled = !discountAlertsEnabled;
        if (nextEnabled && typeof window !== 'undefined' && 'Notification' in window) {
            try {
                let permission = Notification.permission;
                if (permission === 'default') permission = await Notification.requestPermission();
                setNotificationPermission(permission);
                if (permission === 'granted') {
                    new Notification('اعلان تخفیف نساج‌یار فعال شد', { body: 'در صورت ثبت تخفیف جدید در این دستگاه به شما اطلاع می‌دهیم.' });
                }
            } catch {
                setNotificationPermission('unsupported');
            }
        } else if (nextEnabled) {
            setNotificationPermission('unsupported');
        }
        setDiscountAlertsEnabled(nextEnabled);
    };

    const handleNewFabricAdded = (newFabric, newPlace) => {
        setFabrics(previous => [newFabric, ...previous]);
        setPlaces(previous => [newPlace, ...previous]);
        if (nasajHasActiveDiscount(newFabric) && discountAlertsEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification('تخفیف جدید در نساج‌یار', {
                    body: `${newFabric.name} با ${nasajFormatNumber(newFabric.discountPercent, 0)}٪ تخفیف ثبت شد.`
                });
            } catch { }
        }
        openFabricStudio(newFabric);
    };

    const handleRatePlace = (placeId, stars, comment) => {
        setPlaces((prevPlaces) => {
            const updated = prevPlaces.map((place) => {
                if (place.id !== placeId) return place;

                const isFirstVote = place.userRating === null;
                const newCount = isFirstVote ? place.reviewCount + 1 : place.reviewCount;
                const totalScoreBefore = place.rating * place.reviewCount;
                const adjustedTotal = isFirstVote
                    ? totalScoreBefore + stars
                    : totalScoreBefore - place.userRating + stars;
                const newRating = Number((adjustedTotal / newCount).toFixed(2));

                let updatedReviews = [...(place.reviews || [])];
                if (comment) {
                    const existingUserIdx = updatedReviews.findIndex((r) => r.id === 'current-user');
                    const userReviewObj = {
                        id: 'current-user',
                        author: 'شما',
                        stars,
                        comment
                    };
                    if (existingUserIdx >= 0) {
                        updatedReviews[existingUserIdx] = userReviewObj;
                    } else {
                        updatedReviews = [userReviewObj, ...updatedReviews];
                    }
                } else {
                    updatedReviews = updatedReviews.map((r) =>
                        r.id === 'current-user' ? { ...r, stars } : r
                    );
                }

                return {
                    ...place,
                    rating: newRating,
                    reviewCount: newCount,
                    userRating: stars,
                    reviews: updatedReviews
                };
            });

            try {
                const snapshot = {};
                updated.forEach((p) => {
                    if (p.userRating !== null) {
                        snapshot[p.id] = {
                            rating: p.rating,
                            reviewCount: p.reviewCount,
                            userRating: p.userRating,
                            reviews: p.reviews
                        };
                    }
                });
                localStorage.setItem(nasajProfileStorageKey('nasaj_yar_ratings', activeProfileId), JSON.stringify(snapshot));
            } catch { }

            return updated;
        });
    };

    const handleViewProducerFabrics = (producerName) => {
        const found = fabrics.find((f) => f.producer === producerName);
        if (found) {
            openFabricStudio(found);
        } else {
            setSearchQuery('');
            setActiveTab('explore');
        }
    };

    const fabricTypeOptions = [...new Set(fabrics.map(fabric => fabric.fabricType).filter(Boolean))];
    const countryOptions = [...new Set(fabrics.map(fabric => fabric.originCountry).filter(Boolean))];
    const seasonOptions = [...new Set(fabrics.map(fabric => fabric.season).filter(Boolean))];
    const activeAdvancedFilterCount = Object.entries(advancedFilters).filter(([key, value]) => key === 'fabricType' || key === 'country' || key === 'season' ? value !== 'all' : String(value).trim() !== '').length;

    const filteredFabrics = fabrics.filter((f) => {
        const query = String(searchQuery || '').trim().toLocaleLowerCase('fa');
        const searchable = [f.name, f.fabricType, f.rawMaterials, f.originCountry, f.area, f.producer, f.season, ...(Array.isArray(f.suitableFor) ? f.suitableFor : []), ...(Array.isArray(f.features) ? f.features : [])]
            .filter(Boolean).join(' ').toLocaleLowerCase('fa');
        const matchesSearch = !query || searchable.includes(query);
        const stretchValue = String(f.stretch || '');
        const matchesStretch = stretchFilter === 'all' ? true : stretchValue.includes(stretchFilter);
        const gsmValue = nasajParseNumber(f.gsm);
        const widthValue = nasajParseNumber(f.width);
        const priceValue = nasajPriceWithDiscount(f) || nasajParseNumber(f.pricePerMeter);
        const matchesType = advancedFilters.fabricType === 'all' || f.fabricType === advancedFilters.fabricType;
        const matchesCountry = advancedFilters.country === 'all' || f.originCountry === advancedFilters.country;
        const matchesSeason = advancedFilters.season === 'all' || f.season === advancedFilters.season;
        const matchesGsm = (!advancedFilters.minGsm || gsmValue >= nasajParseNumber(advancedFilters.minGsm)) && (!advancedFilters.maxGsm || gsmValue <= nasajParseNumber(advancedFilters.maxGsm));
        const matchesPrice = (!advancedFilters.minPrice || priceValue >= nasajParseNumber(advancedFilters.minPrice)) && (!advancedFilters.maxPrice || priceValue <= nasajParseNumber(advancedFilters.maxPrice));
        const matchesWidth = (!advancedFilters.minWidth || widthValue >= nasajParseNumber(advancedFilters.minWidth)) && (!advancedFilters.maxWidth || widthValue <= nasajParseNumber(advancedFilters.maxWidth));
        return matchesSearch && matchesStretch && matchesType && matchesCountry && matchesSeason && matchesGsm && matchesPrice && matchesWidth;
    });


    const sortedFabrics = [...filteredFabrics].sort((a, b) => {
        if (sortMode === 'price-low') return nasajParseNumber(nasajPriceWithDiscount(a) || a.pricePerMeter) - nasajParseNumber(nasajPriceWithDiscount(b) || b.pricePerMeter);
        if (sortMode === 'price-high') return nasajParseNumber(nasajPriceWithDiscount(b) || b.pricePerMeter) - nasajParseNumber(nasajPriceWithDiscount(a) || a.pricePerMeter);
        if (sortMode === 'gsm-high') return nasajParseNumber(b.gsm) - nasajParseNumber(a.gsm);
        if (sortMode === 'discount') return nasajParseNumber(b.discountPercent) - nasajParseNumber(a.discountPercent);
        return 0;
    });

    const handleToggleCompare = (fabricId) => {
        const key = String(fabricId);
        if (compareIds.includes(key)) {
            setCompareIds(previous => previous.filter(id => id !== key));
            return;
        }
        if (compareIds.length >= 3) {
            window.alert('برای مقایسه، حداکثر سه پارچه را می‌توانید انتخاب کنید.');
            return;
        }
        setCompareIds(previous => [...previous, key]);
    };


    // خروجی PDF و تصویر از کل صفحه‌ای که کاربر در جزئیات پارچه می‌بیند.
    const prepareFabricDetailCapture = async () => {
        const detailRoot = document.getElementById('nasaj-fabric-detail-page');
        if (!detailRoot) throw new Error('صفحه جزئیات پارچه پیدا نشد.');
        detailRoot.dataset.nasajPreviousScrollTop = String(detailRoot.scrollTop || 0);
        detailRoot.scrollTop = 0;
        detailRoot.classList.add('nasaj-exporting-detail');
        const appShell = detailRoot.closest('.nasaj-app-shell');
        if (appShell) appShell.classList.add('nasaj-exporting-shell');
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        const images = Array.from(detailRoot.querySelectorAll('img'));
        await Promise.all(images.map(image => {
            if (image.complete && image.naturalWidth > 0) return Promise.resolve();
            return new Promise(resolve => {
                const finish = () => resolve();
                image.addEventListener('load', finish, { once: true });
                image.addEventListener('error', finish, { once: true });
                setTimeout(finish, 5000);
            });
        }));
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return detailRoot;
    };

    const handleDownloadFabricPdf = async (fabric) => {
        if (!fabric || pdfExporting || imageExporting) return;
        if (typeof window.html2pdf !== 'function') {
            window.alert('ابزار ساخت PDF بارگذاری نشده است. اتصال اینترنت را بررسی و دوباره تلاش کنید.');
            return;
        }
        setPdfExporting(true);
        let detailRoot = null;
        try {
            detailRoot = await prepareFabricDetailCapture();
            const safeCode = String(fabric.code || fabric.id || 'fabric').replace(/[^a-zA-Z0-9_-]/g, '-');
            await window.html2pdf().set({
                margin: [8, 8, 10, 8],
                filename: `nasajyar-fabric-${safeCode}-full-details.pdf`,
                image: { type: 'jpeg', quality: 0.96 },
                html2canvas: { scale: 2, useCORS: true, allowTaint: false, backgroundColor: '#ffffff', logging: false, windowWidth: Math.max(760, detailRoot.scrollWidth), windowHeight: detailRoot.scrollHeight, scrollX: 0, scrollY: 0 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
                pagebreak: { mode: ['css', 'legacy'], avoid: ['.nasaj-detail-metrics'] }
            }).from(detailRoot).save();
        } catch (error) {
            console.error('خطا در خروجی PDF صفحه کامل پارچه:', error);
            window.alert('ساخت PDF کامل انجام نشد. اتصال اینترنت و فضای خالی دستگاه را بررسی و دوباره تلاش کنید.');
        } finally {
            if (detailRoot) { const previousScrollTop = Number(detailRoot.dataset.nasajPreviousScrollTop || 0); detailRoot.classList.remove('nasaj-exporting-detail'); delete detailRoot.dataset.nasajPreviousScrollTop; const shell = detailRoot.closest('.nasaj-app-shell'); if (shell) shell.classList.remove('nasaj-exporting-shell'); detailRoot.scrollTop = previousScrollTop; }
            setPdfExporting(false);
        }
    };

    const handleDownloadFabricSnapshot = async (fabric) => {
        if (!fabric || imageExporting || pdfExporting) return;
        if (typeof window.html2canvas !== 'function') {
            window.alert('ابزار ساخت تصویر بارگذاری نشده است. اتصال اینترنت را بررسی و دوباره تلاش کنید.');
            return;
        }
        setImageExporting(true);
        let detailRoot = null;
        try {
            detailRoot = await prepareFabricDetailCapture();
            const canvas = await window.html2canvas(detailRoot, {
                scale: Math.min(2, window.devicePixelRatio || 2),
                useCORS: true,
                allowTaint: false,
                backgroundColor: '#ffffff',
                logging: false,
                width: detailRoot.scrollWidth,
                height: detailRoot.scrollHeight,
                windowWidth: Math.max(760, detailRoot.scrollWidth),
                windowHeight: detailRoot.scrollHeight,
                scrollX: 0,
                scrollY: 0
            });
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('ساخت تصویر نهایی ممکن نشد.');
            const safeCode = String(fabric.code || fabric.id || 'fabric').replace(/[^a-zA-Z0-9_-]/g, '-');
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `nasajyar-fabric-${safeCode}-full-page.png`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1500);
        } catch (error) {
            console.error('خطا در تهیه تصویر کامل صفحه پارچه:', error);
            window.alert('ساخت تصویر کامل انجام نشد. ممکن است طول صفحه یا یکی از تصاویر بارگذاری‌شده محدودیت مرورگر ایجاد کرده باشد.');
        } finally {
            if (detailRoot) { const previousScrollTop = Number(detailRoot.dataset.nasajPreviousScrollTop || 0); detailRoot.classList.remove('nasaj-exporting-detail'); delete detailRoot.dataset.nasajPreviousScrollTop; const shell = detailRoot.closest('.nasaj-app-shell'); if (shell) shell.classList.remove('nasaj-exporting-shell'); detailRoot.scrollTop = previousScrollTop; }
            setImageExporting(false);
        }
    };

    const selectedWeightPerMeter = selectedFabric
        ? Math.round((selectedFabric.gsm * selectedFabric.width) / 100)
        : 0;

    const selectedProducerPlace = selectedFabric
        ? places.find((p) => p.name === selectedFabric.producer)
        : null;


    // نسخه فشرده عکس پروفایل برای نمایش مستقیم داخل اپ
    const DEVELOPER_AVATAR_FIXED = "./IMG_20261114_044653_295.jpg";

    return (
        <div className="nasaj-app-shell w-full max-w-[430px] h-[100dvh] sm:h-[860px] sm:my-4 bg-white sm:rounded-[36px] shadow-2xl border border-slate-300 flex flex-col overflow-hidden relative">

            {/* نوار وضعیت بالای اپلیکیشن */}
            <header className="nasaj-topbar bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between shrink-0 relative z-40">
                <div className="flex items-center gap-2">
                    <div className="nasaj-brand-mark"><span>ن</span><i></i></div>
                    <div className="nasaj-brand-copy">
                        <h1 className="font-bold text-sm leading-tight">نساج‌یار</h1>
                        <p className="text-[10px] text-slate-400">بازار هوشمند پارچه و نساجی</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setActiveTab('deals')} className="nasaj-header-action" aria-label="تخفیف‌ها" title="تخفیف‌ها">
                        <span>٪</span>
                        {fabrics.some(nasajHasActiveDiscount) && <i></i>}
                    </button>
                    <button type="button" onClick={() => setActiveTab('profile')} className="nasaj-profile-trigger" aria-label={`پروفایل ${profile.name || 'کاربر'}`} title={`پروفایل ${profile.name || 'کاربر'}`}><NasajUserAvatar profile={profile} compact /></button>
                    {activeTab === 'detail' && (
                        <button
                            onClick={() => setActiveTab('explore')}
                            className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl text-xs font-bold"
                        >
                            بازگشت ←
                        </button>
                    )}

                    {/* منوی سه‌نقطه و اطلاعات توسعه‌دهنده */}
                    <details className="relative z-[80]">
                        <summary
                            className="list-none cursor-pointer w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-2xl font-black select-none"
                            aria-label="تنظیمات و اطلاعات برنامه"
                            title="تنظیمات و اطلاعات برنامه"
                        >
                            ⋮
                        </summary>

                        <div
                            className="absolute left-0 top-11 w-64 max-w-[calc(100vw-32px)] bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 p-4 animate-fade-in"
                            dir="rtl"
                        >
                            <section className="mb-4 border-b border-slate-100 pb-3">
                                <p className="text-[11px] font-black text-slate-800 mb-2">🎨 ظاهر برنامه</p>
                                <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="انتخاب پوسته برنامه">
                                    <button
                                        type="button"
                                        onClick={() => setTheme('light')}
                                        aria-pressed={theme === 'light'}
                                        className={`rounded-xl border px-1 py-2 text-[10px] font-bold transition ${theme === 'light' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 bg-white text-slate-600'}`}
                                    >
                                        <span className="block text-base mb-0.5">☀️</span>
                                        سفید
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTheme('dark')}
                                        aria-pressed={theme === 'dark'}
                                        className={`rounded-xl border px-1 py-2 text-[10px] font-bold transition ${theme === 'dark' ? 'border-orange-500 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                                    >
                                        <span className="block text-base mb-0.5">🌙</span>
                                        تیره
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTheme('pink')}
                                        aria-pressed={theme === 'pink'}
                                        className={`rounded-xl border px-1 py-2 text-[10px] font-bold transition ${theme === 'pink' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-200 bg-white text-slate-600'}`}
                                    >
                                        <span className="block text-base mb-0.5">🌸</span>
                                        صورتی
                                    </button>
                                </div>
                            </section>

                            <div className="flex flex-col items-center text-center">
                                <img
                                    src={DEVELOPER_AVATAR_FIXED}
                                    alt="تصویر توسعه‌دهنده نساج‌یار"
                                    className="w-20 h-20 rounded-full object-cover border-4 border-orange-100 shadow-md mb-3"
                                />

                                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                                    توسعه‌دهنده نساج‌یار
                                </span>

                                <h3 className="font-black text-base mt-2" dir="ltr">
                                    Aliakbar Nuruzi
                                </h3>

                                <p className="text-[10px] text-slate-400 mt-1">
                                    طراح و توسعه‌دهنده پلتفرم نساج‌یار
                                </p>
                            </div>

                            <div className="border-t border-slate-100 mt-4 pt-3">
                                <p className="text-[10px] text-slate-400 mb-2">
                                    راه ارتباطی با توسعه‌دهنده
                                </p>

                                <a
                                    href="mailto:nuruzi0902nuruzi@gmail.com"
                                    className="flex items-center gap-2 bg-slate-50 hover:bg-orange-50 border border-slate-100 rounded-xl p-3 transition"
                                    dir="ltr"
                                >
                                    <span className="text-lg">✉️</span>
                                    <span className="text-[10px] font-bold text-slate-700 break-all">
                                        nuruzi0902nuruzi@gmail.com
                                    </span>
                                </a>
                            </div>
                        </div>
                    </details>
                </div>
            </header>

            {/* محتوای متغیر صفحات */}
            <main key={activeTab} className="nasaj-main-stage flex-1 min-h-0 overflow-hidden relative bg-slate-50 flex flex-col">

                {/* صفحه ۱: ویترین و جستجوی پارچه‌ها */}
                {activeTab === 'explore' && (
                    <div className="nasaj-home-scroll h-full overflow-y-auto p-3.5 pb-28 no-scrollbar">
                        {unavailableDeepLink && (
                            <div className="nasaj-deeplink-missing" role="status">
                                این شناسه روی این دستگاه ثبت نشده است. پارچه‌های ثبت‌شده توسط کاربران فعلاً فقط در مرورگر سازنده ذخیره می‌شوند.
                                <small dir="ltr">{incomingFabricId ? nasajFabricCode(incomingFabricId) : ''}</small>
                            </div>
                        )}
                        <section className="nasaj-home-hero">
                            <div className="nasaj-hero-content">
                                <span className="nasaj-hero-kicker"><i></i> تجربه تازه خرید پارچه</span>
                                <h2>برای ایده‌ات،<br /><em>پارچه درست</em> را پیدا کن.</h2>
                                <p>از شناخت بافت تا مقایسه تخصصی و ارتباط با بازار پارچه.</p>
                                <button type="button" onClick={() => setActiveTab('deals')} className="nasaj-hero-cta">
                                    دیدن پیشنهادهای ویژه <span>←</span>
                                </button>
                            </div>
                            <div className="nasaj-hero-weave" aria-hidden="true">
                                <div className="nasaj-weave-orbit orbit-one"></div>
                                <div className="nasaj-weave-orbit orbit-two"></div>
                                <div className="nasaj-weave-core">ن</div>
                                <span className="nasaj-weave-caption">TEXTILE / 01</span>
                            </div>
                            <div className="nasaj-hero-foot">
                                <div><strong>{nasajFormatNumber(fabrics.length, 0)}</strong><span>نمونه پارچه</span></div>
                                <div><strong>{nasajFormatNumber(fabrics.filter(nasajHasActiveDiscount).length, 0)}</strong><span>تخفیف فعال</span></div>
                                <div><strong>{nasajFormatNumber(places.length, 0)}</strong><span>فروشنده و تولیدی</span></div>
                            </div>
                        </section>

                        <section className="nasaj-home-pro-tools">
                            <button type="button" onClick={() => setActiveTab('qr')}><span className="nasaj-home-tool-icon">▦</span><span><b>شناسنامه QR پارچه</b><small>ساخت شناسه و برچسب اختصاصی</small></span><i>←</i></button>
                            <button type="button" onClick={() => setActiveTab('studio')}><span className="nasaj-home-tool-icon">✂</span><span><b>استودیوی طراحی و دوخت</b><small>ویرایش تصویر، پروژه و ارتباط با خیاط‌ها</small></span><i>←</i></button>
                        </section>

                        <section className="nasaj-home-extra-tools" aria-label="ابزارهای دیگر نساج‌یار">
                            <button type="button" onClick={() => setActiveTab('magazine')}>📰 مجله تخصصی</button>
                            <button type="button" onClick={() => setActiveTab('colors')}>🎨 کتابخانه کالیته</button>
                            <button type="button" onClick={() => setActiveTab('calculator')}>🧮 محاسبه متراژ</button>
                            <button type="button" onClick={() => setActiveTab('favorites')}>♡ علاقه‌مندی‌ها</button>
                        </section>

                        <div className="nasaj-searchbar relative mb-4">
                            <span className="nasaj-search-icon" aria-hidden="true">⌕</span>
                            <input
                                type="text"
                                placeholder="جستجوی پارچه، جنس، کاربرد دوخت (مانتو، هودی...) یا کشور..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-2xl py-3 pr-10 pl-4 text-xs focus:outline-none focus:border-slate-900 shadow-sm"
                            />
                        </div>

                        <div className="nasaj-tools-grid grid grid-cols-4 gap-2 mb-4">
                            <button onClick={() => setActiveTab('favorites')} className="nasaj-tool-card nasaj-tool-favorite rounded-xl border border-pink-100 bg-white p-2 text-center shadow-sm">
                                <span className="block text-lg">❤️</span>
                                <span className="block text-[10px] font-bold text-slate-700">علاقه‌مندی‌ها</span>
                                <span className="block text-[9px] text-slate-400">{nasajFormatNumber(favoriteFabricIds.length, 0)} مورد</span>
                            </button>
                            <button onClick={() => setActiveTab('calculator')} className="nasaj-tool-card nasaj-tool-calc rounded-xl border border-slate-200 bg-white p-2 text-center shadow-sm">
                                <span className="block text-lg">🧮</span>
                                <span className="block text-[10px] font-bold text-slate-700">محاسبه پارچه</span>
                                <span className="block text-[9px] text-slate-400">متراژ و هزینه</span>
                            </button>
                            <button onClick={() => setActiveTab('deals')} className="nasaj-tool-card nasaj-tool-deals rounded-xl border border-rose-100 bg-white p-2 text-center shadow-sm">
                                <span className="block text-lg">🔔</span>
                                <span className="block text-[10px] font-bold text-slate-700">اعلان تخفیف</span>
                                <span className="block text-[9px] text-slate-400">{nasajFormatNumber(fabrics.filter(nasajHasActiveDiscount).length, 0)} پیشنهاد</span>
                            </button>
                        </div>

                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-3.5 pb-1">
                            {[
                                { id: 'all', label: 'همه پارچه‌ها' },
                                { id: 'بدون کش', label: 'بدون کش' },
                                { id: 'کش از عرض', label: 'کش از عرض' },
                                { id: 'چهارجهته', label: 'فول کش (لاکرا)' }
                            ].map((chip) => (
                                <button
                                    key={chip.id}
                                    onClick={() => setStretchFilter(chip.id)}
                                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition ${stretchFilter === chip.id
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-white text-slate-600 border border-slate-200'
                                        }`}
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>

                        <section className="nasaj-advanced-filter-wrap">
                            <button type="button" className="nasaj-advanced-filter-toggle" aria-expanded={advancedFiltersOpen} onClick={() => setAdvancedFiltersOpen(value => !value)}>
                                <span>⚙ فیلترهای تخصصی</span><span>{activeAdvancedFilterCount ? `${activeAdvancedFilterCount} فیلتر فعال` : 'جنس، فصل، قیمت و مشخصات'}</span><b>{advancedFiltersOpen ? '−' : '+'}</b>
                            </button>
                            {advancedFiltersOpen && (
                                <div className="nasaj-advanced-filter-panel">
                                    <label>نوع پارچه<select value={advancedFilters.fabricType} onChange={event => updateAdvancedFilter('fabricType', event.target.value)}><option value="all">همه انواع</option>{fabricTypeOptions.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
                                    <label>کشور تولید<select value={advancedFilters.country} onChange={event => updateAdvancedFilter('country', event.target.value)}><option value="all">همه کشورها</option>{countryOptions.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
                                    <label>فصل مناسب<select value={advancedFilters.season} onChange={event => updateAdvancedFilter('season', event.target.value)}><option value="all">همه فصل‌ها</option>{seasonOptions.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
                                    <div className="nasaj-range-filter"><span>گرماژ (GSM)</span><input type="number" min="0" placeholder="از" value={advancedFilters.minGsm} onChange={event => updateAdvancedFilter('minGsm', event.target.value)} /><input type="number" min="0" placeholder="تا" value={advancedFilters.maxGsm} onChange={event => updateAdvancedFilter('maxGsm', event.target.value)} /></div>
                                    <div className="nasaj-range-filter"><span>قیمت هر متر (تومان)</span><input type="number" min="0" placeholder="از" value={advancedFilters.minPrice} onChange={event => updateAdvancedFilter('minPrice', event.target.value)} /><input type="number" min="0" placeholder="تا" value={advancedFilters.maxPrice} onChange={event => updateAdvancedFilter('maxPrice', event.target.value)} /></div>
                                    <div className="nasaj-range-filter"><span>عرض پارچه (cm)</span><input type="number" min="0" placeholder="از" value={advancedFilters.minWidth} onChange={event => updateAdvancedFilter('minWidth', event.target.value)} /><input type="number" min="0" placeholder="تا" value={advancedFilters.maxWidth} onChange={event => updateAdvancedFilter('maxWidth', event.target.value)} /></div>
                                    <button type="button" className="nasaj-filter-reset" onClick={() => { resetAdvancedFilters(); setSearchQuery(''); setStretchFilter('all'); }}>پاک‌کردن همه فیلترها</button>
                                </div>
                            )}
                        </section>

                        <div className="nasaj-products-heading">
                            <div>
                                <span className="nasaj-eyebrow">کشف و انتخاب</span>
                                <h2>ویترین پارچه‌ها</h2>
                                <p>{nasajFormatNumber(filteredFabrics.length, 0)} نتیجه برای بررسی شما</p>
                            </div>
                            <label className="nasaj-sort-wrap">
                                <span>مرتب‌سازی</span>
                                <select value={sortMode} onChange={event => setSortMode(event.target.value)} aria-label="مرتب‌سازی پارچه‌ها">
                                    <option value="featured">پیشنهادی</option>
                                    <option value="price-low">ارزان‌تر</option>
                                    <option value="price-high">گران‌تر</option>
                                    <option value="gsm-high">گرماژ بیشتر</option>
                                    <option value="discount">بیشترین تخفیف</option>
                                </select>
                            </label>
                        </div>

                        <div className="nasaj-catalog-sample-note">عکس‌های ویترین، تصاویر عکاسی‌شده از نمونه پارچه‌ها هستند؛ ممکن است رنگ روی نمایشگر با پارچه واقعی تفاوت داشته باشد. مشخصات فنی، قیمت و فروشنده نمونه‌ها نمایشی‌اند و پیش از خرید باید تأیید شوند.</div>
                        <div className="grid grid-cols-2 gap-3 nasaj-products-grid">
                            {sortedFabrics.map((item, index) => {
                                const thumb = item.imageUrl || '';
                                const sellerPlace = places.find((p) => p.name === item.producer);
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => openFabricStudio(item)}
                                        className="nasaj-fabric-card bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer flex flex-col"
                                    >
                                        <div className="nasaj-fabric-image-row">
                                        <div className={`nasaj-fabric-image relative h-36 bg-slate-200 ${thumb ? '' : 'is-photo-missing'}`}>
                                            {thumb ? (
                                                <img
                                                    src={thumb}
                                                    alt={`${item.name}، عکس واقعی نمونه پارچه`}
                                                    loading={index < 4 ? 'eager' : 'lazy'}
                                                    decoding="async"
                                                    fetchPriority={index < 2 ? 'high' : 'low'}
                                                    onError={(event) => {
                                                        const image = event.currentTarget;
                                                        const fallbacks = nasajFabricPhotoFallbacks(thumb);
                                                        const attempt = Number(image.dataset.nasajPhotoAttempt || 0);
                                                        if (attempt < fallbacks.length) {
                                                            image.dataset.nasajPhotoAttempt = String(attempt + 1);
                                                            image.src = fallbacks[attempt];
                                                            return;
                                                        }
                                                        image.style.display = 'none';
                                                        image.parentElement.classList.add('is-photo-missing');
                                                    }}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : null}
                                            <span className="nasaj-photo-fallback">اتصال تصویر برقرار نشد؛ اینترنت را بررسی و صفحه را دوباره باز کن</span>
                                            <span className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[9px] px-2 py-0.5 rounded-lg font-bold">
                                                📷 عکس واقعی پارچه
                                            </span>
                                            {sellerPlace && (
                                                <span className="absolute top-2 left-2 bg-amber-400 text-slate-950 text-[9px] px-1.5 py-0.5 rounded-md font-black shadow">
                                                    ★{sellerPlace.rating.toFixed(1)}
                                                </span>
                                            )}
                                            <span
                                                className={`absolute bottom-2 left-2 text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold ${item.producerType === 'manufacturer' ? 'bg-slate-900/90' : 'bg-orange-600/90'
                                                    }`}
                                            >
                                                {item.producerType === 'manufacturer' ? '🏭 تولیدی' : '🏪 فروشگاه'}
                                            </span>
                                            <div className="absolute bottom-1.5 right-1.5" onClick={event => event.stopPropagation()}>
                                                <NasajFavoriteButton active={favoriteFabricIds.includes(String(item.id))} compact onClick={(event) => { event.stopPropagation(); handleToggleFavorite(item.id); }} />
                                            </div>
                                            {nasajHasActiveDiscount(item) && (
                                                <span className="absolute top-9 right-2 bg-rose-600 text-white text-[9px] px-1.5 py-0.5 rounded-md font-black shadow">
                                                    {nasajFormatNumber(item.discountPercent, 0)}٪ تخفیف
                                                </span>
                                            )}
                                        </div>
                                        <FabricCardQr fabric={item} />
                                        </div>

                                        <div className="nasaj-fabric-copy p-2.5 flex-1 flex flex-col justify-between">
                                            <div>
                                                <h3 className="font-bold text-slate-900 text-xs line-clamp-1">{item.name}</h3>
                                                <p className="nasaj-fabric-card-id" dir="ltr">{nasajFabricCode(item.id)}</p>
                                                <p className="text-[10px] text-slate-500 mt-0.5">
                                                    وزن: <b className="text-slate-700">{item.gsm} گرم</b> | عرض: {item.width}cm
                                                </p>
                                                <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-1">
                                                    {item.originCountry}
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
                                                <div className="flex -space-x-1 space-x-reverse">
                                                    {item.colors.map((c, idx) => (
                                                        <span
                                                            key={idx}
                                                            style={{ backgroundColor: c }}
                                                            className="w-3.5 h-3.5 rounded-full border border-white shadow-sm"
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-left">
                                                    {nasajHasActiveDiscount(item) && <span className="block text-[8px] text-slate-400 line-through">{item.pricePerMeter}</span>}
                                                    <span className={`text-[10px] font-bold ${nasajHasActiveDiscount(item) ? 'text-rose-600' : 'text-orange-600'}`}>
                                                        {nasajHasActiveDiscount(item) ? `${nasajFormatNumber(nasajPriceWithDiscount(item), 0)} تومان` : item.pricePerMeter}
                                                    </span>
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                className={`nasaj-compare-toggle ${compareIds.includes(String(item.id)) ? 'is-selected' : ''}`}
                                                onClick={(event) => { event.stopPropagation(); handleToggleCompare(item.id); }}
                                            >
                                                <span>{compareIds.includes(String(item.id)) ? '✓' : '⇄'}</span>
                                                {compareIds.includes(String(item.id)) ? 'انتخاب شد' : 'افزودن به مقایسه'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {filteredFabrics.length === 0 && (
                            <div className="nasaj-empty-state">
                                <span>⌕</span><strong>پارچه‌ای پیدا نشد</strong><p>عبارت جستجو یا فیلتر را تغییر دهید.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* صفحه ۲: مجله تخصصی، مقالات و اخبار پارچه */}
                {activeTab === 'qr' && <FabricQrPage fabrics={fabrics} initialFabricId={selectedFabric ? selectedFabric.id : undefined} />}

                {activeTab === 'studio' && <ProfessionalStudioPage fabrics={fabrics} profile={profile} profileId={activeProfileId} />}

                {activeTab === 'magazine' && (
                    <TextileMagazine
                        articles={INITIAL_ARTICLES}
                        fabrics={fabrics}
                        bookmarkedIds={bookmarkedArticles}
                        onToggleBookmark={handleToggleBookmark}
                        onOpenFabricById={handleOpenFabricById}
                    />
                )}

                {/* کتابخانه معرفی کالیته‌ها و رنگ‌های پارچه */}
                {activeTab === 'colors' && <ColorPaletteLibrary />}

                {activeTab === 'favorites' && (
                    <FavoritesPage
                        fabrics={fabrics}
                        favoriteIds={favoriteFabricIds}
                        favoriteFolders={favoriteFolders}
                        favoriteAssignments={favoriteAssignments}
                        onCreateFolder={handleCreateFavoriteFolder}
                        onAssignFolder={handleAssignFavoriteFolder}
                        onToggleFavorite={handleToggleFavorite}
                        onOpenFabric={openFabricStudio}
                        onBack={() => setActiveTab('explore')}
                    />
                )}

                {activeTab === 'profile' && (
                    <ProfileSettings
                        profile={profile}
                        profiles={profiles}
                        activeProfileId={activeProfileId}
                        onSwitchProfile={handleSwitchProfile}
                        onCreateProfile={handleCreateProfile}
                        onSaveProfile={handleSaveProfile}
                        theme={theme}
                        onChangeTheme={setTheme}
                        stats={{ favorites: favoriteFabricIds.length, projects: (() => { try { return JSON.parse(localStorage.getItem(nasajProfileStorageKey('nasaj_yar_design_projects', activeProfileId)) || (activeProfileId === 'local-owner' ? localStorage.getItem('nasaj_yar_design_projects') : null) || '[]').length; } catch { return 0; } })(), calculations: calculatorHistory.length }}
                        onBack={() => setActiveTab('explore')}
                    />
                )}

                {activeTab === 'calculator' && (
                    <FabricCalculator fabrics={fabrics} history={calculatorHistory} onSaveHistory={handleSaveCalculatorHistory} onDeleteHistory={handleDeleteCalculatorHistory} onBack={() => setActiveTab('explore')} />
                )}

                {activeTab === 'deals' && (
                    <DiscountsPage
                        fabrics={fabrics}
                        alertsEnabled={discountAlertsEnabled}
                        notificationPermission={notificationPermission}
                        onToggleAlerts={handleToggleDiscountAlerts}
                        onOpenFabric={openFabricStudio}
                        onBack={() => setActiveTab('explore')}
                    />
                )}

                {/* صفحه ۳: استودیو نمایش لمسی پارچه، ویدیو و شناسنامه فنی کامل */}
                {activeTab === 'detail' && selectedFabric && (
                    <div id="nasaj-fabric-detail-page" className="h-full overflow-y-auto pb-24 no-scrollbar bg-white">
                        <Fabric2DViewer fabric={selectedFabric} activeColor={activeColor} />

                        <div className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                                            کد: {selectedFabric.code}
                                        </span>
                                        <span className="nasaj-detail-qr-id" dir="ltr">{nasajFabricCode(selectedFabric.id)}</span>
                                        {incomingBatchCode && String(selectedFabric.id) === String(incomingFabricId) && <span className="nasaj-detail-qr-id">طاقه: {incomingBatchCode}</span>}
                                        <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                            {selectedFabric.originCountry}
                                        </span>
                                        {selectedProducerPlace && (
                                            <span className="text-[10px] font-black text-slate-900 bg-amber-300/80 px-2 py-0.5 rounded-md">
                                                ★ {selectedProducerPlace.rating.toFixed(1)} ({selectedProducerPlace.reviewCount} رای)
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="font-black text-base text-slate-900 mt-1.5">{selectedFabric.name}</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {selectedFabric.producerType === 'manufacturer' ? '🏭 تولیدکننده:' : '🏪 فروشگاه:'}{' '}
                                        <b className="text-slate-700">{selectedFabric.producer}</b> ({selectedFabric.area})
                                    </p>
                                </div>
                                <div className="text-left flex flex-col items-end gap-1.5">
                                    <div className="nasaj-export-hide"><NasajFavoriteButton active={favoriteFabricIds.includes(String(selectedFabric.id))} onClick={() => handleToggleFavorite(selectedFabric.id)} /></div>
                                    <span className="text-[10px] text-slate-400 block">قیمت هر متر</span>
                                    {nasajHasActiveDiscount(selectedFabric) && <span className="text-[10px] text-slate-400 line-through">{selectedFabric.pricePerMeter}</span>}
                                    <span className={`font-black text-sm ${nasajHasActiveDiscount(selectedFabric) ? 'text-rose-600' : 'text-slate-900'}`}>
                                        {nasajHasActiveDiscount(selectedFabric) ? `${nasajFormatNumber(nasajPriceWithDiscount(selectedFabric), 0)} تومان` : selectedFabric.pricePerMeter}
                                    </span>
                                    {nasajHasActiveDiscount(selectedFabric) && <span className="text-[9px] bg-rose-50 text-rose-700 rounded-md px-2 py-0.5">{nasajFormatNumber(selectedFabric.discountPercent, 0)}٪ تخفیف</span>}
                                </div>
                            </div>

                            <div className="nasaj-detail-metrics">
                                <div><strong>{nasajFormatNumber(selectedFabric.gsm, 0)}</strong><span>گرماژ GSM</span></div>
                                <div><strong>{nasajFormatNumber(selectedFabric.width, 0)} cm</strong><span>عرض پارچه</span></div>
                                <div><strong>{nasajFormatNumber(selectedWeightPerMeter, 0)} g</strong><span>وزن هر متر طول</span></div>
                            </div>

                            <div className="mt-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                <span className="text-xs font-bold text-slate-700 block mb-2">
                                    🎨 کالیته رنگ موجود (برای تغییر رنگ بافت لمس کنید):
                                </span>
                                <div className="flex gap-2.5 flex-wrap items-center">
                                    {selectedFabric.colors.map((c, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setActiveColor(c)}
                                            title={c}
                                            style={{ backgroundColor: c }}
                                            className={`w-8 h-8 rounded-full transition transform ${activeColor === c ? 'scale-110 ring-2 ring-offset-2 ring-slate-900' : 'opacity-80'}`}
                                        />
                                    ))}
                                    {!selectedFabric.colors.some(c => c.toLowerCase() === activeColor.toLowerCase()) && (
                                        <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-full pr-1 pl-2 py-1">
                                            <span className="w-7 h-7 rounded-full border border-white shadow" style={{ backgroundColor: activeColor }} />
                                            <span className="text-[9px] font-bold text-orange-700">رنگ ترکیبی</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/80">
                                <h3 className="font-bold text-xs text-emerald-950 mb-2 flex items-center gap-1.5">
                                    <span>✨</span>
                                    <span>ویژگی‌های شاخص پارچه</span>
                                </h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedFabric.features.map((feat, idx) => (
                                        <span
                                            key={idx}
                                            className="bg-white text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-2xs"
                                        >
                                            ✓ {feat}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-3 bg-orange-50/70 p-3.5 rounded-2xl border border-orange-200/80">
                                <h3 className="font-bold text-xs text-orange-950 mb-2 flex items-center gap-1.5">
                                    <span>✂️</span>
                                    <span>مناسب برای دوخت چه لباس‌هایی است؟</span>
                                </h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedFabric.suitableFor.map((garment, idx) => (
                                        <span
                                            key={idx}
                                            className="bg-white text-orange-800 border border-orange-200 px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-2xs"
                                        >
                                            👔 {garment}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-4">
                                <h3 className="font-bold text-xs text-slate-900 mb-2">📋 شناسنامه فنی و مشخصات تخصصی پارچه</h3>
                                <div className="rounded-2xl border border-slate-200 overflow-hidden text-xs">
                                    <div className="flex justify-between items-center p-3 bg-slate-50 border-b border-slate-200">
                                        <span className="text-slate-500">جنس پارچه</span>
                                        <span className="font-bold text-slate-900 text-left">{selectedFabric.fabricType}</span>
                                    </div>

                                    <div className="flex justify-between items-start gap-3 p-3 bg-white border-b border-slate-200">
                                        <span className="text-slate-500 whitespace-nowrap">مواد تشکیل‌دهنده</span>
                                        <span className="font-bold text-slate-900 text-left leading-relaxed">
                                            {selectedFabric.rawMaterials}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-slate-50 border-b border-slate-200">
                                        <span className="text-slate-500">تولید کشور</span>
                                        <span className="font-bold text-slate-900">{selectedFabric.originCountry}</span>
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-white border-b border-slate-200">
                                        <span className="text-slate-500">وزن هر متر مربع (گرماژ)</span>
                                        <span className="font-bold text-slate-900">{selectedFabric.gsm} گرم (GSM)</span>
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-slate-50 border-b border-slate-200">
                                        <span className="text-slate-500">وزن هر متر طول</span>
                                        <span className="font-bold text-slate-900">حدود {selectedWeightPerMeter} گرم در متر</span>
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-white border-b border-slate-200">
                                        <span className="text-slate-500">ابعاد (عرض × متراژ طاقه)</span>
                                        <span className="font-bold text-slate-900">
                                            عرض {selectedFabric.width} سانتی‌متر | طاقه {selectedFabric.rollLength} متری
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-slate-50 border-b border-slate-200">
                                        <span className="text-slate-500">میزان کشسانی</span>
                                        <span className="font-bold text-orange-600">{selectedFabric.stretch}</span>
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-white border-b border-slate-200">
                                        <span className="text-slate-500">ایستایی و ضخامت</span>
                                        <span className="font-bold text-slate-900 text-left">{selectedFabric.drapeAndThickness}</span>
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-slate-50 border-b border-slate-200">
                                        <span className="text-slate-500">فصل مناسب</span>
                                        <span className="font-bold text-slate-900">{selectedFabric.season}</span>
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-white border-b border-slate-200">
                                        <span className="text-slate-500">آبرفت و ثبات رنگ</span>
                                        <span className="font-bold text-emerald-700 text-left">{selectedFabric.shrinkage}</span>
                                    </div>

                                    <div className="flex justify-between items-start gap-3 p-3 bg-slate-50 border-b border-slate-200">
                                        <span className="text-slate-500 whitespace-nowrap">شستشو و نگهداری</span>
                                        <span className="font-medium text-slate-800 text-left leading-relaxed">
                                            {selectedFabric.careInstructions}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-white">
                                        <span className="text-slate-500">حداقل سفارش</span>
                                        <span className="font-bold text-slate-900">{selectedFabric.minOrder}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="nasaj-detail-qr-cta nasaj-export-hide"><div><span>▦</span><div><strong>شناسه دیجیتال این پارچه</strong><small>QR اختصاصی با مشخصات فنی محصول</small></div></div><button type="button" onClick={() => setActiveTab('qr')}>ساخت QR <b>←</b></button></div>

                            <div className="grid grid-cols-2 gap-2 mt-4 nasaj-export-hide">
                                <button type="button" onClick={() => setActiveTab('studio')} className="nasaj-detail-secondary">✦ ویرایش در استودیوی طراحی</button>
                                <button type="button" onClick={() => setActiveTab('calculator')} className="nasaj-detail-secondary">🧮 محاسبه متراژ</button>
                            </div>
                            <div className="flex gap-2 mt-2 nasaj-export-hide">
                                <button
                                    onClick={() => setActiveTab('map')}
                                    className="flex-1 bg-slate-900 text-white py-3 rounded-2xl text-xs font-bold shadow hover:bg-slate-800"
                                >
                                    🗺️ ثبت امتیاز و نقشه تهران
                                </button>
                                <a
                                    href="tel:02155620011"
                                    className="flex-1 bg-orange-600 text-white text-center py-3 rounded-2xl text-xs font-bold shadow hover:bg-orange-700"
                                >
                                    📞 استعلام و خرید عمده
                                </a>
                            </div>

                            <section className="nasaj-detail-export-panel nasaj-export-hide">
                                <div className="nasaj-detail-export-heading"><span>خروجی کامل محصول</span><strong>همه اطلاعات همین صفحه را ذخیره کنید</strong><small>تصویر پارچه، قیمت، رنگ‌بندی، کاربردها و تمام مشخصات فنی</small></div>
                                <div className="nasaj-detail-export-buttons">
                                    <button type="button" onClick={() => handleDownloadFabricPdf(selectedFabric)} disabled={pdfExporting || imageExporting} className="nasaj-detail-export-pdf">
                                        <span className="nasaj-detail-export-icon">{pdfExporting ? '◌' : 'PDF'}</span>
                                        <span><b>{pdfExporting ? 'در حال ساخت PDF…' : 'دریافت PDF کامل'}</b><small>چندصفحه‌ای و مناسب چاپ</small></span>
                                        <span className="nasaj-detail-export-arrow">↓</span>
                                    </button>
                                    <button type="button" onClick={() => handleDownloadFabricSnapshot(selectedFabric)} disabled={imageExporting || pdfExporting} className="nasaj-detail-export-image">
                                        <span className="nasaj-detail-export-icon">{imageExporting ? '◌' : '▧'}</span>
                                        <span><b>{imageExporting ? 'در حال تهیه تصویر…' : 'ذخیره تصویر کامل صفحه'}</b><small>یک تصویر بلند PNG از تمام صفحه</small></span>
                                        <span className="nasaj-detail-export-arrow">↓</span>
                                    </button>
                                </div>
                            </section>
                        </div>
                    </div>
                )}

                {/* صفحه ۴: نقشه تهران همراه با امتیازدهی ستاره‌ای */}
                {activeTab === 'map' && (
                    <TehranMap
                        places={places}
                        onRatePlace={handleRatePlace}
                        onViewProducerFabrics={handleViewProducerFabrics}
                    />
                )}

                {/* صفحه ۵: فرم ثبت پارچه توسط تولیدکننده */}
                {activeTab === 'add' && (
                    <AddFabricForm
                        onAddSuccess={handleNewFabricAdded}
                        onCancel={() => setActiveTab('explore')}
                    />
                )}

                {activeTab === 'explore' && compareIds.length > 0 && (
                    <div className="nasaj-compare-dock">
                        <div className="nasaj-compare-dock-copy">
                            <span className="nasaj-compare-dock-icon">⇄</span>
                            <div><strong>{nasajFormatNumber(compareIds.length, 0)} پارچه انتخاب شده</strong><small>{compareIds.length < 2 ? 'برای شروع مقایسه یک پارچه دیگر انتخاب کنید' : 'آماده بررسی کنار هم'}</small></div>
                        </div>
                        <button type="button" onClick={() => setCompareOpen(true)} disabled={compareIds.length < 2}>مقایسه</button>
                        <button type="button" className="nasaj-compare-clear" onClick={() => setCompareIds([])} aria-label="پاک کردن انتخاب‌ها">×</button>
                    </div>
                )}
                {compareOpen && (
                    <FabricCompareModal
                        fabrics={fabrics}
                        compareIds={compareIds}
                        onRemove={fabricId => { const next = compareIds.filter(id => id !== String(fabricId)); setCompareIds(next); if (!next.length) setCompareOpen(false); }}
                        onClose={() => setCompareOpen(false)}
                    />
                )}
            </main>

            {/* نوار ناوبری پایین؛ مسیرهای اصلی نسخه جدید */}
            <nav className="nasaj-bottom-nav bg-white border-t border-slate-200 px-1.5 py-2 flex items-center justify-between shrink-0 z-30" aria-label="ناوبری اصلی">
                <button type="button" onClick={() => setActiveTab('explore')} className={`nasaj-nav-item flex-1 flex flex-col items-center gap-0.5 py-1 rounded-xl transition ${activeTab === 'explore' || activeTab === 'detail' ? 'is-active text-slate-900 font-bold' : 'text-slate-400'}`}>
                    <span className="text-lg">🧵</span><span className="text-[10px]">ویترین</span>
                </button>
                <button type="button" onClick={() => setActiveTab('qr')} className={`nasaj-nav-item flex-1 flex flex-col items-center gap-0.5 py-1 rounded-xl transition ${activeTab === 'qr' ? 'is-active text-orange-600 font-black' : 'text-slate-400'}`}>
                    <span className="text-lg">▦</span><span className="text-[10px]">QR پارچه</span>
                </button>
                <button type="button" onClick={() => setActiveTab('add')} aria-label="ثبت پارچه جدید" className={`nasaj-add-nav flex-1 flex flex-col items-center justify-center gap-0.5 -mt-4 mx-1 min-w-[66px] max-w-[76px] h-[62px] rounded-2xl text-white shadow-lg transition transform active:scale-95 ${activeTab === 'add' ? 'bg-slate-900' : 'bg-orange-600 hover:bg-orange-700'}`}>
                    <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-2xl leading-none font-black">+</span><span className="text-[10px] font-black whitespace-nowrap">ثبت پارچه</span>
                </button>
                <button type="button" onClick={() => setActiveTab('studio')} className={`nasaj-nav-item flex-1 flex flex-col items-center gap-0.5 py-1 rounded-xl transition ${activeTab === 'studio' ? 'is-active text-orange-600 font-black' : 'text-slate-400'}`}>
                    <span className="text-lg">✂</span><span className="text-[10px]">طراحی و دوخت</span>
                </button>
                <button type="button" onClick={() => setActiveTab('map')} className={`nasaj-nav-item flex-1 flex flex-col items-center gap-0.5 py-1 rounded-xl transition ${activeTab === 'map' ? 'is-active text-slate-900 font-bold' : 'text-slate-400'}`}>
                    <span className="text-lg">🗺️</span><span className="text-[10px]">نقشه</span>
                </button>
            </nav>

        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);