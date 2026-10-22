# rootkit 개발 범위 및 AI API 설계안

팀 협의용 초안 · 2026-10-22

> 최신 기준은 루트의 [기획서.md](../기획서.md)를 참고하세요. 학습은 0·1·2 총 3단계입니다. 아래 고정 배점은 임시 제안이며 확정 정책이 아닙니다. 채점·배점은 AI/FastAPI가 관리하고 프론트는 결과를 표시합니다.

## 1. 이번 개발에서 만들 기능

회사의 기존 문서를 참고해 비즈니스 영어 이메일 작성을 연습하는 온보딩 학습 서비스를 구현한다. 우선 이메일 학습 2단계에 집중한다.

| 구분 | 왼쪽 문제 영역 | 오른쪽 작성 영역 | 학습 목표 |
| --- | --- | --- | --- |
| 1단계: 이메일 개선 | 업무 맥락 + 어색하거나 부적절하게 작성된 영어 이메일 | 제목 + 본문 입력 | 기존 이메일의 문제점을 파악하고 비즈니스 표현으로 수정 |
| 2단계: 상황별 작성 | 업무 상황 + 수신자 + 반드시 포함할 정보. 원문 이메일은 제공하지 않음 | 제목 + 본문 입력 | 상황에 필요한 정보를 구성해 영어 이메일을 직접 작성 |

두 단계 모두 제출 후 점수와 피드백을 확인하고 수정·재제출할 수 있다. 영어 문장을 작성하며, 문제 설명과 피드백은 한국어로 제공한다.

메일 작성 화면의 ‘제출’은 학습 답안 제출이다. 실제 이메일을 발송하지 않는다.

## 2. 역할 분담

개발 범위는 화면의 좌우가 아니라 **화면·사용자·기록 관리 / 문제 생성·평가**로 나눈다. 왼쪽 문제 화면과 오른쪽 에디터는 모두 Next.js 담당자가 구현하고, AI 팀은 화면에 표시할 데이터를 제공한다.

| 담당 | 구현 범위 |
| --- | --- |
| Next.js | 로그인·세션, 단계 선택, 왼쪽 문제 렌더링, 제목·본문 에디터, 제출·로딩·오류 처리, 피드백 화면, 수정·재제출 |
| Next.js 서버 | 사용자 권한 확인, FastAPI 호출, 문제·제출 답안·평가 결과의 PostgreSQL 저장, 요청 중복 방지 |
| FastAPI / AI | 단계에 맞는 문제 생성, 사내 문서 검색(RAG), 채점 기준 생성, 제출 답안 평가, 구조화된 피드백 반환 |
| PostgreSQL | 사용자, 생성된 문제, 제출 답안, 점수·피드백 저장 |
| 공동 협의 | 예시 문제, 채점 기준, 사내 문서 선정·사용 범위, API 응답 형식과 오류 처리 |

Next.js와 PostgreSQL로 로그인 및 학습 기록을 담당하는 구성이 적절하다. 별도 일반 백엔드를 추가하기보다 Next.js 서버를 사용자용 API 창구로 사용한다.

## 3. 전체 요청 흐름

```text
사용자 브라우저
   │ 단계 선택 / 답안 제출
   ▼
Next.js 서버 ───── PostgreSQL
   │               문제·답안·평가 기록
   │ 서버 간 인증을 포함한 요청
   ▼
FastAPI
   ├─ 문제 생성 / 답안 평가
   └─ RAG 검색 → 선정된 사내 문서
```

1. 사용자가 로그인하고 1단계 또는 2단계를 선택한다.
2. Next.js 서버가 FastAPI에 문제 생성을 요청한다.
3. FastAPI는 화면용 문제와 서버 전용 채점 정보를 함께 반환한다.
4. Next.js는 전체 결과를 DB에 저장하고, **화면용 문제만** 브라우저로 전달한다.
5. 사용자가 제목과 본문을 작성해 제출한다.
6. Next.js는 문제 소유권을 확인하고 제출 답안을 저장한다.
7. DB에서 해당 문제의 채점 정보를 읽어 FastAPI에 평가를 요청한다.
8. 평가 결과를 DB에 저장하고 사용자에게 보여준다.
9. 수정·재제출은 같은 문제에 새로운 제출 기록을 추가한다.

