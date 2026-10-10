"""Build crawlable localized entry pages from reviewed public service copy."""
from pathlib import Path
from html import escape
import json
ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://mavorealestate.com'
LANGUAGES = {'he':'עברית','en':'English','fr':'Français','de':'Deutsch','es':'Español','ar':'العربية'}
COPY = {
'en': {
 'title':'Tel Aviv & Bat Yam Real Estate | MAVO',
 'heading':'Find your next home in Tel Aviv and Bat Yam',
 'intro':'MAVO connects property owners, buyers and tenants. Explore the current listings and contact us to discuss your search, your property or a viewing.',
 'browse':'Browse properties', 'contact':'Contact MAVO', 'sale':'Properties for sale', 'rent':'Properties to rent', 'owners':'Selling or letting your property',
 'ownerText':'Tell us about your property, its location and your plans. We can discuss the marketing process, viewings and the terms of working together. Contact us for the fees and services that apply to your property.',
 'buyers':'Buying a home', 'buyerText':'Start with your preferred neighborhood, budget and the features you need. Ask us about availability and the details of any listing before making a decision. Prices shown in the catalog are asking prices in Israeli shekels.',
 'tenants':'Finding a rental', 'tenantText':'Browse rental listings by location, price and number of rooms. Contact us to confirm availability, entry dates, rental terms and brokerage fees before arranging a viewing.',
 'international':'Buying from abroad', 'internationalText':'Looking for a property in Israel while living overseas? Tell us where you are based and what you are looking for. We can discuss available properties and arrange an initial conversation. Ask whether a virtual tour is available for a particular property.',
 'areas':'Explore our neighborhoods', 'areaText':'Explore Neve Tzedek, Florentin, the Old North, Kerem HaTeimanim, central Tel Aviv and Bat Yam. Neighborhood pages and the live catalog open in the main site, where you can choose automatic translation.',
 'catalogNote':'The live catalog uses automatic translation. Confirm important property details directly with MAVO.',
 'call':'Call', 'email':'Email', 'privacy':'Privacy policy', 'accessibility':'Accessibility', 'rights':'MAVO Real Estate',
},
'fr': {
 'title':'Immobilier à Tel Aviv et Bat Yam | MAVO', 'heading':'Trouvez votre prochain logement à Tel Aviv et Bat Yam',
 'intro':'MAVO accompagne les propriétaires, les acheteurs et les locataires. Consultez les annonces disponibles et contactez-nous pour parler de votre recherche, de votre bien ou d’une visite.',
 'browse':'Voir les biens', 'contact':'Contacter MAVO', 'sale':'Biens à vendre', 'rent':'Biens à louer', 'owners':'Vendre ou louer votre bien',
 'ownerText':'Présentez-nous votre bien, sa localisation et votre projet. Nous pourrons discuter de sa commercialisation, des visites et des conditions de notre collaboration. Contactez-nous pour connaître les honoraires et les services applicables à votre bien.',
 'buyers':'Acheter un logement', 'buyerText':'Précisez le quartier souhaité, votre budget et les caractéristiques essentielles. Vérifiez avec nous la disponibilité et les détails de chaque annonce avant de prendre une décision. Les prix du catalogue sont les prix demandés, en shekels israéliens.',
 'tenants':'Trouver une location', 'tenantText':'Consultez les locations par secteur, prix et nombre de pièces. Contactez-nous pour confirmer la disponibilité, la date d’entrée, les conditions de location et les honoraires avant d’organiser une visite.',
 'international':'Acheter depuis l’étranger', 'internationalText':'Vous vivez à l’étranger et cherchez un bien en Israël ? Indiquez-nous votre pays de résidence et votre recherche. Nous pourrons discuter des biens disponibles lors d’un premier échange. Demandez si une visite virtuelle est proposée pour le bien qui vous intéresse.',
 'areas':'Découvrir les quartiers', 'areaText':'Découvrez Neve Tzedek, Florentin, le Vieux Nord, Kerem HaTeimanim, le centre de Tel Aviv et Bat Yam. Les pages des quartiers et le catalogue sont accessibles sur le site principal, où vous pouvez choisir la traduction automatique.',
 'catalogNote':'Le catalogue utilise une traduction automatique. Confirmez les informations importantes directement auprès de MAVO.',
 'call':'Téléphone', 'email':'E-mail', 'privacy':'Confidentialité', 'accessibility':'Accessibilité', 'rights':'MAVO Immobilier',
},
'de': {
 'title':'Immobilien in Tel Aviv und Bat Yam | MAVO', 'heading':'Finden Sie Ihr nächstes Zuhause in Tel Aviv und Bat Yam',
 'intro':'MAVO verbindet Eigentümer, Käufer und Mieter. Entdecken Sie die aktuellen Angebote und sprechen Sie mit uns über Ihre Suche, Ihre Immobilie oder einen Besichtigungstermin.',
 'browse':'Immobilien ansehen', 'contact':'MAVO kontaktieren', 'sale':'Immobilien kaufen', 'rent':'Immobilien mieten', 'owners':'Ihre Immobilie verkaufen oder vermieten',
 'ownerText':'Erzählen Sie uns von Ihrer Immobilie, dem Standort und Ihren Plänen. Gemeinsam können wir über die Vermarktung, Besichtigungen und die Bedingungen einer Zusammenarbeit sprechen. Fragen Sie nach den Gebühren und Leistungen für Ihre Immobilie.',
 'buyers':'Ein Zuhause kaufen', 'buyerText':'Beginnen Sie mit Ihrem Wunschviertel, Ihrem Budget und den benötigten Eigenschaften. Klären Sie mit uns die Verfügbarkeit und die Angaben zum Angebot, bevor Sie eine Entscheidung treffen. Die Preise im Katalog sind Angebotspreise in israelischen Schekel.',
 'tenants':'Eine Mietwohnung finden', 'tenantText':'Suchen Sie Mietangebote nach Lage, Preis und Zimmeranzahl. Bestätigen Sie mit uns Verfügbarkeit, Einzugstermin, Mietbedingungen und Maklergebühren, bevor Sie eine Besichtigung vereinbaren.',
 'international':'Aus dem Ausland kaufen', 'internationalText':'Sie leben im Ausland und suchen eine Immobilie in Israel? Teilen Sie uns Ihren Wohnort und Ihre Wünsche mit. In einem ersten Gespräch können wir verfügbare Angebote besprechen. Fragen Sie, ob für eine bestimmte Immobilie eine virtuelle Besichtigung möglich ist.',
 'areas':'Unsere Viertel entdecken', 'areaText':'Entdecken Sie Neve Tzedek, Florentin, den Alten Norden, Kerem HaTeimanim, das Zentrum von Tel Aviv und Bat Yam. Viertelseiten und aktuelle Angebote öffnen auf der Hauptseite, auf der Sie die automatische Übersetzung wählen können.',
 'catalogNote':'Der Katalog nutzt automatische Übersetzung. Bestätigen Sie wichtige Angaben direkt mit MAVO.',
 'call':'Anrufen', 'email':'E-Mail', 'privacy':'Datenschutz', 'accessibility':'Barrierefreiheit', 'rights':'MAVO Immobilien',
},
'es': {
 'title':'Inmuebles en Tel Aviv y Bat Yam | MAVO', 'heading':'Encuentre su próximo hogar en Tel Aviv y Bat Yam',
 'intro':'MAVO conecta a propietarios, compradores e inquilinos. Consulte los anuncios disponibles y contáctenos para hablar de su búsqueda, su inmueble o una visita.',
 'browse':'Ver inmuebles', 'contact':'Contactar con MAVO', 'sale':'Inmuebles en venta', 'rent':'Inmuebles en alquiler', 'owners':'Vender o alquilar su inmueble',
 'ownerText':'Cuéntenos sobre su inmueble, su ubicación y sus planes. Podemos hablar del proceso de comercialización, las visitas y las condiciones de colaboración. Consúltenos las comisiones y los servicios correspondientes a su inmueble.',
 'buyers':'Comprar una vivienda', 'buyerText':'Empiece por el barrio que prefiere, su presupuesto y las características que necesita. Confirme con nosotros la disponibilidad y los detalles de cada anuncio antes de tomar una decisión. Los precios del catálogo son precios de oferta en séqueles israelíes.',
 'tenants':'Encontrar un alquiler', 'tenantText':'Busque alquileres por ubicación, precio y número de habitaciones. Contáctenos para confirmar la disponibilidad, la fecha de entrada, las condiciones del alquiler y las comisiones antes de concertar una visita.',
 'international':'Comprar desde el extranjero', 'internationalText':'¿Vive fuera de Israel y busca un inmueble aquí? Díganos dónde reside y qué está buscando. Podemos hablar de los inmuebles disponibles en una primera conversación. Pregunte si el inmueble que le interesa dispone de una visita virtual.',
 'areas':'Conocer los barrios', 'areaText':'Descubra Neve Tzedek, Florentin, el Viejo Norte, Kerem HaTeimanim, el centro de Tel Aviv y Bat Yam. Las páginas de los barrios y el catálogo se abren en el sitio principal, donde puede elegir la traducción automática.',
 'catalogNote':'El catálogo utiliza traducción automática. Confirme los datos importantes directamente con MAVO.',
 'call':'Llamar', 'email':'Correo electrónico', 'privacy':'Privacidad', 'accessibility':'Accesibilidad', 'rights':'MAVO Inmuebles',
},
'ar': {
 'title':'عقارات في تل أبيب وبات يام | MAVO', 'heading':'اعثر على منزلك القادم في تل أبيب وبات يام',
 'intro':'تربط MAVO بين مالكي العقارات والمشترين والمستأجرين. تصفّح العروض المتاحة وتواصل معنا لمناقشة بحثك أو عقارك أو ترتيب زيارة.',
 'browse':'تصفّح العقارات', 'contact':'تواصل مع MAVO', 'sale':'عقارات للبيع', 'rent':'عقارات للإيجار', 'owners':'بيع عقارك أو تأجيره',
 'ownerText':'أخبرنا عن عقارك وموقعه وخططك. يمكننا مناقشة عملية التسويق والزيارات وشروط التعاون. تواصل معنا لمعرفة الرسوم والخدمات المتعلقة بعقارك.',
 'buyers':'شراء منزل', 'buyerText':'ابدأ بتحديد الحي المفضّل والميزانية والمواصفات التي تحتاج إليها. تحقّق معنا من توفّر العقار وتفاصيل الإعلان قبل اتخاذ القرار. الأسعار المعروضة في الكتالوج هي الأسعار المطلوبة بالشيكل الإسرائيلي.',
 'tenants':'البحث عن عقار للإيجار', 'tenantText':'تصفّح عقارات الإيجار حسب الموقع والسعر وعدد الغرف. تواصل معنا لتأكيد التوفّر وموعد الدخول وشروط الإيجار ورسوم الوساطة قبل ترتيب الزيارة.',
 'international':'الشراء من خارج البلاد', 'internationalText':'هل تقيم خارج إسرائيل وتبحث عن عقار فيها؟ أخبرنا بمكان إقامتك وما تبحث عنه. يمكننا مناقشة العقارات المتاحة في محادثة أولية. اسأل إن كانت جولة افتراضية متاحة للعقار الذي يهمّك.',
 'areas':'استكشف الأحياء', 'areaText':'استكشف نيفيه تسيدك وفلورنتين والشمال القديم وكيرم هتيمانيم ووسط تل أبيب وبات يام. تُفتح صفحات الأحياء والكتالوج على الموقع الرئيسي، حيث يمكنك اختيار الترجمة الآلية.',
 'catalogNote':'يستخدم الكتالوج الترجمة الآلية. أكّد تفاصيل العقار المهمة مباشرة مع MAVO.',
 'call':'اتصل بنا', 'email':'البريد الإلكتروني', 'privacy':'الخصوصية', 'accessibility':'إمكانية الوصول', 'rights':'MAVO للعقارات',
}}
AREAS = [('/neve-tzedek.html','Neve Tzedek'),('/florentin.html','Florentin'),('/north-tel-aviv.html','Old North'),('/kerem-hateimanim.html','Kerem HaTeimanim'),('/lev-hair.html','Central Tel Aviv'),('/bat-yam.html','Bat Yam')]
def alternates():
    return '\n'.join(f'<link rel="alternate" hreflang="{lang}" href="{BASE}{"/" if lang == "he" else "/"+lang+"/"}">' for lang in LANGUAGES) + f'\n<link rel="alternate" hreflang="x-default" href="{BASE}/">'
