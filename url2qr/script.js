/**
 * URL2QR - QR Code Generator Script
 * 기능:
 * 1. 로고 클릭 시 초기 상태 리셋
 * 2. URL 입력 후 확인 시: URL 입력창 하단 슬라이드 다운 + 중앙 고화질 QR 코드 생성
 * 3. QR코드 카드 또는 다운로드 버튼 클릭 시 고화질 JPG 파일로 저장
 * 4. 마우스 커서 위치에 따른 실시간 인터랙티브 그라데이션 색상/각도 변화
 * 5. 클립보드 복사, 붙여넣기, 새 창 열기 등 다양한 편의 기능
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM 요소 선택
  const inputDock = document.getElementById('input-dock');
  const urlForm = document.getElementById('url-form');
  const urlInput = document.getElementById('url-input');
  const btnSubmit = document.getElementById('btn-submit');
  const btnClear = document.getElementById('btn-clear');
  const btnPaste = document.getElementById('btn-paste');
  const qrResultSection = document.getElementById('qr-result-section');
  const qrCard = document.getElementById('qr-card');
  const qrcodeBox = document.getElementById('qrcode-box');
  const qrUrlText = document.getElementById('qr-url-text');
  const btnDownloadJpg = document.getElementById('btn-download-jpg');
  const btnCopyLink = document.getElementById('btn-copy-link');
  const btnVisitUrl = document.getElementById('btn-visit-url');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  const logoBtn = document.getElementById('logo-btn');
  const sampleTags = document.querySelectorAll('.sample-tag');

  let currentUrl = '';
  let qrCodeInstance = null;
  let toastTimer = null;

  // =========================================================================
  // 1. 마우스 커서 인터랙티브 동적 그라데이션 (부드러운 Lerp 보간)
  // =========================================================================
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;
  let isMouseMoving = false;

  window.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
    isMouseMoving = true;
  });

  // 터치 디바이스 지원
  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      targetX = e.touches[0].clientX;
      targetY = e.touches[0].clientY;
      isMouseMoving = true;
    }
  }, { passive: true });

  function updateDynamicGradient() {
    // 부드러운 스프링/보간 추적 (Lerp)
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;

    const width = window.innerWidth || 1920;
    const height = window.innerHeight || 1080;

    // 화면 비율 (0.0 ~ 1.0)
    const normX = Math.max(0, Math.min(1, currentX / width));
    const normY = Math.max(0, Math.min(1, currentY / height));

    // 중앙 기준 각도 계산
    const centerX = width / 2;
    const centerY = height / 2;
    const rad = Math.atan2(currentY - centerY, currentX - centerX);
    let deg = Math.round(rad * (180 / Math.PI)) + 90;
    if (deg < 0) deg += 360;

    // 로고 옐로우(#F5B800, Hue ~44)와 어우러지는 화사하고 밝은 톤의 Hue 계산
    // 마우스 X에 따라 골드(48) ~ 웜 앰버(34)
    // 마우스 Y에 따라 피치 오렌지(24) ~ 썬플라워 옐로우(52)
    const hue1 = Math.round(36 + (normX * 18 - 9) + (normY * 10)); // 32 ~ 55
    const hue2 = Math.round(20 + (normY * 20) + (normX * 12));     // 20 ~ 52

    // CSS Custom Properties 업데이트
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--mouse-x', `${currentX.toFixed(1)}px`);
    rootStyle.setProperty('--mouse-y', `${currentY.toFixed(1)}px`);
    rootStyle.setProperty('--mouse-deg', `${deg}deg`);

    // 밝고 뽀송한 파스텔 옐로우 & 웜 코랄/피치 그라데이션 색조
    rootStyle.setProperty('--dynamic-accent-1', `hsla(${hue1}, 96%, 74%, 0.45)`);
    rootStyle.setProperty('--dynamic-accent-2', `hsla(${hue2}, 92%, 82%, 0.4)`);

    requestAnimationFrame(updateDynamicGradient);
  }

  // 애니메이션 루프 시작
  requestAnimationFrame(updateDynamicGradient);

  // =========================================================================
  // 2. 알림 토스트 함수
  // =========================================================================
  function showToast(message, isError = false) {
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    toastMessage.textContent = message;
    if (isError) {
      toast.style.borderColor = '#ef4444';
      toast.style.boxShadow = '0 16px 35px -8px rgba(239, 68, 68, 0.25)';
    } else {
      toast.style.borderColor = 'rgba(245, 184, 0, 0.6)';
      toast.style.boxShadow = '0 16px 35px -8px rgba(180, 130, 20, 0.25)';
    }

    toast.classList.add('show');
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // =========================================================================
  // 3. URL 정규화
  // =========================================================================
  function normalizeUrl(input) {
    let trimmed = input.trim();
    if (!trimmed) return '';

    // 프로토콜이 없는 경우 https:// 자동 보완
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = 'https://' + trimmed;
    }
    return trimmed;
  }

  // =========================================================================
  // 4. QR 코드 생성 및 화면 전환
  // =========================================================================
  function generateQRCode() {
    const rawVal = urlInput.value.trim();
    if (!rawVal) {
      const card = document.querySelector('.url-input-card');
      card.classList.add('shake-error');
      setTimeout(() => card.classList.remove('shake-error'), 450);
      urlInput.focus();
      showToast('생성할 웹사이트 주소를 입력해주세요.', true);
      return;
    }

    const formattedUrl = normalizeUrl(rawVal);
    currentUrl = formattedUrl;
    urlInput.value = formattedUrl;

    // 컨테이너 초기화
    qrcodeBox.innerHTML = '';

    try {
      // QRCode.js 인스턴스 생성 (240x240, 고품질 H 레벨)
      qrCodeInstance = new QRCode(qrcodeBox, {
        text: formattedUrl,
        width: 240,
        height: 240,
        colorDark: '#111827',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });

      qrUrlText.textContent = formattedUrl;
      qrUrlText.title = formattedUrl;

      // 중앙 -> 하단 슬라이드 전환
      transitionToGeneratedState();

    } catch (err) {
      console.error('QR코드 생성 오류:', err);
      showToast('QR 코드 생성에 실패했습니다.', true);
    }
  }

  function transitionToGeneratedState() {
    if (inputDock.classList.contains('is-centered')) {
      inputDock.classList.remove('is-centered');
      inputDock.classList.add('is-bottom');
    }

    setTimeout(() => {
      qrResultSection.classList.add('active');
    }, 120);
  }

  function resetToInitialState() {
    qrResultSection.classList.remove('active');
    setTimeout(() => {
      inputDock.classList.remove('is-bottom');
      inputDock.classList.add('is-centered');
      urlInput.value = '';
      currentUrl = '';
      qrcodeBox.innerHTML = '';
      urlInput.focus();
    }, 180);
    showToast('초기 화면으로 재설정되었습니다.');
  }

  // =========================================================================
  // 5. [핵심 기능]: QR 코드 클릭 시 고화질 JPG 파일 다운로드
  // =========================================================================
  function downloadQRAsJPG() {
    if (!currentUrl) {
      showToast('생성된 QR 코드가 없습니다.', true);
      return;
    }

    const canvas = qrcodeBox.querySelector('canvas');
    const img = qrcodeBox.querySelector('img');

    if (!canvas && !img) {
      showToast('QR 코드 이미지를 찾을 수 없습니다.', true);
      return;
    }

    // 800x800 고해상도 백그라운드 캔버스
    const exportSize = 800;
    const padding = 80;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = exportSize;
    offCanvas.height = exportSize;
    const ctx = offCanvas.getContext('2d');

    if (!ctx) {
      showToast('캔버스를 생성할 수 없습니다.', true);
      return;
    }

    // 1. JPEG는 투명 채널이 없으므로 깔끔한 화이트 배경 채움 (검은 배경 방지)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, exportSize, exportSize);

    // 2. QR 코드 렌더링 및 다운로드 링크 발동
    const executeDownload = (sourceElement) => {
      try {
        ctx.drawImage(sourceElement, padding, padding, exportSize - padding * 2, exportSize - padding * 2);

        // JPG 품질 0.95
        const jpgDataUrl = offCanvas.toDataURL('image/jpeg', 0.95);

        let domainSlug = 'qrcode';
        try {
          const parsed = new URL(currentUrl);
          domainSlug = parsed.hostname.replace(/[^a-zA-Z0-9]/g, '_');
        } catch (e) {
          domainSlug = 'qrcode';
        }

        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const filename = `${domainSlug}_${timestamp}.jpg`;

        const downloadLink = document.createElement('a');
        downloadLink.href = jpgDataUrl;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        showToast(`'${filename}' JPG 파일로 다운로드되었습니다!`);
      } catch (e) {
        console.error('다운로드 오류:', e);
        showToast('JPG 다운로드 처리 중 오류가 발생했습니다.', true);
      }
    };

    if (canvas) {
      executeDownload(canvas);
    } else if (img && img.complete) {
      executeDownload(img);
    } else if (img) {
      img.onload = () => executeDownload(img);
    }
  }

  // =========================================================================
  // 6. 이벤트 리스너
  // =========================================================================

  // 확인 버튼 및 폼 제출
  urlForm.addEventListener('submit', (e) => {
    e.preventDefault();
    generateQRCode();
  });

  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      generateQRCode();
    }
  });

  // QR 카드 클릭 시 JPG 다운로드
  qrCard.addEventListener('click', (e) => {
    e.preventDefault();
    downloadQRAsJPG();
  });

  qrCard.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      downloadQRAsJPG();
    }
  });

  // 다운로드 보조 버튼
  btnDownloadJpg.addEventListener('click', (e) => {
    e.stopPropagation();
    downloadQRAsJPG();
  });

  // URL 복사
  btnCopyLink.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!currentUrl) return;
    try {
      await navigator.clipboard.writeText(currentUrl);
      showToast('URL이 클립보드에 복사되었습니다.');
    } catch (err) {
      showToast('클립보드 복사에 실패했습니다.', true);
    }
  });

  // 새 창에서 열기
  btnVisitUrl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!currentUrl) return;
    window.open(currentUrl, '_blank', 'noopener,noreferrer');
  });

  // 지우기
  btnClear.addEventListener('click', () => {
    urlInput.value = '';
    urlInput.focus();
  });

  // 붙여넣기
  btnPaste.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        urlInput.value = text.trim();
        urlInput.focus();
        showToast('클립보드 주소를 붙여넣었습니다.');
      } else {
        showToast('클립보드가 비어있습니다.', true);
      }
    } catch (err) {
      showToast('클립보드 읽기 권한이 없습니다.', true);
    }
  });

  // 로고 클릭 시: 이미 초기 상태이면 홈(../index.html)으로 이동, QR 생성 상태면 초기 화면으로 리셋
  logoBtn.addEventListener('click', (e) => {
    if (inputDock.classList.contains('is-centered') && !currentUrl) {
      // 이미 초기 상태면 홈으로 이동
      window.location.href = '../index.html';
    } else {
      e.preventDefault();
      resetToInitialState();
    }
  });

  // 예시 태그 클릭
  sampleTags.forEach(tag => {
    tag.addEventListener('click', () => {
      const sampleUrl = tag.getAttribute('data-url');
      if (sampleUrl) {
        urlInput.value = sampleUrl;
        generateQRCode();
      }
    });
  });

  // URL 쿼리 파라미터(?url=...) 자동 감지 및 즉시 QR 코드 생성 연동
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const paramUrl = urlParams.get('url');
    if (paramUrl) {
      urlInput.value = decodeURIComponent(paramUrl);
      setTimeout(() => {
        generateQRCode();
        showToast('연계된 단축 URL로 QR코드가 생성되었습니다!');
      }, 250);
    } else {
      urlInput.focus();
    }
  } catch (e) {
    urlInput.focus();
  }
});