브라우저가 보내는 문제 내용·채점 기준·사용자 ID를 신뢰하지 않는다. 문제와 채점 정보는 서버의 DB에서 조회한다.

## 4. 공통 API 규칙

- FastAPI 내부 API 기본 경로: `/api/v1`
- JSON 요청·응답을 사용한다.
- 사용자 로그인 인증은 Next.js에서 처리한다. FastAPI는 서버 간 토큰으로 호출하며, 해당 토큰은 브라우저에 노출하지 않는다.
- 모든 요청에 `X-Request-ID`를 붙여 양쪽 서버에서 같은 요청을 추적한다.
- `stage`는 정수 `1` 또는 `2`만 허용한다.
- MVP에서는 조직과 난이도를 서버 설정으로 고정한다. 주제는 `request_materials`, `reschedule_meeting`, `progress_update` 중 하나로 제한한다.
- 날짜·시간·고유명사·기한은 생성된 문제에 명시한다. 날짜·요일 일치 및 문제와 기준의 일관성을 검증한다.
- AI의 자유 형식 텍스트를 그대로 응답하지 않고 FastAPI에서 스키마 검증 후 반환한다.
- 응답의 문서는 일반 텍스트로 렌더링한다. AI가 생성한 HTML을 실행하지 않는다.

## 5. API ① 문제 생성

`POST /api/v1/exercises/generate`

### 요청

```json
{
  "stage": 1,
  "topic": "request_materials"
}
```

### 정상 응답: 200 OK

아래 ID와 내용은 예시다. `exercise_id`는 FastAPI가 생성하는 UUID이며, Next.js가 저장한다.

```json
{
  "schema_version": "1.0",
  "exercise_id": "b0f60461-946e-4ac6-bbc8-a1593b067b84",
  "stage": 1,
  "topic": "request_materials",
  "display": {
    "title": "동료에게 영업 자료 요청하기",
    "scenario": "금요일 회의를 준비하기 위해 영업팀 Alex에게 이번 달 영업 실적 자료를 요청해야 합니다. 금요일 오전 10시(KST)까지 전달을 요청하세요.",
    "recipient": {
      "name": "Alex Morgan",
      "role": "영업팀 동료"
    },
    "original_email": {
      "subject": "Send me the report",
      "body": "Hi Alex,\nI need this month's sales report for our meeting. Send it by Friday, 10 a.m. KST. Tell me if you can't.\nRookie"
    },
    "requirements": [
      "요청 자료가 이번 달 영업 실적 자료임을 명시하기",
      "금요일 회의 준비라는 목적 설명하기",
      "금요일 오전 10시(KST)까지라는 기한 안내하기",
      "일정 조율이 가능하다는 내용 포함하기"
    ],
    "references": [
      {
        "source_id": "guide-001",
        "title": "자료 요청 메일 가이드",
        "excerpt": "자료를 요청할 때에는 사용 목적과 필요한 기한을 함께 전달합니다."
      }
    ]
  },
  "grading_context": {
    "rubric_version": "email-v1",
    "criteria": [
      { "id": "task_completion", "max_score": 40 },
      { "id": "structure", "max_score": 20 },
      { "id": "tone", "max_score": 20 },
      { "id": "language", "max_score": 20 }
    ],
    "expected_facts": {
      "material": "이번 달 영업 실적 자료",
      "purpose": "금요일 회의 준비",
      "deadline": "금요일 오전 10시 KST",
      "allow_schedule_negotiation": true
    },
    "reference_basis": [
      {
        "source_id": "guide-001",
        "excerpt": "자료를 요청할 때에는 사용 목적과 필요한 기한을 함께 전달합니다."
      }
    ]
  }
}
```

