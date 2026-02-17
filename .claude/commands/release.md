# Create GitHub Release

새 버전을 릴리즈합니다.

## 절차

1. `npm test`로 테스트 통과 확인
2. `npm run build`로 프로덕션 빌드 확인
3. $ARGUMENTS에서 버전 번호를 추출 (예: `0.2.0`). 없으면 사용자에게 물어보세요.
4. `package.json`, `manifest.json`의 `version` 필드를 새 버전으로 업데이트
5. `versions.json`에 새 버전 → minAppVersion 매핑 추가
6. 변경사항을 커밋: `🔖 chore: release v{version}`
7. `npm run build`로 최종 빌드
8. `gh release create v{version} main.js manifest.json styles.css --title "v{version} — {title}" --notes "{release notes}"`
9. `git push && git push --tags`

릴리즈 노트는 이전 릴리즈 이후 커밋을 분석하여 영문으로 작성합니다.
에셋은 반드시 `main.js`, `manifest.json`, `styles.css` 세 파일입니다.