def build():
    for lang,c in COPY.items():
        e = {k:escape(v) for k,v in c.items()}
        url = BASE+'/'+lang+'/'
        links = ' '.join(f'<a href="{"/?lang=he" if l == "he" else "/"+l+"/"}" lang="{l}" hreflang="{l}"'+(' aria-current="page"' if l==lang else '')+f'>{name}</a>' for l,name in LANGUAGES.items())
        areas = ''.join(f'<a href="{href}?lang={lang}">{escape(name)}</a>' for href,name in AREAS)
        sections = ''.join(f'<section><h2>{e[h]}</h2><p>{e[t]}</p></section>' for h,t in [('owners','ownerText'),('buyers','buyerText'),('tenants','tenantText'),('international','internationalText')])
        schema={'@context':'https://schema.org','@type':'WebPage','name':c['title'],'url':url,'inLanguage':lang,'description':c['intro'],'isPartOf':{'@type':'WebSite','name':'MAVO','url':BASE+'/'}}
        html=f'''<!doctype html>
<html lang="{lang}" dir="{'rtl' if lang=='ar' else 'ltr'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e['title']}</title><meta name="description" content="{e['intro']}">
<link rel="canonical" href="{url}">
{alternates()}
<meta property="og:type" content="website"><meta property="og:title" content="{e['title']}"><meta property="og:description" content="{e['intro']}"><meta property="og:url" content="{url}"><meta property="og:image" content="{BASE}/assets/brand/mavo-share-v32.png">
<link rel="icon" href="/assets/brand/favicon-v37.svg"><link rel="stylesheet" href="/language-pages.css?v=1">
<script type="application/ld+json">{json.dumps(schema,ensure_ascii=False)}</script></head>
<body><header><a class="brand" href="/{lang}/" translate="no"><img src="/assets/brand/symbol-transparent.svg" alt="" width="54" height="54">MAVO</a><nav aria-label="Languages">{links}</nav></header>
<main><div class="hero"><span class="eyebrow" translate="no">MAVO REAL ESTATE</span><h1>{e['heading']}</h1><p>{e['intro']}</p><div class="actions"><a class="primary" href="/?lang={lang}#properties">{e['browse']}</a><a href="#contact">{e['contact']}</a></div></div>
<div class="sections">{sections}</div><section><h2>{e['areas']}</h2><p>{e['areaText']}</p><div class="areas">{areas}</div></section>
<section><div class="actions"><a class="primary" href="/search.html?type=sale&amp;lang={lang}">{e['sale']}</a><a href="/search.html?type=rent&amp;lang={lang}">{e['rent']}</a></div><p>{e['catalogNote']}</p></section>
<section id="contact"><h2>{e['contact']}</h2><div class="contacts"><a href="tel:+972548026123">{e['call']}: <bdi>+972 54 802 6123</bdi></a><a href="mailto:mavorealestate@gmail.com">{e['email']}: mavorealestate@gmail.com</a><a href="https://wa.me/972548026123" rel="noopener">WhatsApp</a></div></section></main>
<footer><span translate="no">© MAVO</span><a href="/privacy.html">{e['privacy']}</a><a href="/accessibility.html">{e['accessibility']}</a></footer></body></html>'''
        folder=ROOT/lang;folder.mkdir(exist_ok=True);(folder/'index.html').write_text(html)
if __name__=='__main__':build()