### 단계별 계약

| 필드 | 1단계 | 2단계 |
| --- | --- | --- |
| `display.scenario` | 필수 | 필수 |
| `display.recipient` | 필수 | 필수 |
| `display.original_email` | 제목·본문이 있는 객체 | 반드시 `null` |
| `display.requirements` | 필수, 1개 이상 | 필수, 1개 이상 |
| `display.references` | 배열, 근거가 없으면 빈 배열 | 동일 |
| `grading_context` | 필수, 서버 전용 | 필수, 서버 전용 |

2단계도 같은 구조를 사용하며, 업무 상황 자체가 독립적으로 이해 가능해야 한다. 화면은 `stage`와 `original_email` 값에 따라 원문 메일 표시 여부를 결정한다.

`grading_context`는 Next.js DB에 저장하되 클라이언트 응답에서 제외한다. 참고 문서는 학습자가 열람 가능한 자료만 제공한다. 검색 결과가 없으면 출처를 만들어내지 않고 일반 기준을 사용하며, 회사 문서에 근거하지 않았음을 명시한다.

## 6. API ② 답안 평가

`POST /api/v1/evaluations`

### 요청

Next.js가 저장된 문제와 채점 정보를 읽어 구성한다. FastAPI는 MVP에서 사용자·문제 저장소를 별도로 운영하지 않아도 된다.

```json
{
  "submission_id": "71eac2f8-c4ae-45c8-a25c-9c009e8b2770",
  "exercise": {
    "exercise_id": "b0f60461-946e-4ac6-bbc8-a1593b067b84",
    "schema_version": "1.0",
    "stage": 1,
    "topic": "request_materials",
    "display": "문제 생성 응답의 display 객체를 그대로 전달",
    "grading_context": "문제 생성 응답의 grading_context 객체를 그대로 전달"
  },
  "answer": {
    "subject": "Request for this month's sales report",
    "body": "Hi Alex,\nCould you please share this month's sales report by Friday at 10 a.m. KST? I need it to prepare for our Friday meeting.\nThank you,\nRookie"
  }
}
```

위 예시의 `display`와 `grading_context` 문자열은 설명용 자리표시자다. 실제 API에서는 반드시 앞서 정의한 JSON 객체로 전달한다. OpenAPI에서는 문제 생성 응답과 동일한 모델을 재사용한다.

### 정상 응답: 200 OK

```json
{
  "schema_version": "1.0",
  "submission_id": "71eac2f8-c4ae-45c8-a25c-9c009e8b2770",
  "exercise_id": "b0f60461-946e-4ac6-bbc8-a1593b067b84",
  "rubric_version": "email-v1",
  "total_score": 85,
  "scores": [
    { "id": "task_completion", "score": 30, "max_score": 40, "comment": "자료와 목적, 기한은 전달했지만 일정 조율 문구가 빠졌습니다." },
    { "id": "structure", "score": 18, "max_score": 20, "comment": "제목과 요청 내용, 마무리가 구성되어 있습니다." },
    { "id": "tone", "score": 19, "max_score": 20, "comment": "동료에게 적절한 정중한 요청 표현입니다." },
    { "id": "language", "score": 18, "max_score": 20, "comment": "내용이 명확하며 자연스럽게 읽힙니다." }
  ],
  "summary": "요청 목적과 기한이 명확합니다. 일정 조율 문구를 추가해 보세요.",
  "strengths": ["정중한 요청 표현을 사용했습니다.", "기한과 시간대를 명시했습니다."],
  "improvements": [
    {
      "criterion_id": "task_completion",
      "target": "body",
      "original_text": null,
      "reason": "상대방이 기한을 맞추기 어려운 경우 회신할 수 있도록 안내가 필요합니다.",
      "suggested_text": "Please let me know if you need more time.",
      "source_ids": []
    }
  ],
  "requirement_checks": [
    { "requirement_index": 0, "satisfied": true },
    { "requirement_index": 1, "satisfied": true },
    { "requirement_index": 2, "satisfied": true },
    { "requirement_index": 3, "satisfied": false }
  ]
}
```

