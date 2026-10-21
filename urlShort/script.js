/**
 * URLShort - Smart URL Shortener Client Script
 * 
 * 기능:
 * 1. 입력 필드 감지: 비어 있으면 '단축하기' 버튼 비활성화 (3-2)
 * 2. '단축하기' 클릭 시 OpenAPI(is.gd, v.gd) 호출 및 읽기 전용 출력 상자에 결과 표시 (3-1, 3-3)
 * 3. '복사' 버튼 클릭 시 클립보드 자동 복사 및 '복사하였습니다' 알림창 표시 (3-4)
 * 4. 마우스 반응형 인터랙티브 그라데이션 일관성 유지
 * 5. 최근 단축 링크 로컬스토리지 저장 및 QR코드 변환 연동
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM 요소 참조
  const urlInput = document.getElementById('url-input');
  const btnShorten = document.getElementById('btn-shorten');
  const btnText = document.getElementById('btn-text');
  const btnClear = document.getElementById('btn-clear');
  const btnPaste = document.getElementById('btn-paste');
  const fieldHint = document.getElementById('field-hint');

  const resultContainer = document.getElementById('result-container');
  const outputUrl = document.getElementById('output-url');
  const btnCopy = document.getElementById('btn-copy');
  const btnVisitShort = document.getElementById('btn-visit-short');
  const btnCreateQr = document.getElementById('btn-create-qr');

  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  const sampleTags = document.querySelectorAll('.sample-tag');

  const historyList = document.getElementById('history-list');
  const btnClearHistory = document.getElementById('btn-clear-history');

  let currentShortUrl = '';
  let toastTimer = null;
  const STORAGE_KEY = 'urlshort_history_v1';

  // =========================================================================
  // 1. 마우스 인터랙티브 다이내믹 그라데이션 (부드러운 Lerp 보간)
  // =========================================================================
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;

  window.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
  });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      targetX = e.touches[0].clientX;
      targetY = e.touches[0].clientY;
    }
  }, { passive: true });

  function updateDynamicGradient() {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;

    const width = window.innerWidth || 1920;
    const height = window.innerHeight || 1080;
    const normX = Math.max(0, Math.min(1, currentX / width));
    const normY = Math.max(0, Math.min(1, currentY / height));

    const centerX = width / 2;
    const centerY = height / 2;
    const rad = Math.atan2(currentY - centerY, currentX - centerX);
    let deg = Math.round(rad * (180 / Math.PI)) + 90;
    if (deg < 0) deg += 360;

    const hue1 = Math.round(36 + (normX * 18 - 9) + (normY * 10));
    const hue2 = Math.round(20 + (normY * 20) + (normX * 12));

    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--mouse-x', `${currentX.toFixed(1)}px`);
    rootStyle.setProperty('--mouse-y', `${currentY.toFixed(1)}px`);
    rootStyle.setProperty('--mouse-deg', `${deg}deg`);
    rootStyle.setProperty('--dynamic-accent-1', `hsla(${hue1}, 96%, 74%, 0.45)`);
    rootStyle.setProperty('--dynamic-accent-2', `hsla(${hue2}, 92%, 82%, 0.4)`);

    requestAnimationFrame(updateDynamicGradient);
  }
  requestAnimationFrame(updateDynamicGradient);

  // =========================================================================
  // 2. 알림창 (Toast Notification) 제어 (3-4)
  // =========================================================================
  function showToast(message, isError = false) {
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    toastMessage.textContent = message;

    const toastIcon = document.getElementById('toast-icon');
    if (isError) {
      toast.style.borderColor = '#ef4444';
      toast.style.boxShadow = '0 16px 35px -8px rgba(239, 68, 68, 0.25)';
      if (toastIcon) toastIcon.style.background = '#ef4444';
    } else {
      toast.style.borderColor = 'rgba(245, 184, 0, 0.6)';
      toast.style.boxShadow = '0 16px 35px -8px rgba(180, 130, 20, 0.25)';
      if (toastIcon) toastIcon.style.background = '#10b981';
    }

    toast.classList.add('show');
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // =========================================================================
  // 3. 입력 필드 감지 및 버튼 활성화/비활성화 처리 (3-2)
  // =========================================================================
  function updateButtonState() {
    const rawValue = urlInput.value.trim();
    if (rawValue.length > 0) {
      btnShorten.disabled = false;
      btnShorten.removeAttribute('title');
      fieldHint.innerHTML = `<span class="hint-dot" style="background:#10b981;"></span>단축할 준비가 되었습니다. [Enter] 또는 '단축하기'를 누르세요.`;
    } else {
      btnShorten.disabled = true;
      btnShorten.setAttribute('title', '단축할 URL을 먼저 입력해주세요');
      fieldHint.innerHTML = `<span class="hint-dot"></span>웹 주소를 입력하면 '단축하기' 버튼이 활성화됩니다.`;
    }
  }

  // 입력 이벤트 실시간 반영
  urlInput.addEventListener('input', updateButtonState);
  urlInput.addEventListener('change', updateButtonState);

  // =========================================================================
  // 4. URL 정규화 헬퍼 (https:// 자동 부가)
  // =========================================================================
  function normalizeUrl(input) {
    let trimmed = input.trim();
    if (!trimmed) return '';

    // 프로토콜이 없는 경우 https:// 자동 보정
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = 'https://' + trimmed;
    }
    return trimmed;
  }

  // =========================================================================
  // 5. OpenAPI URL 단축 요청 및 결과 처리 (3-1, 3-3)
  // =========================================================================
  async function shortenUrl() {
    const rawVal = urlInput.value.trim();
    if (!rawVal) {
      showToast('단축할 URL을 입력해주세요.', true);
      urlInput.focus();
      return;
    }

    const targetUrl = normalizeUrl(rawVal);

    // 기본 URL 형식 유효성 검사
    try {
      new URL(targetUrl);
    } catch (e) {
      showToast('올바른 URL 형식(예: https://example.com)을 입력해주세요.', true);
      return;
    }

    // UI 로딩 상태 전환
    setLoadingState(true);

    let shortened = '';
    let usedApi = '';

    try {
      // 1차 시도: is.gd OpenAPI (CORS 및 JSON 반환 완벽 지원)
      try {
        const isgdUrl = `https://is.gd/create.php?format=json&url=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(isgdUrl);
        if (res.ok) {
          const data = await res.json();
          if (data && data.shorturl) {
            shortened = data.shorturl;
            usedApi = 'is.gd';
          } else if (data && data.errormessage) {
            throw new Error(data.errormessage);
          }
        }
      } catch (err) {
        console.warn('is.gd API 요청 실패, v.gd로 백업 시도:', err);
      }

      // 2차 백업 시도: v.gd OpenAPI
      if (!shortened) {
        const vgdUrl = `https://v.gd/create.php?format=json&url=${encodeURIComponent(targetUrl)}`;
        const res2 = await fetch(vgdUrl);
        if (res2.ok) {
          const data2 = await res2.json();
          if (data2 && data2.shorturl) {
            shortened = data2.shorturl;
            usedApi = 'v.gd';
          } else if (data2 && data2.errormessage) {
            throw new Error(data2.errormessage);
          }
        }
      }

      if (!shortened) {
        throw new Error('OpenAPI 서비스 응답이 없습니다. 잠시 후 다시 시도해주세요.');
      }

      // 단축 성공 처리
      currentShortUrl = shortened;
      outputUrl.value = shortened;
      resultContainer.classList.add('show');

      // 단축 결과로 스크롤
      resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      // 로컬 스토리지에 히스토리 저장
      saveToHistory(targetUrl, shortened);

      showToast(`URL 단축이 완료되었습니다! (${usedApi})`);

    } catch (error) {
      console.error('URL 단축 처리 중 오류:', error);
      showToast(`단축 실패: ${error.message || '네트워크 상태를 확인해주세요.'}`, true);
    } finally {
      setLoadingState(false);
    }
  }

  function setLoadingState(isLoading) {
    if (isLoading) {
      btnShorten.classList.add('is-loading');
      btnShorten.disabled = true;
      btnText.textContent = '단축 중...';
    } else {
      btnShorten.classList.remove('is-loading');
      btnText.textContent = '단축하기';
      updateButtonState();
    }
  }

  // 폼 서밋 / 단축하기 버튼 클릭 / Enter 키 이벤트 연동
  btnShorten.addEventListener('click', (e) => {
    e.preventDefault();
    if (!btnShorten.disabled) {
      shortenUrl();
    }
  });

  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!btnShorten.disabled) {
        shortenUrl();
      }
    }
  });

  // =========================================================================
  // 6. 복사 버튼 및 클립보드 복사 ('복사하였습니다' 알림창) (3-4)
  // =========================================================================
  btnCopy.addEventListener('click', async () => {
    const copyTarget = outputUrl.value.trim() || currentShortUrl;
    if (!copyTarget) {
      showToast('복사할 단축 URL이 없습니다.', true);
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(copyTarget);
      } else {
        // Fallback for older browsers
        outputUrl.select();
        document.execCommand('copy');
      }
      // 요구사항 3-4: '복사하였습니다' 알림창 표시
      showToast('복사하였습니다');
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
      // 대체 선택
      outputUrl.select();
      showToast('복사하였습니다');
    }
  });

  // 보조 기능: 새 창에서 열기
  btnVisitShort.addEventListener('click', () => {
    if (!currentShortUrl) return;
    window.open(currentShortUrl, '_blank', 'noopener,noreferrer');
  });

  // 보조 기능: QR코드로 변환하기 (url2qr/index.html로 링크 파라미터 전달)
  btnCreateQr.addEventListener('click', () => {
    if (!currentShortUrl) return;
    window.location.href = `../url2qr/index.html?url=${encodeURIComponent(currentShortUrl)}`;
  });

  // 도구 버튼: 지우기
  btnClear.addEventListener('click', () => {
    urlInput.value = '';
    updateButtonState();
    urlInput.focus();
  });

  // 도구 버튼: 클립보드 붙여넣기
  btnPaste.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        urlInput.value = text.trim();
        updateButtonState();
        urlInput.focus();
        showToast('클립보드 주소를 붙여넣었습니다.');
      } else {
        showToast('클립보드가 비어있습니다.', true);
      }
    } catch (err) {
      showToast('클립보드 읽기 권한을 허용해주세요.', true);
    }
  });

  // 예시 샘플 태그 클릭
  sampleTags.forEach(tag => {
    tag.addEventListener('click', () => {
      const sample = tag.getAttribute('data-url');
      if (sample) {
        urlInput.value = sample;
        updateButtonState();
        shortenUrl();
      }
    });
  });

  // =========================================================================
  // 7. 최근 단축 링크 기록 (LocalStorage) 관리
  // =========================================================================
  function loadHistory() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  function saveToHistory(orig, short) {
    let history = loadHistory();
    // 중복 제거
    history = history.filter(item => item.short !== short);
    history.unshift({
      orig,
      short,
      createdAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    });
    // 최대 10개 보관
    if (history.length > 10) history = history.slice(0, 10);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    renderHistory();
  }

  function renderHistory() {
    const history = loadHistory();
    if (!history || history.length === 0) {
      historyList.innerHTML = `<div class="history-empty">아직 단축한 링크 기록이 없습니다.</div>`;
      return;
    }

    historyList.innerHTML = history.map(item => `
      <div class="history-item">
        <div class="history-urls">
          <a href="${item.short}" target="_blank" rel="noopener noreferrer" class="history-short-link" title="${item.short}">${item.short}</a>
          <span class="history-orig-link" title="${item.orig}">${item.orig}</span>
        </div>
        <div class="history-actions">
          <button type="button" class="history-btn copy-hist-btn" data-url="${item.short}">복사</button>
          <button type="button" class="history-btn qr-hist-btn" data-url="${item.short}">QR</button>
        </div>
      </div>
    `).join('');

    // 히스토리 개별 복사 버튼
    historyList.querySelectorAll('.copy-hist-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const urlToCopy = btn.getAttribute('data-url');
        if (urlToCopy) {
          try {
            await navigator.clipboard.writeText(urlToCopy);
            showToast('복사하였습니다');
          } catch (e) {
            showToast('복사에 실패했습니다.', true);
          }
        }
      });
    });

    // 히스토리 개별 QR 변환 버튼
    historyList.querySelectorAll('.qr-hist-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const urlForQr = btn.getAttribute('data-url');
        if (urlForQr) {
          window.location.href = `../url2qr/index.html?url=${encodeURIComponent(urlForQr)}`;
        }
      });
    });
  }

  btnClearHistory.addEventListener('click', () => {
    if (confirm('최근 단축 기록을 모두 삭제하시겠습니까?')) {
      localStorage.removeItem(STORAGE_KEY);
      renderHistory();
      showToast('단축 기록이 삭제되었습니다.');
    }
  });

  // =========================================================================
  // 8. 페이지 초기화
  // =========================================================================
  updateButtonState();
  renderHistory();
  urlInput.focus();
});
