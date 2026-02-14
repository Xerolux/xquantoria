<?php

namespace App\Services\Legal;

use App\Models\LegalDocument;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class LegalDocumentGenerator
{
    private array $formData = [];
    private string $language = 'de';
    private string $country = 'DE';

    public function __construct()
    {
        $this->loadDefaultTemplates();
    }

    public function generate(string $type, array $formData): LegalDocument
    {
        $this->formData = $formData;
        $this->language = $formData['language'] ?? 'de';
        $this->country = $formData['country'] ?? 'DE';

        $content = match ($type) {
            LegalDocument::TYPE_IMPRESSUM => $this->generateImpressum(),
            LegalDocument::TYPE_DATENSCHUTZ => $this->generateDatenschutz(),
            LegalDocument::TYPE_VERSAND => $this->generateVersand(),
            LegalDocument::TYPE_WIDERRUF => $this->generateWiderruf(),
            LegalDocument::TYPE_BEZAHLUNG => $this->generateBezahlung(),
            LegalDocument::TYPE_AGB => $this->generateAgb(),
            LegalDocument::TYPE_COOKIE => $this->generateCookie(),
            default => throw new \InvalidArgumentException("Unknown document type: {$type}"),
        };

        return LegalDocument::create([
            'type' => $type,
            'title' => LegalDocument::getTypes()[$type] ?? $type,
            'content' => $content,
            'slug' => Str::slug($type . '-' . time()),
            'form_data' => $formData,
            'language' => $this->language,
            'version' => '1.0',
            'generated_at' => now(),
            'valid_until' => now()->addYear(),
            'is_published' => false,
            'created_by' => Auth::id(),
        ]);
    }

    public function getPreview(string $type, array $formData): string
    {
        $this->formData = $formData;
        $this->language = $formData['language'] ?? 'de';
        $this->country = $formData['country'] ?? 'DE';

        return match ($type) {
            LegalDocument::TYPE_IMPRESSUM => $this->generateImpressum(),
            LegalDocument::TYPE_DATENSCHUTZ => $this->generateDatenschutz(),
            LegalDocument::TYPE_VERSAND => $this->generateVersand(),
            LegalDocument::TYPE_WIDERRUF => $this->generateWiderruf(),
            LegalDocument::TYPE_BEZAHLUNG => $this->generateBezahlung(),
            LegalDocument::TYPE_AGB => $this->generateAgb(),
            LegalDocument::TYPE_COOKIE => $this->generateCookie(),
            default => '',
        };
    }

    public function getFormFields(string $type): array
    {
        return match ($type) {
            LegalDocument::TYPE_IMPRESSUM => $this->getImpressumFields(),
            LegalDocument::TYPE_DATENSCHUTZ => $this->getDatenschutzFields(),
            LegalDocument::TYPE_VERSAND => $this->getVersandFields(),
            LegalDocument::TYPE_WIDERRUF => $this->getWiderrufFields(),
            LegalDocument::TYPE_BEZAHLUNG => $this->getBezahlungFields(),
            LegalDocument::TYPE_AGB => $this->getAgbFields(),
            LegalDocument::TYPE_COOKIE => $this->getCookieFields(),
            default => [],
        };
    }

    private function get(string $key, $default = ''): string
    {
        return $this->formData[$key] ?? $default;
    }

    private function generateImpressum(): string
    {
        $company = $this->get('company_name');
        $owner = $this->get('owner_name');
        $address = $this->get('address');
        $zip = $this->get('zip_code');
        $city = $this->get('city');
        $phone = $this->get('phone');
        $email = $this->get('email');
        $website = $this->get('website');
        $registerCourt = $this->get('register_court');
        $registerNumber = $this->get('register_number');
        $vatId = $this->get('vat_id');
        $taxNumber = $this->get('tax_number');
        $businessType = $this->get('business_type', 'einzelunternehmer');
        $responsiblePerson = $this->get('responsible_person', $owner);
        $disputeResolution = $this->get('dispute_resolution_platform', 'ec.europa.eu/odr');
        $consumerDisputeResolution = $this->get('consumer_dispute_resolution');

        $legalForm = match ($businessType) {
            'gmbh' => 'Gesellschaft mit beschränkter Haftung (GmbH)',
            'ug' => 'Unternehmergesellschaft (haftungsbeschränkt)',
            'ag' => 'Aktiengesellschaft (AG)',
            'ohg' => 'Offene Handelsgesellschaft (OHG)',
            'kg' => 'Kommanditgesellschaft (KG)',
            'gbr' => 'Gesellschaft bürgerlichen Rechts (GbR)',
            'eg' => 'eingetragene Genossenschaft (e.G.)',
            'freelancer' => 'Freiberufler',
            default => 'Einzelunternehmer',
        };

        $html = "<h1>Impressum</h1>\n\n";
        $html .= "<h2>Angaben gemäß § 5 TMG</h2>\n";
        $html .= "<p><strong>{$company}</strong><br>\n";
        $html .= "{$owner}<br>\n";
        $html .= "{$address}<br>\n";
        $html .= "{$zip} {$city}</p>\n\n";

        $html .= "<h2>Kontakt</h2>\n";
        $html .= "<p>";
        if ($phone) $html .= "Telefon: {$phone}<br>\n";
        if ($email) $html .= "E-Mail: <a href=\"mailto:{$email}\">{$email}</a><br>\n";
        if ($website) $html .= "Website: <a href=\"{$website}\" target=\"_blank\">{$website}</a>";
        $html .= "</p>\n\n";

        if ($registerCourt && $registerNumber) {
            $html .= "<h2>Registereintrag</h2>\n";
            $html .= "<p>Eintragung im {$registerCourt}<br>\n";
            $html .= "Registernummer: {$registerNumber}</p>\n\n";
        }

        $html .= "<h2>Umsatzsteuer-ID</h2>\n";
        $html .= "<p>Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:<br>\n";
        if ($vatId) {
            $html .= "{$vatId}</p>\n\n";
        } else {
            $html .= "[Bitte USt-ID eintragen]</p>\n\n";
        }

        if ($taxNumber) {
            $html .= "<p>Wirtschafts-ID: {$taxNumber}</p>\n\n";
        }

        $html .= "<h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>\n";
        $html .= "<p>{$responsiblePerson}<br>\n";
        $html .= "{$address}<br>\n";
        $html .= "{$zip} {$city}</p>\n\n";

        $html .= "<h2>EU-Streitschlichtung</h2>\n";
        $html .= "<p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: ";
        $html .= "<a href=\"https://{$disputeResolution}\" target=\"_blank\" rel=\"noopener\">https://{$disputeResolution}</a><br>\n";
        $html .= "Unsere E-Mail-Adresse finden Sie oben im Impressum.</p>\n\n";

        if ($consumerDisputeResolution) {
            $html .= "<h2>Verbraucherstreitbeilegung/Universalschlichtungsstelle</h2>\n";
            $html .= "<p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer ";
            $html .= "Verbraucherschlichtungsstelle teilzunehmen.</p>\n\n";
        }

        $html .= "<h2>Haftung für Inhalte</h2>\n";
        $html .= "<p>Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den ";
        $html .= "allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht ";
        $html .= "verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen ";
        $html .= "zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</p>\n";
        $html .= "<p>Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen ";
        $html .= "Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt ";
        $html .= "der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden ";
        $html .= "Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.</p>\n\n";

        $html .= "<h2>Haftung für Links</h2>\n";
        $html .= "<p>Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss ";
        $html .= "haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte ";
        $html .= "der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. ";
        $html .= "Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. ";
        $html .= "Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.</p>\n";
        $html .= "<p>Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte ";
        $html .= "einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige ";
        $html .= "Links umgehend entfernen.</p>\n\n";

        $html .= "<h2>Urheberrecht</h2>\n";
        $html .= "<p>Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem ";
        $html .= "deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung ";
        $html .= "außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors ";
        $html .= "bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen ";
        $html .= "Gebrauch gestattet.</p>\n";
        $html .= "<p>Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte ";
        $html .= "Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem ";
        $html .= "auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei ";
        $html .= "Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.</p>\n";

        return $html;
    }

    private function generateDatenschutz(): string
    {
        $company = $this->get('company_name');
        $owner = $this->get('owner_name');
        $address = $this->get('address');
        $zip = $this->get('zip_code');
        $city = $this->get('city');
        $email = $this->get('email');
        $phone = $this->get('phone');
        $website = $this->get('website');
        $dpoName = $this->get('dpo_name');
        $dpoAddress = $this->get('dpo_address');
        $dpoEmail = $this->get('dpo_email');
        $dpoPhone = $this->get('dpo_phone');
        $usesAnalytics = $this->get('uses_analytics', false);
        $usesGoogleAnalytics = $this->get('uses_google_analytics', false);
        $usesMatomo = $this->get('uses_matomo', false);
        $usesCookies = $this->get('uses_cookies', true);
        $usesContactForm = $this->get('uses_contact_form', true);
        $usesNewsletter = $this->get('uses_newsletter', false);
        $usesComments = $this->get('uses_comments', false);
        $hostingProvider = $this->get('hosting_provider', 'Eigenhosting');
        $hostingAddress = $this->get('hosting_address');

        $html = "<h1>Datenschutzerklärung</h1>\n\n";

        $html .= "<h2>1. Verantwortlicher</h2>\n";
        $html .= "<p>Verantwortlich für die Datenverarbeitung auf dieser Website ist:</p>\n";
        $html .= "<p><strong>{$company}</strong><br>\n";
        $html .= "{$owner}<br>\n";
        $html .= "{$address}<br>\n";
        $html .= "{$zip} {$city}<br>\n";
        if ($phone) $html .= "Telefon: {$phone}<br>\n";
        $html .= "E-Mail: <a href=\"mailto:{$email}\">{$email}</a></p>\n\n";

        if ($dpoName) {
            $html .= "<h2>2. Datenschutzbeauftragter</h2>\n";
            $html .= "<p><strong>{$dpoName}</strong><br>\n";
            if ($dpoAddress) $html .= "{$dpoAddress}<br>\n";
            if ($dpoEmail) $html .= "E-Mail: <a href=\"mailto:{$dpoEmail}\">{$dpoEmail}</a><br>\n";
            if ($dpoPhone) $html .= "Telefon: {$dpoPhone}";
            $html .= "</p>\n\n";
        }

        $html .= "<h2>3. Erhebung und Speicherung personenbezogener Daten</h2>\n";
        $html .= "<h3>3.1 Beim Besuch der Website</h3>\n";
        $html .= "<p>Beim Aufruf unserer Website werden automatisch Informationen an den Server unserer Website ";
        $html .= "gesendet. Diese Informationen werden temporär in einem sog. Logfile gespeichert. Folgende ";
        $html .= "Informationen werden dabei ohne Ihr Zutun erfasst und bis zur automatisierten Löschung gespeichert:</p>\n";
        $html .= "<ul>\n";
        $html .= "<li>IP-Adresse des anfragenden Rechners</li>\n";
        $html .= "<li>Datum und Uhrzeit des Zugriffs</li>\n";
        $html .= "<li>Name und URL der abgerufenen Datei</li>\n";
        $html .= "<li>Website, von der aus der Zugriff erfolgt (Referrer-URL)</li>\n";
        $html .= "<li>verwendeter Browser und ggf. das Betriebssystem Ihres Rechners</li>\n";
        $html .= "<li>Name Ihres Access-Providers</li>\n";
        $html .= "</ul>\n\n";

        if ($usesContactForm) {
            $html .= "<h3>3.2 Bei Nutzung des Kontaktformulars</h3>\n";
            $html .= "<p>Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus dem ";
            $html .= "Anfrageformular inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung der ";
            $html .= "Anfrage und für den Fall von Anschlussfragen bei uns gespeichert. Diese Daten geben wir nicht ";
            $html .= "ohne Ihre Einwilligung an Dritte weiter.</p>\n";
            $html .= "<p>Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Durchführung vorvertraglicher ";
            $html .= "Maßnahmen) sowie Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Beantwortung Ihrer Anfrage).</p>\n\n";
        }

        if ($usesNewsletter) {
            $html .= "<h3>3.3 Newsletter</h3>\n";
            $html .= "<p>Wenn Sie sich zu unserem Newsletter anmelden, verwenden wir Ihre E-Mail-Adresse für ";
            $html .= "Werbezwecke, solange Sie nicht abbestellen. Die Anmeldung erfolgt im sogenannten ";
            $html .= "Double-Opt-In-Verfahren. Nach der Anmeldung erhalten Sie eine E-Mail, in der Sie um die ";
            $html .= "Bestätigung Ihrer Anmeldung gebeten werden.</p>\n";
            $html .= "<p>Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO (Einwilligung).</p>\n\n";
        }

        if ($usesCookies) {
            $html .= "<h2>4. Cookies</h2>\n";
            $html .= "<p>Wir setzen auf unserer Seite Cookies ein. Hierbei handelt es sich um kleine Dateien, die Ihr ";
            $html .= "Browser automatisch erstellt und die auf Ihrem Endgerät gespeichert werden.</p>\n";
            $html .= "<p>Folgende Arten von Cookies werden verwendet:</p>\n";
            $html .= "<ul>\n";
            $html .= "<li><strong>Technisch notwendige Cookies:</strong> Diese Cookies sind zum Betrieb der Website ";
            $html .= "erforderlich und können nicht deaktiviert werden.</li>\n";
            $html .= "<li><strong>Funktionale Cookies:</strong> Diese Cookies ermöglichen erweiterte Funktionen und ";
            $html .= "Personalisierung.</li>\n";
            if ($usesAnalytics) {
                $html .= "<li><strong>Analyse-Cookies:</strong> Diese Cookies helfen uns zu verstehen, wie Besucher ";
                $html .= "mit der Website interagieren.</li>\n";
            }
            $html .= "</ul>\n";
            $html .= "<p>Sie können Ihren Browser so einstellen, dass Sie über das Setzen von Cookies informiert ";
            $html .= "werden und Cookies nur im Einzelfall erlauben, die Annahme von Cookies für bestimmte Fälle ";
            $html .= "oder generell ausschließen sowie das automatische Löschen der Cookies beim Schließen des ";
            $html .= "Browsers aktivieren.</p>\n\n";
        }

        if ($usesGoogleAnalytics) {
            $html .= "<h2>5. Google Analytics</h2>\n";
            $html .= "<p>Diese Website nutzt den Dienst Google Analytics, der von der Google Inc. (1600 Amphitheatre ";
            $html .= "Parkway Mountain View, CA 94043, USA) angeboten wird, zur Analyse der Website-Benutzung durch ";
            $html .= "Nutzer. Die Nutzung umfasst die Auswertung der Häufigkeit von Aufrufen und deren Herkunft.</p>\n";
            $html .= "<p>Google Analytics verwendet Cookies. Die durch den Cookie erzeugten Informationen über Ihre ";
            $html .= "Benutzung dieser Website werden in der Regel an einen Server von Google in den USA übertragen ";
            $html .= "und dort gespeichert.</p>\n";
            $html .= "<p>Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) und ";
            $html .= "Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Analyse des Nutzerverhaltens).</p>\n";
            $html .= "<p>Sie können die Speicherung der Cookies durch eine entsprechende Einstellung Ihrer Browser-";
            $html .= "Software verhindern. Zudem können Sie verhindern, dass Google die durch den Cookie erzeugten und ";
            $html .= "bezogenen auf Ihre Nutzung der Website Daten an Google übermittelt, indem Sie das unter dem ";
            $html .= "folgenden Link verfügbare Browser-Plugin herunterladen und installieren: ";
            $html .= "<a href=\"https://tools.google.com/dlpage/gaoptout?hl=de\" target=\"_blank\" rel=\"noopener\">";
            $html .= "https://tools.google.com/dlpage/gaoptout?hl=de</a></p>\n\n";
        }

        if ($usesMatomo) {
            $html .= "<h2>5. Matomo (ehemals Piwik)</h2>\n";
            $html .= "<p>Diese Website nutzt den Webanalysedienst Matomo. Matomo verwendet Cookies, die eine Analyse ";
            $html .= "der Benutzung der Website durch die Nutzer ermöglichen.</p>\n";
            $html .= "<p>Die durch den Cookie erzeugten Informationen über Ihre Benutzung dieser Website werden auf ";
            $html .= "unserem Server gespeichert. Die IP-Adresse wird vor der Speicherung anonymisiert.</p>\n";
            $html .= "<p>Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) und ";
            $html .= "Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Analyse des Nutzerverhaltens).</p>\n\n";
        }

        $html .= "<h2>6. Hosting</h2>\n";
        $html .= "<p>Unsere Website wird bei {$hostingProvider} gehostet.";
        if ($hostingAddress) {
            $html .= " ({$hostingAddress})";
        }
        $html .= "</p>\n";
        $html .= "<p>Der Hosting-Provider verarbeitet alle Daten, die bei der Nutzung unserer Website erhoben werden, ";
        $html .= "in unserem Auftrag. Eine Weitergabe an Dritte erfolgt nicht.</p>\n\n";

        $html .= "<h2>7. Ihre Rechte</h2>\n";
        $html .= "<p>Sie haben jederzeit folgende Rechte bezüglich Ihrer bei uns gespeicherten personenbezogenen Daten:</p>\n";
        $html .= "<ul>\n";
        $html .= "<li><strong>Auskunftsrecht</strong> (Art. 15 DSGVO): Sie haben das Recht, Auskunft über die von uns ";
        $html .= "verarbeiteten personenbezogenen Daten zu verlangen.</li>\n";
        $html .= "<li><strong>Recht auf Berichtigung</strong> (Art. 16 DSGVO): Sie haben das Recht, unverzüglich die ";
        $html .= "Berichtigung unrichtiger Daten zu verlangen.</li>\n";
        $html .= "<li><strong>Recht auf Löschung</strong> (Art. 17 DSGVO): Sie haben das Recht, die Löschung Ihrer ";
        $html .= "Daten zu verlangen.</li>\n";
        $html .= "<li><strong>Recht auf Einschränkung der Verarbeitung</strong> (Art. 18 DSGVO): Sie haben das Recht, ";
        $html .= "die Einschränkung der Verarbeitung Ihrer Daten zu verlangen.</li>\n";
        $html .= "<li><strong>Recht auf Datenübertragbarkeit</strong> (Art. 20 DSGVO): Sie haben das Recht, Ihre Daten ";
        $html .= "in einem strukturierten Format zu erhalten.</li>\n";
        $html .= "<li><strong>Widerspruchsrecht</strong> (Art. 21 DSGVO): Sie haben das Recht, der Verarbeitung Ihrer ";
        $html .= "Daten zu widersprechen.</li>\n";
        $html .= "</ul>\n\n";

        $html .= "<h2>8. Beschwerderecht</h2>\n";
        $html .= "<p>Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren, wenn Sie der ";
        $html .= "Ansicht sind, dass die Verarbeitung Ihrer personenbezogenen Daten rechtswidrig erfolgt.</p>\n\n";

        $html .= "<h2>9. Datensicherheit</h2>\n";
        $html .= "<p>Wir verwenden innerhalb des Website-Besuchs das verbreitete SSL-Verfahren (Secure Socket Layer) ";
        $html .= "in Verbindung mit der jeweils höchsten Verschlüsselungsstufe, die von Ihrem Browser unterstützt ";
        $html .= "wird. Sie erkennen dies am geschlossenen Darstellung des Schlosssymbols in der Adresszeile Ihres ";
        $html .= "Browsers.</p>\n\n";

        $html .= "<h2>10. Aktualität und Änderung der Datenschutzerklärung</h2>\n";
        $html .= "<p>Diese Datenschutzerklärung ist aktuell gültig und hat den Stand " . date('d.m.Y') . ".</p>\n";
        $html .= "<p>Durch die Weiterentwicklung unserer Website und Angebote oder aufgrund geänderter gesetzlicher ";
        $html .= "Vorgaben kann es notwendig werden, diese Datenschutzerklärung zu ändern.</p>\n";

        return $html;
    }

    private function generateVersand(): string
    {
        $company = $this->get('company_name');
        $shippingMethods = $this->get('shipping_methods', ['dhl', 'dpd']);
        $freeShippingFrom = $this->get('free_shipping_from');
        $shippingGermany = $this->get('shipping_germany', '4.99');
        $shippingEu = $this->get('shipping_eu', '9.99');
        $shippingWorld = $this->get('shipping_world', '19.99');
        $deliveryTimeGermany = $this->get('delivery_time_germany', '2-3');
        $deliveryTimeEu = $this->get('delivery_time_eu', '5-7');
        $dispatchDays = $this->get('dispatch_days', '1-2');

        $html = "<h1>Versand- & Lieferbedingungen</h1>\n\n";

        $html .= "<h2>1. Versandkosten</h2>\n";
        $html .= "<p>Die Versandkosten hängen von dem von Ihnen gewählten Versandweg und der Lieferadresse ab. ";
        $html .= "Die genauen Kosten werden Ihnen im Bestellprozess angezeigt.</p>\n\n";

        $html .= "<h3>Versandkosten innerhalb Deutschlands</h3>\n";
        $html .= "<p>Die Versandkosten betragen <strong>{$shippingGermany} EUR</strong> pro Bestellung.</p>\n";
        if ($freeShippingFrom) {
            $html .= "<p>Ab einem Bestellwert von <strong>{$freeShippingFrom} EUR</strong> liefern wir versandkostenfrei.</p>\n";
        }

        $html .= "<h3>Versandkosten ins Ausland</h3>\n";
        $html .= "<table>\n";
        $html .= "<tr><th>Versandziel</th><th>Versandkosten</th></tr>\n";
        $html .= "<tr><td>Deutschland</td><td>{$shippingGermany} EUR</td></tr>\n";
        $html .= "<tr><td>EU-Länder</td><td>{$shippingEu} EUR</td></tr>\n";
        $html .= "<tr><td>Weltweit</td><td>{$shippingWorld} EUR</td></tr>\n";
        $html .= "</table>\n\n";

        $html .= "<h2>2. Lieferzeiten</h2>\n";
        $html .= "<p>Die Lieferzeitangaben beziehen sich auf das Datum des Zahlungseingangs. Bei Überweisungen ";
        $html .= "erfolgt der Versand nach vollständigem Zahlungseingang.</p>\n\n";

        $html .= "<h3>Lieferzeiten nach Ländern</h3>\n";
        $html .= "<table>\n";
        $html .= "<tr><th>Versandziel</th><th>Lieferzeit</th></tr>\n";
        $html .= "<tr><td>Deutschland</td><td>{$deliveryTimeGermany} Werktage</td></tr>\n";
        $html .= "<tr><td>EU-Länder</td><td>{$deliveryTimeEu} Werktage</td></tr>\n";
        $html .= "</table>\n\n";

        $html .= "<h2>3. Versanddienstleister</h2>\n";
        $html .= "<p>Wir versenden mit folgenden Versanddienstleistern:</p>\n";
        $html .= "<ul>\n";
        if (in_array('dhl', $shippingMethods)) $html .= "<li>DHL</li>\n";
        if (in_array('dpd', $shippingMethods)) $html .= "<li>DPD</li>\n";
        if (in_array('hermes', $shippingMethods)) $html .= "<li>Hermes</li>\n";
        if (in_array('ups', $shippingMethods)) $html .= "<li>UPS</li>\n";
        if (in_array('gls', $shippingMethods)) $html .= "<li>GLS</li>\n";
        $html .= "</ul>\n\n";

        $html .= "<h2>4. Versandabwicklung</h2>\n";
        $html .= "<p>Nach erfolgreichem Zahlungseingang wird Ihre Bestellung innerhalb von {$dispatchDays} Werktagen ";
        $html .= "an den Versanddienstleister übergeben. Sie erhalten eine Versandbestätigung per E-Mail mit der ";
        $html .= "Sendungsverfolgungsnummer, sofern verfügbar.</p>\n\n";

        $html .= "<h2>5. Teillieferungen</h2>\n";
        $html .= "<p>Wir sind berechtigt, Teillieferungen vorzunehmen, soweit dies für Sie zumutbar ist. ";
        $html .= "Zusätzliche Versandkosten durch Teillieferungen entstehen Ihnen nicht.</p>\n\n";

        $html .= "<h2>6. Sendungsverfolgung</h2>\n";
        $html .= "<p>Sie können den Status Ihrer Sendung über die Sendungsnummer verfolgen. Die entsprechende ";
        $html .= "Website des Versanddienstleisters finden Sie auf der Website des jeweiligen Anbieters.</p>\n\n";

        $html .= "<h2>7. Liefervorbehalt</h2>\n";
        $html .= "<p>Die Lieferung erfolgt, solange der Vorrat reicht. Sollte ein Artikel trotz redaktioneller ";
        $html .= "Prüfung nicht mehr verfügbar sein, werden wir Sie unverzüglich informieren.</p>\n";

        return $html;
    }

    private function generateWiderruf(): string
    {
        $company = $this->get('company_name');
        $owner = $this->get('owner_name');
        $address = $this->get('address');
        $zip = $this->get('zip_code');
        $city = $this->get('city');
        $email = $this->get('email');
        $phone = $this->get('phone');
        $refundMethod = $this->get('refund_method', 'original');
        $returnShipping = $this->get('return_shipping', 'customer');
        $excludeCategories = $this->get('exclude_categories', []);

        $html = "<h1>Widerrufsrecht</h1>\n\n";

        $html .= "<h2>Widerrufsbelehrung</h2>\n";
        $html .= "<h3>Verbraucher haben ein vierzehntägiges Widerrufsrecht.</h3>\n\n";

        $html .= "<h3>Widerrufsrecht</h3>\n";
        $html .= "<p>Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.</p>\n";
        $html .= "<p>Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter ";
        $html .= "Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen haben.</p>\n\n";

        $html .= "<p>Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (</p>\n";
        $html .= "<p><strong>{$company}</strong><br>\n";
        $html .= "{$owner}<br>\n";
        $html .= "{$address}<br>\n";
        $html .= "{$zip} {$city}</p>\n";
        if ($phone) $html .= "<p>Telefon: {$phone}</p>\n";
        $html .= "<p>E-Mail: <a href=\"mailto:{$email}\">{$email}</a></p>\n";
        $html .= "<p>) mittels einer eindeutigen Erklärung (z.B. ein mit der Post versandter Brief, Telefax oder ";
        $html .= "E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren.</p>\n\n";

        $html .= "<p>Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.</p>\n\n";

        $html .= "<p>Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des ";
        $html .= "Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.</p>\n\n";

        $html .= "<h3>Folgen des Widerrufs</h3>\n";
        $html .= "<p>Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten ";
        $html .= "haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ";
        $html .= "ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung ";
        $html .= "gewählt haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem ";
        $html .= "die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist.</p>\n";

        if ($refundMethod === 'original') {
            $html .= "<p>Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen ";
            $html .= "Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart.</p>\n";
        }

        $html .= "<p>In keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.</p>\n\n";

        if ($returnShipping === 'customer') {
            $html .= "<p>Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben oder ";
            $html .= "bis Sie den Nachweis erbracht haben, dass Sie die Waren zurückgesendet haben, je nachdem, ";
            $html .= "welches der frühere Zeitpunkt ist.</p>\n\n";

            $html .= "<p>Sie haben die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem ";
            $html .= "Tag, an dem Sie uns über den Widerruf dieses Vertrags unterrichten, an uns zurückzusenden oder ";
            $html .= "zu übergeben. Die Frist ist gewahrt, wenn Sie die Waren vor Ablauf der Frist von vierzehn Tagen ";
            $html .= "absenden.</p>\n\n";

            $html .= "<p>Sie tragen die unmittelbaren Kosten der Rücksendung der Waren.</p>\n\n";
        } else {
            $html .= "<p>Wir tragen die Kosten der Rücksendung der Waren.</p>\n\n";
        }

        $html .= "<p>Sie müssen für einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser Wertverlust auf ";
        $html .= "einen zur Prüfung der Beschaffenheit, Eigenschaften und Funktionsweise der Waren nicht notwendigen ";
        $html .= "Umgang mit ihnen zurückzuführen ist.</p>\n\n";

        if (!empty($excludeCategories)) {
            $html .= "<h3>Ausschluss des Widerrufsrechts</h3>\n";
            $html .= "<p>Das Widerrufsrecht besteht nicht bei folgenden Verträgen:</p>\n";
            $html .= "<ul>\n";
            if (in_array('personalized', $excludeCategories)) {
                $html .= "<li>Zur Lieferung von Waren, die nicht vorgefertigt sind und für deren Herstellung eine ";
                $html .= "individuelle Auswahl oder Bestimmung durch den Verbraucher maßgeblich ist</li>\n";
            }
            if (in_array('sealed_audio', $excludeCategories)) {
                $html .= "<li>Zur Lieferung von versiegelten Waren, die aus Gründen des Gesundheitsschutzes oder ";
                $html .= "der Hygiene nicht zur Rückgabe geeignet sind</li>\n";
            }
            if (in_array('sealed_software', $excludeCategories)) {
                $html .= "<li>Zur Lieferung von versiegelter Audio- oder Videoaufnahme oder Computersoftware, ";
                $html .= "wenn die Versiegelung nach der Lieferung entfernt wurde</li>\n";
            }
            $html .= "</ul>\n\n";
        }

        $html .= "<h2>Muster-Widerrufsformular</h2>\n";
        $html .= "<p>(Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und ";
        $html .= "senden Sie es zurück.)</p>\n";
        $html .= "<pre>\n";
        $html .= "An:\n";
        $html .= "{$company}\n";
        $html .= "{$owner}\n";
        $html .= "{$address}\n";
        $html .= "{$zip} {$city}\n";
        $html .= "E-Mail: {$email}\n\n";
        $html .= "Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den ";
        $html .= "Kauf der folgenden Waren (*) / die Erbringung der folgenden Dienstleistung (*)\n\n";
        $html .= "_________________________________________________\n\n";
        $html .= "Bestellt am (*) / erhalten am (*)\n\n";
        $html .= "__________________\n\n";
        $html .= "Name des/der Verbraucher(s)\n\n";
        $html .= "_________________________________________________\n\n";
        $html .= "Anschrift des/der Verbraucher(s)\n\n";
        $html .= "_________________________________________________\n\n";
        $html .= "Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)\n\n";
        $html .= "__________________\n\n";
        $html .= "Datum\n\n";
        $html .= "__________________\n\n";
        $html .= "(*) Unzutreffendes streichen.\n";
        $html .= "</pre>\n";

        return $html;
    }

    private function generateBezahlung(): string
    {
        $company = $this->get('company_name');
        $paymentMethods = $this->get('payment_methods', ['invoice', 'paypal', 'creditcard']);
        $invoiceDays = $this->get('invoice_days', 14);
        $minOrderForInvoice = $this->get('min_order_invoice');
        $cashOnDeliveryFee = $this->get('cod_fee', '2.00');

        $html = "<h1>Zahlungsarten</h1>\n\n";

        $html .= "<p>Bei uns können Sie bequem und sicher aus verschiedenen Zahlungsarten wählen. ";
        $html .= "Die verfügbaren Zahlungsarten können je nach Lieferland variieren.</p>\n\n";

        $html .= "<h2>Verfügbare Zahlungsarten</h2>\n\n";

        if (in_array('invoice', $paymentMethods)) {
            $html .= "<h3>Kauf auf Rechnung</h3>\n";
            $html .= "<p>Bezahlen Sie bequem per Rechnung. Der Rechnungsbetrag ist innerhalb von ";
            $html .= "<strong>{$invoiceDays} Tagen</strong> nach Erhalt der Ware zur Zahlung fällig.</p>\n";
            if ($minOrderForInvoice) {
                $html .= "<p><em>Kauf auf Rechnung ab einem Bestellwert von {$minOrderForInvoice} EUR möglich.</em></p>\n";
            }
            $html .= "<ul>\n";
            $html .= "<li>Erst Ware, dann Zahlung</li>\n";
            $html .= "<li>Keine zusätzlichen Gebühren</li>\n";
            $html .= "<li>Bequeme Zahlung per Überweisung</li>\n";
            $html .= "</ul>\n\n";
        }

        if (in_array('paypal', $paymentMethods)) {
            $html .= "<h3>PayPal</h3>\n";
            $html .= "<p>Zahlen Sie sicher und schnell mit PayPal. Sie werden nach Abschluss der Bestellung ";
            $html .= "automatisch zu PayPal weitergeleitet, um die Zahlung durchzuführen.</p>\n";
            $html .= "<ul>\n";
            $html .= "<li>Sichere Zahlung</li>\n";
            $html .= "<li>Schnelle Abwicklung</li>\n";
            $html .= "<li>Käuferschutz inklusive</li>\n";
            $html .= "</ul>\n\n";
        }

        if (in_array('creditcard', $paymentMethods)) {
            $html .= "<h3>Kreditkarte</h3>\n";
            $html .= "<p>Wir akzeptieren folgende Kreditkarten:</p>\n";
            $html .= "<ul>\n";
            $html .= "<li>Visa</li>\n";
            $html .= "<li>Mastercard</li>\n";
            $html .= "<li>American Express</li>\n";
            $html .= "</ul>\n";
            $html .= "<p>Die Belastung Ihrer Kreditkarte erfolgt mit Abschluss der Bestellung.</p>\n\n";
        }

        if (in_array('sepa', $paymentMethods)) {
            $html .= "<h3>SEPA-Lastschrift</h3>\n";
            $html .= "<p>Lassen Sie den Rechnungsbetrag bequem von Ihrem Bankkonto abbuchen.</p>\n";
            $html .= "<ul>\n";
            $html .= "<li>Einfache Einrichtung</li>\n";
            $html .= "<li>Keine zusätzlichen Gebühren</li>\n";
            $html .= "<li>Sichere Abwicklung</li>\n";
            $html .= "</ul>\n\n";
        }

        if (in_array('sofort', $paymentMethods)) {
            $html .= "<h3>Sofortüberweisung / Klarna</h3>\n";
            $html .= "<p>Zahlen Sie direkt und sicher per Online-Banking.</p>\n";
            $html .= "<ul>\n";
            $html .= "<li>Sofortige Zahlungsbestätigung</li>\n";
            $html .= "<li>Schneller Versand möglich</li>\n";
            $html .= "</ul>\n\n";
        }

        if (in_array('amazon_pay', $paymentMethods)) {
            $html .= "<h3>Amazon Pay</h3>\n";
            $html .= "<p>Nutzen Sie Ihre bei Amazon hinterlegten Zahlungs- und Adressdaten für eine schnelle ";
            $html .= "und sichere Bestellung.</p>\n";
            $html .= "<ul>\n";
            $html .= "<li>Keine erneute Eingabe der Daten erforderlich</li>\n";
            $html .= "<li>Sichere Bezahlung über Amazon</li>\n";
            $html .= "</ul>\n\n";
        }

        if (in_array('apple_pay', $paymentMethods)) {
            $html .= "<h3>Apple Pay</h3>\n";
            $html .= "<p>Bezahlen Sie schnell und sicher mit Apple Pay auf Ihren Apple-Geräten.</p>\n\n";
        }

        if (in_array('google_pay', $paymentMethods)) {
            $html .= "<h3>Google Pay</h3>\n";
            $html .= "<p>Bezahlen Sie schnell und sicher mit Google Pay.</p>\n\n";
        }

        if (in_array('cash_on_delivery', $paymentMethods)) {
            $html .= "<h3>Nachnahme</h3>\n";
            $html .= "<p>Zahlen Sie bequem bei Lieferung in bar an den Zusteller.</p>\n";
            $html .= "<p><strong>Hinweis:</strong> Für Nachnahme-Lieferungen fällt eine zusätzliche Gebühr von ";
            $html .= "{$cashOnDeliveryFee} EUR an.</p>\n\n";
        }

        if (in_array('bank_transfer', $paymentMethods)) {
            $html .= "<h3>Vorkasse / Banküberweisung</h3>\n";
            $html .= "<p>Überweisen Sie den Rechnungsbetrag im Voraus auf unser Bankkonto:</p>\n";
            $html .= "<p>Kontoinhaber: {$company}<br>\n";
            $html .= "Verwendungszweck: Ihre Bestellnummer</p>\n";
            $html .= "<p><em>Der Versand erfolgt nach Zahlungseingang.</em></p>\n\n";
        }

        $html .= "<h2>Sicherheit</h2>\n";
        $html .= "<p>Alle Zahlungen werden über sichere, verschlüsselte Verbindungen (SSL) abgewickelt. ";
        $html .= "Ihre Zahlungsdaten werden sicher übertragen und nicht auf unseren Servern gespeichert.</p>\n\n";

        $html .= "<h2>Währung</h2>\n";
        $html .= "<p>Alle Preise werden in Euro (EUR) ausgewiesen. Bei Zahlungen aus dem Nicht-Euro-Ausland ";
        $html .= "können weitere Gebühren durch Ihre Bank anfallen.</p>\n";

        return $html;
    }

    private function generateAgb(): string
    {
        $company = $this->get('company_name');
        $owner = $this->get('owner_name');
        $address = $this->get('address');
        $zip = $this->get('zip_code');
        $city = $this->get('city');
        $email = $this->get('email');
        $warrantyPeriod = $this->get('warranty_period', '24');
        $jurisdiction = $this->get('jurisdiction', 'de');

        $html = "<h1>Allgemeine Geschäftsbedingungen (AGB)</h1>\n\n";

        $html .= "<h2>§ 1 Geltungsbereich</h2>\n";
        $html .= "<p>(1) Diese Allgemeinen Geschäftsbedingungen (AGB) von {$company} (nachfolgend \"Verkäufer\" ";
        $html .= "genannt) gelten für alle Verträge, die ein Verbraucher oder Unternehmer (nachfolgend \"Kunde\" ";
        $html .= "genannt) mit dem Verkäufer hinsichtlich der vom Verkäufer in seinem Online-Shop dargestellten ";
        $html .= "Waren und/oder Leistungen abschließt.</p>\n";
        $html .= "<p>(2) Diese AGB gelten ausschließlich. Entgegenstehende oder von diesen AGB abweichende Bedingungen ";
        $html .= "des Kunden werden nicht anerkannt, es sei denn, der Verkäufer hat der Geltung im Einzelfall ";
        $html .= "ausdrücklich schriftlich zugestimmt.</p>\n\n";

        $html .= "<h2>§ 2 Vertragsschluss</h2>\n";
        $html .= "<p>(1) Die im Online-Shop des Verkäufers enthaltenen Produktbeschreibungen stellen keine "
        $html .= "verbindlichen Angebote seitens des Verkäufers dar, sondern dienen zur Abgabe eines verbindlichen "
        $html .= "Angebots durch den Kunden.</p>\n";
        $html .= "<p>(2) Der Kunde kann das Angebot über das in den Online-Shop integrierte Online-Bestellformular "
        $html .= "abgeben. Dabei gibt der Kunde, nachdem er die ausgewählten Waren in den virtuellen Warenkorb gelegt "
        $html .= "und den elektronischen Bestellprozess durchlaufen hat, durch Klicken des Buttons den Zahlungspflicht "
        $html .= "vertragsschluss erklärend ein rechtlich verbindliches Angebot ab.</p>\n";
        $html .= "<p>(3) Der Verkäufer kann das Angebot des Kunden innerhalb von fünf Tagen annehmen, indem er dem "
        $html .= "Kunden eine schriftliche Auftragsbestätigung oder eine Auftragsbestätigung in Textform übermittelt "
        $html .= "oder dem Kunden die bestellte Ware liefert.</p>\n\n";

        $html .= "<h2>§ 3 Preise und Zahlungsbedingungen</h2>\n";
        $html .= "<p>(1) Die angegebenen Preise des Verkäufers sind Endpreise, d.h. sie beinhalten sämtliche "
        $html .= "Preisbestandteile einschließlich der gesetzlichen deutschen Umsatzsteuer.</p>\n";
        $html .= "<p>(2) Die Zahlungsmöglichkeit(en) wird/werden dem Kunden im Online-Shop mitgeteilt.</p>\n";
        $html .= "<p>(3) Bei Lieferungen in Länder außerhalb der Europäischen Union können im Einzelfall weitere "
        $html .= "Kosten anfallen, die der Verkäufer nicht zu vertreten hat und die vom Kunden zu tragen sind.</p>\n\n";

        $html .= "<h2>§ 4 Liefer- und Versandbedingungen</h2>\n";
        $html .= "<p>(1) Die Lieferung von Waren erfolgt auf dem Versandweg an die vom Kunden angegebene "
        $html .= "Lieferanschrift, sofern nichts anderes vereinbart ist.</p>\n";
        $html .= "<p>(2) Sendet das Transportunternehmen die versandte Ware an den Verkäufer zurück, da eine "
        $html .= "Zustellung beim Kunden nicht möglich war, trägt der Kunde die Kosten für den erfolglosen "
        $html .= "Versand.</p>\n";
        $html .= "<p>(3) Der Verkäufer behält sich das Recht vor, im Fall von nicht richtiger oder nicht "
        $html .= "ordnungsgemäßer Selbstbelieferung, vom Vertrag zurückzutreten.</p>\n\n";

        $html .= "<h2>§ 5 Eigentumsvorbehalt</h2>\n";
        $html .= "<p>Taucht der Kunde in Vollkaufmann, so bleibt die Ware bis zur vollständigen Bezahlung des "
        $html .= "Kaufpreises Eigentum des Verkäufers.</p>\n\n";

        $html .= "<h2>§ 6 Mängelhaftung (Gewährleistung)</h2>\n";
        $html .= "<p>(1) Es gilt die gesetzliche Mängelhaftung.</p>\n";
        $html .= "<p>(2) Die Verjährungsfrist für gesetzliche Mängelansprüche beträgt bei Verbrauchern {$warrantyPeriod} "
        $html .= "Monate ab Ablieferung der Ware.</p>\n\n";

        $html .= "<h2>§ 7 Haftung</h2>\n";
        $html .= "<p>(1) Der Verkäufer haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie bei "
        $html .= "Verletzung einer wesentlichen Vertragspflicht.</p>\n";
        $html .= "<p>(2) Im Übrigen ist die Haftung des Verkäufers auf die vertragstypisch vorhersehbaren "
        $html .= "Schäden beschränkt.</p>\n\n";

        $html .= "<h2>§ 8 Anwendbares Recht</h2>\n";
        $html .= "<p>Für sämtliche Rechtsbeziehungen der Parteien gilt das Recht der Bundesrepublik Deutschland "
        $html .= "unter Ausschluss der Gesetze über den internationalen Kauf beweglicher Waren.</p>\n\n";

        $html .= "<h2>§ 9 Gerichtsstand</h2>\n";
        $html .= "<p>Ausschließlicher Gerichtsstand für alle Streitigkeiten ist der Sitz des Verkäufers, "
        $html .= "sofern der Kunde Kaufmann, eine juristische Person des öffentlichen Rechts oder ein "
        $html .= "öffentlich-rechtliches Sondervermögen ist.</p>\n\n";

        $html .= "<h2>§ 10 Salvatorische Klausel</h2>\n";
        $html .= "<p>Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, bleibt die "
        $html .= "Wirksamkeit der übrigen Bestimmungen hiervon unberührt.</p>\n\n";

        $html .= "<p><strong>Stand:</strong> " . date('d.m.Y') . "</p>\n";

        return $html;
    }

    private function generateCookie(): string
    {
        $company = $this->get('company_name');
        $usesAnalytics = $this->get('uses_analytics', false);
        $usesMarketing = $this->get('uses_marketing', false);

        $html = "<h1>Cookie-Richtlinie</h1>\n\n";

        $html .= "<h2>1. Was sind Cookies?</h2>\n";
        $html .= "<p>Cookies sind kleine Textdateien, die auf Ihrem Endgerät (Computer, Tablet, Smartphone) "
        $html .= "gespeichert werden, wenn Sie unsere Website besuchen. Sie helfen uns dabei, unsere Website "
        $html .= "für Sie nutzerfreundlicher zu gestalten.</p>\n\n";

        $html .= "<h2>2. Arten von Cookies</h2>\n";

        $html .= "<h3>2.1 Technisch notwendige Cookies</h3>\n";
        $html .= "<p>Diese Cookies sind für den Betrieb unserer Website zwingend erforderlich und können "
        $html .= "in unseren Systemen nicht deaktiviert werden. Sie werden normalerweise nur als Reaktion "
        $html .= "auf von Ihnen getätigte Aktionen gesetzt.</p>\n";
        $html .= "<table>\n";
        $html .= "<tr><th>Name</th><th>Zweck</th><th>Speicherdauer</th></tr>\n";
        $html .= "<tr><td>session_id</td><td>Sitzungsverwaltung</td><td>Sitzungsende</td></tr>\n";
        $html .= "<tr><td>csrf_token</td><td>Sicherheit</td><td>Sitzungsende</td></tr>\n";
        $html .= "<tr><td>cookie_consent</td><td>Cookie-Einwilligung</td><td>1 Jahr</td></tr>\n";
        $html .= "</table>\n\n";

        $html .= "<h3>2.2 Funktionale Cookies</h3>\n";
        $html .= "<p>Diese Cookies ermöglichen erweiterte Funktionen und Personalisierung, wie z.B. "
        $html .= "die Speicherung Ihrer Spracheinstellungen.</p>\n";
        $html .= "<table>\n";
        $html .= "<tr><th>Name</th><th>Zweck</th><th>Speicherdauer</th></tr>\n";
        $html .= "<tr><td>language</td><td>Spracheinstellung</td><td>1 Jahr</td></tr>\n";
        $html .= "<tr><td>theme</td><td>Design-Einstellung</td><td>1 Jahr</td></tr>\n";
        $html .= "</table>\n\n";

        if ($usesAnalytics) {
            $html .= "<h3>2.3 Analyse-Cookies</h3>\n";
            $html .= "<p>Diese Cookies helfen uns zu verstehen, wie Besucher mit unserer Website "
            $html .= "interagieren, indem Informationen anonym gesammelt werden.</p>\n";
            $html .= "<table>\n";
            $html .= "<tr><th>Name</th><th>Zweck</th><th>Speicherdauer</th></tr>\n";
            $html .= "<tr><td>_ga</td><td>Google Analytics</td><td>2 Jahre</td></tr>\n";
            $html .= "<tr><td>_gid</td><td>Google Analytics</td><td>24 Stunden</td></tr>\n";
            $html .= "<tr><td>_gat</td><td>Google Analytics</td><td>1 Minute</td></tr>\n";
            $html .= "</table>\n\n";
        }

        if ($usesMarketing) {
            $html .= "<h3>2.4 Marketing-Cookies</h3>\n";
            $html .= "<p>Diese Cookies werden verwendet, um Werbung relevanter für Sie zu gestalten. "
            $html .= "Sie sammeln Informationen über Ihre Browsergewohnheiten.</p>\n";
            $html .= "<table>\n";
            $html .= "<tr><th>Name</th><th>Zweck</th><th>Speicherdauer</th></tr>\n";
            $html .= "<tr><td>_fbp</td><td>Facebook Pixel</td><td>3 Monate</td></tr>\n";
            $html .= "</table>\n\n";
        }

        $html .= "<h2>3. Cookie-Einwilligung</h2>\n";
        $html .= "<p>Bei Ihrem ersten Besuch unserer Website zeigen wir Ihnen einen Banner, in dem wir "
        $html .= "Sie über die Verwendung von Cookies informieren und Sie um Ihre Einwilligung bitten. "
        $html .= "Sie können Ihre Cookie-Einstellungen jederzeit über den Link \"Cookie-Einstellungen\" "
        $html .= "in der Fußzeile ändern.</p>\n\n";

        $html .= "<h2>4. Cookies verwalten</h2>\n";
        $html .= "<p>Sie können Cookies in Ihrem Browser verwalten und löschen. Bitte beachten Sie, dass "
        $html .= "das Löschen aller Cookies dazu führen kann, dass Ihre Einstellungen verloren gehen und "
        $html .= "einige Funktionen nicht mehr verfügbar sind.</p>\n";
        $html .= "<ul>\n";
        $html .= "<li><a href=\"https://support.google.com/chrome/answer/95647\" target=\"_blank\" rel=\"noopener\">Chrome</a></li>\n";
        $html .= "<li><a href=\"https://support.mozilla.org/de/kb/cookies-und-website-daten-in-firefox-loschen\" target=\"_blank\" rel=\"noopener\">Firefox</a></li>\n";
        $html .= "<li><a href=\"https://support.apple.com/de-de/guide/safari/sfri11471/mac\" target=\"_blank\" rel=\"noopener\">Safari</a></li>\n";
        $html .= "<li><a href=\"https://support.microsoft.com/de-de/microsoft-edge/cookies-in-microsoft-edge-5fe49a31-6018-49c9-8ae6-08194ea2d06e\" target=\"_blank\" rel=\"noopener\">Edge</a></li>\n";
        $html .= "</ul>\n\n";

        $html .= "<h2>5. Kontakt</h2>\n";
        $html .= "<p>Bei Fragen zur Verwendung von Cookies können Sie uns jederzeit kontaktieren:</p>\n";
        $html .= "<p><strong>{$company}</strong></p>\n";

        return $html;
    }

    private function getImpressumFields(): array
    {
        return [
            ['name' => 'company_name', 'label' => 'Firmenname', 'type' => 'text', 'required' => true],
            ['name' => 'owner_name', 'label' => 'Inhaber / Geschäftsführer', 'type' => 'text', 'required' => true],
            ['name' => 'address', 'label' => 'Straße & Hausnummer', 'type' => 'text', 'required' => true],
            ['name' => 'zip_code', 'label' => 'PLZ', 'type' => 'text', 'required' => true],
            ['name' => 'city', 'label' => 'Ort', 'type' => 'text', 'required' => true],
            ['name' => 'phone', 'label' => 'Telefon', 'type' => 'tel'],
            ['name' => 'email', 'label' => 'E-Mail', 'type' => 'email', 'required' => true],
            ['name' => 'website', 'label' => 'Website', 'type' => 'url'],
            ['name' => 'business_type', 'label' => 'Rechtsform', 'type' => 'select', 'options' => [
                ['value' => 'einzelunternehmer', 'label' => 'Einzelunternehmer'],
                ['value' => 'gmbh', 'label' => 'GmbH'],
                ['value' => 'ug', 'label' => 'UG (haftungsbeschränkt)'],
                ['value' => 'ag', 'label' => 'AG'],
                ['value' => 'ohg', 'label' => 'OHG'],
                ['value' => 'kg', 'label' => 'KG'],
                ['value' => 'gbr', 'label' => 'GbR'],
                ['value' => 'freelancer', 'label' => 'Freiberufler'],
            ]],
            ['name' => 'register_court', 'label' => 'Registergericht', 'type' => 'text'],
            ['name' => 'register_number', 'label' => 'Registernummer', 'type' => 'text'],
            ['name' => 'vat_id', 'label' => 'USt-IdNr.', 'type' => 'text'],
            ['name' => 'tax_number', 'label' => 'Steuernummer', 'type' => 'text'],
            ['name' => 'responsible_person', 'label' => 'Verantwortliche Person (§ 55 RStV)', 'type' => 'text'],
            ['name' => 'dispute_resolution_platform', 'label' => 'OS-Plattform', 'type' => 'text', 'default' => 'ec.europa.eu/odr'],
        ];
    }

    private function getDatenschutzFields(): array
    {
        return [
            ['name' => 'company_name', 'label' => 'Firmenname', 'type' => 'text', 'required' => true],
            ['name' => 'owner_name', 'label' => 'Inhaber', 'type' => 'text', 'required' => true],
            ['name' => 'address', 'label' => 'Straße & Hausnummer', 'type' => 'text', 'required' => true],
            ['name' => 'zip_code', 'label' => 'PLZ', 'type' => 'text', 'required' => true],
            ['name' => 'city', 'label' => 'Ort', 'type' => 'text', 'required' => true],
            ['name' => 'email', 'label' => 'E-Mail', 'type' => 'email', 'required' => true],
            ['name' => 'phone', 'label' => 'Telefon', 'type' => 'tel'],
            ['name' => 'website', 'label' => 'Website', 'type' => 'url'],
            ['name' => 'dpo_name', 'label' => 'Datenschutzbeauftragter (Name)', 'type' => 'text'],
            ['name' => 'dpo_address', 'label' => 'Datenschutzbeauftragter (Adresse)', 'type' => 'text'],
            ['name' => 'dpo_email', 'label' => 'Datenschutzbeauftragter (E-Mail)', 'type' => 'email'],
            ['name' => 'dpo_phone', 'label' => 'Datenschutzbeauftragter (Telefon)', 'type' => 'tel'],
            ['name' => 'uses_cookies', 'label' => 'Cookies verwenden', 'type' => 'checkbox', 'default' => true],
            ['name' => 'uses_contact_form', 'label' => 'Kontaktformular vorhanden', 'type' => 'checkbox', 'default' => true],
            ['name' => 'uses_newsletter', 'label' => 'Newsletter vorhanden', 'type' => 'checkbox'],
            ['name' => 'uses_comments', 'label' => 'Kommentarfunktion vorhanden', 'type' => 'checkbox'],
            ['name' => 'uses_analytics', 'label' => 'Analytics verwenden', 'type' => 'checkbox'],
            ['name' => 'uses_google_analytics', 'label' => 'Google Analytics', 'type' => 'checkbox'],
            ['name' => 'uses_matomo', 'label' => 'Matomo', 'type' => 'checkbox'],
            ['name' => 'hosting_provider', 'label' => 'Hosting-Provider', 'type' => 'text'],
            ['name' => 'hosting_address', 'label' => 'Hosting-Adresse', 'type' => 'text'],
        ];
    }

    private function getVersandFields(): array
    {
        return [
            ['name' => 'company_name', 'label' => 'Firmenname', 'type' => 'text', 'required' => true],
            ['name' => 'shipping_methods', 'label' => 'Versanddienstleister', 'type' => 'multiselect', 'options' => [
                ['value' => 'dhl', 'label' => 'DHL'],
                ['value' => 'dpd', 'label' => 'DPD'],
                ['value' => 'hermes', 'label' => 'Hermes'],
                ['value' => 'ups', 'label' => 'UPS'],
                ['value' => 'gls', 'label' => 'GLS'],
            ]],
            ['name' => 'free_shipping_from', 'label' => 'Kostenloser Versand ab (EUR)', 'type' => 'number'],
            ['name' => 'shipping_germany', 'label' => 'Versandkosten Deutschland (EUR)', 'type' => 'number', 'default' => '4.99'],
            ['name' => 'shipping_eu', 'label' => 'Versandkosten EU (EUR)', 'type' => 'number', 'default' => '9.99'],
            ['name' => 'shipping_world', 'label' => 'Versandkosten Weltweit (EUR)', 'type' => 'number', 'default' => '19.99'],
            ['name' => 'delivery_time_germany', 'label' => 'Lieferzeit Deutschland (Tage)', 'type' => 'text', 'default' => '2-3'],
            ['name' => 'delivery_time_eu', 'label' => 'Lieferzeit EU (Tage)', 'type' => 'text', 'default' => '5-7'],
            ['name' => 'dispatch_days', 'label' => 'Versandfertig in (Werktagen)', 'type' => 'text', 'default' => '1-2'],
        ];
    }

    private function getWiderrufFields(): array
    {
        return [
            ['name' => 'company_name', 'label' => 'Firmenname', 'type' => 'text', 'required' => true],
            ['name' => 'owner_name', 'label' => 'Inhaber', 'type' => 'text', 'required' => true],
            ['name' => 'address', 'label' => 'Straße & Hausnummer', 'type' => 'text', 'required' => true],
            ['name' => 'zip_code', 'label' => 'PLZ', 'type' => 'text', 'required' => true],
            ['name' => 'city', 'label' => 'Ort', 'type' => 'text', 'required' => true],
            ['name' => 'email', 'label' => 'E-Mail', 'type' => 'email', 'required' => true],
            ['name' => 'phone', 'label' => 'Telefon', 'type' => 'tel'],
            ['name' => 'return_shipping', 'label' => 'Rückversandkosten trägt', 'type' => 'select', 'options' => [
                ['value' => 'customer', 'label' => 'Kunde'],
                ['value' => 'merchant', 'label' => 'Händler'],
            ], 'default' => 'customer'],
            ['name' => 'refund_method', 'label' => 'Rückerstattungsart', 'type' => 'select', 'options' => [
                ['value' => 'original', 'label' => 'Ursprüngliches Zahlungsmittel'],
                ['value' => 'credit', 'label' => 'Gutschein'],
            ], 'default' => 'original'],
            ['name' => 'exclude_categories', 'label' => 'Widerruf ausschließen für', 'type' => 'multiselect', 'options' => [
                ['value' => 'personalized', 'label' => 'Personalisierte Waren'],
                ['value' => 'sealed_audio', 'label' => 'Versiegelte Audio/Video'],
                ['value' => 'sealed_software', 'label' => 'Versiegelte Software'],
            ]],
        ];
    }

    private function getBezahlungFields(): array
    {
        return [
            ['name' => 'company_name', 'label' => 'Firmenname', 'type' => 'text', 'required' => true],
            ['name' => 'payment_methods', 'label' => 'Zahlungsarten', 'type' => 'multiselect', 'options' => [
                ['value' => 'invoice', 'label' => 'Rechnung'],
                ['value' => 'paypal', 'label' => 'PayPal'],
                ['value' => 'creditcard', 'label' => 'Kreditkarte'],
                ['value' => 'sepa', 'label' => 'SEPA-Lastschrift'],
                ['value' => 'sofort', 'label' => 'Sofortüberweisung/Klarna'],
                ['value' => 'amazon_pay', 'label' => 'Amazon Pay'],
                ['value' => 'apple_pay', 'label' => 'Apple Pay'],
                ['value' => 'google_pay', 'label' => 'Google Pay'],
                ['value' => 'cash_on_delivery', 'label' => 'Nachnahme'],
                ['value' => 'bank_transfer', 'label' => 'Vorkasse'],
            ], 'required' => true],
            ['name' => 'invoice_days', 'label' => 'Zahlungsziel Rechnung (Tage)', 'type' => 'number', 'default' => 14],
            ['name' => 'min_order_invoice', 'label' => 'Mindestbestellwert Rechnung (EUR)', 'type' => 'number'],
            ['name' => 'cod_fee', 'label' => 'Nachnahmegebühr (EUR)', 'type' => 'number', 'default' => '2.00'],
        ];
    }

    private function getAgbFields(): array
    {
        return [
            ['name' => 'company_name', 'label' => 'Firmenname', 'type' => 'text', 'required' => true],
            ['name' => 'owner_name', 'label' => 'Inhaber', 'type' => 'text', 'required' => true],
            ['name' => 'address', 'label' => 'Straße & Hausnummer', 'type' => 'text', 'required' => true],
            ['name' => 'zip_code', 'label' => 'PLZ', 'type' => 'text', 'required' => true],
            ['name' => 'city', 'label' => 'Ort', 'type' => 'text', 'required' => true],
            ['name' => 'email', 'label' => 'E-Mail', 'type' => 'email', 'required' => true],
            ['name' => 'warranty_period', 'label' => 'Gewährleistungsfrist (Monate)', 'type' => 'number', 'default' => 24],
            ['name' => 'jurisdiction', 'label' => 'Rechtssystem', 'type' => 'select', 'options' => [
                ['value' => 'de', 'label' => 'Deutschland'],
                ['value' => 'at', 'label' => 'Österreich'],
                ['value' => 'ch', 'label' => 'Schweiz'],
            ], 'default' => 'de'],
        ];
    }

    private function getCookieFields(): array
    {
        return [
            ['name' => 'company_name', 'label' => 'Firmenname', 'type' => 'text', 'required' => true],
            ['name' => 'uses_analytics', 'label' => 'Analytics-Cookies', 'type' => 'checkbox'],
            ['name' => 'uses_marketing', 'label' => 'Marketing-Cookies', 'type' => 'checkbox'],
        ];
    }

    private function loadDefaultTemplates(): void
    {
    }
}
