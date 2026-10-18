import { students } from './state.js';
import { escapeHtml } from './utils.js';

        export function updateStats() {
            const totalStudents = students.length;
            const totalFines = students.reduce((sum, s) => sum + (s.fine || 0), 0);
            const avgFine = totalStudents > 0 ? totalFines / totalStudents : 0;
            const highestFine = totalStudents > 0 ? Math.max(...students.map(s => s.fine || 0)) : 0;
            const paid = students.filter(s => s.status === 'paid').length;
            const unpaid = totalStudents - paid;
            let totalCollected = 0;
            students.forEach(s => { totalCollected += (s.totalPaid || 0); });
            document.getElementById('statTotalStudents').textContent = totalStudents;
            document.getElementById('statTotalFines').textContent = '₱' + totalFines.toFixed(0);
            document.getElementById('statAvgFine').textContent = '₱' + avgFine.toFixed(0);
            document.getElementById('statHighestFine').textContent = '₱' + highestFine.toFixed(0);
            document.getElementById('statPaidUnpaid').textContent = paid + '/' + unpaid;
            document.getElementById('statCollected').textContent = '₱' + totalCollected.toFixed(0);
            updateCollectionProgress(totalFines, totalCollected);
            renderLeaderboard(totalStudents);
        }
        export function renderLeaderboard(totalStudents) {
            const box = document.getElementById('leaderboardBox');
            const list = document.getElementById('lbList');
            const lbTotal = document.getElementById('lbTotalStudents');
            const toggleWrap = document.getElementById('lbToggleWrap');
            if (!box || !list) return;
            const sorted = [...students].sort((a, b) => (b.fine || 0) - (a.fine || 0));
            const top = sorted.slice(0, 10);
            if (top.length === 0 || top[0].fine <= 0) { box.style.display = 'none'; return; }
            box.style.display = 'block';
            if (lbTotal) lbTotal.textContent = totalStudents;
            const showAll = window._lbShowAll === true;
            const medals = ['🥇', '🥈', '🥉'];
            const visible = showAll ? top : top.slice(0, 3);
            const barW = (s) => top[0].fine > 0 ? ((s.fine || 0) / top[0].fine) * 100 : 0;
            const row = (s, i) => {
                const rank = i < 3 ? medals[i] : `#${i + 1}`;
                const w = top[0].fine > 0 ? ((s.fine || 0) / top[0].fine) * 100 : 0;
                return `<div style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:${i < top.length - 1 ? '1px solid #1e293b' : 'none'};">
                    <span style="font-size:0.8rem;width:28px;text-align:center;">${rank}</span>
                    <span style="flex:1;font-size:0.75rem;font-weight:600;color:#e0e0e0;">${escapeHtml(s.name)}</span>
                    <div style="width:60px;height:6px;background:#0d1520;border-radius:3px;overflow:hidden;">
                        <div style="height:100%;width:${w}%;background:linear-gradient(90deg,var(--amber),var(--accent));border-radius:3px;"></div>
                    </div>
                    <span style="font-size:0.75rem;font-weight:bold;color:${s.status === 'paid' ? '#10b981' : '#f87171'};min-width:55px;text-align:right;font-family:monospace;">₱${(s.fine || 0).toFixed(0)}</span>
                </div>`;
            };
            const top3rows = top.slice(0, 3).map((s, i) => row(s, i)).join('');
            const restRows = top.slice(3).map((s, i) => row(s, i + 3)).join('');
            list.innerHTML = top3rows + (showAll ? restRows : '');
            if (top.length > 3) {
                toggleWrap.style.display = 'block';
                document.getElementById('lbToggleBtn').textContent = showAll ? '▲ Show Less' : `▼ Show All (${top.length - 3} more)`;
            } else {
                toggleWrap.style.display = 'none';
            }
        }
        export function updateCollectionProgress(totalFines, totalCollected) {
            const pct = totalFines > 0 ? Math.min(100, (totalCollected / totalFines) * 100) : 0;
            const remaining = Math.max(0, totalFines - totalCollected);
            document.getElementById('progressFill').style.width = pct + '%';
            document.getElementById('collectionPercent').textContent = pct.toFixed(1) + '%';
            document.getElementById('progressCollected').innerHTML = '₱' + totalCollected.toFixed(0);
            document.getElementById('progressTotal').innerHTML = '₱' + totalFines.toFixed(0);
            document.getElementById('progressRemaining').innerHTML = '₱' + remaining.toFixed(0);
        }

        document.getElementById('lbToggleBtn')?.addEventListener('click', () => {
            window._lbShowAll = !window._lbShowAll;
            const total = students.length;
            renderLeaderboard(total);
        });
