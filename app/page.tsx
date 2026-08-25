'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';

const phone = '918248395591';
const wa = (message: string) => `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

const copy = {
  en: {
    home: 'Home', about: 'Our Story', products: 'Products', wholesale: 'Wholesale', gallery: 'Gallery', contact: 'Contact',
    eyebrow: 'MRJ BEST BAKERY · PALANI', hero: 'Freshly Baked\nEvery Day', sub: 'Premium wholesale & retail bakery, made with care for every table.',
    view: 'View Products', talk: 'Contact Us', order: 'WhatsApp Order', discover: 'Discover our story',
    story: 'Baked with warmth.\nServed with pride.', storyText: 'From soft everyday buns to indulgent tea-time treats, MRJ Best Bakery brings freshly made goodness to families and businesses across Palani.',
    mission: 'Our mission', missionText: 'To make every day sweeter with honest ingredients, careful baking, and dependable service.',
    productsTitle: 'Something good\nin every bite.', productsText: 'Fresh from our ovens, made to make your day.', enquire: 'Enquire on WhatsApp',
    wholesaleTitle: 'Your dependable\nbakery partner.', wholesaleText: 'Reliable, freshly made bakery supplies for businesses that serve their communities every day.', bulk: 'Request a bulk order',
    galleryTitle: 'A little taste\nof our kitchen.', testimonialsTitle: 'Loved around\nPalani.', contactTitle: 'Let’s bake\nsomething great.', address: '12A Main Bazaar St.,\nNew Aayakudi, Palani', send: 'Send WhatsApp enquiry'
  },
  ta: {
    home: 'முகப்பு', about: 'எங்களைப் பற்றி', products: 'தயாரிப்புகள்', wholesale: 'மொத்த விற்பனை', gallery: 'காட்சியகம்', contact: 'தொடர்பு',
    eyebrow: 'எம்.ஆர்.ஜே பெஸ்ட் பேக்கரி · பழனி', hero: 'தினமும் புதிதாக\nசுட்டது', sub: 'ஒவ்வொரு மேசைக்கும் அக்கறையுடன் தயாரிக்கப்படும் உயர்தர மொத்த மற்றும் சில்லறை பேக்கரி.',
    view: 'தயாரிப்புகள்', talk: 'தொடர்பு கொள்ள', order: 'வாட்ஸ்அப் ஆர்டர்', discover: 'எங்கள் கதையைப் பாருங்கள்',
    story: 'அன்புடன் சுட்டது.\nபெருமையுடன் வழங்குவது.', storyText: 'மென்மையான தினசரி பன்கள் முதல் சுவையான தேநீர் நேர சிற்றுண்டிகள் வரை, எம்.ஆர்.ஜே பெஸ்ட் பேக்கரி பழனி முழுவதும் புதிய சுவையை வழங்குகிறது.',
    mission: 'எங்கள் நோக்கம்', missionText: 'நல்ல பொருட்கள், கவனமான தயாரிப்பு மற்றும் நம்பகமான சேவையால் ஒவ்வொரு நாளையும் இனிமையாக்குவது.',
    productsTitle: 'ஒவ்வொரு கடியிலும்\nஒரு நல்ல சுவை.', productsText: 'எங்கள் அடுப்பிலிருந்து நேரடியாக உங்களுக்காக.', enquire: 'வாட்ஸ்அப்பில் விசாரிக்கவும்',
    wholesaleTitle: 'உங்கள் நம்பகமான\nபேக்கரி கூட்டாளர்.', wholesaleText: 'சமூகத்திற்கு தினமும் சேவை செய்யும் வணிகங்களுக்கு நம்பகமான, புதிய பேக்கரி விநியோகம்.', bulk: 'மொத்த ஆர்டரை கோரவும்',
    galleryTitle: 'எங்கள் சமையலறையின்\nசிறு சுவை.', testimonialsTitle: 'பழனியின்\nஅன்பு.', contactTitle: 'சுவையானதை\nசேர்ந்து செய்வோம்.', address: '12A மெயின் பஜார் தெரு,\nபுது ஆயக்குடி, பழனி', send: 'வாட்ஸ்அப் விசாரணை அனுப்பவும்'
  }
};

const products = [
  ['Bread', 'பிரெட்', 'Fresh, soft loaves for every home and table.', '/images/bread.jpg'],
  ['Coconut Bun', 'தேங்காய் பன்', 'Soft coconut goodness in every bite.', '/images/coconut-bun.jpg'],
  ['Milk Bun', 'பால் பன்', 'Pillowy soft sweetness for any time.', '/images/milk-bun.jpg'],
  ['Butter Bun', 'பட்டர் பன்', 'Golden, rich and delightfully buttery.', '/images/butter-bun.jpg'],
  ['Cream Bun', 'கிரீம் பன்', 'A sweet, airy treat made fresh daily.', '/images/cream-bun.jpg'],
  ['Tea Cake', 'டீ கேக்', 'The perfect companion for your evening tea.', '/images/tea-cake.jpg'],
  ['Roll Cake', 'ரோல் கேக்', 'Tender sponge cake with a sweet swirl.', '/images/swiss-roll.jpg'],
  ['Swiss Roll', 'ஸ்விஸ் ரோல்', 'Classic spirals, carefully baked fresh.', '/images/swiss-roll.jpg'],
  ['Cookies', 'குக்கீஸ்', 'Crisp, comforting, and made for sharing.', '/images/cookies.jpg'],
  ['Biscuits', 'பிஸ்கட்', 'Classic crunch for your tea-time break.', '/images/cookies.jpg'],
  ['Snacks', 'ஸ்நாக்ஸ்', 'Savoury little bites for any moment.', '/images/butter-bun.jpg']
];
const audiences = ['Tea Stalls', 'Hotels & Lodges', 'Restaurants', 'Supermarkets', 'Schools & Canteens', 'Distributors', 'Petti Shops & Retail Stores'];
const gallery = [
  ['Fresh Buns', '/images/local-bakery-display.png', 'Buns'],
  ['Coconut Buns', '/images/coconut-bun.jpg', 'Buns'],
  ['Soft Milk Buns', '/images/milk-bun.jpg', 'Buns'],
  ['Fresh Tea Cake', '/images/tea-cake.jpg', 'Cakes'],
  ['Swiss Roll', '/images/swiss-roll.jpg', 'Cakes'],
  ['Tea-time Cookies', '/images/cookies.jpg', 'Cakes']
];
const showcasePieces = {
  'roll-cake': [[35.643, 9.143, 39.857, 35.071], [11.286, 15, 34.857, 34.929], [56, 23.5, 34, 37.357], [11, 50.571, 34.786, 32.643], [31.929, 57.786, 31.857, 33], [54.643, 52.786, 31.786, 33.5]],
  'coconut-bun': [[2.786, 27.5, 43.286, 43.786], [54.786, 28.143, 42.571, 43.071], [12.214, 52.5, 37.429, 43.214], [13.143, 3.714, 36.714, 43.714], [51, 3.786, 37.5, 43.357], [51.429, 52.571, 36.429, 43]],
  'milk-bun': [[3.214, 16.786, 46.643, 62.643], [45.357, 28.143, 51.929, 54.929]],
  cookies: [[35.786, 33.071, 27.929, 18.571], [36.143, 82.071, 27.643, 16.143], [36.429, 65.786, 27.143, 15.786], [35.143, 1.5, 28.357, 15.643], [35.929, 17.714, 27.786, 15.5], [36.357, 52.571, 27.429, 14.143]]
} as const;
const showcaseScenes = [
  { id: 'roll-cake', motion: 'spiral', name: 'Roll Cake', tamil: 'ரோல் கேக்', kicker: 'A SWIRL OF JOY', tamilKicker: 'சுவையின் சுழல்', description: 'Soft sponge, silky cream and a berry-bright swirl.', tamilDescription: 'மென்மையான ஸ்பாஞ்ச், சில்கி கிரீம் மற்றும் பெர்ரி சுவையின் சுழல்.', labels: ['Soft sponge', 'Creamy centre', 'Berry swirl'], tamilLabels: ['மென்மையான ஸ்பாஞ்ச்', 'கிரீம் மையம்', 'பெர்ரி சுழல்'], pieces: showcasePieces['roll-cake'] },
  { id: 'coconut-bun', motion: 'radial', name: 'Coconut Bun', tamil: 'தேங்காய் பன்', kicker: 'TROPICAL COMFORT', tamilKicker: 'தேங்காயின் இனிமை', description: 'Golden baked softness with a generous coconut filling.', tamilDescription: 'தாராளமான தேங்காய் நிரப்புதலுடன் பொன்னிற மென்மையான பன்.', labels: ['Golden bun', 'Coconut filling', 'Freshly baked'], tamilLabels: ['பொன்னிற பன்', 'தேங்காய் நிரப்பு', 'புதிதாக சுட்டது'], pieces: showcasePieces['coconut-bun'] },
  { id: 'milk-bun', motion: 'layers', name: 'Milk Bun', tamil: 'பால் பன்', kicker: 'CLOUD-SOFT BITES', tamilKicker: 'மேகம் போன்ற மென்மை', description: 'Pillowy, lightly sweet buns made for any time.', tamilDescription: 'எந்த நேரத்திற்கும் ஏற்ற பஞ்சு போன்ற மென்மையான இனிப்பு பன்கள்.', labels: ['Pillowy soft', 'Milky crumb', 'Daily fresh'], tamilLabels: ['பஞ்சு மென்மை', 'பால் சுவை', 'தினமும் புதிது'], pieces: showcasePieces['milk-bun'] },
  { id: 'cookies', motion: 'scatter', name: 'Cookies', tamil: 'குக்கீஸ்', kicker: 'THE PERFECT CRUNCH', tamilKicker: 'சரியான மொறுமொறுப்பு', description: 'Buttery little bites with a little chocolate joy.', tamilDescription: 'வெண்ணெய் சுவையுடன் சாக்லேட் மகிழ்ச்சி தரும் சிறு கடிகள்.', labels: ['Buttery bake', 'Chocolate chips', 'Tea-time ready'], tamilLabels: ['வெண்ணெய் சுவை', 'சாக்லேட் சிப்ஸ்', 'தேநீர் நேரம்'], pieces: showcasePieces.cookies }
];

export default function Home() {
  const [lang, setLang] = useState<'en' | 'ta'>('en');
  const [menu, setMenu] = useState(false);
  const [active, setActive] = useState('All');
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const showcaseRef = useRef<HTMLElement>(null);
  const t = copy[lang];
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => {
    const elements = document.querySelectorAll('.section, .stats');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('is-visible'); });
    }, { threshold: 0.12 });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const showcase = showcaseRef.current;
    if (!showcase) return;
    let rotation: ReturnType<typeof setInterval> | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        rotation = setInterval(() => setShowcaseIndex((index) => (index + 1) % showcaseScenes.length), 7600);
      } else if (rotation) {
        clearInterval(rotation);
        rotation = undefined;
      }
    }, { threshold: 0.3 });
    observer.observe(showcase);
    return () => { observer.disconnect(); if (rotation) clearInterval(rotation); };
  }, []);
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); window.open(wa(`Hello MRJ Best Bakery!\nName: ${data.get('name')}\nPhone: ${data.get('mobile')}\nEnquiry: ${data.get('message')}`), '_blank'); setToast(true); setTimeout(() => setToast(false), 3500); };
  const nav = [['home', t.home], ['about', t.about], ['products', t.products], ['wholesale', t.wholesale], ['gallery', t.gallery], ['contact', t.contact]];
  return <main>
    <header className="header"><a className="brand" href="#home" aria-label="MRJ Best Bakery home"><span>MRJ</span><small>BEST BAKERY</small></a><nav className={menu ? 'open' : ''}>{nav.map(([id, label]) => <a onClick={() => setMenu(false)} href={`#${id}`} key={id}>{label}</a>)}<button className="lang" onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}>{lang === 'en' ? 'தமிழ்' : 'EN'}</button></nav><button className="menu" onClick={() => setMenu(!menu)} aria-label="Open menu">{menu ? '×' : '☰'}</button></header>

    <section className="hero" id="home"><div className="hero-shade" /><div className="hero-content"><p className="eyebrow">{t.eyebrow}</p><h1>{t.hero.split('\n').map((x, i) => <span key={i}>{x}</span>)}</h1><p className="lead">{t.sub}</p><div className="buttons"><a className="button gold" href="#products">{t.view} <b>→</b></a><a className="button ghost" href={wa('Hello MRJ Best Bakery! I would like to place an order.')} target="_blank">{t.order}</a></div></div><a className="scroll" href="#about"><i /> Scroll to explore</a></section>

    <section className="story section" id="about"><div className="story-visual"><img src="/images/story-bread.jpg" alt="Artisan breads freshly prepared by MRJ Best Bakery" /><div className="story-wash" /><div className="story-stamp"><span>✦</span><b>{lang === 'en' ? 'FRESHLY' : 'புதிதாக'}</b><small>{lang === 'en' ? 'BAKED DAILY' : 'தினமும் சுட்டது'}</small></div><div className="story-note"><strong>MRJ</strong><span>{lang === 'en' ? 'Made with care\nin Palani' : 'பழனியில்\nஅன்புடன் தயாரிப்பு'}</span></div></div><div className="story-copy"><p className="eyebrow gold-text">OUR STORY</p><h2>{t.story.split('\n').map((x, i) => <span key={i}>{x}</span>)}</h2><p>{t.storyText}</p><div className="values"><article><b>01</b><h3>{t.mission}</h3><p>{t.missionText}</p></article><article><b>02</b><h3>{lang === 'en' ? 'Our promise' : 'எங்கள் உறுதி'}</h3><p>{lang === 'en' ? 'Freshly prepared treats that feel just like home.' : 'வீட்டின் சுவையை நினைவூட்டும் புதிய தயாரிப்புகள்.'}</p></article></div><a className="text-link" href="#contact">{t.discover} <b>→</b></a></div></section>

    <section className="stats"><div><strong>10+</strong><span>{lang === 'en' ? 'Years of warmth' : 'ஆண்டுகள் அனுபவம்'}</span></div><div><strong>30+</strong><span>{lang === 'en' ? 'Fresh products' : 'புதிய தயாரிப்புகள்'}</span></div><div><strong>1K+</strong><span>{lang === 'en' ? 'Happy customers' : 'மகிழ்ந்த வாடிக்கையாளர்கள்'}</span></div><div><strong>20+</strong><span>{lang === 'en' ? 'Delivery areas' : 'விநியோக இடங்கள்'}</span></div></section>

    <section className="moments section"><div className="moments-intro"><p className="eyebrow gold-text">MADE FOR EVERYDAY JOY</p><h2>{lang === 'en' ? <>From our bakery<br/>to your moments.</> : <>எங்கள் பேக்கரியிலிருந்து<br/>உங்கள் மகிழ்ச்சிக்கு.</>}</h2><p>{lang === 'en' ? 'For family tea-time, friendly catch-ups, and the neighbourhood shops that serve everyone.' : 'குடும்ப தேநீர் நேரம், நண்பர்கள் சந்திப்பு மற்றும் அனைவருக்கும் சேவை செய்யும் அருகிலுள்ள கடைகளுக்காக.'}</p></div><div className="moment-cards"><article><img src="/images/family-bakery.png" alt="Indian family enjoying fresh bakery buns" /><div><small>{lang === 'en' ? 'FOR FAMILY' : 'குடும்பத்திற்காக'}</small><h3>{lang === 'en' ? 'Warm moments at home' : 'வீட்டின் இனிய தருணங்கள்'}</h3></div></article><article><img src="/images/friends-bakery.png" alt="Friends sharing bakery treats and tea" /><div><small>{lang === 'en' ? 'FOR FRIENDS' : 'நண்பர்களுக்காக'}</small><h3>{lang === 'en' ? 'Good food, better company' : 'நல்ல உணவு, நல்ல நட்பு'}</h3></div></article><article><img src="/images/retailer-bakery.png" alt="Local retailer receiving fresh bakery supplies" /><div><small>{lang === 'en' ? 'FOR BUSINESS' : 'வணிகத்திற்காக'}</small><h3>{lang === 'en' ? 'Fresh supply, every day' : 'தினமும் புதிய விநியோகம்'}</h3></div></article></div></section>

    <section className="showcase" ref={showcaseRef} aria-label={lang === 'en' ? 'Featured bakery products' : 'சிறப்பு பேக்கரி தயாரிப்புகள்'}>{(() => { const scene = showcaseScenes[showcaseIndex]; const labels = lang === 'en' ? scene.labels : scene.tamilLabels; return <div className="showcase-inner" key={scene.id}><div className="showcase-copy"><p className="eyebrow">{lang === 'en' ? scene.kicker : scene.tamilKicker}</p><p className="showcase-count"><span>0{showcaseIndex + 1}</span> / 0{showcaseScenes.length}</p><h2>{lang === 'en' ? scene.name : scene.tamil}</h2><p>{lang === 'en' ? scene.description : scene.tamilDescription}</p><a className="button showcase-button" href="#products">{lang === 'en' ? 'Explore products' : 'தயாரிப்புகளைப் பாருங்கள்'} <b>→</b></a></div><div className="showcase-stage" aria-hidden="true"><div className="showcase-orbit orbit-one" /><div className="showcase-orbit orbit-two" /><div className={`showcase-product motion-${scene.motion}`}>{scene.pieces.map(([left, top, width, height], index) => <img className={`showcase-piece actual-piece part-${index}`} src={`/images/showcase/pieces/${scene.id}/piece-${index + 1}.png`} style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }} alt="" key={index} />)}</div>{labels.map((label, index) => <div className={`showcase-label label-${index + 1}`} key={label}><i /><span>{label}</span></div>)}</div><div className="showcase-progress"><i style={{ width: `${((showcaseIndex + 1) / showcaseScenes.length) * 100}%` }} /></div></div>; })()}</section>

    <section className="products section" id="products"><div className="section-intro"><p className="eyebrow gold-text">FROM OUR OVEN</p><h2>{t.productsTitle.split('\n').map((x, i) => <span key={i}>{x}</span>)}</h2><p>{t.productsText}</p></div><div className="product-grid">{products.map(([name, tamil, desc, image], index) => <article className="product-card" key={name}><div className="product-image"><img src={image} alt={`${name} from MRJ Best Bakery`} /></div><div className="product-info"><small>{lang === 'en' ? 'FRESH DAILY' : 'தினமும் புதிது'}</small><h3>{lang === 'en' ? name : tamil}</h3><p>{desc}</p><a href={wa(`Hello MRJ Best Bakery! I would like to enquire about ${name}.`)} target="_blank">{t.enquire} <b>↗</b></a></div></article>)}</div></section>

    <section className="wholesale section" id="wholesale"><div className="wholesale-copy"><div className="wholesale-photo"><img src="/images/local-bakery-display.png" alt="Fresh bakery products ready for wholesale supply" /><span>{lang === 'en' ? 'Fresh every morning' : 'தினமும் புதிது'}</span></div><p className="eyebrow gold-text">FOR BUSINESS</p><h2>{t.wholesaleTitle.split('\n').map((x, i) => <span key={i}>{x}</span>)}</h2><p>{t.wholesaleText}</p><a className="button gold" href="#contact">{t.bulk} <b>→</b></a></div><div className="serving-panel"><p className="eyebrow gold-text">{lang === 'en' ? 'WE SUPPLY FRESH DAILY TO' : 'தினமும் புதிய விநியோகம்'}</p><h3>{lang === 'en' ? 'Businesses we proudly serve' : 'நாங்கள் சேவை செய்யும் வணிகங்கள்'}</h3><div className="audience-pills">{audiences.map((x) => <span key={x}>{x}</span>)}</div><p className="supply-note">{lang === 'en' ? 'Regular delivery · Bulk orders · Reliable quality' : 'தொடர் விநியோகம் · மொத்த ஆர்டர்கள் · நம்பகமான தரம்'}</p></div></section>

    <section className="gallery section" id="gallery"><div className="gallery-head"><div><p className="eyebrow gold-text">BAKED MEMORIES</p><h2>{t.galleryTitle.split('\n').map((x, i) => <span key={i}>{x}</span>)}</h2><p className="gallery-subtitle">{lang === 'en' ? 'Fresh favourites made for every tea-time and every celebration.' : 'ஒவ்வொரு தேநீர் நேரத்திற்கும் கொண்டாட்டத்திற்கும் புதிய சுவைகள்.'}</p></div><div className="filters">{['All', 'Buns', 'Cakes'].map(x => <button className={active === x ? 'active' : ''} onClick={() => setActive(x)} key={x}>{x}</button>)}</div></div><div className="gallery-grid">{gallery.filter(([, , category]) => active === 'All' || category === active).map(([label, image]) => <button aria-label={`Open ${label} photo`} onClick={() => setLightbox(image)} className="gallery-item" key={label}><img src={image} alt={label} /><span>{label}</span><i>Tap to view ↗</i></button>)}</div></section>

    <section className="testimonials section"><div className="section-intro centered"><p className="eyebrow gold-text">KIND WORDS</p><h2>{t.testimonialsTitle.split('\n').map((x, i) => <span key={i}>{x}</span>)}</h2></div><div className="review-row"><article><div>★★★★★</div><p>“The coconut buns are always soft, fresh, and gone within minutes at our shop.”</p><strong>— Local Tea Shop</strong></article><article><div>★★★★★</div><p>“Reliable wholesale supply and the quality is consistently excellent.”</p><strong>— Restaurant Partner</strong></article><article><div>★★★★★</div><p>“Our family’s favourite stop for evening snacks and sweet treats.”</p><strong>— Palani Customer</strong></article></div></section>

    <section className="contact section" id="contact"><div className="contact-info"><p className="eyebrow gold-text">SAY HELLO</p><h2>{t.contactTitle.split('\n').map((x, i) => <span key={i}>{x}</span>)}</h2><a className="contact-line" href="tel:+918248395591"><span>☎</span> +91 82483 95591</a><a className="contact-line" href="https://maps.google.com/?q=12A+Main+Bazaar+St,+New+Aayakudi,+Palani" target="_blank"><span>⌖</span>{t.address.split('\n').map((x,i)=><em key={i}>{x}</em>)}</a><a className="contact-line" href="https://instagram.com/mrjbestbakery96" target="_blank"><span>◎</span> @mrjbestbakery96</a></div><form onSubmit={submit}><label>{lang === 'en' ? 'Your name' : 'பெயர்'}<input name="name" required placeholder="Your name" /></label><label>{lang === 'en' ? 'Phone number' : 'தொலைபேசி எண்'}<input name="mobile" required inputMode="tel" placeholder="Your phone number" /></label><label>{lang === 'en' ? 'How can we help?' : 'எவ்வாறு உதவலாம்?'}<textarea name="message" required placeholder="Tell us what you need" rows={4} /></label><button className="button gold" type="submit">{t.send} <b>→</b></button></form></section>
    <footer><a className="brand" href="#home"><span>MRJ</span><small>BEST BAKERY</small></a><p>Freshly baked goodness, every day.</p><div><a href="#products">Products</a><a href="#wholesale">Wholesale</a><a href="https://instagram.com/mrjbestbakery96">Instagram</a></div><small>© {new Date().getFullYear()} MRJ Best Bakery. All rights reserved.</small></footer>
    {lightbox && <div className="lightbox" onClick={() => setLightbox(null)}><button aria-label="Close">×</button><img src={lightbox} alt="MRJ Best Bakery product" /></div>}{toast && <div className="toast">Opening WhatsApp with your enquiry…</div>}
  </main>;
}
