import { currentSectionId, sections } from './state.js';

        export function nextId(arr) { return arr.length > 0 ? Math.max(...arr.map(x => x.id)) + 1 : 1; }

        export function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m));
        }

        export function readFileAsBase64(file) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_SIZE = 150;
                        let w = img.width, h = img.height;
                        if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } }
                        else { if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; } }
                        canvas.width = w; canvas.height = h;
                        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                        resolve(canvas.toDataURL('image/jpeg', 0.7));
                    };
                    img.src = reader.result;
                };
                reader.readAsDataURL(file);
            });
        }

        export function readImageAsBase64(file, maxSize, quality) {
            maxSize = maxSize || 1600;
            quality = quality || 0.78;
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onerror = () => resolve('');
                reader.onload = () => {
                    const img = new Image();
                    img.onerror = () => resolve('');
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let w = img.width, h = img.height;
                        if (w > h) { if (w > maxSize) { h *= maxSize / w; w = maxSize; } }
                        else { if (h > maxSize) { w *= maxSize / h; h = maxSize; } }
                        canvas.width = Math.round(w); canvas.height = Math.round(h);
                        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                        resolve(canvas.toDataURL('image/jpeg', quality));
                    };
                    img.src = reader.result;
                };
                reader.readAsDataURL(file);
            });
        }

        export function formatMoney(n) { return '₱' + Number(n).toFixed(2); }
        export function getCurrentSectionName() {
            const sec = sections.find(s => s.id === currentSectionId);
            return sec ? sec.name : 'this section';
        }
