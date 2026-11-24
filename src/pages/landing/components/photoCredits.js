/** Each landing photo's credit, kept with the image as metadata (data-credit), not printed (owner, 24 Nov 2026).
 * Source and licence of every photo: public/crops/CREDITS.md. */
const CREDIT = {"field_logs": "McKay Savage, CC BY 2.0, via Wikimedia Commons", "restoration": "USAID Africa Bureau, public domain, via Wikimedia Commons", "advisor": "Kate Holt / AusAID, CC BY 2.0, via Wikimedia Commons", "groundnut": "Kambai Akau, CC BY-SA 4.0, via Wikimedia Commons", "sorghum": "Radosław Botev, CC BY 3.0 PL, via Wikimedia Commons", "eudr": "NASA Earth Observatory, public domain, via Wikimedia Commons", "millet": "Krystal S. Wright, CC BY-SA 4.0, via Wikimedia Commons", "finance": "Bukulu Steven, CC BY-SA 4.0, via Wikimedia Commons", "sesame": "RamboSD, CC BY 4.0, via Wikimedia Commons", "cowpea": "Thamizhpparithi Maari, CC BY-SA 4.0, via Wikimedia Commons"};

export const creditFor = (src) => CREDIT[(src.split('/').pop() || '').replace('.webp', '')] || '';
