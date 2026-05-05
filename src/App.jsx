import { useEffect, useState } from 'react';
import Papa from 'papaparse';
import {
  CalendarDays, Kanban, LayoutGrid, Layers, Radar, Award, Network,
  ChevronRight, Search, RefreshCw, Sun, Moon, Link as LinkIcon, Map,
  FolderOpen, ChevronDown, Download, ChevronUp
} from 'lucide-react';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState('timeline');
  const [selectedYear, setSelectedYear] = useState('2026');
  
  const [selectedProject, setSelectedProject] = useState(null); 
  const [selectedGroupedEvents, setSelectedGroupedEvents] = useState(null); 
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // ✅ 변수명을 isDropdownOpen으로 통일
  
  const [lastSync, setLastSync] = useState('00:00');

  // ✅ 상세 모달이 닫히거나 다른 사업을 열 때 드롭다운 초기화
  useEffect(() => {
    setIsDropdownOpen(false);
  }, [selectedProject]);
  
  // ✅ Vite 환경에서 차단된 IPC 통신 강제 우회 (창 닫기 버튼 색상 동기화)
  useEffect(() => {
    try {
      const requireFn = window.require || (window.eval && window.eval('require'));
      if (requireFn) {
        const { ipcRenderer } = requireFn('electron');
        ipcRenderer.send('theme-change', isDarkMode);
      }
    } catch (error) {
      console.log('Electron IPC 통신 에러:', error);
    }
  }, [isDarkMode]);

  // ✅ 기본 시트 주소를 최신 주소로 변경
  const [sheetUrl, setSheetUrl] = useState('https://docs.google.com/spreadsheets/d/e/2PACX-1vRhfsY99wc5Fk0O9jpVWJb1viuBJx6TjQ-16oy94rlQfg82o79OmxiollNoKj_hakhKqXRmd7thi2Fw/pub?output=csv');
  const [inputUrl, setInputUrl] = useState(sheetUrl);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fetchSheetData = (urlToFetch = sheetUrl) => {
    if (!urlToFetch) return;
    
    const fetchUrl = `${urlToFetch}&t=${new Date().getTime()}`;

    Papa.parse(fetchUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setData(results.data.filter(item => item['지구명']));
        setLastSync(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
      },
      error: (err) => console.error("데이터 로드 실패:", err)
    });
  };

  useEffect(() => {
    fetchSheetData(sheetUrl);
  }, []);

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    if (inputUrl && inputUrl.includes('pub?output=csv')) {
      setSheetUrl(inputUrl);
      fetchSheetData(inputUrl);
    } else {
      alert("올바른 구글 시트 '웹에 게시된 CSV' 형식의 주소를 입력해주세요.");
    }
  };

  const parseDate = (dateStr) => {
    if (!dateStr || dateStr.includes('#REF!')) return null;
    const cleanStr = dateStr.trim().split(' ')[0];
    const parts = cleanStr.split('.');
    if (parts.length < 3) return null;
    return new Date(`20${parts[0]}-${parts[1]}-${parts[2]}`);
  };

  const getPosFromDate = (date) => {
    if (!date) return null;
    const targetYear = parseInt(selectedYear);
    const start = new Date(targetYear, 0, 1);
    const end = new Date(targetYear, 11, 31);
    const pos = ((date.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100;
    return Math.max(0, Math.min(100, pos));
  };

  const getPos = (dateStr) => getPosFromDate(parseDate(dateStr));
  const isCurrentYear = today.getFullYear() === parseInt(selectedYear);

  const scrollToPhase = (phaseName) => {
    setActiveMenu('list');
    setTimeout(() => {
      // 1. 스크롤은 기존처럼 첫 번째 행을 찾아서 이동
      const element = document.getElementById(`phase-${phaseName}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      // 2. 하이라이트는 data-phase 속성을 가진 '해당 차수의 모든 행'을 찾아서 동시 적용
      const rows = document.querySelectorAll(`tr[data-phase="${phaseName}"]`);
      rows.forEach(row => {
        const originalBg = row.style.backgroundColor;
        row.style.backgroundColor = "rgba(59,130,246,0.15)";
        row.style.transition = "background-color 0.5s";
        setTimeout(() => { row.style.backgroundColor = originalBg; }, 1200);
      });
    }, 100);
  };

  const renderPMBadge = (item) => {
    const pmTag = item['진행상황'];
    if (pmTag === '완료') return <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-[#3B82F6] text-white ml-2 shrink-0">PM 완료</span>;
    if (pmTag === '진행중') return <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-[#00D287] text-white animate-pulse ml-2 shrink-0">PM 진행중</span>;
    return null;
  };

  const renderConsortium = (item, isVertical = false) => {
    const getVal = (prefix, keyword) => {
      const targetKey = Object.keys(item).find(k => 
        k.replace(/\s+/g, '').includes(prefix) && 
        k.replace(/\s+/g, '').includes(keyword)
      );
      return targetKey ? item[targetKey] : null;
    };

    const renderGroup = (prefix, label, textColor, bgColor, isPlaceholder = false) => {
      if (isPlaceholder) {
        return (
          <div key={prefix} className="flex flex-col justify-start gap-0.5 flex-1 min-w-0 text-left px-3.5 py-2.5 rounded-xl border opacity-50" style={{ background: 'var(--label-bg)', borderColor: 'var(--border-light)' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded shrink-0" style={{ background: bgColor, color: textColor }}>
                {label}
              </span>
            </div>
            <p className="text-[12px] truncate pl-0.5 flex items-center gap-1.5" style={{ color: 'var(--text-dimmer)' }}>
              <span className="font-semibold shrink-0" style={{ color: 'var(--text-dim)' }}>부관사 :</span>
              <span className="truncate invisible">-</span> 
            </p>
            <p className="text-[12px] truncate pl-0.5 flex items-center gap-1.5" style={{ color: 'var(--text-dimmer)' }}>
              <span className="font-semibold shrink-0" style={{ color: 'var(--text-dim)' }}>설계사 :</span>
              <span className="truncate invisible">-</span>
            </p>
          </div>
        );
      }

      const lead = getVal(prefix, '주관');
      const sub = getVal(prefix, '부관');
      const design = getVal(prefix, '설계');
      
      if (!lead && !sub && !design) return null;

      const winKey = Object.keys(item).find(k => k.replace(/\s+/g, '').includes('당선여부'));
      const winStatusStr = winKey && item[winKey] ? String(item[winKey]).trim() : '';

      let displayLabel = label; 
      let displayBg = bgColor;
      let displayColor = textColor;

      if (winStatusStr && winStatusStr !== '-') {
        const lead1 = getVal('컨소1', '주관');
        const lead2 = getVal('컨소2', '주관');

        const mentionsLead1 = lead1 && winStatusStr.includes(lead1);
        const mentionsLead2 = lead2 && winStatusStr.includes(lead2);

        let isWin = false;
        let isLoss = false;

        if (mentionsLead1 || mentionsLead2) {
            if (lead && winStatusStr.includes(lead)) {
                isWin = true;
            } else if (lead) {
                isLoss = true;
            }
        } else {
            if (winStatusStr.includes('비당선') || winStatusStr.includes('탈락') || winStatusStr === 'X') {
                isLoss = true;
            } else if (winStatusStr.includes('당선') || winStatusStr === 'O') {
                if (prefix === '컨소1') isWin = true; 
                if (prefix === '컨소2' && lead) isLoss = true; 
            }
        }

        if (isWin) {
          displayLabel = '당선';
          displayBg = 'rgba(59,130,246,0.15)'; 
          displayColor = '#3B82F6';
        } else if (isLoss) {
          displayLabel = '비당선';
          displayBg = 'var(--label-bg)'; 
          displayColor = 'var(--text-dim)';
        }
      }

      const isTpParticipating = lead && Object.entries(item).some(([k, v]) => 
        (k.includes('참여') || k.includes('TP') || k.includes('PM') || k.includes('진행')) &&
        v && String(v).replace(/\s+/g, '').includes(lead.replace(/\s+/g, ''))
      );

      return (
        <div key={prefix} className="flex flex-col justify-start gap-0.5 flex-1 min-w-0 text-left px-3.5 py-2.5 rounded-xl border" style={{ background: 'var(--label-bg)', borderColor: 'var(--border-light)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded shrink-0" style={{ background: displayBg, color: displayColor }}>
              {displayLabel}
            </span>
            {lead && <span className="text-[14px] font-bold truncate" style={{ color: 'var(--text-main)' }} title={lead}>{lead}</span>}
            
            {isTpParticipating && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-[#00D287] text-white shrink-0 shadow-sm ml-0.5">
                TP 참여
              </span>
            )}
          </div>
          <p className="text-[12px] truncate pl-0.5 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }} title={sub ? `부관사 : ${String(sub).replace(/\+/g, ' · ')}` : ''}>
            <span className="font-semibold shrink-0" style={{ color: 'var(--text-dim)' }}>부관사 :</span>
            <span className={`truncate ${!sub ? 'invisible' : ''}`}>{sub ? String(sub).replace(/\+/g, ' · ') : '-'}</span>
          </p>
          <p className="text-[12px] truncate pl-0.5 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }} title={design ? `설계사 : ${String(design).replace(/\+/g, ' · ')}` : ''}>
            <span className="font-semibold shrink-0" style={{ color: 'var(--text-dim)' }}>설계사 :</span>
            <span className={`truncate ${!design ? 'invisible' : ''}`}>{design ? String(design).replace(/\+/g, ' · ') : '-'}</span>
          </p>
        </div>
      );
    };

    let c1 = renderGroup('컨소1', '컨소 1', '#3B82F6', 'rgba(59,130,246,0.15)');
    let c2 = renderGroup('컨소2', '컨소 2', '#f59e0b', 'rgba(245,158,11,0.15)');

    if (c1 || c2) {
      if (!c1) c1 = renderGroup('컨소1', '컨소 1', '#3B82F6', 'rgba(59,130,246,0.15)', true);
      if (!c2) c2 = renderGroup('컨소2', '컨소 2', '#f59e0b', 'rgba(245,158,11,0.15)', true);

      let isC2Winner = false;
      const winKey = Object.keys(item).find(k => k.replace(/\s+/g, '').includes('당선여부'));
      const winStatusStr = winKey && item[winKey] ? String(item[winKey]).trim() : '';

      if (winStatusStr && winStatusStr !== '-') {
        const lead2 = getVal('컨소2', '주관');
        if (lead2 && winStatusStr.includes(lead2)) {
          isC2Winner = true;
        }
      }

      return (
        <div className={`w-full h-full gap-2 ${isVertical ? 'flex flex-col' : 'grid grid-cols-1 2xl:grid-cols-2'}`}>
          {isC2Winner ? c2 : c1}
          {isC2Winner ? c1 : c2}
        </div>
      );
    }

    if (item['컨소시엄']) {
      return (
        <div className="flex flex-col justify-start gap-1 text-left h-full px-3.5 py-2.5 rounded-xl border" style={{ background: 'var(--label-bg)', borderColor: 'var(--border-light)' }}>
          {item['컨소시엄'].split('-').map(s => s.trim()).filter(Boolean).map((s, idx) => (
            <p key={idx} className="text-[13px] font-medium truncate" title={s}>- {s}</p>
          ))}
        </div>
      );
    }

    return <div className="text-[13px] font-semibold text-center h-full flex flex-col justify-center" style={{ color: 'var(--text-dim)' }}>-</div>;
  };

  const filteredData = data.filter(item => {
    const matchesYear = String(item['연도']) === String(selectedYear);
    const consortiumStr = `${item['컨소시엄']||''} ${item['컨소1 : 주관사']||''} ${item['컨소2 : 주관사']||''}`;
    const matchesSearch = item['지구명']?.includes(searchTerm) || consortiumStr.includes(searchTerm) || item['블록']?.includes(searchTerm);
    return matchesYear && matchesSearch;
  });

  const tpItems = filteredData.filter(item => item['진행상황'] === '진행중' || item['진행상황'] === '완료');
  
  const tpPhases = tpItems.reduce((acc, item) => {
    const phase = item['회차'] || '기타';
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(item);
    return acc;
  }, {});

  let winCount = 0;
  let lossCount = 0;
  let pendingCount = 0;
  const partnerStats = {}; 

  Object.values(tpPhases).forEach(phaseGroup => {
    const repItem = phaseGroup[0]; 
    const winKey = Object.keys(repItem).find(k => k.replace(/\s+/g, '').includes('당선여부'));
    const winStr = winKey && repItem[winKey] ? String(repItem[winKey]).replace(/\s+/g, '') : '';

    const lead1Key = Object.keys(repItem).find(k => k.replace(/\s+/g, '').includes('컨소1') && k.replace(/\s+/g, '').includes('주관'));
    const lead2Key = Object.keys(repItem).find(k => k.replace(/\s+/g, '').includes('컨소2') && k.replace(/\s+/g, '').includes('주관'));
    const lead1 = lead1Key && repItem[lead1Key] ? String(repItem[lead1Key]).replace(/\s+/g, '') : '';
    const lead2 = lead2Key && repItem[lead2Key] ? String(repItem[lead2Key]).replace(/\s+/g, '') : '';

    let isTpIn1 = false;
    let isTpIn2 = false;

    Object.entries(repItem).forEach(([k, v]) => {
      const cleanK = k.replace(/\s+/g, '');
      const cleanV = String(v).replace(/\s+/g, '');
      if (cleanK.includes('참여') || cleanK.includes('TP') || cleanK.includes('PM') || cleanK.includes('진행')) {
        if (lead1 && cleanV.includes(lead1)) isTpIn1 = true;
        if (lead2 && cleanV.includes(lead2)) isTpIn2 = true;
      }
    });

    const tpLead = isTpIn1 ? lead1 : (isTpIn2 ? lead2 : null);

    if (tpLead) {
      if (!partnerStats[tpLead]) {
        partnerStats[tpLead] = { total: 0, win: 0 };
      }
      partnerStats[tpLead].total += 1; 
      
      if (winStr.includes(tpLead) || winStr.includes('당선') || winStr === 'O') {
         if (!winStr.includes('비당선') && !winStr.includes('탈락') && winStr !== 'X') {
             partnerStats[tpLead].win += 1;
         }
      }
    }

    if (!winStr || winStr === '-' || winStr === '미정' || winStr === '대기중') {
      pendingCount++;
    } else if (winStr.includes('비당선') || winStr.includes('탈락') || winStr === 'X') {
      lossCount++;
    } else if (tpLead && winStr.includes(tpLead)) {
      winCount++;
    } else if (lead1 && lead2 && (winStr.includes(lead1) || winStr.includes(lead2))) {
      lossCount++;
    } else if (winStr.includes('당선') || winStr === 'O') {
      winCount++;
    } else {
      pendingCount++; 
    }
  });

  const totalFinished = winCount + lossCount;
  const winRate = totalFinished > 0 ? ((winCount / totalFinished) * 100).toFixed(1) : 0;

  const sortedPartners = Object.entries(partnerStats).sort((a, b) => {
    if (b[1].total !== a[1].total) return b[1].total - a[1].total;
    return b[1].win - a[1].win;
  });

  let currentRank = 1;
  const rankedPartners = sortedPartners.map((partner, index) => {
    if (index > 0) {
      const prev = sortedPartners[index - 1][1];
      const curr = partner[1];
      if (prev.total !== curr.total || prev.win !== curr.win) {
        currentRank++; 
      }
    }
    return { name: partner[0], stats: partner[1], rank: currentRank };
  });
  
  const groupedData = filteredData.reduce((acc, item) => {
    const phase = item['회차'] || '기타';
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(item);
    return acc;
  }, {});

  const tpParticipatingPhaseNames = Object.keys(groupedData)
    .filter(phaseKey => groupedData[phaseKey].some(p => p['진행상황'] === '진행중' || p['진행상황'] === '완료'))
    .sort((a, b) => a.localeCompare(b));

  const tpParticipatingPhasesCount = tpParticipatingPhaseNames.length;
  const totalPhasesCount = Object.keys(groupedData).length;

  const activePhases = [];
  const donePhases = [];
  Object.keys(groupedData).forEach(phase => {
    const items = groupedData[phase];
    const hasActive = items.some(i => i['진행상황'] === '진행중');
    const hasDone = items.some(i => i['진행상황'] === '완료');
    if (hasActive) activePhases.push(phase);
    else if (hasDone) donePhases.push(phase);
  });
  activePhases.sort((a, b) => a.localeCompare(b));
  donePhases.sort((a, b) => a.localeCompare(b));

  const timelinePhaseData = Object.keys(groupedData).map(phaseKey => {
    const phaseItems = groupedData[phaseKey];
    const repItem = phaseItems[0];
    const blocksInfo = phaseItems.map(p => `${p['지구명']}(${p['블록']})`).join(', ');
    const hasPMActive = phaseItems.some(p => p['진행상황'] === '진행중');
    const hasPMDone = phaseItems.some(p => p['진행상황'] === '완료');
    const pmStatus = hasPMDone ? '완료' : (hasPMActive ? '진행중' : '');
    const pmProject = phaseItems.find(p => p['진행상황'] === '진행중' || p['진행상황'] === '완료');
    return { ...repItem, phaseName: phaseKey, blocksSummary: blocksInfo, blockCount: phaseItems.length, isPMPhase: hasPMActive || hasPMDone, pmStatus, pmProject, rawItems: phaseItems };
  }).sort((a, b) => (a.phaseName || '').localeCompare(b.phaseName || ''));

  const milestoneTypes = [
    { key: '사전예고', label: '사전예고', color: '#06B6D4' },
    { key: '본공고', label: '본공고', color: '#3B82F6' },
    { key: '확약서 마감', label: '확약서 마감', color: '#00D287' },
    { key: '질의 마감', label: '질의 마감', color: '#f59e0b' },
    { key: '제출', label: '제출일', color: '#60A5FA' },
    { key: '심사', label: '심사일', color: '#EF4444' },
  ];

  let rawUpcomingEvents = [];
  data.forEach(item => {
    milestoneTypes.forEach(ms => {
      const date = parseDate(item[ms.key]);
      if (date) {
        const dDay = Math.ceil((date.getTime() - today.getTime()) / 86400000);
        if (dDay >= -7) rawUpcomingEvents.push({ ...item, eventName: ms.label, eventDate: date, dDay: String(dDay), dateStr: item[ms.key].split(' ')[0] });
      }
    });
  });

  const groupedEventsMap = {};
  rawUpcomingEvents.forEach(item => {
    const isPM = item['진행상황'] === '진행중' || item['진행상황'] === '완료';
    const groupKey = `${item.dateStr}_${item.eventName}_${isPM}`;
    
    if (!groupedEventsMap[groupKey]) {
      groupedEventsMap[groupKey] = {
        ...item,
        rounds: new Set(),
        blocks: [],
        items: []
      };
    }
    if (item['회차']) groupedEventsMap[groupKey].rounds.add(item['회차']);
    groupedEventsMap[groupKey].blocks.push({
      name: item['지구명'],
      block: item['블록'],
      originalItem: item,
      isPM: isPM
    });
    groupedEventsMap[groupKey].items.push(item);
  });

  let allUpcomingEvents = Object.values(groupedEventsMap);
  allUpcomingEvents.sort((a, b) => {
    const dateDiff = a.eventDate.getTime() - b.eventDate.getTime();
    if (dateDiff !== 0) return dateDiff;
    
    const aPM = a.blocks.some(block => block.isPM);
    const bPM = b.blocks.some(block => block.isPM);
    if (aPM && !bPM) return -1;
    if (!aPM && bPM) return 1;
    
    const aRound = a.rounds ? Array.from(a.rounds).sort()[0] : a['회차'];
    const bRound = b.rounds ? Array.from(b.rounds).sort()[0] : b['회차'];
    return (aRound || '').localeCompare(bRound || '');
  });

  const dayOfWeek = today.getDay();
  const daysToThisSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

  const deadlineGroups = {
    lastWeek: allUpcomingEvents.filter(item => parseInt(item.dDay) >= -7 && parseInt(item.dDay) < 0),
    thisWeek: allUpcomingEvents.filter(item => parseInt(item.dDay) >= 0 && parseInt(item.dDay) <= daysToThisSunday),
    nextWeek: allUpcomingEvents.filter(item => parseInt(item.dDay) > daysToThisSunday && parseInt(item.dDay) <= daysToThisSunday + 7),
    later: allUpcomingEvents.filter(item => parseInt(item.dDay) > daysToThisSunday + 7).slice(0, 8),
  };

  const handleSidebarItemClick = (item) => {
    if (item.rounds && item.rounds.size > 1) {
      setSelectedGroupedEvents(item);
    } else {
      setSelectedProject(item.blocks[0].originalItem);
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden theme-wrapper ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
      <style>{`
        @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");

        .theme-dark {
          --bg-main: #0A0C10;
          --bg-side: #13161C;
          --bg-card: #13161C;
          --bg-header: rgba(10, 12, 16, 0.8);
          --border: #222630;
          --border-light: #222630;
          --text-main: #FAFAFA;
          --text-muted: #A1A1AA;
          --text-dim: #71717A;
          --text-dimmer: #52525B;
          --table-header: #0A0C10;
          --hover-bg: rgba(255, 255, 255, 0.05);
          --nav-active-bg: rgba(59, 130, 246, 0.1);
          --nav-text-active: #60A5FA;
          --nav-text: #71717A;
          --nav-icon-active: #60A5FA;
          --tab-bg: #13161C;
          --input-bg: #0A0C10;
          --input-text: #FAFAFA;
          --popup-panel: #13161C;
          --track-bg: #222630;
          --track-inactive: #272A35;
          --label-bg: rgba(250, 250, 250, 0.03);
          --btn-close: #222630;
          --toggle-bg: #0A0C10;
          --toggle-active-light: transparent;
          --toggle-active-dark: #222630;
        }
        
        .theme-light {
          --bg-main: #FAFAFA;
          --bg-side: #FFFFFF;
          --bg-card: #FFFFFF;
          --bg-header: rgba(250, 250, 250, 0.85);
          --border: #E4E4E7;
          --border-light: #F4F4F5;
          --text-main: #18181B;
          --text-muted: #3F3F46;
          --text-dim: #71717A;
          --text-dimmer: #A1A1AA;
          --table-header: #FAFAFA;
          --hover-bg: rgba(0, 0, 0, 0.03);
          --nav-active-bg: #F4F4F5;
          --nav-text-active: #18181B;
          --nav-text: #71717A;
          --nav-icon-active: #18181B;
          --tab-bg: #FFFFFF;
          --input-bg: #FAFAFA;
          --input-text: #18181B;
          --popup-panel: #FFFFFF;
          --track-bg: #F4F4F5;
          --track-inactive: #E4E4E7;
          --label-bg: #FAFAFA;
          --btn-close: #F4F4F5;
          --toggle-bg: #F4F4F5;
          --toggle-active-light: #FFFFFF;
          --toggle-active-dark: transparent;
        }

        .theme-wrapper {
          background: var(--bg-main);
          color: var(--text-main);
          font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif;
          letter-spacing: -0.01em;
        }

        * { 
          font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif; 
          letter-spacing: -0.01em; 
        }
        
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        .hover-bg:hover { background: var(--hover-bg); }
        .hover-row:hover { background: var(--hover-bg); }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease forwards; }
        @keyframes pulse-glow { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        .pulse-glow { animation: pulse-glow 2s infinite; }
      `}</style>

      <aside className="w-[240px] shrink-0 flex flex-col border-r z-20 transition-colors" style={{ background: 'var(--bg-side)', borderColor: 'var(--border)' }}>
        <div className="px-5 pt-3 pb-6 relative">
          <div className="absolute top-0 left-5 w-6 h-1 rounded-b-sm" style={{ background: '#3B82F6' }}></div>
          <div className="flex flex-col justify-center" style={{ WebkitAppRegion: 'drag' }}>
            <p className="font-bold tracking-widest text-[16px] mb-0.5" style={{ color: '#3B82F6' }}>TPLabs</p>
            <p className="font-extrabold text-[20px] tracking-tight flex items-baseline gap-1.5" style={{ color: 'var(--text-main)' }}>
              LH 민참사업 <span className="text-[15px] font-semibold" style={{ color: 'var(--text-muted)' }}>대시보드</span>
            </p>
          </div>
        </div>

        <div className="px-4 pt-[0px] flex-1 flex flex-col justify-between pb-6">
          <div>
            <p className="text-[12px] font-bold tracking-widest mb-3 px-2" style={{ color: 'var(--text-dimmer)' }}>메뉴</p>
            <nav className="space-y-1">
              {[
                { id: 'timeline', label: '일정 타임라인', icon: <CalendarDays size={20} strokeWidth={1.5} /> },
                { id: 'list', label: '사업 목록', icon: <LayoutGrid size={20} strokeWidth={1.5} /> },
                { id: 'region', label: '지역별 현황', icon: <Map size={20} strokeWidth={1.5} /> },
                { id: 'status', label: '자료실', icon: <FolderOpen size={20} strokeWidth={1.5} /> },
              ].map(menu => (
                <button
                  key={menu.id}
                  onClick={() => setActiveMenu(menu.id)}
                  className={`relative w-full flex items-center gap-4 px-3 py-3.5 rounded-xl text-left transition-all ${activeMenu !== menu.id ? 'hover-bg' : ''}`}
                >
                  {activeMenu === menu.id && (
                    <div className="absolute top-1/2 -translate-y-1/2 left-[-16px] w-[4px] h-[22px] rounded-r-md" style={{ background: '#3B82F6' }}></div>
                  )}
                  <span style={{ color: activeMenu === menu.id ? '#3B82F6' : 'var(--text-dim)' }}>{menu.icon}</span>
                  <p className="text-[15px] font-bold" style={{ color: activeMenu === menu.id ? 'var(--text-main)' : 'var(--text-dim)' }}>
                    {menu.label}
                  </p>
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-8 border-t pt-6" style={{ borderColor: 'var(--border)' }}>
             <p className="text-[12px] font-bold tracking-widest mb-3 px-2 flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
               <LinkIcon size={12}/> DATA SOURCE
             </p>
             <form onSubmit={handleUrlSubmit} className="flex flex-col gap-2">
               <input
                 type="text"
                 value={inputUrl}
                 onChange={(e) => setInputUrl(e.target.value)}
                 placeholder="구글 시트 CSV 주소 입력..."
                 className="w-full rounded-xl px-3 py-2.5 text-[11px] outline-none border transition-all focus:border-[#3B82F6] font-mono"
                 style={{ background: 'var(--input-bg)', borderColor: 'var(--border-light)', color: 'var(--input-text)' }}
               />
               <button 
                 type="submit"
                 className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white transition-transform hover:scale-[1.02]"
                 style={{ background: 'linear-gradient(to right, #60A5FA, #3B82F6)' }}
               >
                 시트 연동하기
               </button>
             </form>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="shrink-0 border-b pl-4 pr-[140px] lg:pl-6 lg:pr-[140px] py-3 flex flex-wrap lg:flex-nowrap items-center justify-between gap-4 transition-colors" style={{ background: 'var(--bg-header)', borderColor: 'var(--border)', backdropFilter: 'blur(12px)', WebkitAppRegion: 'drag' }}>
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-2 text-[13px] whitespace-nowrap" style={{ color: 'var(--text-dim)' }}>
              <span className="font-semibold">대시보드</span>
              <ChevronRight size={14} />
              <span className="font-bold" style={{ color: 'var(--text-muted)' }}>{activeMenu === 'timeline' ? '일정 타임라인' : activeMenu === 'status' ? '자료실' : '사업 목록'}</span>
            </div>
            <div className="relative w-40 xl:w-56 hidden md:block" style={{ WebkitAppRegion: 'no-drag' }}>
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="지구명 검색..."
                className="w-full rounded-full py-2 pl-9 pr-4 text-[13px] outline-none border transition-all focus:border-[#3B82F6]"
                style={{ background: 'var(--input-bg)', borderColor: 'var(--border-light)', color: 'var(--input-text)' }}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center flex-wrap justify-end gap-3" style={{ WebkitAppRegion: 'no-drag' }}>
            <div className="flex items-center p-1 rounded-full border shadow-inner transition-all" style={{ background: 'var(--toggle-bg)', borderColor: 'var(--border)' }}>
              <button onClick={() => setIsDarkMode(false)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all" style={{ background: !isDarkMode ? '#3B82F6' : 'var(--toggle-active-light)', color: !isDarkMode ? '#ffffff' : 'var(--text-dim)' }}>
                <Sun size={14}/> 라이트
              </button>
              <button onClick={() => setIsDarkMode(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all" style={{ background: isDarkMode ? '#3B82F6' : 'var(--toggle-active-dark)', color: isDarkMode ? '#ffffff' : 'var(--text-dim)' }}>
                <Moon size={14}/> 다크
              </button>
            </div>

            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all hover-bg"
              style={{ borderColor: 'var(--border-light)', color: 'var(--text-dim)' }}
              onClick={() => fetchSheetData(sheetUrl)} 
            >
              <RefreshCw size={14} />
              <span className="hidden sm:inline">{lastSync} 동기화</span>
            </button>

            <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-card)' }}>
              {['2025', '2026'].map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className="px-3 xl:px-4 py-1.5 text-[12px] font-bold transition-all"
                  style={{ background: selectedYear === year ? '#3B82F6' : 'transparent', color: selectedYear === year ? '#ffffff' : 'var(--text-dim)' }}
                >
                  {year}년
                </button>
              ))}
            </div>

            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[11px] shadow-sm shrink-0" style={{ background: 'linear-gradient(135deg, #60A5FA, #3B82F6)' }}>TP</div>
          </div>
        </header>

        {/* 💡 ID 속성 (main-scroll-area) 추가 */}
        <div id="main-scroll-area" className="flex-1 overflow-y-auto scrollbar-hide p-4 lg:p-6 transition-colors">
          
          {/* ✅ 좁은 화면에서는 2x2 배열, 충분히 넓은 화면(2xl)에서만 1줄 4칸 배열로 배치 */}
          <section className="grid grid-cols-2 2xl:grid-cols-4 gap-4 mb-6">
            
            {/* ✅ 카드 1: 총 회차 */}
            <div className="rounded-2xl p-4 lg:p-5 border flex flex-col transition-all relative overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
              <div className="absolute top-5 right-5 w-[110px] h-[110px] flex items-center justify-center z-10">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="var(--border-light)" strokeWidth="4.5" />
                  <circle cx="20" cy="20" r="16" fill="none" stroke="#3B82F6" strokeWidth="4.5" 
                          strokeDasharray={2 * Math.PI * 16} 
                          strokeDashoffset={2 * Math.PI * 16 - ((tpParticipatingPhasesCount / totalPhasesCount || 0) * 2 * Math.PI * 16)} 
                          strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="flex flex-col items-center mt-1">
                  <span className="text-[11px] font-bold" style={{ color: 'var(--text-dim)' }}>총 {totalPhasesCount}차수</span>
                  <span className="text-[16px] font-extrabold leading-none mt-0.5" style={{ color: '#3B82F6' }}>참여 {tpParticipatingPhasesCount}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>
                  <Layers size={22} strokeWidth={1.5} />
                </div>
                <div className="min-w-0 pr-[110px]">
                  <p className="text-[13px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>총 회차</p>
                  <p className="text-[12px] truncate hidden sm:block mt-0.5" style={{ color: 'var(--text-dim)' }}>민간참여 모집 회차</p>
                </div>
              </div>
              <div className="flex items-baseline gap-2 z-10 flex-wrap mt-3 mb-4">
                <p className="font-bold text-[24px] xl:text-[28px]" style={{ color: '#3B82F6' }}>
                  {tpParticipatingPhasesCount}<span className="text-[16px] ml-1 font-medium" style={{ color: 'var(--text-main)' }}>건</span>
                </p>
                <p className="text-[15px] font-semibold" style={{ color: 'var(--text-dim)' }}>
                  / {totalPhasesCount}차수
                </p>
              </div>
              
              <div className="flex-1 flex flex-wrap content-start gap-2 pt-4 border-t z-10" style={{ borderColor: 'var(--border-light)' }}>
                {tpParticipatingPhaseNames.length > 0 && tpParticipatingPhaseNames.map(phaseName => (
                  <button 
                    key={phaseName} 
                    onClick={() => scrollToPhase(phaseName)} 
                    className="px-2.5 py-1 text-[12px] font-semibold rounded-lg transition-all border flex items-center gap-1 hover-bg" 
                    style={{ background: 'var(--label-bg)', borderColor: 'var(--border-light)', color: '#3B82F6' }}
                  >
                    {phaseName} <ChevronRight size={12}/>
                  </button>
                ))}
              </div>
            </div>

            {/* ✅ 카드 2: PM 진행현황 */}
            <div className="rounded-2xl p-4 lg:p-5 border flex flex-col transition-all relative overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
              
              <div className="absolute top-5 right-5 w-[110px] h-[110px] flex items-center justify-center z-10">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="var(--border-light)" strokeWidth="4.5" />
                  <circle cx="20" cy="20" r="16" fill="none" stroke="#00D287" strokeWidth="4.5" 
                          strokeDasharray={2 * Math.PI * 16} 
                          strokeDashoffset={2 * Math.PI * 16 - ((activePhases.length / (activePhases.length + donePhases.length) || 0) * 2 * Math.PI * 16)} 
                          strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="flex flex-col items-center mt-1">
                  <span className="text-[11px] font-bold" style={{ color: 'var(--text-dim)' }}>총 {activePhases.length + donePhases.length}건</span>
                  <span className="text-[16px] font-extrabold leading-none mt-0.5" style={{ color: '#00D287' }}>진행 {activePhases.length}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,210,135,0.15)', color: '#00D287' }}>
                  <Radar size={22} strokeWidth={1.5} />
                </div>
                <div className="min-w-0 pr-[120px]">
                  <p className="text-[13px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>PM 진행현황</p>
                  <p className="text-[12px] truncate hidden sm:block mt-0.5" style={{ color: 'var(--text-dim)' }}>TP랩스 참여중</p>
                </div>
              </div>
              
              <div className="flex items-baseline gap-2 z-10 flex-wrap mt-3 mb-4">
                <p className="font-bold text-[24px] xl:text-[28px]" style={{ color: '#00D287' }}>
                  {activePhases.length}<span className="text-[16px] ml-1 font-medium" style={{ color: 'var(--text-dim)' }}>건 진행중</span>
                </p>
              </div>
              
              <div className="flex-1 flex flex-wrap content-start gap-2 pt-4 border-t z-10" style={{ borderColor: 'var(--border-light)' }}>
                {activePhases.map(phaseName => (
                  <button 
                    key={phaseName} 
                    onClick={() => scrollToPhase(phaseName)} 
                    className="px-2.5 py-1 text-[12px] font-bold rounded-lg transition-all border flex items-center gap-1 hover-bg" 
                    style={{ background: 'var(--label-bg)', borderColor: 'var(--border-light)', color: '#00D287' }}
                  >
                    {phaseName} <ChevronRight size={12}/>
                  </button>
                ))}
                {donePhases.map(phaseName => (
                  <button 
                    key={phaseName} 
                    onClick={() => scrollToPhase(phaseName)} 
                    className="px-2.5 py-1 text-[12px] font-medium rounded-lg transition-all border flex items-center gap-1 hover-bg opacity-70 hover:opacity-100" 
                    style={{ background: 'var(--label-bg)', borderColor: 'var(--border-light)', color: isDarkMode ? '#60A5FA' : '#3B82F6' }}
                  >
                    {/* 💡 변경점: ' 완료' 텍스트를 제거했습니다. */}
                    {phaseName} <ChevronRight size={12}/>
                  </button>
                ))}
              </div>
            </div>

            {/* ✅ 카드 3: 수주 성공률 */}
            <div className="rounded-2xl p-4 lg:p-5 border flex flex-col transition-all relative overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
              
              <div className="absolute top-5 right-5 w-[110px] h-[110px] flex items-center justify-center z-10">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="var(--border-light)" strokeWidth="4.5" />
                  <circle cx="20" cy="20" r="16" fill="none" stroke="#6366f1" strokeWidth="4.5" 
                          strokeDasharray={2 * Math.PI * 16} 
                          strokeDashoffset={2 * Math.PI * 16 - ((parseFloat(winRate) || 0) / 100) * 2 * Math.PI * 16} 
                          strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="flex flex-col items-center mt-1">
                  <span className="text-[11px] font-bold" style={{ color: 'var(--text-dim)' }}>결과 {totalFinished}건</span>
                  <span className="text-[16px] font-extrabold leading-none mt-0.5" style={{ color: '#6366f1' }}>당선 {winCount}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-1 relative z-10">
                {/* 🎨 아이콘 교체 */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>
                  <Award size={22} strokeWidth={1.5} />
                </div>
                <div className="min-w-0 pr-[110px]">
                  <p className="text-[13px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>수주 성공률</p>
                  <p className="text-[12px] truncate hidden sm:block mt-0.5" style={{ color: 'var(--text-dim)' }}>TP랩스 참여사업 실적</p>
                </div>
              </div>
              
              <div className="flex items-baseline gap-2 z-10 flex-wrap mt-3 mb-4">
                <p className="font-bold text-[24px] xl:text-[28px]" style={{ color: '#6366f1' }}>{winRate}%</p>
              </div>
              
              <div className="flex-1 flex flex-wrap content-start gap-3 pt-4 border-t z-10" style={{ borderColor: 'var(--border-light)' }}>
                 <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#3B82F6] shadow-sm"></span>
                    <span className="text-[12px] font-bold" style={{ color: 'var(--text-main)' }}>당선 {winCount}건</span>
                 </div>
                 <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: 'var(--text-dimmer)' }}></span>
                    <span className="text-[12px] font-semibold" style={{ color: 'var(--text-dim)' }}>패배 {lossCount}건</span>
                 </div>
                 {pendingCount > 0 && (
                   <div className="flex items-center gap-1.5 ml-auto mt-0.5">
                      <span className="text-[11px] font-medium px-1.5 py-0.5 rounded border" style={{ color: 'var(--text-dim)', borderColor: 'var(--border-light)', background: 'var(--label-bg)' }}>
                        진행중 {pendingCount}건
                      </span>
                   </div>
                 )}
              </div>
            </div>

            {/* ✅ 카드 4: 파트너사 실적 */}
            <div className="rounded-2xl p-4 lg:p-5 border flex flex-col transition-all relative overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
              <div className="flex items-center gap-3 mb-1">
                {/* 🎨 아이콘 교체 */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(6,182,212,0.15)', color: '#06B6D4' }}>
                  <Network size={22} strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>파트너사 실적</p>
                  <p className="text-[12px] truncate hidden sm:block mt-0.5" style={{ color: 'var(--text-dim)' }}>TP랩스 참여 파트너사 성과</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 z-10 mt-3 mb-1 flex-1 overflow-y-auto scrollbar-hide" style={{ maxHeight: '110px' }}>
                {rankedPartners.length > 0 ? (
                  rankedPartners.map(({ name, stats, rank }) => {
                    return (
                      <div key={name} className="flex justify-between items-center px-3 py-1.5 shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* 1위 숫자에만 색상 포인트를 주고, 주관사 이름은 모두 동일하게 처리 */}
                          <span className="text-[13px] font-bold shrink-0" style={{ color: rank === 1 ? '#06B6D4' : 'var(--text-dimmer)' }}>{rank}위</span>
                          <span className="truncate text-[13px] font-bold" style={{ color: 'var(--text-main)' }}>{name}</span>
                        </div>
                        <div className="flex items-center shrink-0 text-right">
                           {/* 실적 텍스트 색상도 모두 동일하게 통일 */}
                           <span className="text-[12px] font-semibold" style={{ color: 'var(--text-main)' }}>
                             <span style={{ color: '#3B82F6' }}>당선 {stats.win}건</span> <span style={{ opacity: 0.5, margin: '0 2px' }}>/</span> 참여 {stats.total}건
                           </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-[12px] font-semibold text-center mt-4" style={{ color: 'var(--text-dim)' }}>참여 이력 없음</div>
                )}
              </div>
            </div>
          </section>

          <nav className="flex items-center gap-3 mb-6 overflow-x-auto scrollbar-hide pb-2">
            {[
              { id: 'timeline', label: '일정 타임라인', icon: <CalendarDays size={16} strokeWidth={1.5} /> },
              { id: 'list', label: '사업 목록', icon: <LayoutGrid size={16} strokeWidth={1.5} /> },
              { id: 'region', label: '지역별 현황', icon: <Map size={16} strokeWidth={1.5} /> },
              { id: 'status', label: '자료실', icon: <FolderOpen size={16} strokeWidth={1.5} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveMenu(tab.id)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-bold transition-all border whitespace-nowrap"
                style={{
                  background: activeMenu === tab.id ? '#3B82F6' : 'var(--tab-bg)',
                  borderColor: activeMenu === tab.id ? '#3B82F6' : 'var(--border-light)',
                  color: activeMenu === tab.id ? '#ffffff' : 'var(--text-dim)',
                  boxShadow: activeMenu === tab.id ? '0 4px 15px rgba(59,130,246,0.3)' : 'none',
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>

          {activeMenu === 'timeline' && (
            <div className="rounded-2xl border overflow-hidden animate-fadeIn" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
              <div className="p-6 pb-4">
                <div className="overflow-x-auto scrollbar-hide pt-8 pb-2">
                  <div className="min-w-[750px]">
                    <div className="flex items-center mb-6 pl-[220px]">
                      <div className="flex-1 flex relative">
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                          <div key={m} className="flex-1 pl-2 border-l text-[13px] font-semibold" style={{ borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>
                            {m}월
                          </div>
                        ))}
                        
                        {isCurrentYear && (
                          <div className="absolute top-[-30px] pointer-events-none z-30" style={{ left: `${getPosFromDate(today)}%` }}>
                            <div className="absolute -translate-x-1/2 text-[11px] font-bold px-2.5 py-1 rounded text-white whitespace-nowrap shadow-sm" style={{ background: '#EF4444' }}>오늘</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-7">
                      {timelinePhaseData.map((item, i) => {
                        const dots = milestoneTypes.map(ms => ({ pos: getPos(item[ms.key]), color: ms.color, label: ms.label, key: ms.key })).filter(d => d.pos !== null);
                        const firstDot = dots[0];
                        const lastDot = dots[dots.length - 1];
                        return (
                          <div key={i} className="flex items-center group">
                            <div 
                              className="w-[220px] shrink-0 flex items-center gap-3 pr-4 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setSelectedProject(item.pmProject || item)}
                            >
                              <span
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition-colors"
                                style={{
                                  background: item.isPMPhase ? (item.pmStatus === '진행중' ? 'rgba(0,210,135,0.15)' : 'rgba(59,130,246,0.15)') : 'var(--label-bg)',
                                  color: item.isPMPhase ? (item.pmStatus === '진행중' ? '#00D287' : '#3B82F6') : 'var(--text-dim)',
                                  border: `1px solid ${item.isPMPhase ? (item.pmStatus === '진행중' ? 'rgba(0,210,135,0.3)' : 'rgba(59,130,246,0.3)') : 'var(--border-light)'}`,
                                }}
                              >
                                {item.phaseName}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[12px] font-semibold" style={{ color: item.isPMPhase ? (item.pmStatus === '진행중' ? '#00D287' : '#3B82F6') : 'var(--text-muted)' }}>
                                    {item.blockCount}개 블록
                                  </span>
                                  {item.pmStatus === '완료' && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white" style={{ background: '#3B82F6' }}>PM완료</span>
                                  )}
                                  {item.pmStatus === '진행중' && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold pulse-glow text-white" style={{ background: '#00D287' }}>PM진행중</span>
                                  )}
                                </div>
                                <p className="text-[10px] mt-0.5 font-medium truncate" style={{ color: 'var(--text-dim)' }}>{item.blocksSummary}</p>
                               </div>
                            </div>

                            <div className="flex-1 relative h-7 flex items-center">
                              <div className="absolute inset-0 flex pointer-events-none">
                                {[...Array(12)].map((_, idx) => (
                                  <div key={idx} className="flex-1 border-l" style={{ borderColor: 'var(--border)' }}></div>
                                ))}
                              </div>
                              <div className="absolute w-full h-[2px] rounded-full" style={{ background: 'var(--track-bg)' }}></div>

                              {firstDot && lastDot && firstDot !== lastDot && (
                                <div
                                  className="absolute h-[3px] rounded-full transition-all"
                                  style={{
                                    left: `${firstDot.pos}%`,
                                    width: `${Math.max(2, (lastDot.pos - firstDot.pos))}%`,
                                    background: item.isPMPhase
                                      ? 'linear-gradient(to right, #60A5FA, #3B82F6)'
                                      : 'var(--track-inactive)',
                                  }}
                                ></div>
                              )}
                              {dots.map((dot, idx) => (
                                <div key={idx} className="absolute flex flex-col items-center group/dot z-20" style={{ left: `${dot.pos}%` }} title={`${dot.label}`}>
                                  <div className="w-3.5 h-3.5 rounded-full border-2 shadow-lg transition-transform duration-200 group-hover/dot:scale-150" style={{ background: dot.color, borderColor: 'var(--bg-card)', boxShadow: `0 0 8px ${dot.color}60` }}></div>
                                </div>
                              ))}

                              {isCurrentYear && (
                                <div className="absolute top-[-20px] bottom-[-20px] pointer-events-none" style={{ left: `${getPosFromDate(today)}%`, borderLeft: '2px dashed rgba(239,68,68,0.5)' }}></div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-5 mt-8 pt-6 border-t flex-wrap" style={{ borderColor: 'var(--border-light)' }}>
                  {milestoneTypes.map(ms => (
                    <div key={ms.key} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: ms.color }}></div>
                      <span className="text-[12px] font-medium" style={{ color: 'var(--text-main)' }}>{ms.label}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 ml-2">
                    <div className="w-6 border-t-2 border-dashed" style={{ borderColor: '#EF4444' }}></div>
                    <span className="text-[12px] font-medium" style={{ color: 'var(--text-main)' }}>오늘</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeMenu === 'status' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fadeIn">
              {Object.keys(groupedData).map(phase => {
                const phaseItems = groupedData[phase];
                const totalUnitsForPhase = phaseItems.reduce((acc, item) => acc + (parseInt(item['세대수']?.replace(/[^0-9]/g, '')) || 0), 0);
                
                const hasPMActive = phaseItems.some(p => p['진행상황'] === '진행중');
                const hasPMDone = phaseItems.some(p => p['진행상황'] === '완료');
                
                let statusColor = 'var(--text-main)'; 
                if (hasPMActive) statusColor = '#00D287';
                else if (hasPMDone) statusColor = '#3B82F6';

                return (
                  <div key={phase} id={`phase-${phase}`} className="rounded-2xl border p-6 transition-all" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
                    <div 
                      className="grid grid-cols-[1fr_140px_270px] items-center mb-5 pb-4 px-2 border-b cursor-pointer hover:opacity-70 transition-opacity" 
                      style={{ borderColor: 'var(--border-light)' }}
                      onClick={() => setSelectedProject(phaseItems[0])}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <h4 className="font-bold text-[17px] tracking-tight truncate" style={{ color: 'var(--text-main)' }}>{phase} 요약</h4>
                      </div>
                      
                      <div className="flex items-center justify-end gap-1.5 w-full shrink-0 whitespace-nowrap pr-8">
                        <span className="font-bold text-[20px]" style={{ color: statusColor }}>
                          {phaseItems.length}<span className="text-[15px] ml-0.5 font-medium">BL</span>
                        </span>
                        <span className="font-bold text-[15px]" style={{ color: statusColor }}>
                          총 {totalUnitsForPhase.toLocaleString()}세대
                        </span>
                      </div>
                      
                      <div className="flex flex-nowrap items-center justify-end gap-1.5 min-w-0">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const yearStr = String(phaseItems[0]['연도'] || selectedYear).slice(-2);
                            const roundStr = String(phaseItems[0]['회차']).replace('차', '');
                            window.open(`https://imnlmnbvzmeihzbbheaa.supabase.co/storage/v1/object/public/lh-document/lh-guide-${yearStr}-${roundStr}/lh-${yearStr}-${roundStr}-part1.pdf`, '_blank');
                          }}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-bold transition-all hover-bg shadow-sm whitespace-nowrap shrink-0"
                          style={{ background: 'var(--bg-main)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                        >
                          <Download size={12} style={{ color: '#3B82F6' }} /> 지침서 1편
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const yearStr = String(phaseItems[0]['연도'] || selectedYear).slice(-2);
                            const roundStr = String(phaseItems[0]['회차']).replace('차', '');
                            window.open(`https://imnlmnbvzmeihzbbheaa.supabase.co/storage/v1/object/public/lh-document/lh-guide-${yearStr}-${roundStr}/lh-${yearStr}-${roundStr}-part2.pdf`, '_blank');
                          }}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-bold transition-all hover-bg shadow-sm whitespace-nowrap shrink-0"
                          style={{ background: 'var(--bg-main)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                        >
                          <Download size={12} style={{ color: '#3B82F6' }} /> 지침서 2편
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const yearStr = String(phaseItems[0]['연도'] || selectedYear).slice(-2);
                            const roundStr = String(phaseItems[0]['회차']).replace('차', '');
                            window.open(`https://imnlmnbvzmeihzbbheaa.supabase.co/storage/v1/object/public/lh-document/lh-guide-${yearStr}-${roundStr}/lh-${yearStr}-${roundStr}-fin-attach.pdf`, '_blank');
                          }}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-bold transition-all hover-bg shadow-sm whitespace-nowrap shrink-0"
                          style={{ background: 'var(--bg-main)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                        >
                          <Download size={12} style={{ color: '#3B82F6' }} /> 재무첨부서류
                        </button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {phaseItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-[1fr_140px_270px] items-center cursor-pointer p-2 rounded-xl transition-all hover-bg"
                          onClick={() => setSelectedProject(item)}
                        >
                          <div className="min-w-0 pr-4">
                            <div className="flex flex-wrap items-center gap-y-1">
                              <p className="font-semibold text-[14px] break-keep leading-snug pr-1" style={{ color: item['진행상황'] === '진행중' ? '#00D287' : (item['진행상황'] === '완료' ? (isDarkMode ? '#60A5FA' : '#3B82F6') : 'var(--text-muted)') }}>
                                {item['지구명']} {item['블록']}
                              </p>
                              {renderPMBadge(item)}
                            </div>
                            <p className="text-[11px] mt-1 break-keep" style={{ color: 'var(--text-dim)' }}>{item['유형']}</p>
                          </div>
                          
                          <div className="flex flex-col items-end justify-center w-full shrink-0 whitespace-nowrap pr-8">
                            <p className="font-bold text-[14px]">{item['세대수']}</p>
                            <p className="text-[10px] font-mono" style={{ color: 'var(--text-dimmer)' }}>{item['본공고']?.split(' ')[0]}</p>
                          </div>
                          
                          <div className="flex flex-nowrap items-center justify-end gap-1.5 min-w-0">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const yearStr = String(item['연도'] || selectedYear).slice(-2);
                                const roundStr = String(item['회차']).replace('차', '');
                                window.open(`https://imnlmnbvzmeihzbbheaa.supabase.co/storage/v1/object/public/lh-document/lh-guide-${yearStr}-${roundStr}/lh-${yearStr}-${roundStr}-dev.pdf`, '_blank');
                              }}
                              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-bold transition-all hover-bg shadow-sm whitespace-nowrap shrink-0"
                              style={{ background: 'var(--bg-main)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                            >
                              <Download size={12} style={{ color: '#3B82F6' }} /> 개발계획서
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const yearStr = String(item['연도'] || selectedYear).slice(-2);
                                const roundStr = String(item['회차']).replace('차', '');
                                window.open(`https://imnlmnbvzmeihzbbheaa.supabase.co/storage/v1/object/public/lh-document/lh-guide-${yearStr}-${roundStr}/lh-${yearStr}-${roundStr}-fin.pdf`, '_blank');
                              }}
                              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-bold transition-all hover-bg shadow-sm whitespace-nowrap shrink-0"
                              style={{ background: 'var(--bg-main)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                            >
                              <Download size={12} style={{ color: '#3B82F6' }} /> 재무계획서
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeMenu === 'region' && (() => {
            const provStats = {};
            const cityStats = {};

            // ✅ 시/군/구 구분을 세밀하게 나누고, 최상위 지역을 '도' 단위로 정확히 명시합니다.
            const getRegionInfo = (name) => {
              if (!name) return { prov: '기타', city: '미상' };
              
              // ✅ 서울 조건에서 '위례'를 지웠습니다. 이제 서울은 1건으로 정상 표기됩니다.
              if (name.includes('서울') || name.includes('도봉') || name.includes('수서') || name.includes('마곡')) return { prov: '서울특별시', city: '서울특별시' };
              if (name.includes('인천') || name.includes('검단') || name.includes('영종') || name.includes('청라')) return { prov: '인천광역시', city: '인천광역시' };
              if (name.includes('부산')) return { prov: '부산광역시', city: '부산광역시' };
              if (name.includes('대구')) return { prov: '대구광역시', city: '대구광역시' };
              if (name.includes('광주')) return { prov: '광주광역시', city: '광주광역시' };
              if (name.includes('대전')) return { prov: '대전광역시', city: '대전광역시' };
              if (name.includes('울산')) return { prov: '울산광역시', city: '울산광역시' };
              if (name.includes('세종')) return { prov: '세종특별자치시', city: '세종특별자치시' };

              // ✅ 경기도 하위 시군구 디테일 추가
              if (name.includes('평택') || name.includes('고덕')) return { prov: '경기도', city: '평택시' };
              if (name.includes('남양주') || name.includes('왕숙') || name.includes('다산')) return { prov: '경기도', city: '남양주시' };
              if (name.includes('양주') || name.includes('회천') || name.includes('옥정')) return { prov: '경기도', city: '양주시' };
              if (name.includes('오산') || name.includes('세교')) return { prov: '경기도', city: '오산시' };
              if (name.includes('안양')) return { prov: '경기도', city: '안양시' };
              if (name.includes('안산') || name.includes('장상')) return { prov: '경기도', city: '안산시' };
              if (name.includes('부천') || name.includes('대장')) return { prov: '경기도', city: '부천시' };
              // ✅ '위례'를 성남시로 묶어뒀습니다. (만약 하남시 사업이라면 아래 하남시 줄에 넣으시면 됩니다)
              if (name.includes('성남') || name.includes('판교') || name.includes('위례')) return { prov: '경기도', city: '성남시' };
              if (name.includes('수원') || name.includes('당수')) return { prov: '경기도', city: '수원시' };
              if (name.includes('화성') || name.includes('동탄')) return { prov: '경기도', city: '화성시' };
              if (name.includes('과천')) return { prov: '경기도', city: '과천시' };
              if (name.includes('의왕')) return { prov: '경기도', city: '의왕시' };
              if (name.includes('하남') || name.includes('교산')) return { prov: '경기도', city: '하남시' };
              if (name.includes('파주') || name.includes('운정')) return { prov: '경기도', city: '파주시' };
              if (name.includes('김포')) return { prov: '경기도', city: '김포시' };
              if (name.includes('고양') || name.includes('창릉')) return { prov: '경기도', city: '고양시' };
              if (name.includes('광명')) return { prov: '경기도', city: '광명시' };
              if (name.includes('시흥')) return { prov: '경기도', city: '시흥시' };
              if (name.includes('용인')) return { prov: '경기도', city: '용인시' };
              if (name.includes('구리')) return { prov: '경기도', city: '구리시' };

              if (name.includes('충북') || name.includes('청주')) return { prov: '충청북도', city: '청주시' };
              if (name.includes('충남') || name.includes('천안') || name.includes('아산') || name.includes('내포')) return { prov: '충청남도', city: name.includes('천안') ? '천안시' : '아산시' };
              if (name.includes('전북') || name.includes('전주')) return { prov: '전북특별자치도', city: '전주시' };
              if (name.includes('전남')) return { prov: '전라남도', city: '전라남도(기타)' };
              if (name.includes('경북')) return { prov: '경상북도', city: '경상북도(기타)' };
              if (name.includes('경남') || name.includes('창원') || name.includes('양산')) return { prov: '경상남도', city: name.includes('창원') ? '창원시' : '양산시' };
              if (name.includes('강원') || name.includes('춘천') || name.includes('원주')) return { prov: '강원특별자치도', city: name.includes('춘천') ? '춘천시' : '원주시' };
              if (name.includes('제주')) return { prov: '제주특별자치도', city: '제주시' };

              return { prov: '경기도', city: '기타(경기)' }; 
            };

            filteredData.forEach(item => {
              const loc = getRegionInfo(item['지구명']);
              const prov = loc.prov;
              const city = loc.city;

              const units = parseInt(String(item['세대수'] || '0').replace(/[^0-9]/g, '')) || 0;
              const budget = parseInt(String(item['사업비(추정)'] || '0').replace(/[^0-9]/g, '')) || 0;

              // 지도 툴팁을 위해 도(prov) 객체 안에 세부 시(city) 데이터를 모읍니다.
              if (!provStats[prov]) provStats[prov] = { units: 0, budget: 0, count: 0, cities: {} };
              provStats[prov].units += units;
              provStats[prov].budget += budget;
              provStats[prov].count += 1;
              provStats[prov].cities[city] = (provStats[prov].cities[city] || 0) + units;

              if (!cityStats[city]) cityStats[city] = { prov, units: 0, budget: 0, count: 0 };
              cityStats[city].units += units;
              cityStats[city].budget += budget;
              cityStats[city].count += 1;
            });

            const sortedCitiesByUnits = Object.entries(cityStats).sort((a, b) => b[1].units - a[1].units);
            const sortedCitiesByBudget = Object.entries(cityStats).sort((a, b) => b[1].budget - a[1].budget);
            
            const maxCityUnits = sortedCitiesByUnits.length > 0 ? sortedCitiesByUnits[0][1].units : 1;
            const maxCityBudget = sortedCitiesByBudget.length > 0 ? sortedCitiesByBudget[0][1].budget : 1;

            // ✅ 실제 맵 이미지에 맞춰 픽셀 단위(1~2%)로 영점 초정밀 재조정 (0~100%)
            const geoMap = [
              { id: '서울특별시', label: '서울', x: 46, y: 51 },
              { id: '인천광역시', label: '인천', x: 30, y: 54 },
              { id: '평택시', label: '평택', x: 45, y: 80 },
              { id: '남양주시', label: '남양주', x: 58, y: 45 },
              { id: '양주시', label: '양주', x: 46, y: 37 },
              { id: '오산시', label: '오산', x: 50, y: 74 },
              { id: '안양시', label: '안양', x: 43, y: 59 },
              { id: '안산시', label: '안산', x: 38, y: 62 },
              { id: '부천시', label: '부천', x: 36, y: 53 },
              { id: '성남시', label: '성남', x: 52, y: 58 },
              { id: '수원시', label: '수원', x: 49, y: 66 },
              { id: '화성시', label: '화성', x: 35, y: 71 },
              { id: '과천시', label: '과천', x: 47, y: 56 },
              { id: '의왕시', label: '의왕', x: 46, y: 60 },
              { id: '하남시', label: '하남', x: 56, y: 53 },
              { id: '파주시', label: '파주', x: 36, y: 35 },
              { id: '김포시', label: '김포', x: 26, y: 44 },
              { id: '고양시', label: '고양', x: 38, y: 46 },
              { id: '광명시', label: '광명', x: 40, y: 56 },
              { id: '시흥시', label: '시흥', x: 33, y: 60 },
              { id: '용인시', label: '용인', x: 59, y: 70 },
              { id: '구리시', label: '구리', x: 53, y: 48 }
            ];

            return (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 animate-fadeIn">
                
                {/* 1. 지리적 버블맵 영역 (툴팁 위로 띄우기 및 JSX 문법 에러 완벽 해결) */}
                <div className="rounded-2xl border p-6 flex flex-col transition-all overflow-hidden relative" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
                  <div className="flex items-center justify-between mb-2 pb-4 border-b shrink-0 relative z-20" style={{ borderColor: 'var(--border-light)' }}>
                    <div className="flex items-center gap-2">
                      <Map size={20} style={{ color: '#3B82F6' }} strokeWidth={1.5} />
                      <h4 className="font-bold text-[17px] tracking-tight" style={{ color: 'var(--text-main)' }}>수도권 사업 분포 맵</h4>
                    </div>
                    <span className="text-[11px] font-medium px-2 py-1 rounded-lg" style={{ background: 'var(--label-bg)', color: 'var(--text-dim)' }}>지도: 수도권 / 마우스 오버: 상세 요약</span>
                  </div>
                  
                  <div className="flex-1 w-full flex items-center justify-center pt-2">
                    <div className="relative w-full max-w-[500px] aspect-square flex items-center justify-center scale-[1.1] sm:scale-[1.2] md:scale-[1.25]">
                      
                      {/* 다크모드/라이트모드 배경 완벽 일치 (lighten 블렌딩) */}
                      <div 
                        className="absolute inset-0 w-full h-full rounded-[2.5rem] overflow-hidden z-0"
                        style={{
                          mixBlendMode: isDarkMode ? 'lighten' : 'multiply',
                          opacity: isDarkMode ? 0.85 : 0.5,
                          transform: 'translateZ(0)'
                        }}
                      >
                        <img 
                          src="/metro_map.png" 
                          alt="" 
                          className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-all duration-300"
                          style={{
                            filter: isDarkMode ? 'brightness(0.8) contrast(1.2)' : 'invert(1) grayscale(100%) brightness(1.2)'
                          }}
                        />
                      </div>

                      {/* 진짜 지도 모양 위에 시군구 데이터 맵핑 */}
                      <div className="absolute inset-0 z-10">
                        {geoMap.map((loc) => {
                          const stats = cityStats[loc.id];
                          const isActive = !!stats;
                          
                          let bubbleSize = 28; 
                          if (isActive) {
                            const ratio = stats.units / maxCityUnits; 
                            bubbleSize = 32 + (ratio * 24); 
                          }
                          
                          return (
                            <div 
                              key={loc.id}
                              className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center group transition-all ${isActive ? 'cursor-pointer z-20 hover:z-[100]' : 'z-10 opacity-90'}`}
                              style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
                            >
                               {/* 마커 (동적 크기 적용) */}
                               <div className={`rounded-full flex flex-col items-center justify-center border-2 transition-all shadow-md ${isActive ? 'group-hover:scale-110' : ''}`}
                                    style={{ 
                                      width: `${bubbleSize}px`,
                                      height: `${bubbleSize}px`,
                                      background: isActive ? 'rgba(59, 130, 246, 0.95)' : 'var(--bg-main)',
                                      borderColor: isActive ? '#60A5FA' : 'var(--border)',
                                      color: isActive ? '#fff' : 'var(--text-dim)',
                                      boxShadow: isActive ? '0 10px 25px rgba(59,130,246,0.3)' : 'none'
                                    }}>
                                  <span className="font-extrabold" style={{ fontSize: isActive ? `${Math.max(11, bubbleSize * 0.22)}px` : '10px' }}>{loc.label}</span>
                                  {isActive && <span className="font-bold opacity-90 mt-[1px]" style={{ fontSize: `${Math.max(9, bubbleSize * 0.16)}px` }}>{stats.count}건</span>}
                               </div>

                               {/* 호버 툴팁 (Y좌표가 60 초과면 위로, 아니면 아래로 열림) */}
                               {isActive && (
                                 <div className={`absolute ${loc.y > 60 ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 -translate-x-1/2 w-max min-w-[140px] rounded-xl p-3.5 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none border`} style={{ background: 'var(--bg-header)', borderColor: 'var(--border)', backdropFilter: 'blur(16px)' }}>
                                   <p className="text-[14px] font-extrabold mb-3 pb-2 border-b flex items-center justify-between" style={{ color: '#3B82F6', borderColor: 'var(--border-light)' }}>
                                     <span>{loc.id} 상세</span>
                                     <span className="text-[10px] text-white bg-[#3B82F6] px-1.5 py-0.5 rounded ml-2">{stats.count}개 블록</span>
                                   </p>
                                   <div className="flex flex-col gap-2">
                                      <div className="flex items-center justify-between gap-5 text-[12px]">
                                        <span className="font-bold" style={{ color: 'var(--text-main)' }}>총 세대수</span>
                                        <span className="font-semibold" style={{ color: 'var(--text-dim)' }}>{stats.units.toLocaleString()}세대</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-5 text-[12px]">
                                        <span className="font-bold" style={{ color: 'var(--text-main)' }}>추정 사업비</span>
                                        <span className="font-semibold" style={{ color: 'var(--text-dim)' }}>{stats.budget.toLocaleString()}억원</span>
                                      </div>
                                   </div>
                                 </div>
                               )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. 시·군·구 분석 영역 (지도 박스와 높이 자동 맞춤 및 좌우 정렬 완벽 해결) */}
                <div className="rounded-2xl border p-6 flex flex-col transition-all overflow-hidden h-full" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
                  <div className="flex items-center justify-between mb-4 pb-4 border-b shrink-0" style={{ borderColor: 'var(--border-light)' }}>
                    <div className="flex items-center gap-2">
                      <Kanban size={22} style={{ color: '#00D287' }} strokeWidth={1.5} />
                      <h4 className="font-extrabold text-[18px] tracking-tight" style={{ color: 'var(--text-main)' }}>지역별 세대수 및 사업비 분석</h4>
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-8 overflow-y-auto scrollbar-hide">
                    
                    {/* 1. 세대수 비교 (세로 바 차트) */}
                    <div className="flex flex-col flex-1 shrink-0 min-h-[170px]">
                      <h5 className="text-[14px] font-bold mb-3 flex items-center gap-2 shrink-0" style={{ color: 'var(--text-main)' }}>
                         <span className="w-1.5 h-4 rounded-full" style={{ background: '#3B82F6' }}></span>
                         지역별 공급 세대수
                      </h5>
                      <div className="flex-1 flex items-end justify-between w-full overflow-x-auto scrollbar-hide pb-2 pt-10 px-2 border-b border-dashed relative" style={{ borderColor: 'var(--border-light)' }}>
                        {sortedCitiesByUnits.map(([city, stats], index) => {
                          const isTop3 = index < 3;
                          const heightPct = Math.max((stats.units / maxCityUnits) * 100, 3);
                          return (
                            <div key={city} className="flex flex-col items-center justify-end h-full min-w-[44px] group relative cursor-pointer">
                              <div className="w-8 rounded-t-md transition-all duration-700 ease-out opacity-80 group-hover:opacity-100 relative flex justify-center" 
                                   style={{ height: `${heightPct}%`, background: '#3B82F6' }}>
                                <span className="absolute bottom-full mb-1.5 text-[12px] font-extrabold whitespace-nowrap flex items-baseline gap-0.5" style={{ color: 'var(--text-main)' }}>
                                  {stats.units.toLocaleString()}<span className="text-[10px] font-semibold opacity-70">세대</span>
                                </span>
                              </div>
                              <span className="text-[13px] font-bold mt-2 whitespace-nowrap" style={{ color: isTop3 ? 'var(--text-main)' : 'var(--text-dim)' }}>
                                {city.replace('특별시', '').replace('광역시', '').replace('시', '')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. 추정 사업비 비교 (세로 바 차트) */}
                    <div className="flex flex-col flex-1 shrink-0 min-h-[170px]">
                      <h5 className="text-[14px] font-bold mb-3 flex items-center gap-2 shrink-0" style={{ color: 'var(--text-main)' }}>
                         <span className="w-1.5 h-4 rounded-full" style={{ background: '#00D287' }}></span>
                         지역별 추정 사업비
                      </h5>
                      <div className="flex-1 flex items-end justify-between w-full overflow-x-auto scrollbar-hide pb-2 pt-10 px-2 border-b border-dashed relative" style={{ borderColor: 'var(--border-light)' }}>
                        {sortedCitiesByBudget.map(([city, stats], index) => {
                          const isTop3 = index < 3;
                          const heightPct = Math.max((stats.budget / maxCityBudget) * 100, 3);
                          return (
                            <div key={city} className="flex flex-col items-center justify-end h-full min-w-[44px] group relative cursor-pointer">
                              <div className="w-8 rounded-t-md transition-all duration-700 ease-out opacity-80 group-hover:opacity-100 relative flex justify-center" 
                                   style={{ height: `${heightPct}%`, background: '#00D287' }}>
                                <span className="absolute bottom-full mb-1.5 text-[12px] font-extrabold whitespace-nowrap flex items-baseline gap-0.5" style={{ color: 'var(--text-main)' }}>
                                  {stats.budget.toLocaleString()}<span className="text-[10px] font-semibold opacity-70">억</span>
                                </span>
                              </div>
                              <span className="text-[13px] font-bold mt-2 whitespace-nowrap" style={{ color: isTop3 ? 'var(--text-main)' : 'var(--text-dim)' }}>
                                {city.replace('특별시', '').replace('광역시', '').replace('시', '')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            );
          })()}

          {activeMenu === 'list' && (
            <div className="rounded-2xl border overflow-hidden animate-fadeIn scrollbar-hide" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-left min-w-[900px] table-fixed">
                  <colgroup>
                    <col style={{ width: '8%' }} /> 
                    <col style={{ width: '18%' }} /> 
                    <col style={{ width: '9%' }} /> 
                    <col style={{ width: '14%' }} /> 
                    <col style={{ width: '10%' }} /> 
                    <col style={{ width: '9%' }} /> 
                    <col style={{ width: '32%' }} /> 
                  </colgroup>
                  <thead className="border-b" style={{ background: 'var(--table-header)', borderColor: 'var(--border-light)' }}>
                    <tr>
                      {['회차', '지구명 / 블록', '세대수', '유형', '규모', '추정 사업비', '컨소시엄 구성'].map(h => (
                        <th key={h} className="px-4 py-4 text-[12px] font-bold uppercase tracking-wider text-center whitespace-nowrap" style={{ color: 'var(--text-dim)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(groupedData).sort((a, b) => a.localeCompare(b, undefined, {numeric: true})).map(phase => {
                      const phaseItems = groupedData[phase];
                      const hasPMActive = phaseItems.some(p => p['진행상황'] === '진행중');
                      const hasPMDone = phaseItems.some(p => p['진행상황'] === '완료');

                      return phaseItems.map((item, i) => (
                        <tr
                          key={`${phase}-${i}`}
                          id={i === 0 ? `phase-${phase}` : undefined}
                          data-phase={phase} // 💡 추가: 모든 행에 data-phase 속성을 부여하여 한 번에 선택할 수 있게 함
                          onClick={() => setSelectedProject(item)}
                          className="cursor-pointer transition-all border-b hover-row"
                          style={{ borderColor: 'var(--border)' }}
                        >
                          {i === 0 && (
                            <td 
                              rowSpan={phaseItems.length} 
                              className="px-4 py-4 align-middle text-center border-r overflow-hidden"
                              style={{ borderColor: 'var(--border-light)', background: 'var(--bg-side)' }}
                            >
                              <div className="flex flex-col items-center justify-center gap-1.5">
                                {hasPMActive && <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-[#00D287] text-white animate-pulse shrink-0 shadow-sm">PM 진행중</span>}
                                {!hasPMActive && hasPMDone && <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-[#3B82F6] text-white shrink-0 shadow-sm">PM 완료</span>}
                                <span className="font-bold text-[14px] whitespace-nowrap" style={{ color: 'var(--text-main)' }}>{phase}</span>
                              </div>
                            </td>
                          )}
                          <td className="px-4 py-4 overflow-hidden text-center">
                            <div className="flex items-baseline justify-center gap-1.5 truncate">
                              <span className="font-semibold text-[14px] truncate" style={{ color: 'var(--text-main)' }}>
                                {item['지구명']}
                              </span>
                              <span className="text-[12px] font-medium uppercase shrink-0" style={{ color: 'var(--text-dim)' }}>
                                {item['블록']}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 font-bold text-[15px] text-center overflow-hidden truncate" style={{ color: '#3B82F6' }}>{item['세대수']}</td>
                          
                          <td className="px-4 py-4 text-center overflow-hidden truncate">
                            <span className="font-medium text-[13px]">{item['유형']}</span>
                          </td>
                          <td className="px-4 py-4 text-center overflow-hidden truncate">
                            <span className="font-medium text-[13px]">{item['주택규모']}</span>
                          </td>

                          <td className="px-4 py-4 font-semibold text-[14px] truncate text-center overflow-hidden">{item['사업비(추정)']}</td>
                          {i === 0 && (
                            <td 
                              rowSpan={phaseItems.length}
                              className="p-3 align-middle border-l overflow-hidden"
                              style={{ borderColor: 'var(--border-light)', background: 'var(--bg-side)', height: '1px' }}
                            >
                              <div className="w-full h-full">
                                {renderConsortium(item)}
                              </div>
                            </td>
                          )}
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 💡 aside 전체 스크롤(overflow-y-auto)을 제거하고 컨테이너로 변경 */}
      <aside className="w-[260px] shrink-0 flex flex-col border-l transition-colors" style={{ background: 'var(--bg-side)', borderColor: 'var(--border)' }}>
        <div className="px-5 pt-[52px] pb-1 shrink-0" style={{ WebkitAppRegion: 'drag' }}>
          <div className="flex items-center justify-between mb-1" style={{ WebkitAppRegion: 'no-drag' }}>
            <h4 className="text-[14px] font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full pulse-glow" style={{ background: '#EF4444', boxShadow: '0 0 6px #EF4444' }}></span>
              임박 마감 일정
            </h4>
          </div>
        </div>

        {/* 💡 실제 임박 마감 리스트가 들어가는 이 div에만 스크롤 속성 부여 */}
        <div className="flex-1 px-4 pt-2 pb-5 space-y-6 overflow-y-auto scrollbar-hide">
          {Object.entries(deadlineGroups).map(([key, list]) => {
            if (list.length === 0) return null;
            
            const isPast = key === 'lastWeek';
            const themeColor = key === 'thisWeek' ? '#EF4444' : key === 'nextWeek' ? '#3B82F6' : key === 'lastWeek' ? 'var(--text-dimmer)' : '#f59e0b';
            const mainTextColor = isPast ? 'var(--text-dim)' : 'var(--text-main)';
            
            return (
              <div key={key}>
                <h5 className="text-[13px] font-bold mb-3 flex items-center gap-2" style={{ color: themeColor }}>
                  <span className="w-[3px] h-[12px] rounded-full" style={{ background: themeColor }}></span>
                  {key === 'lastWeek' ? '최근 완료' : key === 'thisWeek' ? '금 주' : key === 'nextWeek' ? '차 주' : '이 후'}
                  <span className="ml-1 text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-card)', color: themeColor }}>{list.length}건</span>
                </h5>
                <div className="space-y-2.5">
                  {list.map((item, idx) => {
                    const eventDate = new Date(item.eventDate);
                    
                    const isPMActive = item.blocks.some(b => b.isPM && b.originalItem['진행상황'] === '진행중');
                    const isPMDone = item.blocks.some(b => b.isPM && b.originalItem['진행상황'] === '완료');
                    
                    const cardBg = isPMActive 
                      ? (isDarkMode ? 'rgba(0,210,135,0.08)' : 'rgba(0,210,135,0.03)')
                      : isPMDone
                        ? (isDarkMode ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.03)')
                        : 'var(--bg-card)';
                        
                    const cardBorderColor = isPMActive 
                      ? 'rgba(0,210,135,0.3)'
                      : isPMDone
                        ? 'rgba(59,130,246,0.3)'
                        : 'var(--border-light)';
                        
                    const leftIndicatorColor = isPMActive ? '#00D287' : (isPMDone ? '#3B82F6' : themeColor);

                    return (
                      <div 
                        key={idx} 
                        onClick={() => handleSidebarItemClick(item)}
                        className={`rounded-xl p-3.5 relative overflow-hidden border transition-all cursor-pointer hover:-translate-y-1 hover:shadow-lg ${isPMActive ? 'shadow-sm' : ''}`}
                        style={{ 
                          background: cardBg, 
                          borderColor: cardBorderColor, 
                          opacity: isPast ? 0.65 : 1 
                        }}
                      >
                        <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ background: leftIndicatorColor }}></div>
                        <div className="pl-2.5">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="text-center">
                                <p className="text-[12px] font-semibold" style={{ color: mainTextColor }}>{eventDate.getMonth() + 1}월</p>
                                <p className="text-[19px] font-bold leading-none mt-0.5" style={{ color: key === 'thisWeek' ? '#EF4444' : mainTextColor }}>{eventDate.getDate()}</p>
                              </div>
                            </div>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md" style={{ background: key === 'thisWeek' ? 'rgba(239,68,68,0.15)' : 'var(--label-bg)', color: key === 'thisWeek' ? '#EF4444' : 'var(--text-dim)' }}>
                              {item.dDay < 0 ? `D+${Math.abs(item.dDay)}` : `D-${item.dDay}`}
                            </span>
                          </div>
                          
                          <div className="mt-2 pl-1">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                              <p className="text-[14px] font-bold" style={{ color: mainTextColor }}>
                                <span className="mr-1" style={{ color: leftIndicatorColor }}>
                                  [{item.rounds && item.rounds.size > 1 ? `${Array.from(item.rounds).sort()[0]} 외` : (item.rounds && item.rounds.size === 1 ? Array.from(item.rounds)[0] : item['회차'])}]
                                </span> 
                                {item.eventName}
                              </p>
                              {isPMActive && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white pulse-glow" style={{ background: '#00D287' }}>PM진행중</span>}
                              {isPMDone && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white" style={{ background: '#3B82F6' }}>PM완료</span>}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <p className="text-[13px] font-medium truncate" style={{ color: mainTextColor }}>
                                • {item.blocks[0].name} <span className="text-[12px] ml-0.5 opacity-75" style={{ color: mainTextColor }}>{item.blocks[0].block}</span>
                                {item.blocks.length > 1 && (
                                  <span className="font-bold ml-1 opacity-80" style={{ color: 'var(--text-dim)' }}>외 {item.blocks.length - 1}BL</span>
                                )}
                              </p>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* 💡 하단 맨 위로 가기 고정 버튼 영역 추가 */}
        <div className="p-4 border-t shrink-0" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-side)', WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={() => {
              const scrollArea = document.getElementById('main-scroll-area');
              if (scrollArea) scrollArea.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-[13px] font-bold transition-all border hover:-translate-y-0.5 shadow-sm"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
          >
            <ChevronUp size={16} style={{ color: '#3B82F6' }} /> 맨 위로 가기
          </button>
        </div>
      </aside>

      {selectedGroupedEvents && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fadeIn"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelectedGroupedEvents(null)}
        >
          <div
            className="w-full max-w-sm rounded-[2rem] border p-6 relative shadow-2xl transition-colors max-h-[85vh] flex flex-col"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedGroupedEvents(null)}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full font-bold text-[15px] transition-all hover-bg"
              style={{ background: 'var(--btn-close)', color: 'var(--text-muted)' }}
            >
              ✕
            </button>
            
            <h3 className="text-[18px] font-bold mb-1" style={{ color: 'var(--text-main)' }}>해당 일정 사업 목록</h3>
            <p className="text-[13px] font-medium mb-5" style={{ color: 'var(--text-dim)' }}>
              {selectedGroupedEvents.eventName} ({selectedGroupedEvents.dateStr.split(' ')[0]})
            </p>

            <div className="flex flex-col gap-3 overflow-y-auto scrollbar-hide pb-2 pr-1">
              {Array.from(selectedGroupedEvents.rounds).sort().map(round => {
                const itemsInRound = selectedGroupedEvents.items.filter(item => item['회차'] === round);
                if (itemsInRound.length === 0) return null;
                
                const repItem = itemsInRound[0];
                const isPMActive = itemsInRound.some(i => i['진행상황'] === '진행중');
                const isPMDone = itemsInRound.some(i => i['진행상황'] === '완료');
                
                const cardBg = isPMActive ? (isDarkMode ? 'rgba(0,210,135,0.08)' : 'rgba(0,210,135,0.03)') : isPMDone ? (isDarkMode ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.03)') : 'var(--bg-main)';
                const cardBorderColor = isPMActive ? 'rgba(0,210,135,0.3)' : isPMDone ? 'rgba(59,130,246,0.3)' : 'var(--border-light)';
                
                let popupThemeColor = '#3B82F6';
                if (selectedGroupedEvents.dDay < 0) popupThemeColor = 'var(--text-dimmer)';
                else if (selectedGroupedEvents.dDay <= 7) popupThemeColor = '#EF4444';
                else if (selectedGroupedEvents.dDay > 14) popupThemeColor = '#f59e0b';
                
                const leftIndicatorColor = isPMActive ? '#00D287' : (isPMDone ? '#3B82F6' : popupThemeColor);

                return (
                  <div 
                    key={round}
                    onClick={() => {
                      setSelectedGroupedEvents(null); 
                      setSelectedProject(repItem);    
                    }}
                    className={`rounded-xl p-3.5 relative overflow-hidden border transition-all cursor-pointer hover:-translate-y-1 hover:shadow-lg ${isPMActive ? 'shadow-sm' : ''}`}
                    style={{ background: cardBg, borderColor: cardBorderColor }}
                  >
                    <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ background: leftIndicatorColor }}></div>
                    <div className="pl-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[14px] font-bold flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                          <span style={{ color: leftIndicatorColor }}>[{round}]</span> 
                          {selectedGroupedEvents.eventName}
                        </p>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md" style={{ background: 'var(--label-bg)', color: 'var(--text-dim)' }}>
                          {selectedGroupedEvents.dDay < 0 ? `D+${Math.abs(selectedGroupedEvents.dDay)}` : `D-${selectedGroupedEvents.dDay}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-2">
                        {isPMActive && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white pulse-glow" style={{ background: '#00D287' }}>PM진행중</span>}
                        {isPMDone && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white" style={{ background: '#3B82F6' }}>PM완료</span>}
                      </div>
                      <div className="mt-1 pl-0.5 flex flex-col gap-0.5">
                         <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-main)' }}>
                           • {itemsInRound[0]['지구명']} <span className="text-[12px] ml-0.5 opacity-75" style={{ color: 'var(--text-dim)' }}>{itemsInRound[0]['블록']}</span>
                           {itemsInRound.length > 1 && (
                             <span className="font-bold ml-1 opacity-80" style={{ color: 'var(--text-dim)' }}>외 {itemsInRound.length - 1}BL</span>
                           )}
                         </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {selectedProject && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 animate-fadeIn"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={() => {
            setSelectedProject(null);
            setIsDropdownOpen(false); // ✅ 모달 바깥 클릭 시 드롭다운도 닫기
          }}
        >
          <div
            className="w-full lg:w-fit max-w-[98vw] 2xl:max-w-[1850px] max-h-[90vh] overflow-y-auto rounded-[2.5rem] border p-6 md:p-8 relative shadow-2xl scrollbar-hide transition-colors mx-auto"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-light)' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedProject(null)}
              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full font-bold text-[15px] transition-all hover-bg z-50"
              style={{ background: 'var(--btn-close)', color: 'var(--text-muted)' }}
            >
              ✕
            </button>

            {(() => {
              const isProgress = selectedProject['진행상황'] === '진행중';
              const isDone = selectedProject['진행상황'] === '완료';
              const hasPM = isProgress || isDone;
              
              const accentColor = hasPM ? (isProgress ? '#00D287' : (isDarkMode ? '#60A5FA' : '#3B82F6')) : '#3B82F6';
              const accentBg = hasPM ? (isProgress ? 'rgba(0,210,135,0.15)' : 'rgba(59,130,246,0.15)') : 'transparent';
              
              const currentPhaseProjects = data.filter(item => item['회차'] === selectedProject['회차'] && item['연도'] === selectedProject['연도']);
              const allBlocksNames = currentPhaseProjects.map(p => `${p['지구명']}(${p['블록']})`).join(', ');
              
              const totalPhaseUnits = currentPhaseProjects.reduce((acc, project) => acc + (parseInt(String(project['세대수']).replace(/[^0-9]/g, '')) || 0), 0);
              const totalPhaseBudget = currentPhaseProjects.reduce((acc, project) => acc + (parseInt(String(project['사업비(추정)']).replace(/[^0-9]/g, '')) || 0), 0);

              return (
                <>
                  <div className="mb-6 border-b pb-6" style={{ borderColor: 'var(--border-light)' }}>
                    {hasPM && (
                      <span className="inline-block text-[11px] px-3 py-1.5 rounded-lg font-extrabold tracking-widest uppercase mb-3" style={{ color: accentColor, background: accentBg }}>
                        Project Management
                      </span>
                    )}
                    
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pr-8">
                      <div className="flex flex-col gap-4 shrink-0">
                        
                        {/* ✅ 1. 제목 및 자료실 버튼 묶음 */}
                        <div className="flex items-center gap-4 shrink-0 flex-wrap">
                          <div className="flex items-center gap-3 shrink-0">
                            <h3 className="text-[28px] font-bold tracking-tight whitespace-nowrap leading-none" style={{ color: 'var(--text-main)' }}>
                              [{selectedProject['회차']}]
                            </h3>
                            <p className="text-[17px] font-semibold break-keep leading-none pt-0.5" style={{ color: 'var(--text-main)' }}>
                              {allBlocksNames}
                            </p>
                          </div>

                          {/* ✅ 2. 자료실 드롭다운 영역 (변수명 isDropdownOpen으로 완벽 통일) */}
                          <div className="relative" style={{ zIndex: 60 }}>
                            <button
                              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all border shadow-sm hover-bg"
                              style={{ 
                                background: isDropdownOpen ? 'var(--label-bg)' : 'var(--bg-main)', 
                                borderColor: isDropdownOpen ? '#3B82F6' : 'var(--border-light)', 
                                color: isDropdownOpen ? '#3B82F6' : 'var(--text-main)' 
                              }}
                            >
                              <FolderOpen size={16} />
                              자료실
                              <ChevronDown className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} size={14} />
                            </button>

                            {isDropdownOpen && (
                              <div 
                                className="absolute top-full left-0 mt-2 w-56 rounded-xl border shadow-2xl py-1.5 overflow-hidden animate-fadeIn"
                                style={{ background: 'var(--bg-header)', borderColor: 'var(--border-light)', backdropFilter: 'blur(16px)' }}
                              >
                                {[
                                  { label: '공모지침서 1편', id: 'part1' },
                                  { label: '공모지침서 2편', id: 'part2' },
                                  { label: '개발계획서', id: 'dev' },
                                  { label: '재무계획서', id: 'fin' },
                                  { label: '재무첨부서류', id: 'fin-attach' }
                                ].map(file => (
                                  <button
                                    key={file.id}
                                    onClick={() => {
                                      const yearStr = String(selectedProject['연도'] || selectedYear).slice(-2);
                                      const roundStr = String(selectedProject['회차']).replace('차', '');
                                      
                                      const folderName = `lh-guide-${yearStr}-${roundStr}`;
                                      const fileName = `lh-${yearStr}-${roundStr}-${file.id}.pdf`;
                                      
                                      const supabaseUrl = 'https://imnlmnbvzmeihzbbheaa.supabase.co'; 
                                      const fileUrl = `${supabaseUrl}/storage/v1/object/public/lh-document/${folderName}/${fileName}`;
                                      
                                      window.open(fileUrl, '_blank');
                                      setIsDropdownOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-[13px] font-semibold flex items-center justify-between hover-bg transition-colors group"
                                    style={{ color: 'var(--text-main)' }}
                                  >
                                    <span>{selectedProject['회차']} {file.label}</span>
                                    <Download className="opacity-0 group-hover:opacity-100 transition-opacity" size={14} color="#3B82F6" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ✅ 3. 담당자 박스를 bg-main으로 눌러서 입체감 부여 */}
                        <div className={`flex flex-wrap items-center gap-4 rounded-xl px-5 py-2.5 border w-fit shrink-0 ${!hasPM ? 'opacity-50' : ''}`} style={{ background: 'var(--bg-main)', borderColor: 'var(--border-light)' }}>
                          {[
                            { label: '담당팀', value: hasPM ? (selectedProject['PM팀'] || '미정') : '-' },
                            { label: '담당자', value: hasPM ? (selectedProject['담당자'] || '미정') : '-' },
                            { label: '팀원', value: hasPM ? (selectedProject['팀원'] || '-') : '-' },
                          ].map((f, idx) => (
                            <div key={f.label} className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <span className="text-[12px] font-medium whitespace-nowrap" style={{ color: 'var(--text-dim)' }}>{f.label}:</span>
                                <span className={`text-[13px] font-bold whitespace-nowrap ${!hasPM ? 'invisible' : ''}`} style={{ color: hasPM ? accentColor : 'var(--text-dimmer)' }}>
                                  {f.value}
                                </span>
                              </div>
                              {idx !== 2 && <div className="w-px h-3" style={{ background: 'var(--border-light)' }}></div>}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="w-full xl:w-[500px] shrink-0 flex items-stretch">
                        {renderConsortium(selectedProject, false)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-6 xl:gap-8 mt-8">
                    
                    {/* ✅ [상세 일정] 박스 */}
                    <div className="animate-fadeInUp w-full lg:w-[280px] xl:w-[320px] shrink-0 flex flex-col">
                      <div className="flex items-center gap-2 mb-4 px-1 shrink-0">
                        <div className="w-1.5 h-4 rounded-full" style={{ background: '#00D287' }}></div>
                        <h4 className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>상세 일정</h4>
                      </div>
                      
                      {/* ✅ 박스 배경을 bg-main(더 어두운 톤)으로 교체 */}
                      <div className="border rounded-[2.5rem] p-6 lg:p-8 shadow-inner flex-1 flex flex-col" style={{ background: 'var(--bg-main)', borderColor: 'var(--border-light)' }}>
                        <div className="relative flex flex-col justify-between flex-1 gap-6">
                          <div className="absolute top-2 bottom-2 left-[7px] border-l-2 border-dashed z-0" style={{ borderColor: 'var(--border-light)' }}></div>
                          
                          {milestoneTypes.map(ms => {
                            const dateStr = selectedProject[ms.key];
                            const date = parseDate(dateStr);
                            const dDay = date ? Math.ceil((date.getTime() - today.getTime()) / 86400000) : null;
                            
                            return (
                              <div key={ms.key} className="relative flex items-center justify-between group z-10 gap-2">
                                <div className="flex items-center gap-4 min-w-0">
                                  <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--bg-main)' }}>
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: ms.color, boxShadow: `0 0 8px ${ms.color}80` }}></div>
                                  </div>
                                  <span className="text-[15px] font-semibold whitespace-nowrap" style={{ color: 'var(--text-main)' }}>{ms.label}</span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-[15px] font-bold whitespace-nowrap" style={{ color: 'var(--text-main)' }}>{dateStr ? dateStr.split(' ')[0] : '-'}</span>
                                  {dDay !== null && (
                                    /* ✅ D-Day 뱃지 텍스트와 배경색 세련되게 수정 */
                                    <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-md whitespace-nowrap shadow-sm" style={{ 
                                      background: dDay < 0 ? 'var(--label-bg)' : (isDarkMode ? 'rgba(96,165,250,0.15)' : 'rgba(59,130,246,0.15)'), 
                                      color: dDay < 0 ? 'var(--text-dim)' : (isDarkMode ? '#60A5FA' : '#3B82F6'),
                                      border: dDay < 0 ? '1px solid var(--border-light)' : 'none'
                                    }}>
                                      {dDay < 0 ? `D+${Math.abs(dDay)}` : dDay === 0 ? 'D-Day' : `D-${dDay}`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* ✅ [사업 정보] 박스 */}
                    <div className="animate-fadeInUp flex-1 min-w-[300px] flex flex-col" style={{ animationDelay: '0.1s' }}>
                      <div className="flex items-center gap-2 mb-4 px-1 shrink-0">
                        <div className="w-1.5 h-4 rounded-full" style={{ background: '#f59e0b' }}></div>
                        <h4 className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>사업 정보</h4>
                      </div>
                      
                      {/* ✅ 박스 배경을 bg-main(더 어두운 톤)으로 교체 */}
                      <div className="border rounded-[2.5rem] p-6 lg:p-8 shadow-inner flex-1 flex flex-col overflow-y-auto scrollbar-hide" style={{ background: 'var(--bg-main)', borderColor: 'var(--border-light)' }}>
                        
                        {/* ✅ 앞서 수정한 간격 꽉 채우기 (items-stretch) 속성 유지! */}
                        <div className="flex flex-row gap-6 xl:gap-8 overflow-x-auto flex-1 pb-2 scrollbar-hide items-stretch">
                          {currentPhaseProjects.map((project, projIdx) => (
                            <div key={projIdx} className="flex flex-col flex-1 min-w-[220px] h-full">
                              <h5 className="text-[15px] font-bold mb-4 flex items-center justify-between gap-2 shrink-0 border-b pb-3" style={{ borderColor: 'var(--border-light)' }}>
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#f59e0b' }}></div>
                                  <span className="truncate" style={{ color: 'var(--text-main)' }}>{project['지구명']} <span className="text-[13px] font-semibold" style={{ color: 'var(--text-dim)' }}>{project['블록']}</span></span>
                                </div>
                                <span className="text-[11px] font-semibold truncate text-right ml-2" style={{ color: 'var(--text-dim)' }}>{project['유형']}</span>
                              </h5>
                              
                              <div className="flex flex-col flex-1 justify-between h-full pl-1 pb-2">
                                {[
                                  { label: '세대수', value: `${project['세대수']}` },
                                  { label: '추정 사업비', value: project['사업비(추정)'] },
                                  { label: '주택 규모', value: project['주택규모'] },
                                  { label: '착공 예정', value: project['착공예정'] },
                                  { label: '사업 종료', value: project['사업종료'] },
                                ].map((f) => (
                                  <div key={f.label} className="flex items-center justify-between gap-2 py-2.5">
                                    {/* ✅ 라벨(dim), 텍스트(main) 색상 대비 강화 */}
                                    <span className="text-[13px] font-medium shrink-0" style={{ color: 'var(--text-dim)' }}>{f.label}</span>
                                    <span className="text-[14px] font-bold truncate text-right" style={{ color: 'var(--text-main)' }}>
                                      {f.value || '-'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 pt-5 flex items-center justify-end gap-5 border-t shrink-0" style={{ borderColor: 'var(--border-light)' }}>
                          <div className="flex items-center gap-2.5">
                            <span className="text-[13px] font-medium" style={{ color: 'var(--text-dim)' }}>총 세대수</span>
                            <span className="text-[15px] font-extrabold" style={{ color: 'var(--text-main)' }}>{totalPhaseUnits.toLocaleString()}세대</span>
                          </div>
                          <div className="w-px h-3.5" style={{ background: 'var(--border-light)' }}></div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-[13px] font-medium" style={{ color: 'var(--text-dim)' }}>총 사업비</span>
                            <span className="text-[15px] font-extrabold" style={{ color: 'var(--text-main)' }}>{totalPhaseBudget.toLocaleString()}억</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ✅ [사업 진행상황] 박스 */}
                    {hasPM && (
                      <div className="animate-fadeInUp w-full lg:w-[280px] xl:w-[320px] shrink-0 flex flex-col" style={{ animationDelay: '0.2s' }}>
                        <div className="flex items-center gap-2 mb-4 px-1 shrink-0">
                          <div className="w-1.5 h-4 rounded-full" style={{ background: accentColor }}></div>
                          <h4 className="text-[15px] font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                            사업 진행상황
                          </h4>
                        </div>
                        
                        {/* ✅ 박스 배경을 bg-main(더 어두운 톤)으로 교체 */}
                        <div className="border rounded-[2.5rem] p-6 lg:p-8 shadow-inner flex-1 flex flex-col" style={{ background: 'var(--bg-main)', borderColor: 'var(--border-light)' }}>
                          <div className="flex flex-col flex-1">
                            {['합사 투입', 'PQ목록 배포', 'PQ스캔본 취합', 'PQ원본 취합', '날인 예정', '인쇄소 투입'].map((field, idx, arr) => {
                              const val = selectedProject[field];
                              let isHighlighted = !!val && val !== '대기중' && val !== '미정';
                              
                              if (isHighlighted && val) {
                                const d = parseDate(val);
                                if (d && d.getTime() > today.getTime()) {
                                  isHighlighted = false;
                                }
                              }

                              return (
                                <div key={field} className={`flex flex-col ${idx !== arr.length - 1 ? 'flex-1' : ''}`}>
                                  <div className="flex justify-between items-center group gap-2 w-full shrink-0">
                                    <span className="font-semibold text-[14px] tracking-tight whitespace-nowrap" style={{ color: isHighlighted ? 'var(--text-main)' : 'var(--text-dim)' }}>{field}</span>
                                    
                                    {/* ✅ 버튼(Badge) 스타일링 고급화 (진행: 은은한 글로우, 대기: 음각 버튼 느낌) */}
                                    <span 
                                      style={isHighlighted 
                                        ? { background: accentColor, color: 'white', borderColor: 'transparent', boxShadow: `0 4px 14px ${accentColor}40` } 
                                        : { background: 'var(--label-bg)', color: 'var(--text-dimmer)', borderColor: 'var(--border-light)' }
                                      } 
                                      className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all border whitespace-nowrap`}
                                    >
                                      {val || '대기중'}
                                    </span>
                                  </div>
                                  
                                  {idx !== arr.length - 1 && (
                                    <div className="flex-1 flex items-center w-full min-h-[1rem] relative">
                                      <div className="w-full border-b border-dashed absolute top-1/2 left-0 -translate-y-1/2" style={{ borderColor: 'var(--border-light)' }}></div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}