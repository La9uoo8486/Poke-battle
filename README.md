# 포켓배틀 노트

포켓몬 챔피언스 + 스칼렛·바이올렛 배틀 정보 웹앱. 모바일·PC 둘 다 되고, 홈 화면에 설치(PWA)도 됩니다.

## 기능
| 탭 | 내용 |
|---|---|
| 실전 순위 | Showdown 래더 사용률 순위 (매주 자동 갱신) |
| 랭킹·투표 | 유저 투표 순위 / S~D 투표하기 / 종족값 순위 |
| 도감 | 1252종(메가·리전폼 포함), 검색·타입 필터·★즐겨찾기 |
| 상성 | 방어·공격 계산기 + 전체 상성표 |
| 파티 | 6마리 약점 분석, 테라 타입 반영, 링크 공유, Showdown 내보내기/불러오기, 파티 저장 |
| 카운터 | 상대 포켓몬 → 유리한 포켓몬·공격 타입 추천 |
| 퀴즈 | 타입 상성 퀴즈 (연속 정답 기록) |

상단에서 포맷을 고르면 공식 룰대로 기믹 칩이 켜집니다. 칩을 누르면 켜고/끌 수 있어요 (켜면 포함, 끄면 제외).
- 메가진화: XY·ORAS 메가 폼 / 메가진화 Z-A: 레전즈 Z-A 메가 폼 → 도감·검색·순위·카운터에서 포함/제외
- 다이맥스: 거다이맥스 폼 포함/제외
- Z기술: 파티 빌더에 Z크리스탈 선택 (Showdown 내보내기에 반영)
- 테라스탈: 파티 빌더에 테라 타입 선택 (약점 분석에 반영)
공식 룰과 다르게 바꾸면 "공식 룰과 다름 · 초기화" 칩이 뜹니다.
포맷·기믹 설정은 `data/formats.json` 에서 바꿉니다 (새 레귤레이션 나오면 여기만 수정).

## 폴더 구조
```
index.html, css/, js/        화면
config.js                    Supabase 키 넣는 곳
data/dex.json, types.json    도감·상성 (PokeAPI)
data/formats.json            포맷·기믹 허용 여부
data/usage.json              사용률 (자동 갱신)
scripts/build-dex.mjs        도감 데이터 다시 만들기
scripts/fetch-usage.mjs      사용률 수집
.github/workflows/           매주 월요일 자동 수집
supabase/schema.sql          투표 테이블
sw.js, manifest.webmanifest  PWA
```

---

## 1. 배포 (GitHub Pages, 무료)
1. GitHub에서 새 저장소 생성 (예: `pokebattle`, Public).
2. 이 폴더 전체를 업로드 (웹에서 "Add file → Upload files"로 드래그해도 됨. `.github` 폴더도 꼭 포함).
3. 저장소 **Settings → Pages** → Source: `Deploy from a branch`, Branch: `main` / `(root)` → Save.
4. 1~2분 뒤 `https://<아이디>.github.io/pokebattle/` 접속.

## 2. 사용률 자동 갱신 켜기
1. 저장소 **Settings → Actions → General** → Workflow permissions: **Read and write permissions** → Save.
2. **Actions** 탭 → "사용률 갱신" → **Run workflow** 로 한 번 수동 실행.
3. 이후 매주 월요일 12시(KST)에 자동 실행. 바뀐 게 있으면 `data/usage.json` 이 커밋되고 사이트에 반영됩니다.

첫 실행 후 기술·도구·특성·테라·같이 쓰는 포켓몬·실전 카운터 데이터가 채워집니다 (지금 들어있는 건 2026-10 상위 40위 사용률만).

## 3. 투표 모으기 (Supabase, 무료)
로그인 창은 없습니다. 기기마다 보이지 않는 익명 계정이 자동으로 만들어져서 **포켓몬당 기기 1표**(수정 가능)로 중복을 막습니다.

1. https://supabase.com 가입 → **New project** (Region: Northeast Asia (Seoul)).
2. 왼쪽 **SQL Editor** → `supabase/schema.sql` 내용 전체 붙여넣기 → **Run**.
3. **Authentication → Sign In / Providers** → **Allow anonymous sign-ins** 켜기 → Save.
4. **Project Settings → API** (또는 Data API) 에서
   - `Project URL`
   - `anon` `public` 키 (**service_role 키는 절대 쓰지 말 것**)
   를 복사해서 `config.js` 에 넣고 GitHub에 다시 업로드.
5. 사이트 → 랭킹·투표 → 투표하기에서 S~D를 눌러보고, Supabase **Table Editor → votes** 에 줄이 생기면 성공.

결과 보기: Table Editor의 `vote_summary`(평균·표 수) 또는 `votes` → 오른쪽 위 **Export → CSV**.

### 알아둘 점
- 브라우저 데이터를 지우거나 시크릿 창을 쓰면 새 기기로 취급돼서 다시 투표할 수 있습니다. 로그인 없이 완벽하게 막는 방법은 없습니다.
- 어뷰징이 보이면 **Authentication → Attack Protection** 에서 CAPTCHA(Turnstile)를 켜거나, 나중에 구글/디스코드 로그인을 붙이면 됩니다. 익명 계정에 `linkIdentity` 로 연결하면 기존 표가 그대로 유지돼서 테이블은 안 바꿔도 됩니다.
- Supabase 무료 플랜은 1주일 동안 요청이 없으면 프로젝트가 일시정지됩니다. 대시보드에서 Restore 누르면 복구됩니다.

## 4. 로컬에서 실행
`index.html` 을 더블클릭하면 안 됩니다 (모듈 로딩 막힘). 폴더에서:
```
npx serve .        또는   python -m http.server 8000
```

## 업데이트 반영 (PWA)
앱 파일과 데이터는 "네트워크 우선"이라 온라인이면 항상 최신 버전을 받습니다. 새 버전이 감지되면 자동으로 한 번 새로고침됩니다. 오프라인일 때만 저장된 도감·상성을 보여줍니다.

## 데이터 출처·주의
- 도감·상성: PokeAPI (https://pokeapi.co) CSV. 갱신은 `node scripts/build-dex.mjs`.
- 사용률: Smogon 통계 (https://www.smogon.com/stats/) — **Pokémon Showdown 시뮬레이터** 래더 기준이며 게임 내 공식 랭크 순위가 아닙니다.
- 포켓몬 챔피언스 M-C 룰(2026-09-09 ~ 12-02, 메가진화만 허용): Serebii, Victory Road 기준.
- Showdown 내보내기에서 메가폼은 `Charizard-Mega-Y` 처럼 폼 이름으로 나갑니다. Showdown이 메가스톤 없이 이 표기를 그대로 받는지는 확인하지 못했습니다.
- Smogon이 이번 달 "Checks and Counters" 데이터를 비워 둬서, 지금은 카운터가 타입 기준 추천만 나옵니다. 데이터가 생기면 자동 표시.
- 카운터 "타입 기준 추천"은 자속 기술만 계산합니다 (특성·도구·서브 기술·스피드 미반영).
