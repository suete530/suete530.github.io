import { badge } from './dom.js';
import { currentSectionId, getIsAdmin, sections, students } from './state.js';
import { db } from './firebase.js';
import { escapeHtml, formatMoney, getCurrentSectionName } from './utils.js';
import { playSound } from './ui.js';
import { collection, doc, setDoc, getDoc, getDocs, onSnapshot, query } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

        export function toggleChatWeb() {
            const panel = document.getElementById('chat-panel');
            const bubble = document.getElementById('chat-bubble');
            const open = panel.classList.toggle('open');
            bubble.classList.toggle('active', open);
            if (open && !panel.dataset.initialized) {
                panel.dataset.initialized = 'true';
                appendMessage('bot', '<span class="bot-tag">▸ AI ASSISTANT v1.0</span> SYSTEM ONLINE. Ako si AI Assistant ng Fines Manager. Pwede mo akong tanungin tungkol sa fines, students, at payments.\n\nI-type ang <b>help</b> para sa listahan ng commands.');
            }
            if (open) {
                const msgs = document.getElementById('chat-messages');
                msgs.scrollTop = msgs.scrollHeight;
                setTimeout(() => document.getElementById('chat-input').focus(), 300);
            }
        }
        export function appendMessage(sender, html) {
            const msgs = document.getElementById('chat-messages');
            const div = document.createElement('div');
            div.className = 'chat-msg ' + sender;
            div.innerHTML = html;
            msgs.appendChild(div);
            msgs.scrollTop = msgs.scrollHeight;
        }
        export function showTyping() {
            const msgs = document.getElementById('chat-messages');
            const div = document.createElement('div');
            div.className = 'chat-typing';
            div.id = 'chat-typing-indicator';
            div.innerHTML = '<span></span><span></span><span></span>';
            msgs.appendChild(div);
            msgs.scrollTop = msgs.scrollHeight;
        }
        export function hideTyping() {
            const el = document.getElementById('chat-typing-indicator');
            if (el) el.remove();
        }
        export async function processMessage(input) {
            const text = input.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
            if (!text) return;
            appendMessage('user', escapeHtml(input.trim()));
            showTyping();
            await new Promise(r => setTimeout(r, 400 + Math.random() * 400));
            hideTyping();
            const isTagalog = /(ano|sino|magkano|ilan|paano|bakit|gaano|pwede|mga|meron|wala|ba |po |opo|kayo|ako|ninyo|natin)/i.test(text);
            const studentsList = students || [];
            const sectionName = getCurrentSectionName();
            const totalStudents = studentsList.length;
            const totalFines = studentsList.reduce((sum, s) => sum + (s.fine || 0), 0);
            const totalCollected = studentsList.reduce((sum, s) => sum + (s.totalPaid || 0), 0);
            const paidStudents = studentsList.filter(s => s.status === 'paid');
            const unpaidStudents = studentsList.filter(s => s.status === 'unpaid');
            let reply = '';
            if (/^(hi|hello|hey|musta|good (morning|afternoon|evening|day)|magandang)/i.test(text)) {
                reply = isTagalog
                    ? `Magandang araw! 😊 Ako ang chat assistant ng Fines Manager. Ano ang maitutulong ko?`
                    : `Hello! 😊 I'm the Fines Manager chat assistant. How can I help you?`;
                if (text.length < 10) reply += '\n\n💡 Type <b>help</b> para sa listahan ng commands.';
            } else if (/^(help|commands|tulong|commands)/i.test(text)) {
                reply = isTagalog
                    ? `📋 <b>Mga Pwede Kong Gawin:</b>\n\n🔍 <b>find [name]</b> — Maghanap ng estudyante\n💰 <b>total fines</b> — Kabuuang fines\n⚠️ <b>unpaid</b> — Mga hindi pa bayad\n✅ <b>paid</b> — Mga nakabayad na\n👥 <b>how many students</b> — Bilang ng estudyante\n📊 <b>stats</b> — Statistics ng section\n📚 <b>sections</b> — Listahan ng sections\n💬 Pwede rin Tagalog!`
                    : `📋 <b>Available Commands:</b>\n\n🔍 <b>find [name]</b> — Search for a student\n💰 <b>total fines</b> — Total fines amount\n⚠️ <b>unpaid</b> — List unpaid students\n✅ <b>paid</b> — List paid students\n👥 <b>how many students</b> — Student count\n📊 <b>stats</b> — Section statistics\n📚 <b>sections</b> — List all sections\n💬 Tagalog is also supported!`;
            } else if (/^(find|search|hanapin|sino si|ipakita)/i.test(text) && studentsList.length > 0) {
                const query = text.replace(/^(find|search|hanapin|sino si|ipakita)\s*/i, '');
                if (query) {
                    const matches = studentsList.filter(s => (s.name || '').toLowerCase().includes(query));
                    if (matches.length === 0) {
                        reply = isTagalog ? `😕 Walang nahanap na "${escapeHtml(query)}".` : `😕 No student found matching "${escapeHtml(query)}".`;
                    } else if (matches.length === 1) {
                        const s = matches[0];
                        const remaining = Math.max(0, (s.fine || 0) - (s.totalPaid || 0));
                        const statusEmoji = s.status === 'paid' ? '✅' : '⚠️';
                        reply = `👤 <b>${escapeHtml(s.name)}</b>\n` +
                            `💰 Fine: ${formatMoney(s.fine || 0)}\n` +
                            `💳 Paid: ${formatMoney(s.totalPaid || 0)}\n` +
                            `📊 Remaining: ${formatMoney(remaining)}\n` +
                            `${statusEmoji} Status: <b>${s.status === 'paid' ? 'Paid' : 'Unpaid'}</b>`;
                    } else {
                        reply = (isTagalog ? `🔍 ${matches.length} nahanap: ` : `🔍 ${matches.length} found: `) +
                            matches.slice(0, 8).map(s => escapeHtml(s.name)).join(', ') +
                            (matches.length > 8 ? `, +${matches.length - 8} more` : '');
                    }
                } else {
                    reply = isTagalog ? '👤 Sino ang gusto mong hanapin?' : '👤 Who would you like to find?';
                }
            } else if (/(total|kabuuang|lahat na|sum|total fines)\s*(fine|fines|bayad|multa)?/i.test(text) && !/paid|bayad|nakabayad|collected/i.test(text)) {
                reply = isTagalog
                    ? `💰 <b>Kabuuang Fines</b> (${sectionName}):\n📊 Total: ${formatMoney(totalFines)}\n👥 Students: ${totalStudents}\n📈 Average: ${formatMoney(totalStudents > 0 ? totalFines / totalStudents : 0)}`
                    : `💰 <b>Total Fines</b> (${sectionName}):\n📊 Total: ${formatMoney(totalFines)}\n👥 Students: ${totalStudents}\n📈 Average: ${formatMoney(totalStudents > 0 ? totalFines / totalStudents : 0)}`;
            } else if (/^(unpaid|hindi.*(bayad|paid)|may.*(utang|balance|atraso)|sino.*balance)/i.test(text)) {
                if (unpaidStudents.length === 0) {
                    reply = isTagalog ? '🎉 Lahat ay bayad na! Walang may balance.' : '🎉 Everyone is paid! No outstanding balances.';
                } else {
                    const show = unpaidStudents.slice(0, 10);
                    const list = show.map(s => `• ${escapeHtml(s.name)} — ${formatMoney(s.fine || 0)}`).join('\n');
                    reply = (isTagalog
                        ? `⚠️ <b>${unpaidStudents.length} na estudyante</b> ang hindi pa bayad:\n${list}`
                        : `⚠️ <b>${unpaidStudents.length} student(s)</b> unpaid:\n${list}`)
                        + (unpaidStudents.length > 10 ? `\n(+${unpaidStudents.length - 10} more)` : '');
                }
            } else if (/^(paid|bayad|nakabayad|sino.*bayad)/i.test(text)) {
                if (paidStudents.length === 0) {
                    reply = isTagalog ? '😕 Wala pang nakakabayad.' : '😕 No one has paid yet.';
                } else {
                    const show = paidStudents.slice(0, 10);
                    const list = show.map(s => `• ${escapeHtml(s.name)} — Paid ${formatMoney(s.totalPaid || 0)}`).join('\n');
                    reply = (isTagalog
                        ? `✅ <b>${paidStudents.length} na estudyante</b> ang bayad na:\n${list}`
                        : `✅ <b>${paidStudents.length} student(s)</b> paid:\n${list}`)
                        + (paidStudents.length > 10 ? `\n(+${paidStudents.length - 10} more)` : '');
                }
            } else if (/(how many|ilang|bilang|count|total.*student|ilan.*estudyante)/i.test(text)) {
                reply = isTagalog
                    ? `👥 <b>${totalStudents}</b> na estudyante sa ${sectionName}.`
                    : `👥 <b>${totalStudents}</b> student(s) in ${sectionName}.`;
            } else if (/^(stats|statistics|statistical|estadistika)/i.test(text)) {
                const avgFine = totalStudents > 0 ? totalFines / totalStudents : 0;
                const highestFine = totalStudents > 0 ? Math.max(...studentsList.map(s => s.fine || 0)) : 0;
                reply = (isTagalog
                    ? `📊 <b>Statistics</b> (${sectionName}):\n👥 Students: ${totalStudents}\n💰 Total Fines: ${formatMoney(totalFines)}\n📈 Average: ${formatMoney(avgFine)}\n🏆 Highest: ${formatMoney(highestFine)}\n✅ Paid: ${paidStudents.length}\n⚠️ Unpaid: ${unpaidStudents.length}\n💳 Collected: ${formatMoney(totalCollected)}`
                    : `📊 <b>Statistics</b> (${sectionName}):\n👥 Students: ${totalStudents}\n💰 Total Fines: ${formatMoney(totalFines)}\n📈 Average Fine: ${formatMoney(avgFine)}\n🏆 Highest Fine: ${formatMoney(highestFine)}\n✅ Paid: ${paidStudents.length}\n⚠️ Unpaid: ${unpaidStudents.length}\n💳 Collected: ${formatMoney(totalCollected)}`);
            } else if (/^(sections|section|section list|mga section)/i.test(text)) {
                const sects = sections || [];
                if (sects.length === 0) {
                    reply = isTagalog ? '📚 Walang sections.' : '📚 No sections available.';
                } else {
                    const list = sects.map(s => `• ${escapeHtml(s.name)}${s.id === currentSectionId ? ' ← current' : ''}`).join('\n');
                    reply = (isTagalog ? `📚 <b>Mga Section:</b>\n${list}` : `📚 <b>Sections:</b>\n${list}`);
                }
            } else if (/(collected|nakolekta|total.*paid|total.*collected)/i.test(text)) {
                reply = isTagalog
                    ? `💳 <b>Nakolekta na:</b> ${formatMoney(totalCollected)} mula sa ${totalStudents} na estudyante.`
                    : `💳 <b>Total Collected:</b> ${formatMoney(totalCollected)} from ${totalStudents} student(s).`;
            } else {
                reply = isTagalog
                    ? `😅 Hindi ko maintindihan. I-type ang <b>help</b> para sa listahan ng mga kaya kong gawin.`
                    : `😅 I didn't understand that. Type <b>help</b> to see what I can do.`;
            }
            appendMessage('bot', reply);
            if ('speechSynthesis' in window) {
                const clean = reply.replace(/<[^>]*>/g, '');
                const u = new SpeechSynthesisUtterance(clean.slice(0, 120));
                u.rate = 0.9; u.lang = isTagalog ? 'fil-PH' : 'en-US';
                speechSynthesis.cancel();
                speechSynthesis.speak(u);
            }
        }
        export function quickChat(msg) {
            document.getElementById('chat-input').value = msg;
            processMessage(msg);
        }
        document.addEventListener('DOMContentLoaded', () => {
            const input = document.getElementById('chat-input');
            const sendBtn = document.getElementById('chat-send');
            sendBtn.addEventListener('click', () => {
                const val = input.value.trim();
                if (val) { processMessage(val); input.value = ''; }
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = input.value.trim();
                    if (val) { processMessage(val); input.value = ''; }
                }
            });
        });
        export let _chatStudentId = null;
        export let _chatUnsub = null;

        window.openChat = function(studentId) {
            const s = students.find(st => st.id === studentId);
            if (!s) return;
            _chatStudentId = studentId;
            document.getElementById('chatModalTitle').textContent = '💬 ' + s.name;
            document.getElementById('chatMessagesContainer').innerHTML = '<div class="no-results" style="padding:20px;font-size:0.75rem;">Loading...</div>';
            document.getElementById('chatMsgInput').value = '';
            document.getElementById('chatModal').classList.add('active');
            if (_chatUnsub) _chatUnsub();
            _chatUnsub = onSnapshot(doc(db, 'chats', String(studentId)), (snap) => {
                const data = snap.data();
                const msgs = data && data.messages ? data.messages : [];
                renderChatMessages(msgs, studentId);
                if (getIsAdmin() && msgs.length > 0) {
                    const updated = msgs.map(m => m.sender === 'student' ? { ...m, read: true } : m);
                    if (JSON.stringify(updated) !== JSON.stringify(msgs)) {
                        setDoc(doc(db, 'chats', String(studentId)), { studentId, studentName: data?.studentName || s.name, messages: updated });
                    }
                }
            });
        };

        export function renderChatMessages(msgs, studentId) {
            const container = document.getElementById('chatMessagesContainer');
            if (msgs.length === 0) { container.innerHTML = '<div class="no-results" style="padding:20px;font-size:0.75rem;">No messages yet. Start chatting!</div>'; return; }
            container.innerHTML = msgs.map(m => {
                const isAdmin = m.sender === 'admin';
                const time = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return `<div class="${isAdmin ? 'chat-bubble-admin' : 'chat-bubble-student'}">${escapeHtml(m.text)}<div class="chat-msg-time">${time}${isAdmin ? ' · Admin' : ''}</div></div>`;
            }).join('');
            container.scrollTop = container.scrollHeight;
        }

        document.getElementById('chatSendBtn')?.addEventListener('click', async () => {
            const input = document.getElementById('chatMsgInput');
            const text = input.value.trim();
            if (!text || !_chatStudentId) return;
            const s = students.find(st => st.id === _chatStudentId);
            const snap = await getDoc(doc(db, 'chats', String(_chatStudentId)));
            const data = snap.data();
            const msgs = data && data.messages ? [...data.messages] : [];
            msgs.push({ text, sender: getIsAdmin() ? 'admin' : 'student', timestamp: Date.now(), read: false });
            await setDoc(doc(db, 'chats', String(_chatStudentId)), { studentId: _chatStudentId, studentName: s ? s.name : 'Student', messages: msgs });
            input.value = '';
        });

        document.getElementById('chatMsgInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('chatSendBtn').click(); } });

        window.closeChatModal = function() {
            document.getElementById('chatModal').classList.remove('active');
            if (_chatUnsub) { _chatUnsub(); _chatUnsub = null; }
            _chatStudentId = null;
        };
        window.closeInboxModal = function() { document.getElementById('inboxModal').classList.remove('active'); };
        document.getElementById('chatModal')?.addEventListener('click', (e) => { if (e.target === document.getElementById('chatModal')) window.closeChatModal(); });
        document.getElementById('inboxModal')?.addEventListener('click', (e) => { if (e.target === document.getElementById('inboxModal')) window.closeInboxModal(); });
        document.getElementById('inboxModal')?.addEventListener('click', (e) => { if (e.target === document.getElementById('inboxModal')) closeInboxModal(); });

        document.getElementById('inboxBtn')?.addEventListener('click', async () => {
            const sid = localStorage.getItem('fm_student_session_id');
            if (!sid) return;
            document.getElementById('inboxModal').classList.add('active');
            const list = document.getElementById('inboxChatList');
            list.innerHTML = '<div class="no-results" style="padding:20px;font-size:0.75rem;">Loading...</div>';
            try {
                const snap = await getDocs(collection(db, 'chats'));
                const chats = [];
                snap.forEach(d => { const data = d.data(); if (String(data.studentId) === String(sid)) chats.push(data); });
                if (chats.length === 0) { list.innerHTML = '<div class="no-results" style="padding:20px;font-size:0.75rem;">No messages from admin yet.</div>'; return; }
                const chat = chats[0];
                const msgs = chat.messages || [];
                list.innerHTML = `<div style="cursor:pointer;padding:12px;background:#0d1520;border-radius:12px;border-left:4px solid var(--accent);" onclick="closeInboxModal();window.openChat(${sid})">
                    <div style="font-size:0.8rem;font-weight:bold;color:var(--accent);">📨 Chat with Admin</div>
                    <div style="font-size:0.7rem;color:#9ca3af;margin-top:4px;">${msgs.length > 0 ? escapeHtml(msgs[msgs.length - 1].text.slice(0, 60)) : 'No messages'}</div>
                </div>`;
            } catch(e) { list.innerHTML = '<div class="no-results">Error loading inbox.</div>'; }
        });

        export function updateInboxBadge() {
            const btn = document.getElementById('inboxBtn');
            const badge = document.getElementById('inboxBadge');
            if (!btn || !badge) return;
            const sid = localStorage.getItem('fm_student_session_id');
            if (!sid || getIsAdmin()) { btn.style.display = 'none'; return; }
            btn.style.display = '';
            if (window._inboxUnsub) window._inboxUnsub();
            let _prevUnread = 0;
            window._inboxUnsub = onSnapshot(doc(db, 'chats', String(sid)), (snap) => {
                const data = snap.data();
                if (!data || !data.messages) { badge.style.display = 'none'; _prevUnread = 0; return; }
                const unread = data.messages.filter(m => m.sender === 'admin' && !m.read).length;
                if (unread > 0) { badge.textContent = unread; badge.style.display = ''; if (_prevUnread === 0) playSound('notif'); }
                else { badge.style.display = 'none'; }
                _prevUnread = unread;
            });
        }