### 채점 규칙

- `total_score`는 항목별 점수의 합이며 0~100 정수다. 각 점수는 0 이상, 해당 `max_score` 이하다.
- 생성 시 저장된 기준으로 평가한다. 재제출마다 문제와 기준을 새로 생성하지 않는다.
- 의미가 같은 다양한 표현을 인정한다. 모범 답안과 문장 일치 여부로 채점하지 않는다.
- `original_text`는 답안에 실제 존재하는 부분을 인용한다. 누락된 내용이면 `null`로 반환한다.
- `target`은 `subject` 또는 `body`다. `requirement_index`는 요구 사항 배열의 0부터 시작하는 인덱스다.
- 근거가 있는 피드백만 해당 출처 ID를 연결한다. 일반적인 조언의 `source_ids`는 빈 배열이다.
- 동일 기준을 유지하더라도 AI 점수에는 편차가 있을 수 있다. 학습 피드백으로 사용하고 인사 평가 용도로 취급하지 않는다.
- 사용자의 답안이나 검색 문서에 포함된 지시가 평가 기준을 바꾸지 않도록 처리한다.

## 7. Next.js가 제공할 사용자용 API

브라우저는 아래 API만 호출한다. FastAPI 주소와 서버 간 토큰은 알 필요가 없다.

| 메서드 | 경로 | 역할 |
| --- | --- | --- |
| POST | `/api/exercises` | 단계·주제를 받아 문제 생성 후 저장. 공개 문제 데이터 반환 |
| GET | `/api/exercises/:id` | 로그인 사용자의 저장된 문제 조회. 채점 정보 제외 |
| POST | `/api/exercises/:id/submissions` | 제목·본문 제출, 답안 저장 후 채점 요청 및 결과 반환 |
| GET | `/api/submissions/:id` | 제출 상태 및 평가 결과 조회 |
| GET | `/api/exercises/:id/submissions` | 해당 문제의 제출·수정 이력 조회 |

로그인·회원가입 경로는 선택한 인증 방식에 맞춰 별도 구현한다. 모든 문제·제출 조회에서 현재 사용자의 소유권을 확인한다.

답안 제출 요청 예시:

```json
{
  "client_request_id": "e6153059-dfc9-4b1f-a252-fb1a743e6ab3",
  "subject": "Request for this month's sales report",
  "body": "Hi Alex, ..."
}
```

같은 사용자의 동일 `client_request_id` 요청은 기존 제출 기록을 반환하여 중복 기록·중복 채점 시작을 막는다. 수정 후 재제출에는 새로운 ID를 사용한다. 이 처리는 Next.js/DB의 책임이다.

## 8. 최소 DB 구조

| 테이블 | 주요 컬럼 | 설명 |
| --- | --- | --- |
| `users` | `id`, `email`, `name`, `created_at` | 실제 로그인 정보 구성은 인증 방식에 맞춤 |
| `exercises` | `id`, `user_id`, `stage`, `topic`, `schema_version`, `display_json`, `grading_context_json`, `created_at` | 생성된 문제를 고정된 상태로 저장 |
| `submissions` | `id`, `exercise_id`, `client_request_id`, `subject`, `body`, `status`, `evaluation_json`, `total_score`, `error_code`, `created_at`, `evaluated_at` | 제출마다 새 행 생성, 평가 상태와 결과 보관 |

- `display_json`, `grading_context_json`, `evaluation_json`은 PostgreSQL `jsonb` 사용을 제안한다.
- `submissions.status`: `pending`, `evaluating`, `completed`, `failed`.
- `exercises.user_id`는 `users.id`, `submissions.exercise_id`는 `exercises.id`를 참조한다.
- `(exercise_id, client_request_id)`에 유니크 제약을 둔다. 요청 사용자의 문제 소유권을 검증한 후 사용한다.
- 점수는 목록 조회를 위해 별도 컬럼에 저장하되 평가 JSON과 함께 하나의 트랜잭션으로 기록한다.
- RAG 원본 문서·검색 인덱스는 AI 팀에서 관리한다. MVP에서는 Next.js의 문서 업로드 관리 화면을 제외한다.

