// EmailJS alerts for developer (owner) events.
// Fill in the four values below — see "EmailJS setup" in README.md.
// While they still contain YOUR_..., sending is skipped silently.

        const _p = atob("cV9aSU44aUVHYllTbGEtWU4=");
        const _s = atob("c2VydmljZV9xdXg1dHBt");
        const _t = atob("dGVtcGxhdGVfOW9lNzl0ZA==");
        const EMAILJS_PUBLIC_KEY = _p;
        const EMAILJS_SERVICE_ID = _s;
        const EMAILJS_TEMPLATE_ID = _t;
        export const DEV_NOTIFY_EMAIL = atob("bmFyZGl4c3dlZXRAZ21haWwuY29t");

        const SDK_URL = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';

        export function isEmailNotifyReady() {
            return [EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, DEV_NOTIFY_EMAIL]
                .every(v => typeof v === 'string' && v.length > 0 && v.indexOf('YOUR_') === -1);
        }

        async function loadSdk() {
            if (window.emailjs) return window.emailjs;
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = SDK_URL;
                s.onload = resolve;
                s.onerror = () => reject(new Error('EmailJS SDK failed to load'));
                document.head.appendChild(s);
            });
            if (!window.emailjs) throw new Error('EmailJS SDK unavailable');
            return window.emailjs;
        }

        const EVENT_TEXT = {
            signed_in: {
                subject: '✅ Successfully signed in — Developer account',
                headline: 'A developer (owner) successfully signed in.'
            },
            account_created: {
                subject: '✅ Successfully created developer account',
                headline: 'A new developer (owner) account was successfully created.'
            }
        };

        export async function sendDevEmail(event, accountEmail) {
            if (!isEmailNotifyReady()) {
                console.warn('[notify] EmailJS not configured — skipping', event);
                return false;
            }
            const info = EVENT_TEXT[event] || { subject: 'Fines System notification', headline: event };
            const now = new Date();
            try {
                const emailjs = await loadSdk();
                await emailjs.send(
                    EMAILJS_SERVICE_ID,
                    EMAILJS_TEMPLATE_ID,
                    {
                        to_email: DEV_NOTIFY_EMAIL,
                        subject: info.subject,
                        message: info.headline + '\n\nAccount: ' + (accountEmail || 'unknown') +
                            '\nTime: ' + now.toLocaleString() +
                            '\nPage: ' + window.location.href +
                            '\nDevice: ' + navigator.userAgent,
                        event: event,
                        email: accountEmail || 'unknown',
                        time: now.toLocaleString(),
                        site: window.location.origin
                    },
                    { publicKey: EMAILJS_PUBLIC_KEY }
                );
                return true;
            } catch (e) {
                console.warn('[notify] Email not sent:', e && e.message ? e.message : e);
                return false;
            }
        }
