// 약관·방침 페이지: 서버의 버전 기록(앱과 같은 policy.json)을 읽어 지금 공개 버전 내용을 보여준다.
//
// - 지금 공개 버전 = 노출(visible)이고 공개 일시(publishAt)가 지난 기록 중 공개 일시가 가장 최근인 것.
//   비노출로 바꾸면 이전 공개 버전이 보인다. 앱의 판단과 같다.
// - 각 버전 전문은 {page}-{버전}.html(기록의 url)에 있고, 그 안의 #policy-body를 가져와 바꿔 끼운다.
// - 공개된 버전이 둘 이상이면 위에 '다른 버전 보기' 목록을 보여준다.
// - 서버를 읽지 못하면 페이지에 들어 있는 내용을 그대로 둔다.
//
// 버전 전문 페이지({page}-{버전}.html, data-version이 있는 스크립트)에서는 그 버전 기록만 확인한다:
// - 비노출(visible: false)이거나 기록이 없으면 본문을 숨기고 '공개되지 않은 약관' 안내를 보여준다.
// - 노출이지만 공개 일시 전이면 '시행 예정' 안내를 위에 붙여 보여준다(사전 고지용).
(function () {
  const script = document.currentScript;
  const doc = script.dataset.doc;
  const ownVersion = script.dataset.version;
  const POLICY_URL = 'https://momeng-98b75.web.app/app/policy.json';

  /** 버전 'YYYYMMDD'를 '2026년 11월 19일'로. */
  function label(v) {
    return v.slice(0, 4) + '년 ' + Number(v.slice(4, 6)) + '월 ' + Number(v.slice(6, 8)) + '일';
  }

  /** 버전 기록 [r]의 전문 페이지에서 본문을 가져와 바꿔 끼운다. */
  async function show(r) {
    const body = document.getElementById('policy-body');
    if (body.dataset.version === r.version) return;
    const res = await fetch(r.url, { cache: 'no-cache' });
    if (!res.ok) return;
    const html = new DOMParser().parseFromString(await res.text(), 'text/html');
    const next = html.getElementById('policy-body');
    if (!next) return;
    body.innerHTML = next.innerHTML;
    body.dataset.version = r.version;
  }

  /** 버전 전문 페이지: 이 버전 기록이 비노출이면 본문을 숨기고, 공개 전이면 시행 예정 안내를 붙인다. */
  function guard(json) {
    const body = document.getElementById('policy-body');
    const r = (json[doc] || []).find((x) => x.version === ownVersion);
    if (!r || r.visible === false) {
      body.innerHTML =
        '<h1>공개되지 않은 문서예요</h1><p>현재 시행 중인 내용은 <a href="' +
        script.dataset.page + '.html">여기</a>에서 볼 수 있어요.</p>';
      body.hidden = false;
      return;
    }
    if (new Date(r.publishAt) > new Date()) {
      const note = document.createElement('p');
      note.className = 'callout';
      note.textContent = label(r.version) + '부터 시행될 예정인 내용이에요.';
      body.prepend(note);
    }
    body.hidden = false;
  }

  if (ownVersion) {
    // 확인 전에는 본문을 가려 둔다(비노출 버전이 잠깐이라도 보이지 않게). 서버를 못 읽으면 그대로 보여준다.
    document.getElementById('policy-body').hidden = true;
    fetch(POLICY_URL, { cache: 'no-cache' })
      .then((res) => res.json())
      .then(guard)
      .catch(() => (document.getElementById('policy-body').hidden = false));
    return;
  }

  fetch(POLICY_URL, { cache: 'no-cache' })
    .then((res) => res.json())
    .then(async (json) => {
      const now = new Date();
      const released = (json[doc] || [])
        .filter((r) => r.visible !== false && r.url && new Date(r.publishAt) <= now)
        .sort((a, b) => (b.publishAt > a.publishAt ? 1 : -1));
      if (!released.length) return;
      await show(released[0]);
      if (released.length < 2) return;
      // 다른 버전 보기: 공개된 버전들(최신이 위).
      const box = document.getElementById('policy-versions');
      const select = document.createElement('select');
      released.forEach((r, i) => {
        const o = document.createElement('option');
        o.value = String(i);
        o.textContent = '시행일 ' + label(r.version) + (i === 0 ? ' (현재)' : '');
        select.appendChild(o);
      });
      select.addEventListener('change', () => show(released[Number(select.value)]));
      box.append('다른 버전 보기 ', select);
      box.hidden = false;
    })
    .catch(() => {});
})();