## 9. 입력 검증·실패 처리

초기 제안: 제목 1~200자, 본문 1~10,000자. 앞뒤 공백 제거 후 빈 입력은 거절한다. 두 서버에서 동일한 제한을 적용한다.

공통 오류 응답 예시:

```json
{
  "error": {
    "code": "AI_TIMEOUT",
    "message": "평가 시간이 초과되었습니다. 작성 내용은 저장되어 있습니다.",
    "retryable": true,
    "request_id": "req-example-001"
  }
}
```

| HTTP 상태 | 코드 예시 | 처리 |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | 사용자 또는 서버 간 인증 확인 |
| 404 | `EXERCISE_NOT_FOUND` | 존재하지 않거나 접근할 수 없는 문제. Next.js에서 반환 |
| 422 | `INVALID_INPUT` | 잘못된 단계·주제·입력 길이 |
| 429 | `RATE_LIMITED` | 요청 제한, 재시도 가능 시점 안내 |
| 502 | `INVALID_AI_RESPONSE` | 모델 결과 스키마 검증 실패 |
| 503 | `AI_UNAVAILABLE` | AI 제공 서비스 일시 장애 |
| 504 | `AI_TIMEOUT` | 처리 제한 시간 초과 |

FastAPI의 기본 validation 오류도 위 오류 형식으로 변환한다. 원시 모델 오류나 서버 내부 정보는 사용자에게 전달하지 않는다.

제출 후에는 에디터의 입력값을 유지하고 제출 버튼을 로딩 상태로 표시한다. 평가 실패 시 0점으로 처리하지 않고 `failed`로 기록한다. 사용자가 재시도하면 새 제출 ID로 동일 내용을 제출할 수 있으며, 실패 기록은 유지한다.

MVP는 한 요청에서 결과를 반환하는 동기 처리로 시작한다. 처리 제한 시간은 배포 환경과 AI 측정 지연에 맞춰 합의한다. 예를 들어 FastAPI 내부 제한 45초를 사용하려면 Next.js와 프록시의 제한은 그보다 길어야 한다. 제한 내 응답이 어려우면 `202 Accepted + job_id + 결과 조회` 방식으로 전환하며, 해당 비동기 작업 API는 이번 초안의 구현 범위에 포함하지 않는다.

Next.js가 중단되거나 응답을 받지 못해 `evaluating`이 남는 경우를 위해 처리 기한을 기록하고, 기한을 넘긴 기록은 조회 또는 정리 작업에서 `failed`로 전환한다. 화면이 무한 대기하지 않도록 한다.

## 10. AI 팀에 요청할 산출물

1. 위 계약에 맞는 문제 생성·평가 API 2개와 FastAPI OpenAPI 문서.
2. 1단계·2단계 각각 정상 응답 샘플과 오류 응답 샘플.
3. 모델 연결 전 프론트엔드 개발에 사용할 고정 응답 모드 또는 목업 JSON.
4. 100점 배점 기준, 기준 버전, 한국어 피드백 형식.
5. RAG에 사용할 승인된 문서 목록과 출처 식별 방식. 초기에는 가상 또는 비식별 자료 사용.
6. 평균·최대 처리 시간 측정 결과 및 동시 요청 제한.

## 11. 구현 순서와 완료 기준

**1차: 고정 문제로 전체 흐름 연결**

- Next.js: 로그인 → 단계 선택 → 문제 표시 → 답안 제출 → 결과 표시.
- AI 팀: 고정 JSON을 반환하는 두 API 제공.
- DB: 문제·답안·평가 저장 및 본인 기록 조회.

**2차: AI 생성·평가 연결**

