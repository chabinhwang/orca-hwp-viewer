# 릴리스

관리자용 메모입니다.

## 순서

1. `orca-plugin.json`의 `version`을 올리고 `npm run build && npm test`를 실행합니다.
2. 커밋하고 main에 push한 뒤 `vX.Y.Z` 태그를 push합니다. 커밋만 push해서는 배포되지 않습니다.
3. 커뮤니티 카탈로그가 약 30분마다 저장소를 확인해 새 버전을 올립니다.

## 알아둘 것

- 한 번 올라간 버전은 바꿀 수 없습니다. 태그를 다른 커밋으로 옮겨도 거부되니, 수정은 항상 새 버전으로 냅니다.
- `trusted-worker` 번들이라 `under-review`(`code`)로 사람 검토에 걸릴 수 있습니다. 고칠 항목이 아니라 기다리면 됩니다. 그동안 이전 버전은 계속 설치됩니다.
- 이미 설치한 사용자는 새 버전이 등록되고 12시간 뒤 자동 업데이트됩니다. 요청하는 권한이 늘면 다시 승인을 받습니다.
- 저장소 이름이나 매니페스트 `id`를 바꾸면 다른 플러그인으로 취급되거나 새 버전 등록이 멈춥니다. 표시 이름(`name`)은 바꿔도 됩니다.

## 상태 확인

- 등록 상태 페이지: https://orca.dev/plugins/chabinhwang/orca-hwp-viewer
- 카탈로그 기록에서 직접 확인:

```sh
gh api repos/stablyai/orca-community-plugins/contents/status.json -H "Accept: application/vnd.github.raw" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['repos'].get('chabinhwang/orca-hwp-viewer'))"
```

## 로컬 개발본과 배포본 전환

둘 다 `.hwp`·`.hwpx` 에디터라 한쪽만 켭니다.

```sh
# 개발본 사용
orca plugin disable chabinhwang.hwp-viewer
orca plugin dev load "$PWD"

# 배포본 사용
orca plugin dev unload "$PWD"
orca plugin enable chabinhwang.hwp-viewer
```

개발 폴더 이름을 바꾸거나 옮기면 개발본이 목록에서 사라지니, 새 경로로 `dev load`를 다시 합니다.
