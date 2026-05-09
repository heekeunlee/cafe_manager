# 카페 직원 근무/급여 관리 MVP

프랜차이즈 카페의 아르바이트 직원 근무표, 주휴수당, 월 예상 급여를 브라우저에서 계산하는 React + Vite MVP입니다. 로그인, GPS 인증, 서버 DB 없이 localStorage로 동작합니다.

## 실행 방법

```bash
npm install
npm run dev
```

프로덕션 빌드 확인:

```bash
npm run build
```

## Supabase 동기화 설정

맥북과 휴대폰이 같은 데이터를 실시간으로 보려면 Supabase에서 테이블을 먼저 만들어야 합니다.

1. Supabase Dashboard에서 프로젝트를 엽니다.
2. 왼쪽 메뉴의 SQL Editor로 이동합니다.
3. [supabase/schema.sql](supabase/schema.sql) 내용을 붙여넣고 실행합니다.
4. 앱을 다시 열면 직원, 근무표, 설정 데이터가 Supabase에 저장되고 다른 기기에도 실시간 반영됩니다.

현재 앱에는 아래 Publishable key가 연결되어 있습니다.

```text
VITE_SUPABASE_URL=https://njkiqxqthgmknvtplrbn.supabase.co
```

테이블이 아직 없거나 Supabase 연결이 실패하면 기존 localStorage 저장 방식으로 동작합니다.

## 파일 구조

```text
src/
  App.tsx                 화면 구성과 입력 흐름
  main.tsx                React 엔트리
  index.css               Tailwind 및 기본 폼 스타일
  types.ts                직원, 근무표, 급여 타입
  data/sampleData.ts      샘플 직원 4명과 샘플 근무표
  hooks/useLocalStorage.ts
  utils/payroll.ts        근무시간, 주휴수당, 월급 계산 로직
```

## 계산식

- 실제 근무시간 = 종료시간 - 시작시간 - 휴게시간
- 기본 주급 = 실제 주 근무시간 x 시급
- 주휴수당 조건 = 주휴수당 적용 직원이고 주 근무시간이 15시간 이상
- 주휴수당 시간 = `min((주 근무시간 / 40) x 8, 8)`
- 주휴수당 금액 = `주휴수당 시간 x 시급`
- 월 예상 급여 = `(기본 주급 + 주휴수당) x 4.345`

## 계산 테스트용 샘플

`src/utils/payroll.ts`의 순수 함수는 아래 케이스로 확인할 수 있습니다.

- 주 14시간, 주휴수당 적용: 주휴수당 시간 0시간, 주휴수당 0원
- 주 15시간, 시급 10,000원, 주휴수당 적용: 주휴수당 시간 3시간, 주휴수당 30,000원
- 주 40시간, 시급 10,000원, 주휴수당 적용: 주휴수당 시간 8시간, 주휴수당 80,000원
- 주 45시간, 시급 10,000원, 주휴수당 적용: 주휴수당 시간은 최대 8시간으로 제한

## 확장 방향

현재 데이터 저장은 `useLocalStorage` 훅에 모여 있습니다. Supabase 또는 Firebase를 붙일 때 직원, 근무표, 매장 설정 저장소를 API 기반 훅 또는 repository 모듈로 교체하면 화면과 계산 로직은 유지할 수 있습니다.