- 문제 생성과 평가를 실제 모델로 교체.
- 1단계는 원문 이메일을 제공하고 2단계는 제공하지 않는지 확인.
- 재제출 시 동일 문제·동일 기준을 유지하는지 확인.
- 빈 답안, 중복 제출, 타 사용자 접근, AI 실패와 시간 초과 처리 확인.

**3차: RAG와 피드백 품질 확인**

- 선정된 회사 문서에서 근거 검색 및 출처 표시.
- 좋은 답안, 필수 정보가 빠진 답안, 부적절한 표현이 있는 답안으로 평가 결과 검토.
- 출처 없는 주장을 회사 기준으로 표시하지 않는지 확인.

## 12. 이번 범위에서 제외할 기능

- 실제 이메일 전송, 첨부 파일 및 서식 편집기.
- 보고서 작성 과정, 용어 학습 전용 과정.
- 관리자 문서 업로드·사용자 관리 화면.
- 여러 회사의 데이터 격리와 조직 관리.
- 실시간 스트리밍 채점, 정교한 학습 통계 대시보드.

위 기능은 확장 후보이며, 우선 **2단계 이메일 학습 → 답안 제출 → AI 피드백 → 수정·재제출** 흐름을 완성한다.

## 13. 착수 전에 팀에서 합의할 항목

| 항목 | 이 문서의 제안 |
| --- | --- |
| 서비스 표기 | rootkit |
| 학습 범위 | 비즈니스 영어 이메일, 1·2단계 |
| 사용자 언어 | 문제·피드백 한국어, 답안 영어 |
| 문제·평가 저장 책임 | Next.js 서버 + PostgreSQL |
| AI 문제·평가 API | FastAPI 2개 엔드포인트 |
| 배점 | 과제 충족 40 / 구성 20 / 어조 20 / 언어 20 |
| 요청 처리 | MVP 동기식, 배포 제한에 따라 비동기 전환 검토 |
| RAG 초기 자료 | 담당자가 선정한 가상·비식별 문서 |

이 문서는 확정 명세가 아닌 협의 초안이다. 필드명·자료형·오류 형식을 합의한 뒤 OpenAPI와 목업 JSON을 공통 계약으로 삼아 각자 구현한다.

## 14. 0단계 추가 및 Next.js 데모 구현 (2026-10-22)

이 절은 위 초안의 **학습 단계 1·2만 허용하는 규칙을 0·1·2로 확장**한다. 현재 Next.js 데모 구현과 향후 FastAPI 계약은 구분한다.

- **0단계: 빈칸 채우기** — 메일 제목과 본문 틀을 제공하고, 학습자가 3개의 빈칸에 문맥에 맞는 표현을 선택한다. 선택형으로 먼저 핵심 표현을 익힌 뒤 1단계와 2단계로 진행한다.
- 단계 값은 `0 | 1 | 2`로 확장한다. DB의 `exercises_stage_check`에도 0을 포함하는 증분 마이그레이션을 추가했다.
- 향후 FastAPI 문제 생성에는 0단계의 본문 템플릿과 `blanks: [{ id, label, options }]`가 필요하다. 정답 키는 서버 전용 `grading_context`에 두고, 제출에는 빈칸 ID별 선택 값을 포함한다. 정확한 필드 구조는 AI 팀과 확정한다.
- 0단계는 선택값의 정오를 채점한다. 문장 작성 평가용 4개 기준 대신 빈칸별 배점을 사용한다. 현재 예시는 40/30/30점이다.
- 현재 구현한 `POST /api/demo/evaluations`는 FastAPI 연결 전 임시 엔드포인트다. 고정 예시 문제와 규칙 기반 채점을 사용하며 실사용 인증·RAG·DB 기록 저장은 포함하지 않는다.
- UI 흐름: `/` → `/login` → `/kits` → `/learn/0` → `/learn/1` → `/learn/2` → `/history`.
- 프론트엔드는 단계별 임시 저장, 피드백, 수정·재제출, 제출 이력을 제공한다. 기록은 현재 브라우저에 저장된다.
