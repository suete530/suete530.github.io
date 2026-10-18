import { guestBtn, loginBtn } from './dom.js';

        export const i18n = {
            en: {
                loginTitle: '🔐 Fines Manager', loginDesc: 'Enter secretary email & password or continue as student',
                btnLogin: '🔓 Secretary Login', btnGuest: '👨‍🎓 Continue as Student',
                headerTitle: '📋 BSIS Fines Manager', roleStudent: '👨‍🎓 Student',
                btnActivity: '📋 Activity', btnAnnounce: '📢 Announce', btnPassword: '🔑 Password', btnLogout: '🚪 Logout',
                profileStudent: '👨‍🎓 Student', profileRole: 'USER',
                pageTitle: 'STUDENT FINES', lblSection: '📚 Section:', btnNewSection: '➕ New Section',
                gcashLabel: '💳 Bayad gamit GCash!!', gcashScan: '📷 Scan QR to get GCash number',
                gcashSteps: 'Send payment → Copy Ref# → Show to Secretary',
                statStudents: 'Students', statTotalFines: 'Total Fines', statAverage: 'Average',
                statHighest: 'Highest', statPaidUnpaid: 'Paid/Unpaid', statCollected: 'Collected',
                lblFullName: '👤 Full Name', lblGender: '⚥ Gender', lblRelationship: '💞 Relationship',
                lblFine: '💰 Fine (₱)', lblStatus: '📊 Status',
                male: 'Male', female: 'Female', nb: 'Non-binary',
                single: 'Single', taken: 'Taken', married: 'Married', uyab: 'Uyab', complicated: 'Complicated',
                unpaid: 'Unpaid', paid: 'Paid',
                btnAdd: '➕ ADD', btnClear: '🗑️ Clear',
                searchPlaceholder: '🔍 Search...', allGenders: 'All Genders', allStatus: 'All Status',
                name: 'Name', fineHigh: 'Fine ↓', fineLow: 'Fine ↑',
                finesLedger: '📌 FINES LEDGER', btnPayCSV: '📥 Payments CSV', btnFinesCSV: '📥 Fines CSV',
                loading: 'Loading...', totalFines: '💰 TOTAL FINES',
                btnSuggestions: '💡 Feature Suggestions', credits: 'Credits: Website Developer: <span>Jonard Suete</span> · <span>Kenneth Panyo</span>',
                paymentHistory: '💳 Payment History', gcashSend: 'Send payment to GCash',
                gcashScanQR: '📷 Scan QR para sa GCash number',
                gcashInstructions: '1️⃣ Open GCash app → Send Money → Enter number above<br>2️⃣ Enter exact amount → Copy Reference Number<br>3️⃣ Paste reference number below',
                paymentAmount: 'Payment Amount (₱)', gcashRef: 'GCash Reference Number',
                date: 'Date', note: 'Note (optional)', notePlaceholder: 'e.g., Partial payment',
                btnComplete: '✅ Complete Payment',
                settings: '🔑 Settings', adminName: '👤 Admin Name', displayName: 'Display Name',
                btnSaveName: '💾 Save Name', adminPhoto: '🖼️ Profile Photo', btnUploadPhoto: '📷 Upload Photo', passwordSection: '🔐 Password',
                currentPw: 'Current Password', newPw: 'New Password', confirmPw: 'Confirm New Password',
                btnSavePw: '💾 Save Password', gcashSettings: '💳 GCash Settings',
                gcashNum: 'GCash Number', gcashAccName: 'GCash Account Name', btnSaveGcash: '💾 Save GCash Info',
                qrSection: '📷 GCash QR Code', noQR: 'No QR uploaded yet', btnUploadQR: '📷 Upload QR Image',
                btnDeleteQR: '🗑️ Delete QR',
                activityLog: '📋 Activity Log', all: 'ALL', today: 'TODAY',
                suggestions: '💡 Feature Suggestions', suggestDesc: 'Share your ideas! What features do you want to see next?',
                yourName: '👤 Your Name', suggestPlaceholder: 'e.g., Add attendance tracker, export to PDF, etc.',
                btnSubmitSuggest: '📤 Submit Suggestion', allSuggestions: '📋 All Suggestions',
                themeSection: '🎨 Theme',
                announcements: '📢 Announcements', announcePlaceholder: 'Write an announcement...',
                btnPost: '📤 Post',
                noAnnounce: 'No announcements yet.'
            },
            tl: {
                loginTitle: '🔐 Fines Manager', loginDesc: 'Ilagay ang email at password ng secretary o magpatuloy bilang estudyante',
                btnLogin: '🔓 Mag-login bilang Secretary', btnGuest: '👨‍🎓 Magpatuloy bilang Estudyante',
                headerTitle: '📋 BSIS Fines Manager', roleStudent: '👨‍🎓 Estudyante',
                btnActivity: '📋 Aktibidad', btnAnnounce: '📢 Anunsyo', btnPassword: '🔑 Password', btnLogout: '🚪 Logout',
                profileStudent: '👨‍🎓 Estudyante', profileRole: 'USER',
                pageTitle: 'MGA FINES NG ESTUDYANTE', lblSection: '📚 Seksyon:', btnNewSection: '➕ Bagong Seksyon',
                gcashLabel: '💳 Magbayad gamit ang GCash!!', gcashScan: '📷 I-scan ang QR para sa GCash number',
                gcashSteps: 'Magbayad → Kopyahin ang Ref# → Ipakita sa Secretary',
                statStudents: 'Estudyante', statTotalFines: 'Kabuuang Fines', statAverage: 'Katamtaman',
                statHighest: 'Pinakamataas', statPaidUnpaid: 'Bayad/Hindi', statCollected: 'Nakolekta',
                lblFullName: '👤 Buong Pangalan', lblGender: '⚥ Kasarian', lblRelationship: '💞 Relasyon',
                lblFine: '💰 Multa (₱)', lblStatus: '📊 Katayuan',
                male: 'Lalaki', female: 'Babae', nb: 'Hindi Binary',
                single: 'Single', taken: 'Taken', married: 'May Asawa', uyab: 'Uyab', complicated: 'Magulo',
                unpaid: 'Hindi Bayad', paid: 'Bayad',
                btnAdd: '➕ DAGDAG', btnClear: '🗑️ Linisin',
                searchPlaceholder: '🔍 Maghanap...', allGenders: 'Lahat ng Kasarian', allStatus: 'Lahat ng Katayuan',
                name: 'Pangalan', fineHigh: 'Multa ↓', fineLow: 'Multa ↑',
                finesLedger: '📌 TALAAN NG FINES', btnPayCSV: '📥 CSV ng Bayad', btnFinesCSV: '📥 CSV ng Fines',
                loading: 'Naglo-load...', totalFines: '💰 KABUUANG FINES',
                btnSuggestions: '💡 Mga Mungkahi', credits: 'Mga Nag-develop: <span>Jonard Suete</span> · <span>Kenneth Panyo</span>',
                paymentHistory: '💳 Kasaysayan ng Bayad', gcashSend: 'Magpadala ng bayad sa GCash',
                gcashScanQR: '📷 I-scan ang QR para sa GCash number',
                gcashInstructions: '1️⃣ Buksan ang GCash → Magpadala ng Pera → Ilagay ang numero<br>2️⃣ Ilagay ang tamang halaga → Kopyahin ang Reference Number<br>3️⃣ Idikit ang reference number sa ibaba',
                paymentAmount: 'Halaga ng Bayad (₱)', gcashRef: 'GCash Reference Number',
                date: 'Petsa', note: 'Tala (opsyonal)', notePlaceholder: 'e.g., Partial na bayad',
                btnComplete: '✅ Kumpletuhin ang Bayad',
                settings: '🔑 Settings', adminName: '👤 Pangalan ng Admin', displayName: 'Display Name',
                btnSaveName: '💾 I-save ang Pangalan', adminPhoto: '🖼️ Larawan ng Profile', btnUploadPhoto: '📷 I-upload ang Larawan', passwordSection: '🔐 Password',
                currentPw: 'Kasalukuyang Password', newPw: 'Bagong Password', confirmPw: 'Kumpirmahin ang Password',
                btnSavePw: '💾 I-save ang Password', gcashSettings: '💳 GCash Settings',
                gcashNum: 'GCash Number', gcashAccName: 'GCash Account Name', btnSaveGcash: '💾 I-save ang GCash',
                qrSection: '📷 GCash QR Code', noQR: 'Wala pang QR', btnUploadQR: '📷 Mag-upload ng QR',
                btnDeleteQR: '🗑️ Burahin ang QR',
                activityLog: '📋 Talaan ng Aktibidad', all: 'LAHAT', today: 'NGAYON',
                suggestions: '💡 Mga Mungkahi', suggestDesc: 'Ibahagi ang iyong mga ideya! Anong features ang gusto mong makita?',
                yourName: '👤 Iyong Pangalan', suggestPlaceholder: 'e.g., Magdagdag ng attendance tracker, export sa PDF, atbp.',
                btnSubmitSuggest: '📤 Isumite ang Mungkahi', allSuggestions: '📋 Lahat ng Mungkahi',
                themeSection: '🎨 Theme',
                announcements: '📢 Mga Anunsyo', announcePlaceholder: 'Magsulat ng anunsyo...',
                btnPost: '📤 I-post',
                noAnnounce: 'Wala pang anunsyo.'
            },
            ceb: {
                loginTitle: '🔐 Fines Manager', loginDesc: 'Isulod ang email ug password sa secretary o padayon isip estudyante',
                btnLogin: '🔓 Mag-login isip Secretary', btnGuest: '👨‍🎓 Padayon isip Estudyante',
                headerTitle: '📋 BSIS Fines Manager', roleStudent: '👨‍🎓 Estudyante',
                btnActivity: '📋 Kalihokan', btnAnnounce: '📢 Pahibalo', btnPassword: '🔑 Password', btnLogout: '🚪 Logout',
                profileStudent: '👨‍🎓 Estudyante', profileRole: 'USER',
                pageTitle: 'MGA FINES SA ESTUDYANTE', lblSection: '📚 Seksyon:', btnNewSection: '➕ Bag-ong Seksyon',
                gcashLabel: '💳 Mobayad gamit ang GCash!!', gcashScan: '📷 I-scan ang QR para sa GCash number',
                gcashSteps: 'Mobayad → Kopyaha ang Ref# → Ipakita sa Secretary',
                statStudents: 'Estudyante', statTotalFines: 'Kabuokang Fines', statAverage: 'Kasarangan',
                statHighest: 'Pinakataas', statPaidUnpaid: 'Bayad/Wala', statCollected: 'Nakolekta',
                lblFullName: '👤 Tibuok Ngalan', lblGender: '⚥ Kinatawhan', lblRelationship: '💞 Relasyon',
                lblFine: '💰 Multa (₱)', lblStatus: '📊 Kahimtang',
                male: 'Lalaki', female: 'Babaye', nb: 'Dili Binary',
                single: 'Ulitawo', taken: 'Naay Uyab', married: 'Minyo', uyab: 'Uyab', complicated: 'Gubot',
                unpaid: 'Wala Bayad', paid: 'Bayad',
                btnAdd: '➕ DUGANG', btnClear: '🗑️ Limpyo',
                searchPlaceholder: '🔍 Pangita...', allGenders: 'Tanang Kinatawhan', allStatus: 'Tanang Kahimtang',
                name: 'Ngalan', fineHigh: 'Multa ↓', fineLow: 'Multa ↑',
                finesLedger: '📌 TALAAN SA FINES', btnPayCSV: '📥 CSV sa Bayad', btnFinesCSV: '📥 CSV sa Fines',
                loading: 'Nag-load...', totalFines: '💰 KABUOKANG FINES',
                btnSuggestions: '💡 Mga Sugyot', credits: 'Mga Naghimo: <span>Jonard Suete</span> · <span>Kenneth Panyo</span>',
                paymentHistory: '💳 Kasaysayan sa Bayad', gcashSend: 'Magpadala ug bayad sa GCash',
                gcashScanQR: '📷 I-scan ang QR para sa GCash number',
                gcashInstructions: '1️⃣ Ablihi ang GCash → Magpadala ug Kwarta → Isulod ang numero<br>2️⃣ Isulod ang saktong kantidad → Kopyaha ang Reference Number<br>3️⃣ Idikit ang reference number sa ubos',
                paymentAmount: 'Kantidad sa Bayad (₱)', gcashRef: 'GCash Reference Number',
                date: 'Petsa', note: 'Nota (opsyonal)', notePlaceholder: 'e.g., Dili kompleto nga bayad',
                btnComplete: '✅ Kompletoha ang Bayad',
                settings: '🔑 Settings', adminName: '👤 Ngalan sa Admin', displayName: 'Display Name',
                btnSaveName: '💾 I-save ang Ngalan', adminPhoto: '🖼️ Larawan sa Profile', btnUploadPhoto: '📷 I-upload ang Larawan', passwordSection: '🔐 Password',
                currentPw: 'Karon nga Password', newPw: 'Bag-ong Password', confirmPw: 'Kumpirmaha ang Password',
                btnSavePw: '💾 I-save ang Password', gcashSettings: '💳 GCash Settings',
                gcashNum: 'GCash Number', gcashAccName: 'GCash Account Name', btnSaveGcash: '💾 I-save ang GCash',
                qrSection: '📷 GCash QR Code', noQR: 'Wala pay QR', btnUploadQR: '📷 Mag-upload ug QR',
                btnDeleteQR: '🗑️ Burahon ang QR',
                activityLog: '📋 Talaan sa Kalihokan', all: 'TANAN', today: 'KARON',
                suggestions: '💡 Mga Sugyot', suggestDesc: 'Ipakigbahin ang imong mga ideya! Unsang features ang gusto nimo makita?',
                yourName: '👤 Imong Ngalan', suggestPlaceholder: 'e.g., Pagdugang og attendance tracker, export sa PDF, ug uban pa',
                btnSubmitSuggest: '📤 Isumiter ang Sugyot', allSuggestions: '📋 Tanang Sugyot',
                themeSection: '🎨 Theme',
                announcements: '📢 Mga Pahibalo', announcePlaceholder: 'Pagsulat og pahibalo...',
                btnPost: '📤 I-post',
                noAnnounce: 'Wala pay pahibalo.'
            }
        };
        export let currentLang = localStorage.getItem('fm_lang') || 'en';
        export function setLanguage(lang) {
            if (!i18n[lang]) lang = 'en';
            currentLang = lang;
            localStorage.setItem('fm_lang', lang);
            document.getElementById('langToggle').textContent = lang === 'en' ? '🇺🇸' : lang === 'tl' ? '🇵🇭' : '🇵🇭';
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (i18n[lang][key]) el.innerHTML = i18n[lang][key];
            });
            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                if (i18n[lang][key]) el.placeholder = i18n[lang][key].replace(/<[^>]*>/g, '');
            });
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) loginBtn.innerHTML = i18n[lang].btnLogin;
            const guestBtn = document.getElementById('viewAsGuest');
            if (guestBtn) guestBtn.innerHTML = i18n[lang].btnGuest;
        }
        document.getElementById('langToggle')?.addEventListener('click', () => {
            const next = { en: 'tl', tl: 'ceb', ceb: 'en' };
            setLanguage(next[currentLang] || 'en');
        });
        document.addEventListener('DOMContentLoaded', () => setLanguage(currentLang));
